-- ===================================
-- Chat History System with Login
-- Database Schema for PostgreSQL
-- ===================================

-- ===================================
-- 1. ตาราง users สำหรับระบบ Login
-- ===================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- ในการใช้งานจริงควรเก็บเป็น hash ด้วย bcrypt
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- 2. ตาราง chat_sessions สำหรับเก็บประวัติการสนทนา
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
-- 3. ตาราง chat_messages สำหรับเก็บข้อความในการสนทนา
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
-- 4. Indexes สำหรับเพิ่มประสิทธิภาพ
-- ===================================

-- Index สำหรับการค้นหา users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index สำหรับค้นหา sessions ของ user
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- Index สำหรับค้นหา messages ใน session
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Full-text search index สำหรับค้นหาข้อความ
CREATE INDEX IF NOT EXISTS idx_chat_sessions_title_search ON chat_sessions USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_search ON chat_messages USING GIN (to_tsvector('english', content));

-- ===================================
-- 5. Functions และ Triggers
-- ===================================

-- Function สำหรับอัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger สำหรับ users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger สำหรับ chat_sessions table
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 6. ข้อมูลทดสอบ (ลบออกในการใช้งานจริง)
-- ===================================

-- สร้าง user ทดสอบ
-- INSERT INTO users (name, email, password) 
-- VALUES ('Test User', 'test@example.com', 'password123');

-- สร้าง chat session ทดสอบ
-- INSERT INTO chat_sessions (id, user_id, title, preview, message_count)
-- VALUES ('chat_test_001', 1, 'Test Chat', 'This is a test chat', 2);

-- สร้าง messages ทดสอบ
-- INSERT INTO chat_messages (session_id, role, content)
-- VALUES 
--   ('chat_test_001', 'user', 'Hello, AI!'),
--   ('chat_test_001', 'assistant', 'Hello! How can I help you today?');

-- ===================================
-- 7. Queries ที่มีประโยชน์
-- ===================================

-- ดูจำนวน sessions ของแต่ละ user
-- SELECT 
--     u.id, u.name, u.email, 
--     COUNT(cs.id) as session_count,
--     SUM(cs.message_count) as total_messages
-- FROM users u
-- LEFT JOIN chat_sessions cs ON u.id = cs.user_id
-- GROUP BY u.id, u.name, u.email
-- ORDER BY session_count DESC;

-- ดู sessions ล่าสุด
-- SELECT 
--     cs.id, cs.title, cs.message_count, 
--     cs.created_at, cs.updated_at,
--     u.name as user_name, u.email as user_email
-- FROM chat_sessions cs
-- JOIN users u ON cs.user_id = u.id
-- ORDER BY cs.updated_at DESC
-- LIMIT 10;

-- ค้นหา sessions ที่มีคำว่า "test"
-- SELECT 
--     cs.id, cs.title, cs.preview, cs.updated_at
-- FROM chat_sessions cs
-- WHERE 
--     to_tsvector('english', cs.title) @@ to_tsquery('english', 'test')
--     OR to_tsvector('english', cs.preview) @@ to_tsquery('english', 'test')
-- ORDER BY cs.updated_at DESC;

-- ดูข้อความทั้งหมดใน session
-- SELECT 
--     cm.id, cm.role, cm.content, cm.created_at
-- FROM chat_messages cm
-- WHERE cm.session_id = 'chat_test_001'
-- ORDER BY cm.created_at ASC;

-- ลบ sessions ที่เก่ากว่า 30 วัน
-- DELETE FROM chat_sessions 
-- WHERE updated_at < NOW() - INTERVAL '30 days';

-- ===================================
-- 8. Cleanup และ Maintenance
-- ===================================

-- ลบ sessions ที่ไม่มี messages
-- DELETE FROM chat_sessions 
-- WHERE message_count = 0 AND created_at < NOW() - INTERVAL '1 day';

-- Vacuum และ Analyze เพื่อ optimize database
-- VACUUM ANALYZE users;
-- VACUUM ANALYZE chat_sessions;
-- VACUUM ANALYZE chat_messages;

-- ===================================
-- สรุป Schema
-- ===================================
-- 
-- users                    -- เก็บข้อมูลผู้ใช้
-- ├── id (PK)
-- ├── name
-- ├── email (UNIQUE)
-- ├── password
-- ├── created_at
-- ├── last_login
-- └── updated_at
--
-- chat_sessions            -- เก็บประวัติการสนทนา
-- ├── id (PK)
-- ├── user_id (FK -> users.id)
-- ├── title
-- ├── preview
-- ├── message_count
-- ├── created_at
-- └── updated_at
--
-- chat_messages            -- เก็บข้อความ
-- ├── id (PK)
-- ├── session_id (FK -> chat_sessions.id)
-- ├── role (user|assistant|system)
-- ├── content
-- ├── images
-- ├── charts
-- ├── tables
-- ├── code_blocks
-- └── created_at
