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
UPDATE users SET approved = COALESCE(approved, TRUE);
UPDATE users SET disabled = COALESCE(disabled, TRUE);

-- แสดงผลลัพธ์ตรวจสอบ
SELECT id, name, email, role, approved, disabled, created_at, last_login FROM users ORDER BY id;

-- อนุมัติผู้ใช้โดยใช้ ID
UPDATE users SET approved = TRUE WHERE id = 1;

-- อนุมัติผู้ใช้โดยใช้ email
UPDATE users SET approved = TRUE WHERE email = 'user@example.com';

-- อนุมัติหลายคนพร้อมกัน
UPDATE users SET approved = TRUE WHERE id IN (1, 2, 3);

-- ยกเลิกการอนุมัติผู้ใช้
UPDATE users SET approved = FALSE WHERE id = 1;

-- ดูผู้ใช้ที่รออนุมัติ
SELECT id, name, email, role, created_at FROM users WHERE approved = FALSE;

-- ดูผู้ใช้ที่อนุมัติแล้ว
SELECT id, name, email, role, approved, created_at FROM users WHERE approved = TRUE;

-- ดูสถานะทั้งหมด
SELECT id, name, email, role, approved, disabled, created_at FROM users ORDER BY created_at DESC;

--อนุมัติและเปิดใช้งานผู้ใช้
UPDATE users SET approved = TRUE, disabled = FALSE WHERE id = 1;