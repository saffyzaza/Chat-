# ระบบ Login - คู่มือการตั้งค่า

## 📋 ขั้นตอนการติดตั้ง

### 1. ติดตั้ง PostgreSQL
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS (ใช้ Homebrew)
brew install postgresql

# หรือใช้ Docker
docker run --name chatdb-postgres -e POSTGRES_PASSWORD=your_password -p 5432:5432 -d postgres
```

### 2. สร้าง Database และ Table
```bash
# เข้าสู่ PostgreSQL
sudo -u postgres psql

# สร้าง database
CREATE DATABASE chatdb;

# เชื่อมต่อกับ database
\c chatdb

# รัน SQL script
\i /path/to/database/schema.sql
```

หรือใช้ pgAdmin:
1. เปิด pgAdmin
2. สร้าง Database ชื่อ `chatdb`
3. เปิด Query Tool
4. Copy SQL จากไฟล์ `database/schema.sql` แล้ววาง
5. กด Execute (F5)

### 3. ตั้งค่า Environment Variables
แก้ไขไฟล์ `.env.local` ตามการตั้งค่า PostgreSQL ของคุณ:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatdb
DB_USER=postgres
DB_PASSWORD=your_password
```

### 4. ติดตั้ง Dependencies (ทำแล้ว)
```bash
npm install pg @types/pg bcrypt @types/bcrypt
```

### 5. เริ่มใช้งาน
```bash
npm run dev
```

## 🎯 คุณสมบัติ

### ✅ ที่ทำแล้ว
- ✅ Login Popup สวยงาม responsive
- ✅ ระบบ Register (สมัครสมาชิก)
- ✅ ระบบ Login (เข้าสู่ระบบ)
- ✅ ระบบ Logout (ออกจากระบบ)
- ✅ แสดงข้อมูล User ใน Sidebar
- ✅ เชื่อมต่อกับ PostgreSQL ผ่าน API
- ✅ เก็บข้อมูล User ใน localStorage
- ✅ Validation ข้อมูล
- ✅ แสดง Error message

### 🔜 ควรเพิ่มเติม (สำหรับ Production)
- 🔐 เข้ารหัสรหัสผ่านด้วย bcrypt
- 🎫 ใช้ JWT Token แทน Simple Token
- 🔒 Middleware สำหรับตรวจสอบ Authentication
- 📧 ยืนยันอีเมล
- 🔑 Reset Password
- 👤 แก้ไขข้อมูลส่วนตัว
- 🖼️ อัพโหลดรูปโปรไฟล์

## 📁 โครงสร้างไฟล์

```
app/
├── components/
│   ├── Sidebar.tsx (เพิ่ม Login UI)
│   └── auth/
│       └── LoginPopup.tsx (Popup Login/Register)
├── api/
│   └── auth/
│       ├── login/route.ts (API Login)
│       ├── register/route.ts (API Register)
│       └── logout/route.ts (API Logout)
database/
└── schema.sql (SQL สำหรับสร้างตาราง)
.env.local (ตั้งค่า Database)
```

## 🔧 การใช้งาน API

### Login
```typescript
POST /api/auth/login
Body: {
  "email": "user@example.com",
  "password": "password123"
}
```

### Register
```typescript
POST /api/auth/register
Body: {
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}
```

### Logout
```typescript
POST /api/auth/logout
```

## 🐛 การแก้ปัญหา

### ไม่สามารถเชื่อมต่อ PostgreSQL
1. ตรวจสอบว่า PostgreSQL กำลังทำงานอยู่
```bash
sudo systemctl status postgresql
```

2. ตรวจสอบ `.env.local` ว่าถูกต้อง

3. ตรวจสอบ Firewall ว่าเปิด port 5432

### Error "Cannot find module 'pg'"
```bash
npm install pg @types/pg
```

### Table users does not exist
รัน SQL script ใน `database/schema.sql` ใน pgAdmin หรือ psql

## 🔐 Security Note
⚠️ **สำคัญ**: ในการใช้งานจริง ควร:
1. เข้ารหัสรหัสผ่านด้วย bcrypt
2. ใช้ JWT Token แทน Simple Token
3. ใช้ HTTPS
4. Validate input ให้ดีกว่านี้
5. ป้องกัน SQL Injection (ใช้ parameterized queries)
