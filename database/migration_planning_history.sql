-- ===================================
-- ตาราง planning_history สำหรับเก็บประวัติการวางแผน (RAG/Planning API)
-- ใช้กับ PostgreSQL
-- ===================================

CREATE TABLE IF NOT EXISTS planning_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) REFERENCES chat_sessions(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    selected_tool VARCHAR(100),
    query TEXT NOT NULL,
    files TEXT[],
    response TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planning_history_session_id ON planning_history(session_id);
CREATE INDEX IF NOT EXISTS idx_planning_history_user_id ON planning_history(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_history_created_at ON planning_history(created_at DESC);
