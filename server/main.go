package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	database "github.com/immatheus/gitback/databases"
	"github.com/immatheus/gitback/storage"
)

func main() {
	godotenv.Load() // only for dev, gcp injects this for us

	if err := database.Init(os.Getenv("DATABASE_URL")); err != nil {
		log.Printf("ERROR: Database initialization failed: %v", err)
		log.Printf("Continuing without database - data will not be persisted")
	} else {
		log.Printf("Database initialized successfully")
	}
	defer database.Close()

	if err := storage.Init(); err != nil {
		log.Printf("WARNING: Storage cache initialization failed: %v", err)
		log.Printf("Continuing without cache - requests will be slower")
	} else {
		log.Printf("GCP Storage cache initialized successfully")
	}
	defer storage.Close()

	app := fiber.New(fiber.Config{
		AppName: "GitBack v1.0.0",
	})

	// this is lowkey insane, makes payloads like 4x smaller
	// rails when it was 20,057kB, now it's 7,001kB
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed, // Fast compression
	}))

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
	app.Get("/api/top-repos", getTopRepos)

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

// for dev only
const skipCache = false

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

	// Check cache first
	if !skipCache {
		cacheStart := time.Now()
		if cachedData, err := storage.GetFromCache(req.Username, req.Repo); err != nil {
			log.Printf("Cache check failed: %v", err)
		} else if cachedData != nil {
			log.Printf("[TIMING] Cache lookup: %v - CACHE HIT", time.Since(cacheStart))
			log.Printf("Returning cached analysis for %s", repoURL)

			// Update view count in background
			go func() {
				if err := database.IncrementViews(req.Username, req.Repo); err != nil {
					log.Printf("[DB] Failed to increment views for %s: %v", repoURL, err)
				}
			}()

			return c.JSON(cachedData)
		} else {
			log.Printf("[TIMING] Cache lookup: %v - CACHE MISS", time.Since(cacheStart))
		}
	}

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

	// Fetch GitHub repo info and stars history in parallel
	var githubInfo *GitHubRepo

	// Use goroutines to fetch GitHub data in parallel
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		if repoInfo, err := fetchGitHubRepoInfo(req.Username, req.Repo); err == nil {
			githubInfo = repoInfo
		}
	}()

	var pullRequests *GitHubSearchResult
	go func() {
		defer wg.Done()
		if pullRequestInfo, err := fetchRepoTopPullRequests(req.Username, req.Repo); err == nil {
			pullRequests = pullRequestInfo
		} else {
			log.Printf("Failed to fetch top pull requests for %s/%s: %v", req.Username, req.Repo, err)
		}
	}()

	wg.Wait()

	go func() {
		histogram := database.CalculateLinesHistogram(commits, 10)

		totalLines := 0
		for _, commit := range commits {
			totalLines += commit.Added - commit.Removed
		}

		dbData := database.RepoData{
			Username:       req.Username,
			RepoName:       req.Repo,
			TotalAdditions: totalAdded,
			TotalLines:     totalLines,
			TotalRemovals:  totalRemoved,
			LinesHistogram: histogram,
			TotalStars:     githubInfo.StargazersCount,
			TotalCommits:   len(commits),
			Language:       githubInfo.Language,
			Size:           githubInfo.Size,
		}

		if err := database.SaveRepo(dbData); err != nil {
			log.Printf("[DB] Failed to save repo to database for %s: %v", repoURL, err)
		} else {
			log.Printf("[DB] Successfully saved repo to database for %s", repoURL)
		}

		if err := database.IncrementViews(req.Username, req.Repo); err != nil {
			log.Printf("[DB] Failed to increment views for %s: %v", repoURL, err)
		} else {
			log.Printf("[DB] Successfully incremented views for %s", repoURL)
		}
	}()

	response := fiber.Map{
		"totalAdded":        totalAdded,
		"totalRemoved":      totalRemoved,
		"totalContributors": totalContributors,
		"totalCommits":      len(commits),
		"commits":           commits,
		"github":            githubInfo,
		"pullRequests":      pullRequests,
	}

	// Store in cache asynchronously
	go func() {
		cacheStoreStart := time.Now()
		if err := storage.StoreInCache(req.Username, req.Repo, response); err != nil {
			log.Printf("Failed to store analysis in cache for %s: %v", repoURL, err)
		} else {
			log.Printf("[TIMING] Cache store: %v for %s", time.Since(cacheStoreStart), repoURL)
		}
	}()

	err = c.JSON(response)

	totalDuration := time.Since(requestStart)
	log.Printf("[TIMING] *** TOTAL REQUEST TIME: %v ***", totalDuration)
	log.Printf("=== Request completed ===\n")

	return err
}

func getTopRepos(c *fiber.Ctx) error {
	repos, err := database.GetTopRepos()
	if err != nil {
		log.Printf("Failed to get top repos: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to fetch top repositories",
		})
	}

	return c.JSON(fiber.Map{
		"repos": repos,
	})
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

type CommitStats = database.CommitStats

type GitHubRepo struct {
	StargazersCount int    `json:"stargazers_count"`
	Language        string `json:"language"`
	Size            int    `json:"size"`
}

type GitHubPullRequest struct {
	ID          int64                  `json:"id"`
	Number      int                    `json:"number"`
	Title       string                 `json:"title"`
	Body        string                 `json:"body"`
	User        GitHubUser             `json:"user"`
	CreatedAt   string                 `json:"created_at"`
	State       string                 `json:"state"`
	HTMLURL     string                 `json:"html_url"`
	Comments    int                    `json:"comments"`
	PullRequest *GitHubPullRequestInfo `json:"pull_request,omitempty"`
	Reactions   GitHubReactions        `json:"reactions"`
}

type GitHubPullRequestInfo struct {
	MergedAt *string `json:"merged_at"`
}

type GitHubReactions struct {
	TotalCount int `json:"total_count"`
	PlusOne    int `json:"+1"`
	MinusOne   int `json:"-1"`
	Laugh      int `json:"laugh"`
	Hooray     int `json:"hooray"`
	Confused   int `json:"confused"`
	Heart      int `json:"heart"`
	Rocket     int `json:"rocket"`
	Eyes       int `json:"eyes"`
}

type GitHubUser struct {
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
	HTMLURL   string `json:"html_url"`
}

var githubClient = &http.Client{
	Timeout: 30 * time.Second,
}

func fetchGitHubRepoInfo(username, repo string) (*GitHubRepo, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s", username, repo)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Add GitHub token if available for higher rate limits
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", "token "+token)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := githubClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	var repoInfo GitHubRepo
	if err := json.NewDecoder(resp.Body).Decode(&repoInfo); err != nil {
		return nil, err
	}

	return &repoInfo, nil
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

	// Estimate capacity for better memory allocation
	estimatedCommits := len(output) / 200
	commits := make([]CommitStats, 0, estimatedCommits)

	scanner := bufio.NewScanner(bytes.NewReader(output))
	buf := make([]byte, 1024*1024)
	scanner.Buffer(buf, 10*1024*1024)

	var currentCommit *CommitStats

	for scanner.Scan() {
		line := scanner.Text()

		if line == "" {
			continue
		}

		// Check if this is a commit header (contains |)
		if strings.Contains(line, "|") {
			if currentCommit != nil {
				commits = append(commits, *currentCommit)
			}

			parts := strings.SplitN(line, "|", 4)
			if len(parts) == 4 {
				timestamp, err := strconv.ParseInt(parts[2], 10, 64)
				if err != nil {
					timestamp = time.Now().Unix()
				}
				date := time.Unix(timestamp, 0)
				currentCommit = &CommitStats{
					Hash:    parts[0][:7],
					Author:  parts[1],
					Date:    date.Unix(),
					Message: truncateMessage(parts[3], 100),
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
	}

	log.Printf("[TIMING] === CLONE REPO BREAKDOWN OF %s ===", repoURL)
	log.Printf("[TIMING] - Temp dir creation: included in overall")
	log.Printf("[TIMING] - Git clone: %v (%.1f%%)", cloneDuration, float64(cloneDuration)/float64(time.Since(overallStart))*100)
	log.Printf("[TIMING] - Git log: %v (%.1f%%)", gitLogDuration, float64(gitLogDuration)/float64(time.Since(overallStart))*100)
	log.Printf("[TIMING] - Total cloneRepo: %v", time.Since(overallStart))
	log.Printf("[TIMING] ================================")

	return commits, nil
}

func truncateMessage(msg string, maxLen int) string {
	if len(msg) <= maxLen {
		return msg
	}
	return msg[:maxLen] + "..."
}

type GitHubSearchResult struct {
	TotalCount int                 `json:"total_count"`
	Items      []GitHubPullRequest `json:"items"`
}

func fetchRepoTopPullRequests(username, repo string) (*GitHubSearchResult, error) {
	const prCount = 5
	searchURL := fmt.Sprintf("https://api.github.com/search/issues?q=repo:%s/%s+type:pr+created:2025-01-01..2025-12-31&sort=reactions&order=desc&per_page=%d", username, repo, prCount)
	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return nil, err
	}

	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", "token "+token)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := githubClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	var searchResult GitHubSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&searchResult); err != nil {
		return nil, err
	}

	log.Printf("[DEBUG] Returning %d pull requests", len(searchResult.Items))
	return &searchResult, nil
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
