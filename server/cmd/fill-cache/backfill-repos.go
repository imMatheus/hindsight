package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"sync"
	"time"

	database "github.com/immatheus/gitback/databases"
	"github.com/joho/godotenv"
)

type AnalyzeRequest struct {
	Username string `json:"username"`
	Repo     string `json:"repo"`
}

type AnalyzeResponse struct {
	Message           string `json:"message"`
	TotalAdded        int    `json:"totalAdded"`
	TotalRemoved      int    `json:"totalRemoved"`
	TotalContributors int    `json:"totalContributors"`
}

type RepoInfo struct {
	Username string
	Repo     string
}

type RequestResult struct {
	Repo     string
	Duration time.Duration
	Success  bool
	Error    string
}

func fetchAllReposFromDB() ([]RepoInfo, error) {
	if err := database.Init(os.Getenv("DATABASE_URL")); err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}
	defer database.Close()

	repos, err := database.GetTopRepos()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch repos from database: %w", err)
	}

	var repoInfos []RepoInfo
	for _, repo := range repos {
		repoInfos = append(repoInfos, RepoInfo{
			Username: repo.Username,
			Repo:     repo.RepoName,
		})
	}

	return repoInfos, nil
}

func mergeAndDeduplicateRepos(dbRepos []RepoInfo, hardcodedRepos []struct {
	Username string
	Repo     string
}) []struct {
	Username string
	Repo     string
} {
	// Create a map to track unique repos
	repoMap := make(map[string]struct {
		Username string
		Repo     string
	})

	// Add all hardcoded repos first
	for _, repo := range hardcodedRepos {
		key := fmt.Sprintf("%s/%s", repo.Username, repo.Repo)
		repoMap[key] = repo
	}

	// Add DB repos, overwriting if they already exist (hardcoded takes precedence)
	for _, repo := range dbRepos {
		key := fmt.Sprintf("%s/%s", repo.Username, repo.Repo)
		if _, exists := repoMap[key]; !exists {
			repoMap[key] = struct {
				Username string
				Repo     string
			}{
				Username: repo.Username,
				Repo:     repo.Repo,
			}
		}
	}

	// Convert back to slice
	var mergedRepos []struct {
		Username string
		Repo     string
	}
	for _, repo := range repoMap {
		mergedRepos = append(mergedRepos, repo)
	}

	return mergedRepos
}

func main() {
	// Load environment variables
	godotenv.Load()

	// Get API URL from environment or use default
	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:8080"
	}

	// Fetch all repos from database
	log.Printf("Fetching existing repositories from database...")
	dbRepos, err := fetchAllReposFromDB()
	if err != nil {
		log.Printf("Warning: Failed to fetch repos from database: %v", err)
		log.Printf("Continuing with only hardcoded repositories...")
		dbRepos = []RepoInfo{} // Use empty slice if DB fetch fails
	} else {
		log.Printf("Found %d repositories in database", len(dbRepos))
	}

	// List of popular GitHub repositories (hardcoded)
	hardcodedRepos := []struct {
		Username string
		Repo     string
	}{
		// {"immatheus", "css-subway-surfer"},
		// {"microsoft", "vscode"},
		// {"facebook", "react"},
		// {"mrdoob", "three.js"},
		// {"microsoft", "TypeScript"},
		// {"vercel", "next.js"},
		// {"kubernetes", "kubernetes"},
		// {"tensorflow", "tensorflow"},
		// {"golang", "go"},
		// {"rust-lang", "rust"},
		// {"nodejs", "node"},
		// {"pytorch", "pytorch"},
		// {"django", "django"},
		// {"ansible", "ansible"},
		// {"elastic", "elasticsearch"},
		// {"apache", "spark"},
		// {"rails", "rails"},
		// {"vuejs", "vue"},
		// {"angular", "angular"},
		// {"dotnet", "aspnetcore"},
		// {"docker", "compose"},
		// {"airbnb", "javascript"},
		// {"mui", "material-ui"},
		// {"axios", "axios"},
		// {"mrdoob", "three.js"},
		// {"lodash", "lodash"},
		// {"moment", "moment"},
		// {"chartjs", "Chart.js"},
		// {"spring-projects", "spring-boot"},
		// {"laravel", "laravel"},
		// {"expressjs", "express"},
		// {"nestjs", "nest"},
		// {"sveltejs", "svelte"},
		// {"nuxt", "nuxt"},
		// {"remix-run", "remix"},
		// {"fastapi", "fastapi"},
		// {"gin-gonic", "gin"},
		// {"gofiber", "fiber"},
		// {"torvalds", "linux"},
	}

	// Merge and deduplicate repos from DB and hardcoded list
	log.Printf("Merging %d database repos with %d hardcoded repos...", len(dbRepos), len(hardcodedRepos))
	repos := mergeAndDeduplicateRepos(dbRepos, hardcodedRepos)
	log.Printf("Final merged list contains %d unique repositories", len(repos))

	fmt.Printf("Filling cache with %d repositories (%d from DB + %d hardcoded, deduplicated)...\n",
		len(repos), len(dbRepos), len(hardcodedRepos))
	fmt.Printf("API URL: %s\n", apiURL)
	fmt.Printf("Running 8 worker threads for optimal throughput\n\n")

	client := &http.Client{
		Timeout: 10 * time.Minute, // Some repos might take a while
	}

	var (
		successCount int
		failCount    int
		results      []RequestResult
		mu           sync.Mutex
		wg           sync.WaitGroup
	)

	// Create channels for work distribution
	workChan := make(chan struct {
		index int
		repo  struct {
			Username string
			Repo     string
		}
	}, len(repos))

	// Fill the work channel with all repositories
	for i, repo := range repos {
		workChan <- struct {
			index int
			repo  struct {
				Username string
				Repo     string
			}
		}{
			index: i,
			repo:  repo,
		}
	}
	close(workChan) // Close channel to signal no more work

	// Start 8 worker goroutines
	numWorkers := 8
	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			for work := range workChan {
				fmt.Printf("[Worker %d] [%d/%d] Analyzing %s/%s...\n",
					workerID+1, work.index+1, len(repos), work.repo.Username, work.repo.Repo)

				reqBody := AnalyzeRequest{
					Username: work.repo.Username,
					Repo:     work.repo.Repo,
				}

				jsonData, err := json.Marshal(reqBody)
				if err != nil {
					log.Printf("[Worker %d] Error marshaling request: %v", workerID+1, err)
					mu.Lock()
					failCount++
					mu.Unlock()
					continue
				}

				req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/analyze", apiURL), bytes.NewBuffer(jsonData))
				if err != nil {
					log.Printf("[Worker %d] Error creating request: %v", workerID+1, err)
					mu.Lock()
					failCount++
					mu.Unlock()
					continue
				}

				req.Header.Set("Content-Type", "application/json")

				start := time.Now()
				resp, err := client.Do(req)
				duration := time.Since(start)
				repoName := fmt.Sprintf("%s/%s", work.repo.Username, work.repo.Repo)

				mu.Lock()
				if err != nil {
					log.Printf("[Worker %d] Error making request: %v", workerID+1, err)
					failCount++
					results = append(results, RequestResult{
						Repo:     repoName,
						Duration: duration,
						Success:  false,
						Error:    err.Error(),
					})
					mu.Unlock()
					continue
				}

				if resp.StatusCode == http.StatusOK {
					var result AnalyzeResponse
					successCount++
					results = append(results, RequestResult{
						Repo:     repoName,
						Duration: duration,
						Success:  true,
						Error:    "",
					})
					if err := json.NewDecoder(resp.Body).Decode(&result); err == nil {
						fmt.Printf("  ✓ Success! (%d lines, %d contributors) - %v\n",
							result.TotalAdded-result.TotalRemoved, result.TotalContributors, duration)
					} else {
						fmt.Printf("  ✓ Success! (cached or processing) - %v\n", duration)
					}
				} else if resp.StatusCode == http.StatusNotFound {
					fmt.Printf("  ✗ Repository not found (404)\n")
					failCount++
					results = append(results, RequestResult{
						Repo:     repoName,
						Duration: duration,
						Success:  false,
						Error:    "Repository not found (404)",
					})
				} else {
					fmt.Printf("  ✗ Failed with status %d - %v\n", resp.StatusCode, duration)
					failCount++
					results = append(results, RequestResult{
						Repo:     repoName,
						Duration: duration,
						Success:  false,
						Error:    fmt.Sprintf("HTTP status %d", resp.StatusCode),
					})
				}
				mu.Unlock()

				resp.Body.Close()
			}
		}(w)
	}

	// Wait for all workers to complete
	wg.Wait()

	// Sort results by duration (longest to shortest)
	sort.Slice(results, func(i, j int) bool {
		return results[i].Duration > results[j].Duration
	})

	fmt.Printf("\n=== Request Times (Longest to Fastest) ===\n")
	var totalDuration time.Duration
	for _, result := range results {
		status := "✓"
		if !result.Success {
			status = "✗"
		}
		fmt.Printf("%s %s - %v\n", status, result.Repo, result.Duration)
		totalDuration += result.Duration
	}

	// Calculate and log average
	var avgDuration time.Duration
	if len(results) > 0 {
		avgDuration = totalDuration / time.Duration(len(results))
	}
	fmt.Printf("\n=== Average Request Time ===\n")
	fmt.Printf("Average: %v\n", avgDuration)

	// Log failed requests
	fmt.Printf("\n=== Failed Requests ===\n")
	failedCount := 0
	for _, result := range results {
		if !result.Success {
			fmt.Printf("✗ %s - %s\n", result.Repo, result.Error)
			failedCount++
		}
	}
	if failedCount == 0 {
		fmt.Printf("No failed requests!\n")
	}

	fmt.Printf("\n=== Summary ===\n")
	fmt.Printf("Success: %d\n", successCount)
	fmt.Printf("Failed:  %d\n", failCount)
	fmt.Printf("Total:   %d\n", len(repos))
}
