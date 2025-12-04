# 📚 คู่มือการใช้งาน Chat History Database

## 🎯 ภาพรวม
ระบบนี้เก็บประวัติการสนทนาใน PostgreSQL พร้อมระบบ Login
- ✅ รองรับ Guest (localStorage) และ User ที่ login (PostgreSQL)
- ✅ Auto-sync เมื่อ login/logout
- ✅ Full-text search
- ✅ API Routes พร้อมใช้งาน

## 🚀 วิธีติดตั้ง

### 1. สร้าง Database
```bash
# เข้าสู่ PostgreSQL
sudo -u postgres psql

# สร้าง database
CREATE DATABASE "chat-aio";

# เชื่อมต่อกับ database
\c chat-aio

# รัน SQL script
\i /path/to/database/complete_schema.sql
```

หรือใช้ pgAdmin:
1. เปิด pgAdmin
2. สร้าง Database ชื่อ `chat-aio`
3. เปิด Query Tool
4. Copy SQL จากไฟล์ `database/complete_schema.sql` แล้วรัน

### 2. ตรวจสอบการติดตั้ง
```sql
-- ตรวจสอบว่าตารางถูกสร้างแล้ว
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- ควรเห็น: users, chat_sessions, chat_messages

-- ตรวจสอบ indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
```

### 3. ตั้งค่า Environment
ไฟล์ `.env.local`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat-aio
DB_USER=postgres
DB_PASSWORD=1234
```

## 📊 โครงสร้าง Database

### ตาราง `users`
เก็บข้อมูลผู้ใช้ที่ login
```sql
id          SERIAL PRIMARY KEY
name        VARCHAR(255) NOT NULL
email       VARCHAR(255) UNIQUE NOT NULL
password    VARCHAR(255) NOT NULL
created_at  TIMESTAMP
last_login  TIMESTAMP
updated_at  TIMESTAMP
```

### ตาราง `chat_sessions`
เก็บประวัติการสนทนา
```sql
id              VARCHAR(100) PRIMARY KEY
user_id         INTEGER (FK -> users.id)
title           VARCHAR(500) NOT NULL
preview         TEXT
message_count   INTEGER DEFAULT 0
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### ตาราง `chat_messages`
เก็บข้อความในแต่ละ session
```sql
id              SERIAL PRIMARY KEY
session_id      VARCHAR(100) (FK -> chat_sessions.id)
role            VARCHAR(20) (user|assistant|system)
content         TEXT NOT NULL
images          TEXT[] -- Array of URLs
charts          JSONB -- Chart data
tables          JSONB -- Table data
code_blocks     JSONB -- Code blocks
created_at      TIMESTAMP
```

## 🔌 API Endpoints

### Sessions API

#### GET `/api/chat/sessions`
ดึงรายการ sessions ทั้งหมด
```typescript
// Query Parameters
?userId=1              // กรองตาม user
?filter=today          // กรองตามเวลา (all|today|week|month)
?search=keyword        // ค้นหา

// Response
{
  sessions: [
    {
      id: "chat_xxx",
      title: "Session title",
      preview: "Preview text...",
      messageCount: 5,
      createdAt: "2025-12-04T...",
      updatedAt: "2025-12-04T...",
      messages: []
    }
  ]
}
```

#### POST `/api/chat/sessions`
สร้าง session ใหม่
```typescript
// Request Body
{
  sessionId: "chat_xxx",
  userId: 1,              // optional
  title: "Session title",
  preview: "Preview..."   // optional
}

// Response
{
  message: "สร้าง session สำเร็จ",
  session: { ... }
}
```

#### DELETE `/api/chat/sessions?ids=id1,id2&userId=1`
ลบหลาย sessions
```typescript
// Response
{
  message: "ลบ 2 sessions สำเร็จ",
  deletedCount: 2
}
```

### Single Session API

#### GET `/api/chat/sessions/[id]`
ดึงข้อมูล session พร้อม messages
```typescript
// Response
{
  session: {
    id: "chat_xxx",
    userId: 1,
    title: "Session title",
    messages: [
      {
        role: "user",
        content: "Hello",
        timestamp: "2025-12-04T..."
      }
    ]
  }
}
```

#### PUT `/api/chat/sessions/[id]`
อัปเดตชื่อหรือ preview
```typescript
// Request Body
{
  title: "New title",
  preview: "New preview"
}
```

#### DELETE `/api/chat/sessions/[id]?userId=1`
ลบ session

### Messages API

#### GET `/api/chat/sessions/[id]/messages`
ดึง messages ทั้งหมดใน session
```typescript
// Response
{
  messages: [...]
}
```

#### POST `/api/chat/sessions/[id]/messages`
เพิ่มข้อความใหม่
```typescript
// Request Body
{
  role: "user",           // user|assistant|system
  content: "Message text",
  images: ["url1"],       // optional
  charts: [...],          // optional
  tables: [...],          // optional
  codeBlocks: [...]       // optional
}

// Response
{
  message: "เพิ่มข้อความสำเร็จ",
  chatMessage: { ... }
}
```

## 💻 วิธีใช้งานใน Code

### Hook: useChatHistory

```typescript
import { useChatHistory } from '@/app/hooks/useChatHistory';

function MyComponent() {
  const {
    sessions,           // รายการ sessions
    currentSessionId,   // session ที่เปิดอยู่
    isLoading,          // สถานะการโหลด
    createNewSession,   // สร้าง session ใหม่
    addMessageToSession,// เพิ่มข้อความ
    loadSession,        // โหลด session
    deleteSession,      // ลบ session
    deleteSessions,     // ลบหลาย sessions
    renameSession,      // เปลี่ยนชื่อ
    clearHistory,       // ลบทั้งหมด
    search,             // ค้นหา
    filterByDate,       // กรองตามวันที่
    loadSessions        // โหลดใหม่
  } = useChatHistory();

  // ตัวอย่างการใช้งาน
  const handleNewChat = async () => {
    const sessionId = await createNewSession("First message");
    console.log('New session:', sessionId);
  };

  const handleSendMessage = async (sessionId: string) => {
    await addMessageToSession(sessionId, {
      role: 'user',
      content: 'Hello!',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div>
      {sessions.map(session => (
        <div key={session.id}>{session.title}</div>
      ))}
    </div>
  );
}
```

### Storage Functions

```typescript
import {
  getAllChatSessions,
  getChatSession,
  saveChatSession,
  deleteChatSession,
  updateSessionTitle,
  addMessageToSession
} from '@/app/utils/chatStorage';

// ดึง sessions ทั้งหมด
const sessions = await getAllChatSessions();

// ค้นหา
const results = await getAllChatSessions(undefined, 'keyword');

// กรองตามวันที่
const todaySessions = await getAllChatSessions('today');

// ดึง session เดียว
const session = await getChatSession('chat_xxx');

// เพิ่มข้อความ
await addMessageToSession('chat_xxx', {
  role: 'user',
  content: 'Hello',
  timestamp: new Date().toISOString()
});
```

## 🔍 Queries ที่มีประโยชน์

### ดูสถิติการใช้งาน
```sql
SELECT 
    u.id, u.name, u.email, 
    COUNT(cs.id) as session_count,
    SUM(cs.message_count) as total_messages
FROM users u
LEFT JOIN chat_sessions cs ON u.id = cs.user_id
GROUP BY u.id, u.name, u.email
ORDER BY session_count DESC;
```

### ดู sessions ล่าสุด
```sql
SELECT 
    cs.id, cs.title, cs.message_count, 
    cs.created_at, cs.updated_at,
    u.name as user_name
FROM chat_sessions cs
JOIN users u ON cs.user_id = u.id
ORDER BY cs.updated_at DESC
LIMIT 10;
```

### ค้นหาแบบ Full-text
```sql
SELECT cs.id, cs.title, cs.preview
FROM chat_sessions cs
WHERE 
    to_tsvector('english', cs.title) @@ to_tsquery('english', 'search & term')
ORDER BY cs.updated_at DESC;
```

### ลบข้อมูลเก่า
```sql
-- ลบ sessions ที่เก่ากว่า 30 วัน
DELETE FROM chat_sessions 
WHERE updated_at < NOW() - INTERVAL '30 days';

-- ลบ sessions ที่ไม่มี messages
DELETE FROM chat_sessions 
WHERE message_count = 0 
AND created_at < NOW() - INTERVAL '1 day';
```

## 🔧 Maintenance

### Optimize Database
```sql
-- Vacuum และ Analyze
VACUUM ANALYZE users;
VACUUM ANALYZE chat_sessions;
VACUUM ANALYZE chat_messages;

-- ตรวจสอบขนาด tables
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Backup
```bash
# Backup database
pg_dump -U postgres chat-aio > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres chat-aio < backup_20251204.sql
```

## 🐛 Troubleshooting

### ไม่สามารถเชื่อมต่อ Database
```sql
-- ตรวจสอบว่า PostgreSQL ทำงานอยู่
SELECT version();

-- ตรวจสอบ connections
SELECT * FROM pg_stat_activity 
WHERE datname = 'chat-aio';
```

### Session ไม่ถูกบันทึก
1. ตรวจสอบว่า user login แล้ว (`getCurrentUserId()`)
2. ตรวจสอบ console log ใน browser
3. ตรวจสอบ API response ใน Network tab

### Messages ไม่แสดง
```sql
-- ตรวจสอบว่ามี messages ใน database
SELECT session_id, COUNT(*) as msg_count
FROM chat_messages
GROUP BY session_id;

-- ตรวจสอบ session ที่มีปัญหา
SELECT * FROM chat_messages 
WHERE session_id = 'your_session_id'
ORDER BY created_at;
```

## 📚 Resources
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [node-postgres](https://node-postgres.com/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
