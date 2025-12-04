-- ===================================
-- Migration: เพิ่ม role column ใน users table
-- วันที่: 4 ธันวาคม 2025
-- ===================================

-- เพิ่ม role column ถ้ายังไม่มี
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user'));
        RAISE NOTICE 'Added role column to users table';
    ELSE
        RAISE NOTICE 'Role column already exists';
    END IF;
END $$;

-- อัปเดต users ที่มีอยู่ให้มี role เป็น 'user'
UPDATE users SET role = 'user' WHERE role IS NULL;

-- แสดงผลลัพธ์
SELECT 
    id, 
    name, 
    email, 
    role,
    created_at 
FROM users 
ORDER BY id;

-- ===================================
-- สร้าง admin user ตัวอย่าง (ถ้าต้องการ)
-- ===================================
-- INSERT INTO users (name, email, password, role) 
-- VALUES ('Admin User', 'admin@example.com', 'admin123', 'admin')
-- ON CONFLICT (email) DO NOTHING;

-- ===================================
-- คำสั่งที่มีประโยชน์
-- ===================================

-- ดู users ทั้งหมดพร้อม role
-- SELECT id, name, email, role, created_at, last_login FROM users;

-- เปลี่ยน user เป็น admin
-- UPDATE users SET role = 'admin' WHERE email = 'user@example.com';

-- เปลี่ยน admin เป็น user
-- UPDATE users SET role = 'user' WHERE email = 'admin@example.com';

-- นับจำนวน users แต่ละ role
-- SELECT role, COUNT(*) as count FROM users GROUP BY role;
