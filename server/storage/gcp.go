package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/storage"
)

var (
	client     *storage.Client
	bucketName string
	ctx        context.Context
)

// Init initializes the GCP storage client
func Init() error {
	bucketName = os.Getenv("GCP_BUCKET_NAME")
	if bucketName == "" {
		return fmt.Errorf("GCP_BUCKET_NAME environment variable not set")
	}

	ctx = context.Background()

	// This automatically handles authentication:
	// - Locally: reads GOOGLE_APPLICATION_CREDENTIALS env var
	// - Cloud Run: uses attached service account automatically
	var err error
	client, err = storage.NewClient(ctx)
	if err != nil {
		return fmt.Errorf("failed to create storage client: %w", err)
	}

	log.Printf("GCP Storage initialized with bucket: %s", bucketName)
	return nil
}

// Close closes the storage client
func Close() error {
	if client != nil {
		return client.Close()
	}
	return nil
}

// CacheKey generates a cache key for a repository
func CacheKey(username, repo string) string {
	return fmt.Sprintf("cache/%s_%s.json", strings.ToLower(username), strings.ToLower(repo))
}

// GetFromCache retrieves cached analysis data from GCP Storage
func GetFromCache(username, repo string) (map[string]interface{}, error) {
	if client == nil {
		return nil, fmt.Errorf("storage client not initialized")
	}

	start := time.Now()
	key := CacheKey(username, repo)

	bucket := client.Bucket(bucketName)
	obj := bucket.Object(key)

	// Check if object exists and get metadata
	attrs, err := obj.Attrs(ctx)
	if err != nil {
		if err == storage.ErrObjectNotExist {
			log.Printf("[CACHE] Cache miss for %s/%s (took %v)", username, repo, time.Since(start))
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get object attributes: %w", err)
	}

	// Check if cache is expired (older than 24 hours)
	if time.Since(attrs.Updated) > 24*time.Hour {
		log.Printf("[CACHE] Cache expired for %s/%s, age: %v", username, repo, time.Since(attrs.Updated))
		// Delete expired cache in background
		go func() {
			if err := obj.Delete(context.Background()); err != nil {
				log.Printf("[CACHE] Failed to delete expired cache: %v", err)
			}
		}()
		return nil, nil
	}

	// Read the cached data
	reader, err := obj.NewReader(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create reader: %w", err)
	}
	defer reader.Close()

	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read cached data: %w", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal cached data: %w", err)
	}

	log.Printf("[CACHE] Cache hit for %s/%s! (took %v, cached %v ago)",
		username, repo, time.Since(start), time.Since(attrs.Updated))

	return result, nil
}

// StoreInCache stores analysis data in GCP Storage cache
func StoreInCache(username, repo string, data map[string]interface{}) error {
	if client == nil {
		return fmt.Errorf("storage client not initialized")
	}

	start := time.Now()
	key := CacheKey(username, repo)

	// Marshal data to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %w", err)
	}

	bucket := client.Bucket(bucketName)
	obj := bucket.Object(key)
	writer := obj.NewWriter(ctx)

	// Set metadata
	writer.ContentType = "application/json"
	writer.Metadata = map[string]string{
		"username":  username,
		"repo":      repo,
		"cached_at": time.Now().Format(time.RFC3339),
	}

	// Write data
	if _, err := writer.Write(jsonData); err != nil {
		writer.Close()
		return fmt.Errorf("failed to write data: %w", err)
	}

	if err := writer.Close(); err != nil {
		return fmt.Errorf("failed to close writer: %w", err)
	}

	log.Printf("[CACHE] Successfully cached %s/%s (took %v, size: %.2f KB)",
		username, repo, time.Since(start), float64(len(jsonData))/1024)

	return nil
}

// ClearCache removes cached data for a specific repository
func ClearCache(username, repo string) error {
	if client == nil {
		return fmt.Errorf("storage client not initialized")
	}

	key := CacheKey(username, repo)

	bucket := client.Bucket(bucketName)
	obj := bucket.Object(key)

	if err := obj.Delete(ctx); err != nil {
		if err == storage.ErrObjectNotExist {
			log.Printf("[CACHE] No cache to clear for %s/%s", username, repo)
			return nil
		}
		return fmt.Errorf("failed to delete cache: %w", err)
	}

	log.Printf("[CACHE] Cleared cache for %s/%s", username, repo)
	return nil
}
