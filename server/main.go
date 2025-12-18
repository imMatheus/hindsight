package main

import (
	"bufio"
	"bytes"
	"fmt"
	"log"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	app := fiber.New(fiber.Config{
		AppName: "GitBack v1.0.0",
	})

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "GitBack API",
			"version": "1.0.0",
		})
	})

	app.Post("/api/analyze", analyzeRepo)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logSystemInfo()
	log.Fatal(app.Listen(":" + port))
}

func logSystemInfo() {
	log.Printf("=== SYSTEM INFO ===")
	log.Printf("NumCPU: %d", runtime.NumCPU())
	log.Printf("GOMAXPROCS: %d", runtime.GOMAXPROCS(0))
	log.Printf("GOOS: %s", runtime.GOOS)
	log.Printf("GOARCH: %s", runtime.GOARCH)

	gitVersion := exec.Command("git", "--version")
	out, err := gitVersion.Output()
	if err == nil {
		log.Printf("Git version: %s", strings.TrimSpace(string(out)))
	}

	protocolCmd := exec.Command("git", "config", "--get", "protocol.version")
	protocolOut, _ := protocolCmd.Output()
	log.Printf("Git protocol.version: %s", strings.TrimSpace(string(protocolOut)))

	log.Printf("Testing network speed to github.com...")
	testNetworkSpeed()

	log.Printf("===================")
}

func testNetworkSpeed() {
	start := time.Now()
	cmd := exec.Command("wget", "-q", "-O", "/dev/null", "https://github.com")
	err := cmd.Run()
	elapsed := time.Since(start)

	if err == nil {
		log.Printf("GitHub ping: %v", elapsed)
	} else {
		log.Printf("GitHub ping failed: %v", err)
	}

	// cmd := exec.Command("curl", "-s", "-o", "/dev/null", "-w", "%{time_total}", "https://github.com")
	// output, err := cmd.Output()
	// elapsed := time.Since(start)

	// if err == nil {
	// 	log.Printf("GitHub ping: %s (total time: %v)", strings.TrimSpace(string(output)), elapsed)
	// } else {
	// 	log.Printf("GitHub ping failed: %v", err)
	// }
}

func analyzeRepo(c *fiber.Ctx) error {
	requestStart := time.Now()

	type Request struct {
		Username string `json:"username"`
		Repo     string `json:"repo"`
	}

	parseStart := time.Now()
	var req Request
	if err := c.BodyParser(&req); err != nil {
		log.Printf("Error parsing request body: %v", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}
	log.Printf("[TIMING] Body parsing: %v", time.Since(parseStart))

	if req.Username == "" {
		log.Printf("Missing username in request")
		return c.Status(400).JSON(fiber.Map{
			"error": "username is required",
		})
	}

	if req.Repo == "" {
		log.Printf("Missing repo in request")
		return c.Status(400).JSON(fiber.Map{
			"error": "repo is required",
		})
	}

	repoURL := fmt.Sprintf("https://github.com/%s/%s.git", req.Username, req.Repo)
	log.Printf("=== Starting analysis for: %s ===", repoURL)

	logRequestSystemStats()

	cloneStart := time.Now()
	commits, err := cloneRepo(repoURL)
	cloneDuration := time.Since(cloneStart)
	log.Printf("[TIMING] Total cloneRepo execution: %v", cloneDuration)

	if err != nil {
		if isNotFoundError(err) {
			log.Printf("Repository not found: %s - Error: %v", repoURL, err)
			return c.Status(404).JSON(fiber.Map{
				"error": "Repository not found",
			})
		}
		log.Printf("Failed to clone repository: %s - Error: %v", repoURL, err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to clone repository",
		})
	}

	processingStart := time.Now()
	totalAdded := 0
	totalRemoved := 0
	totalContributors := 0
	contributors := make(map[string]bool)
	for _, commit := range commits {
		totalAdded += commit.Added
		totalRemoved += commit.Removed
		if _, ok := contributors[commit.Author]; !ok {
			contributors[commit.Author] = true
			totalContributors++
		}
	}
	log.Printf("[TIMING] Processing commits stats: %v", time.Since(processingStart))

	log.Printf("Analysis completed for %s: %d commits, %d contributors, +%d/-%d lines",
		repoURL, len(commits), totalContributors, totalAdded, totalRemoved)

	response := fiber.Map{
		"message":           "Analysis completed",
		"totalAdded":        totalAdded,
		"totalRemoved":      totalRemoved,
		"totalContributors": totalContributors,
		"commits":           commits,
	}

	err = c.JSON(response)

	totalDuration := time.Since(requestStart)
	log.Printf("[TIMING] *** TOTAL REQUEST TIME: %v ***", totalDuration)
	log.Printf("=== Request completed ===\n")

	return err
}

func logRequestSystemStats() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	log.Printf("[STATS] Goroutines: %d", runtime.NumGoroutine())
	log.Printf("[STATS] Memory Alloc: %d MB", m.Alloc/1024/1024)
	log.Printf("[STATS] Memory TotalAlloc: %d MB", m.TotalAlloc/1024/1024)
	log.Printf("[STATS] Memory Sys: %d MB", m.Sys/1024/1024)
	log.Printf("[STATS] NumGC: %d", m.NumGC)

	dfCmd := exec.Command("df", "-h", "/tmp")
	dfOut, err := dfCmd.Output()
	if err == nil {
		lines := strings.Split(string(dfOut), "\n")
		if len(lines) > 1 {
			log.Printf("[STATS] Disk space: %s", strings.Join(strings.Fields(lines[1]), " "))
		}
	}
}

type CommitStats struct {
	Hash    string    `json:"hash"`
	Author  string    `json:"author"`
	Date    time.Time `json:"date"` // Unix timestamp for faster JSON marshaling
	Added   int       `json:"added"`
	Removed int       `json:"removed"`
	Message string    `json:"message"`
}

func cloneRepo(repoURL string) ([]CommitStats, error) {
	overallStart := time.Now()

	log.Printf("[DEBUG] Testing network to GitHub before clone...")
	pingStart := time.Now()
	pingCmd := exec.Command("ping", "-c", "1", "github.com")
	pingOut, pingErr := pingCmd.CombinedOutput()
	if pingErr == nil {
		log.Printf("[DEBUG] Ping result: %s (took %v)", strings.TrimSpace(string(pingOut)), time.Since(pingStart))
	} else {
		log.Printf("[DEBUG] Ping failed: %v", pingErr)
	}

	tmpDirStart := time.Now()
	tmpDir, err := os.MkdirTemp("", "repo-analysis-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(tmpDir)
	log.Printf("[TIMING] Create temp dir: %v (path: %s)", time.Since(tmpDirStart), tmpDir)

	cloneStart := time.Now()
	log.Printf("[DEBUG] Starting git clone for %s", repoURL)
	cloneCmd := exec.Command("git", "clone", "--bare", "--single-branch", repoURL, tmpDir)
	var cloneStderr bytes.Buffer
	cloneCmd.Stderr = &cloneStderr

	if err := cloneCmd.Run(); err != nil {
		log.Printf("Git clone failed for %s: %v - stderr: %s", repoURL, err, cloneStderr.String())
		return nil, err
	}
	cloneDuration := time.Since(cloneStart)
	log.Printf("[TIMING] *** Git clone completed: %v ***", cloneDuration)

	duCmd := exec.Command("du", "-sh", tmpDir)
	duOut, _ := duCmd.Output()
	log.Printf("[DEBUG] Cloned repo size: %s", strings.TrimSpace(string(duOut)))

	gitLogStart := time.Now()
	log.Printf("[DEBUG] Starting git log for %s", repoURL)
	cmd := exec.Command("git",
		"--git-dir", tmpDir,
		"log",
		"--shortstat", // Use shortstat instead of numstat - much faster!
		"--format=%H|%an|%at|%s",
		"--diff-algorithm=histogram",
	)

	output, err := cmd.Output()
	if err != nil {
		log.Printf("Git log failed for %s: %v ", repoURL, err)
		return nil, err
	}
	gitLogDuration := time.Since(gitLogStart)
	log.Printf("[TIMING] *** Git log completed: %v ***", gitLogDuration)
	log.Printf("[DEBUG] Git log output size: %d bytes (%.2f MB)", len(output), float64(len(output))/1024/1024)

	parseStart := time.Now()
	log.Printf("[DEBUG] Starting to parse git log output...")

	// Estimate capacity for better memory allocation
	estimatedCommits := len(output) / 200
	commits := make([]CommitStats, 0, estimatedCommits)

	scanner := bufio.NewScanner(bytes.NewReader(output))
	buf := make([]byte, 1024*1024)
	scanner.Buffer(buf, 10*1024*1024)

	lineParseStart := time.Now()
	var currentCommit *CommitStats
	commitCount := 0
	lineCount := 0

	for scanner.Scan() {
		line := scanner.Text()
		lineCount++

		if lineCount > 0 && lineCount%10000 == 0 {
			log.Printf("[DEBUG] Parsed %d lines, %d commits so far... (elapsed: %v)",
				lineCount, commitCount, time.Since(lineParseStart))
		}

		if line == "" {
			continue
		}

		// Check if this is a commit header (contains |)
		if strings.Contains(line, "|") {
			if currentCommit != nil {
				commits = append(commits, *currentCommit)
				commitCount++
			}

			parts := strings.SplitN(line, "|", 4)
			if len(parts) == 4 {
				timestamp, err := strconv.ParseInt(parts[2], 10, 64)
				if err != nil {
					timestamp = time.Now().Unix()
				}
				date := time.Unix(timestamp, 0)
				currentCommit = &CommitStats{
					Hash:    parts[0],
					Author:  parts[1],
					Date:    date,
					Message: parts[3],
					Added:   0,
					Removed: 0,
				}
			}
		} else if currentCommit != nil && strings.Contains(line, "changed") {
			// Parse shortstat: " 1 file changed, 10 insertions(+), 5 deletions(-)"
			fields := strings.Fields(line)
			for i, field := range fields {
				if i > 0 && (field == "insertion(+)," || field == "insertions(+)," || field == "insertion(+)" || field == "insertions(+)") {
					currentCommit.Added, _ = strconv.Atoi(fields[i-1])
				}
				if i > 0 && (field == "deletion(-)," || field == "deletions(-)," || field == "deletion(-)" || field == "deletions(-)") {
					currentCommit.Removed, _ = strconv.Atoi(fields[i-1])
				}
			}
		}
	}

	if currentCommit != nil {
		commits = append(commits, *currentCommit)
		commitCount++
	}

	parseDuration := time.Since(parseStart)
	log.Printf("[TIMING] *** Parsing completed: %v *** for repo: %s", parseDuration, repoURL)
	log.Printf("[DEBUG] Parsed %d commits", len(commits))

	log.Printf("[TIMING] === CLONE REPO BREAKDOWN ===")
	log.Printf("[TIMING] - Temp dir creation: included in overall")
	log.Printf("[TIMING] - Git clone: %v (%.1f%%)", cloneDuration, float64(cloneDuration)/float64(time.Since(overallStart))*100)
	log.Printf("[TIMING] - Git log: %v (%.1f%%)", gitLogDuration, float64(gitLogDuration)/float64(time.Since(overallStart))*100)
	log.Printf("[TIMING] - Parsing: %v (%.1f%%)", parseDuration, float64(parseDuration)/float64(time.Since(overallStart))*100)
	log.Printf("[TIMING] - Total cloneRepo: %v", time.Since(overallStart))
	log.Printf("[TIMING] ================================")

	return commits, nil
}

func isNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return strings.Contains(errStr, "exit status 128") ||
		strings.Contains(errStr, "Repository not found") ||
		strings.Contains(errStr, "fatal: repository") ||
		strings.Contains(errStr, "remote: Repository not found")
}
