-- ===================================
-- Migration: เพิ่มสถานะการอนุมัติและปิดใช้งานให้ users
-- วันที่: 16 มกราคม 2026
-- ===================================

-- เพิ่มคอลัมน์ approved และ disabled ถ้ายังไม่มี
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='approved'
    ) THEN
        ALTER TABLE users ADD COLUMN approved BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added approved column to users table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='disabled'
    ) THEN
        ALTER TABLE users ADD COLUMN disabled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added disabled column to users table';
    END IF;
END $$;

-- สร้างดัชนีเพื่อการค้นหา/กรองที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);
CREATE INDEX IF NOT EXISTS idx_users_disabled ON users(disabled);

-- ค่าเริ่มต้น: ผู้ใช้ทั้งหมดถือว่าไม่ถูกอนุมัติและไม่ถูกปิดใช้งาน
UPDATE users SET approved = COALESCE(approved, FALSE);
UPDATE users SET disabled = COALESCE(disabled, FALSE);

-- แสดงผลลัพธ์ตรวจสอบ
SELECT id, name, email, role, approved, disabled, created_at, last_login FROM users ORDER BY id;
