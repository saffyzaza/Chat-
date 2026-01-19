-- ===================================
-- Migration: Create file_apa_metadata table
-- Stores file metadata and APA JSON extracted by AI
-- ===================================

CREATE TABLE IF NOT EXISTS file_apa_metadata (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(512) NOT NULL,
    file_path VARCHAR(1024) NOT NULL, -- logical folder path from UI
    mime_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT,
    apa_json JSONB, -- APA-formatted metadata JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_file_apa_metadata_file_name ON file_apa_metadata(file_name);
CREATE INDEX IF NOT EXISTS idx_file_apa_metadata_created_at ON file_apa_metadata(created_at DESC);
