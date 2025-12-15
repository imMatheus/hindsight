package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
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

	stats, err := cloneRepo(fmt.Sprintf("https://github.com/%s/%s.git", req.Username, req.Repo))
	if err != nil {
		fmt.Println(err)
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

	return c.JSON(fiber.Map{
		"message":           "Analysis completed",
		"totalAdded":        totalAdded,
		"totalRemoved":      totalRemoved,
		"totalContributors": totalContributors,
		"stats":             stats,
	})
}

type CommitStats struct {
	Hash    string    `json:"hash"`
	Author  string    `json:"author"`
	Date    time.Time `json:"date"`
	Added   int       `json:"added"`
	Removed int       `json:"removed"`
	Message string    `json:"message"`
}

func cloneRepo(repoURL string) ([]CommitStats, error) {
	// 1. Create temp dir
	tmpDir, err := os.MkdirTemp("", "repo-analysis-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(tmpDir)

	cloneCmd := exec.Command("git", "clone", "--bare", "--single-branch", repoURL, tmpDir)
	if err := cloneCmd.Run(); err != nil {
		return nil, err
	}

	cmd := exec.Command("git", "log", "--numstat", "--pretty=format:%H|%an|%ad|%s", "--date=iso")
	cmd.Dir = tmpDir
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	// Parse the output into CommitStats
	var stats []CommitStats
	lines := strings.Split(string(output), "\n")

	var currentCommit *CommitStats
	for _, line := range lines {
		if line == "" {
			continue
		}

		// Check if this is a commit header line (contains |)
		if strings.Contains(line, "|") {
			// Save previous commit if exists
			if currentCommit != nil {
				stats = append(stats, *currentCommit)
			}

			// Parse new commit header: hash|author|date|message
			parts := strings.SplitN(line, "|", 4)
			if len(parts) == 4 {
				date, _ := time.Parse("2006-01-02 15:04:05 -0700", parts[2])
				currentCommit = &CommitStats{
					Hash:    parts[0],
					Author:  parts[1],
					Date:    date,
					Message: parts[3],
					Added:   0,
					Removed: 0,
				}
			}
		} else if currentCommit != nil {
			// Parse numstat line: added\tremoved\tfilename
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				added, _ := strconv.Atoi(fields[0])
				removed, _ := strconv.Atoi(fields[1])
				currentCommit.Added += added
				currentCommit.Removed += removed
			}
		}
	}

	// Don't forget the last commit
	if currentCommit != nil {
		stats = append(stats, *currentCommit)
	}

	return stats, nil
}
