CREATE TABLE repos (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    repo_name VARCHAR(255) NOT NULL,
    total_additions INTEGER NOT NULL DEFAULT 0,
    total_lines INTEGER NOT NULL DEFAULT 0,
    total_removals INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    lines_histogram JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_repo UNIQUE (username, repo_name)
);

CREATE INDEX idx_username_repo_name ON repos(username, repo_name);
CREATE INDEX idx_views ON repos(views);
CREATE INDEX idx_updated_at ON repos(updated_at);