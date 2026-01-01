package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"time"

	_ "github.com/lib/pq"
)

var db *sql.DB

func Init(dsn string) error {
	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(time.Hour)

	log.Printf("Database connection established")

	go func() {
		_, err := db.Exec(`
			ALTER TABLE repos 
			ADD COLUMN IF NOT EXISTS last_cached_at timestamp;
		`)
		if err != nil {
			log.Printf("Failed to run migration for 'last_cached_at' column: %v", err)
		}
	}()
	return nil
}

func Close() error {
	if db != nil {
		return db.Close()
	}
	return nil
}

type RepoData struct {
	Username       string     `json:"username"`
	RepoName       string     `json:"repoName"`
	TotalAdditions int        `json:"totalAdditions"`
	TotalLines     int        `json:"totalLines"`
	TotalRemovals  int        `json:"totalRemovals"`
	Views          int        `json:"views"`
	LinesHistogram []int      `json:"linesHistogram"` // 10 data points showing LOC over time
	TotalStars     int        `json:"totalStars"`
	TotalCommits   int        `json:"totalCommits"`
	Language       string     `json:"language"`
	Size           int        `json:"size"`
	LastCachedAt   *time.Time `json:"lastCachedAt,omitempty"`
}

// we do this weird json names to minify the payload size, its small but it matters at scale
type CommitStats struct {
	Hash              string `json:"h"`
	Author            string `json:"a"`
	Date              int64  `json:"d"`
	Added             int    `json:"+,omitempty"`
	Removed           int    `json:"-,omitempty"`
	Message           string `json:"m,omitempty"`
	FilesTouchedCount int    `json:"f,omitempty"`
}

func SaveRepo(data RepoData) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	histogramJSON, err := json.Marshal(data.LinesHistogram)
	if err != nil {
		return fmt.Errorf("failed to marshal histogram: %w", err)
	}

	// PostgreSQL upsert using ON CONFLICT
	query := `
		INSERT INTO repos (
			username, 
			repo_name, 
			total_additions, 
			total_lines, 
			total_removals, 
			views, 
			lines_histogram,
			total_stars,
			total_commits,
			language,
			size_kb,
			last_cached_at,
			updated_at
		) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9, $10, $11, NOW())
		ON CONFLICT (username, repo_name) 
		DO UPDATE SET
			total_additions = EXCLUDED.total_additions,
			total_lines = EXCLUDED.total_lines,
			total_removals = EXCLUDED.total_removals,
			lines_histogram = EXCLUDED.lines_histogram,
			total_stars = EXCLUDED.total_stars,
			total_commits = EXCLUDED.total_commits,
			language = EXCLUDED.language,
			size_kb = EXCLUDED.size_kb,
			last_cached_at = EXCLUDED.last_cached_at,
			updated_at = NOW()
	`

	_, err = db.Exec(
		query,
		data.Username,
		data.RepoName,
		data.TotalAdditions,
		data.TotalLines,
		data.TotalRemovals,
		string(histogramJSON),
		data.TotalStars,
		data.TotalCommits,
		data.Language,
		data.Size,
		data.LastCachedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to save repo: %w", err)
	}

	log.Printf("Saved repo data for %s/%s to database", data.Username, data.RepoName)
	return nil
}

func IncrementViews(username, repoName string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	query := `
		UPDATE repos 
		SET views = views + 1 
		WHERE username = $1 AND repo_name = $2
	`

	result, err := db.Exec(query, username, repoName)
	if err != nil {
		return fmt.Errorf("failed to increment views: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		log.Printf("No repo found to increment views: %s/%s", username, repoName)
	}

	return nil
}

func GetRepo(username, repoName string) (*RepoData, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT username, repo_name, total_additions, total_lines, total_removals, lines_histogram
		FROM repos
		WHERE username = $1 AND repo_name = $2
	`

	var data RepoData
	var histogramJSON string

	err := db.QueryRow(query, username, repoName).Scan(
		&data.Username,
		&data.RepoName,
		&data.TotalAdditions,
		&data.TotalLines,
		&data.TotalRemovals,
		&histogramJSON,
	)

	if err == sql.ErrNoRows {
		return nil, nil // Not found
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get repo: %w", err)
	}

	// Parse histogram JSON
	if err := json.Unmarshal([]byte(histogramJSON), &data.LinesHistogram); err != nil {
		return nil, fmt.Errorf("failed to unmarshal histogram: %w", err)
	}

	return &data, nil
}

func GetTopRepos() ([]RepoData, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `
		SELECT username, repo_name, total_additions, total_lines, total_removals, views, lines_histogram, total_stars, total_commits
		FROM repos
		WHERE repo_name != 'linux'
		AND total_lines > 0
		AND total_commits > 1
		ORDER BY total_lines DESC
		LIMIT 100
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query top repos: %w", err)
	}
	defer rows.Close()

	var repos []RepoData
	for rows.Next() {
		var data RepoData
		var histogramJSON string

		err := rows.Scan(
			&data.Username,
			&data.RepoName,
			&data.TotalAdditions,
			&data.TotalLines,
			&data.TotalRemovals,
			&data.Views,
			&histogramJSON,
			&data.TotalStars,
			&data.TotalCommits,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan repo row: %w", err)
		}

		// Parse histogram JSON
		if err := json.Unmarshal([]byte(histogramJSON), &data.LinesHistogram); err != nil {
			return nil, fmt.Errorf("failed to unmarshal histogram: %w", err)
		}

		repos = append(repos, data)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return repos, nil
}

func CalculateLinesHistogram(commits []CommitStats, points int) []int {
	if len(commits) == 0 {
		return make([]int, points)
	}

	// Sort commits by date (oldest first)
	sortedCommits := make([]CommitStats, len(commits))
	copy(sortedCommits, commits)
	sort.Slice(sortedCommits, func(i, j int) bool {
		return sortedCommits[i].Date < sortedCommits[j].Date
	})

	histogram := make([]int, points)
	commitsPerBucket := len(sortedCommits) / points
	if commitsPerBucket == 0 {
		commitsPerBucket = 1
	}

	totalLines := 0
	bucketIndex := 0

	for i, commit := range sortedCommits {
		totalLines += commit.Added - commit.Removed

		// Save snapshot at each bucket boundary
		if (i+1)%commitsPerBucket == 0 && bucketIndex < points {
			histogram[bucketIndex] = totalLines
			bucketIndex++
		}
	}

	// Fill remaining buckets with final total
	for i := bucketIndex; i < points; i++ {
		histogram[i] = totalLines
	}

	return histogram
}

func UpdateLastCachedAt(username, repoName string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	query := `
		UPDATE repos 
		SET last_cached_at = NOW() 
		WHERE username = $1 AND repo_name = $2
	`

	result, err := db.Exec(query, username, repoName)
	if err != nil {
		return fmt.Errorf("failed to update last cached timestamp: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		log.Printf("No repo found to update cache timestamp: %s/%s", username, repoName)
	} else {
		log.Printf("Updated cache timestamp for %s/%s", username, repoName)
	}

	return nil
}
