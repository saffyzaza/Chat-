# User Role System Documentation

## Overview
ระบบ Role สำหรับจัดการสิทธิ์การเข้าถึงของผู้ใช้ในระบบ Chat Application

## Roles

### 1. User (ผู้ใช้งานทั่วไป)
- **สิทธิ์:**
  - สร้างและจัดการการสนทนาของตัวเอง
  - ดูประวัติการสนทนาของตัวเอง
  - แก้ไขและลบการสนทนาของตัวเอง
  - ใช้งานฟีเจอร์ AI Chat ได้ตามปกติ

- **ข้อจำกัด:**
  - ไม่สามารถดูหรือจัดการข้อมูลของผู้ใช้คนอื่น
  - ไม่มีสิทธิ์เข้าถึงส่วน Admin

### 2. Admin (ผู้ดูแลระบบ)
- **สิทธิ์ทั้งหมดของ User พร้อมกับ:**
  - ดูข้อมูลผู้ใช้ทั้งหมดในระบบ
  - จัดการสิทธิ์ผู้ใช้ (เปลี่ยน role)
  - ดูสถิติการใช้งานระบบ
  - จัดการเนื้อหาและการสนทนาของผู้ใช้อื่น (ถ้ามีการพัฒนาฟีเจอร์นี้)
  - เข้าถึงหน้า Admin Dashboard (ถ้ามีการพัฒนา)

## Database Schema

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Migration

### การอัปเดตฐานข้อมูลที่มีอยู่แล้ว
```bash
# เชื่อมต่อกับ PostgreSQL
psql -U postgres -d chatdb

# รัน migration script
\i database/migration_add_role.sql
```

### การสร้าง Admin User แรก
```sql
-- วิธีที่ 1: สร้าง user ใหม่เป็น admin
INSERT INTO users (name, email, password, role) 
VALUES ('Admin User', 'admin@example.com', 'admin123', 'admin');

-- วิธีที่ 2: เปลี่ยน user ที่มีอยู่แล้วเป็น admin
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

## API Response Format

### Login/Register Response
```json
{
  "message": "เข้าสู่ระบบสำเร็จ",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "Bearer ..."
}
```

## Frontend Usage

### 1. ตรวจสอบ Role ใน Component

```typescript
import { getCurrentUser, isAdmin, hasAdminAccess } from '@/app/utils/roleUtils';

// ดึงข้อมูล user
const user = getCurrentUser();

// ตรวจสอบว่าเป็น admin หรือไม่
if (isAdmin(user)) {
  // แสดงฟีเจอร์สำหรับ admin
}

// หรือใช้ hasAdminAccess()
if (hasAdminAccess()) {
  // แสดง admin menu
}
```

### 2. แสดง Role Badge

```typescript
{user.role === 'admin' && (
  <span className="px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded">
    ADMIN
  </span>
)}
```

### 3. Conditional Rendering ตาม Role

```typescript
import { hasAdminAccess } from '@/app/utils/roleUtils';

export const AdminPanel = () => {
  if (!hasAdminAccess()) {
    return <div>คุณไม่มีสิทธิ์เข้าถึงส่วนนี้</div>;
  }
  
  return (
    <div>
      {/* Admin content */}
    </div>
  );
};
```

## Backend Usage

### ตรวจสอบ Role ใน API Route

```typescript
// app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // ดึง user จาก token/session
  const user = await getUserFromToken(request);
  
  // ตรวจสอบ role
  if (user.role !== 'admin') {
    return NextResponse.json(
      { message: 'ไม่มีสิทธิ์เข้าถึง' },
      { status: 403 }
    );
  }
  
  // Admin logic here
  return NextResponse.json({ data: 'admin data' });
}
```

## Security Considerations

1. **ไม่เชื่อถือ role จาก client-side เพียงอย่างเดียว**
   - ตรวจสอบ role ที่ server-side เสมอ
   - ใช้ JWT หรือ session เพื่อยืนยันตัวตน

2. **Hash รหัสผ่าน**
   - ใช้ bcrypt สำหรับ hash password
   - ไม่เก็บรหัสผ่านเป็น plain text

3. **Validate Input**
   - ตรวจสอบ input ทุกครั้งก่อนเปลี่ยน role
   - จำกัดการเปลี่ยน role เฉพาะ admin เท่านั้น

4. **Audit Log**
   - บันทึกการเปลี่ยนแปลง role
   - ติดตามการกระทำของ admin

## Future Enhancements

1. **Additional Roles:**
   - `moderator` - ผู้ดูแลเนื้อหา
   - `premium` - ผู้ใช้พรีเมียม
   - `guest` - ผู้เยี่ยมชม

2. **Permissions System:**
   - Fine-grained permissions
   - Role-based access control (RBAC)

3. **Admin Dashboard:**
   - สถิติการใช้งาน
   - จัดการผู้ใช้
   - ดู logs

4. **Role Management UI:**
   - หน้าจัดการ role สำหรับ admin
   - เปลี่ยน role ผ่าน UI

## Testing

### ทดสอบ Role System

```sql
-- สร้าง test users
INSERT INTO users (name, email, password, role) VALUES
('Regular User', 'user@test.com', 'password', 'user'),
('Admin User', 'admin@test.com', 'password', 'admin');

-- ตรวจสอบ roles
SELECT id, name, email, role FROM users;

-- ทดสอบ constraint
-- ควรเกิด error
INSERT INTO users (name, email, password, role) 
VALUES ('Test', 'test@test.com', 'pass', 'invalid_role');
```

## Support

สำหรับคำถามเพิ่มเติมเกี่ยวกับ Role System:
- อ่าน code ใน `app/utils/roleUtils.ts`
- ดู API implementation ใน `app/api/auth/`
- ตรวจสอบ database schema ใน `database/schema.sql`
