-- ===================================
-- Insert Admin User: alongkorn
-- ===================================

-- เพิ่ม admin user
INSERT INTO users (name, email, password, role, created_at) 
VALUES (
    'alongkorn',
    'alongkorn@gmail.com',
    '0804200929saf',
    'admin',
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
    role = 'admin',
    updated_at = NOW();

-- ตรวจสอบว่าเพิ่มสำเร็จ
SELECT id, name, email, role, created_at, last_login 
FROM users 
WHERE email = 'alongkorn@gmail.com';

-- ===================================
-- หมายเหตุ:
-- - รหัสผ่านในตัวอย่างนี้เป็น plain text
-- - ในการใช้งานจริงควร hash รหัสผ่านด้วย bcrypt
-- - ใช้ ON CONFLICT เพื่ออัปเดต role เป็น admin ถ้า email มีอยู่แล้ว
-- ===================================
