-- ===================================
-- ตาราง users สำหรับระบบ Login
-- ===================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- ในการใช้งานจริงควรเก็บเป็น hash
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง index สำหรับการค้นหา
CREATE INDEX idx_users_email ON users(email);

-- ===================================
-- ตาราง chat_sessions สำหรับเก็บประวัติการสนทนา
-- ===================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    preview TEXT,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- ตาราง chat_messages สำหรับเก็บข้อความในการสนทนา
-- ===================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    images TEXT[], -- เก็บ array ของ image URLs
    charts JSONB, -- เก็บข้อมูล charts เป็น JSON
    tables JSONB, -- เก็บข้อมูล tables เป็น JSON
    code_blocks JSONB, -- เก็บ code blocks เป็น JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- Indexes สำหรับเพิ่มประสิทธิภาพ
-- ===================================
-- Index สำหรับค้นหา sessions ของ user
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- Index สำหรับค้นหา messages ใน session
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Full-text search index สำหรับค้นหาข้อความ
CREATE INDEX idx_chat_sessions_title_search ON chat_sessions USING GIN (to_tsvector('english', title));
CREATE INDEX idx_chat_messages_content_search ON chat_messages USING GIN (to_tsvector('english', content));

-- ===================================
-- Function สำหรับอัปเดต updated_at อัตโนมัติ
-- ===================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger สำหรับ users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger สำหรับ chat_sessions table
CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- ข้อมูลทดสอบ (ลบออกในการใช้งานจริง)
-- ===================================
-- INSERT INTO users (name, email, password) 
-- VALUES ('Test User', 'test@example.com', 'password123');

-- INSERT INTO chat_sessions (id, user_id, title, preview, message_count)
-- VALUES ('chat_test_001', 1, 'Test Chat', 'This is a test chat', 2);

-- INSERT INTO chat_messages (session_id, role, content)
-- VALUES 
--   ('chat_test_001', 'user', 'Hello, AI!'),
--   ('chat_test_001', 'assistant', 'Hello! How can I help you today?');
