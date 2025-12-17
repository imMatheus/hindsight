package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	app := fiber.New(fiber.Config{
		AppName: "Hindsight v1.0.0",
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	// Routes
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Hindsight API",
			"version": "1.0.1",
		})
	})

	app.Post("/api/analyze", analyzeRepo)

	// Start server
	log.Fatal(app.Listen(":8080"))
}

func analyzeRepo(c *fiber.Ctx) error {
	type Request struct {
		Username string `json:"username"`
		Repo     string `json:"repo"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Username == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "username is required",
		})
	}

	if req.Repo == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "repo is required",
		})
	}

	stats, fileTouchCounts, err := cloneRepo(fmt.Sprintf("https://github.com/%s/%s.git", req.Username, req.Repo))
	if err != nil {
		fmt.Println(err)
		// Check if it's a 404 error (repository not found)
		if isNotFoundError(err) {
			return c.Status(404).JSON(fiber.Map{
				"error": "Repository not found",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to clone repository",
		})
	}

	totalAdded := 0
	totalRemoved := 0
	totalContributors := 0
	contributors := make(map[string]bool)
	for _, stat := range stats {
		totalAdded += stat.Added
		totalRemoved += stat.Removed
		if _, ok := contributors[stat.Author]; !ok {
			contributors[stat.Author] = true
			totalContributors++
		}
	}

	// Get top 100 most touched files
	topFiles := getTopTouchedFiles(fileTouchCounts, 100)

	return c.JSON(fiber.Map{
		"message":           "Analysis completed",
		"totalAdded":        totalAdded,
		"totalRemoved":      totalRemoved,
		"totalContributors": totalContributors,
		"stats":             stats,
		"mostTouchedFiles":  topFiles,
	})
}

type CommitStats struct {
	Hash              string    `json:"hash"`
	Author            string    `json:"author"`
	Date              time.Time `json:"date"`
	Added             int       `json:"added"`
	Removed           int       `json:"removed"`
	Message           string    `json:"message"`
	FilesTouchedCount int       `json:"filesTouchedCount"`
}

type FileTouchCount struct {
	File  string `json:"file"`
	Count int    `json:"count"`
}

func getTopTouchedFiles(fileCounts map[string]int, limit int) []FileTouchCount {
	type fileCountPair struct {
		file  string
		count int
	}

	// Convert map to slice
	pairs := make([]fileCountPair, 0, len(fileCounts))
	for file, count := range fileCounts {
		pairs = append(pairs, fileCountPair{file: file, count: count})
	}

	// Sort by count descending
	sort.Slice(pairs, func(i, j int) bool {
		return pairs[i].count > pairs[j].count
	})

	// Take top N
	if limit > len(pairs) {
		limit = len(pairs)
	}

	result := make([]FileTouchCount, limit)
	for i := 0; i < limit; i++ {
		result[i] = FileTouchCount{
			File:  pairs[i].file,
			Count: pairs[i].count,
		}
	}

	return result
}

func cloneRepo(repoURL string) ([]CommitStats, map[string]int, error) {
	tmpDir, err := os.MkdirTemp("", "repo-analysis-")
	if err != nil {
		return nil, nil, err
	}
	defer os.RemoveAll(tmpDir)

	startTime := time.Now()
	cloneCmd := exec.Command("git", "clone", "--bare", "--single-branch", repoURL, tmpDir)
	if err := cloneCmd.Run(); err != nil {
		return nil, nil, err
	}
	elapsed := time.Since(startTime)
	fmt.Printf("Successfully cloned repository in %s\n", elapsed)

	startTime = time.Now()
	// Run git log with --numstat to get added/removed counts and file names
	cmd := exec.Command("git", "log",
		"--numstat",
		"--pretty=format:COMMIT:%H|%an|%at|%s",
	)
	cmd.Dir = tmpDir
	output, err := cmd.Output()
	if err != nil {
		return nil, nil, err
	}
	elapsed = time.Since(startTime)
	fmt.Printf("Successfully ran git log in %s\n", elapsed)

	// Parse the output into CommitStats and accumulate file touches
	var stats []CommitStats
	fileTouchCounts := make(map[string]int)
	lines := strings.Split(string(output), "\n")

	var currentCommit *CommitStats
	for _, line := range lines {
		if line == "" {
			continue
		}

		// Check if this is a commit header line (starts with COMMIT:)
		if strings.HasPrefix(line, "COMMIT:") {
			// Save previous commit if exists
			if currentCommit != nil {
				stats = append(stats, *currentCommit)
			}

			// Parse new commit header: COMMIT:hash|author|timestamp|message
			commitLine := strings.TrimPrefix(line, "COMMIT:")
			parts := strings.SplitN(commitLine, "|", 4)
			if len(parts) == 4 {
				// Parse Unix timestamp
				timestamp, err := strconv.ParseInt(parts[2], 10, 64)
				if err != nil {
					// If timestamp parsing fails, use current time as fallback
					timestamp = time.Now().Unix()
				}
				date := time.Unix(timestamp, 0)
				currentCommit = &CommitStats{
					Hash:              parts[0],
					Author:            parts[1],
					Date:              date,
					Message:           parts[3],
					Added:             0,
					Removed:           0,
					FilesTouchedCount: 0,
				}
			}
		} else if currentCommit != nil {
			// Git uses tabs to separate fields: added\tremoved\tfilename
			// Can be "-" for binary files or when no data available
			tabFields := strings.Split(line, "\t")

			if len(tabFields) >= 3 {
				// This is a numstat line: added\tremoved\tfilename
				addedStr := tabFields[0]
				removedStr := tabFields[1]
				fileName := tabFields[2]

				// Parse added/removed counts (can be "-" for binary files)
				added := 0
				removed := 0
				if addedStr != "-" {
					if parsed, err := strconv.Atoi(addedStr); err == nil {
						added = parsed
					}
				}
				if removedStr != "-" {
					if parsed, err := strconv.Atoi(removedStr); err == nil {
						removed = parsed
					}
				}

				// Add to commit totals
				currentCommit.Added += added
				currentCommit.Removed += removed

				// Track file touches (count each file once per commit)
				if fileName != "" {
					currentCommit.FilesTouchedCount++
					fileTouchCounts[fileName]++
				}
			}
		}
	}

	// Don't forget the last commit
	if currentCommit != nil {
		stats = append(stats, *currentCommit)
	}

	return stats, fileTouchCounts, nil
}

func isNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	// honestly probably better way to handle
	// the api will usually return "exit status 128"
	return strings.Contains(errStr, "exit status 128") ||
		strings.Contains(errStr, "Repository not found") ||
		strings.Contains(errStr, "fatal: repository") ||
		strings.Contains(errStr, "remote: Repository not found")
}
