# Chat History System - localStorage

ระบบจัดการประวัติการสนทนาด้วย localStorage สำหรับ AI Chat Application

## 📁 โครงสร้างไฟล์

```
app/
├── utils/
│   └── chatStorage.ts          # ฟังก์ชันจัดการ localStorage
├── hooks/
│   └── useChatHistory.ts       # Custom hook สำหรับ chat history
├── components/
│   └── chat/
│       └── ChatInterface.tsx   # อัปเดตให้บันทึกประวัติ
└── history_chat/
    └── page.tsx                # หน้าแสดงประวัติการสนทนา
```

## ✨ ฟีเจอร์

### 1. **การบันทึกอัตโนมัติ**
- ✅ บันทึกทุกข้อความ (user + AI) ลง localStorage
- ✅ สร้าง session ID อัตโนมัติ
- ✅ สร้างชื่อ session จากข้อความแรก
- ✅ อัปเดต timestamp และ preview

### 2. **การจัดการ Session**
- ✅ สร้าง session ใหม่
- ✅ โหลด session เก่า
- ✅ ลบ session
- ✅ ลบหลาย sessions พร้อมกัน
- ✅ เปลี่ยนชื่อ session
- ✅ ล้างประวัติทั้งหมด

### 3. **การค้นหาและกรอง**
- ✅ ค้นหาตามชื่อ
- ✅ ค้นหาตาม preview
- ✅ ค้นหาในเนื้อหาข้อความ
- ✅ กรองตามวันที่ (today, week, month, all)

### 4. **UI Features**
- ✅ แสดงรายการ chats
- ✅ เลือกหลาย chats พร้อมกัน
- ✅ Context menu (⋯) สำหรับแต่ละ chat
- ✅ Search bar แบบ real-time
- ✅ Loading states
- ✅ Empty states

## 🚀 วิธีใช้งาน

### 1. สร้าง Chat ใหม่
```typescript
// ใน ChatInterface.tsx
const { createNewSession, addMessageToSession } = useChatHistory();

// สร้าง session ใหม่
const sessionId = createNewSession("ข้อความแรก");

// เพิ่มข้อความ
addMessageToSession(sessionId, {
  role: 'user',
  content: 'สวัสดี',
  timestamp: new Date().toISOString()
});
```

### 2. โหลดประวัติ
```typescript
// ใน history_chat/page.tsx
const { sessions, isLoading, loadSessions } = useChatHistory();

useEffect(() => {
  loadSessions();
}, []);
```

### 3. ค้นหา
```typescript
const { search } = useChatHistory();

search("คำค้นหา"); // ค้นหาใน title, preview, และ messages
```

### 4. ลบ Session
```typescript
const { deleteSession, deleteSessions } = useChatHistory();

// ลบ 1 session
deleteSession('session_id');

// ลบหลาย sessions
deleteSessions(['id1', 'id2', 'id3']);
```

## 📊 โครงสร้างข้อมูล

### ChatMessage
```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  charts?: any[];
  tables?: any[];
  codeBlocks?: Array<{ code: string; language: string }>;
  timestamp: string;
}
```

### ChatSession
```typescript
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}
```

## 💾 localStorage Structure

**Key:** `chat_history`

**Value:** Array of ChatSession objects

```json
[
  {
    "id": "chat_1700000000000_abc123",
    "title": "วิธีลดความเครียด",
    "messages": [
      {
        "role": "user",
        "content": "วิธีลดความเครียดมีอะไรบ้าง",
        "timestamp": "2025-11-17T10:30:00.000Z"
      },
      {
        "role": "assistant",
        "content": "มีหลายวิธีครับ...",
        "timestamp": "2025-11-17T10:30:05.000Z"
      }
    ],
    "createdAt": "2025-11-17T10:30:00.000Z",
    "updatedAt": "2025-11-17T10:35:00.000Z",
    "messageCount": 4,
    "preview": "มีหลายวิธีครับ..."
  }
]
```

## 🔧 ฟังก์ชันหลัก (chatStorage.ts)

| ฟังก์ชัน | คำอธิบาย |
|---------|---------|
| `getAllChatSessions()` | ดึงประวัติทั้งหมด |
| `saveChatSession(session)` | บันทึก session |
| `getChatSession(id)` | ดึง session เดียว |
| `deleteChatSession(id)` | ลบ session |
| `deleteMultipleSessions(ids)` | ลบหลาย sessions |
| `updateSessionTitle(id, title)` | เปลี่ยนชื่อ |
| `clearAllSessions()` | ล้างทั้งหมด |
| `generateSessionId()` | สร้าง ID ใหม่ |
| `generateSessionTitle(text)` | สร้างชื่ออัตโนมัติ |
| `generatePreview(messages)` | สร้าง preview |
| `searchSessions(query)` | ค้นหา |
| `filterSessionsByDate(sessions, filter)` | กรองตามวันที่ |

## 🎯 Hook Methods (useChatHistory)

| Method | คำอธิบาย |
|--------|---------|
| `sessions` | รายการ sessions ทั้งหมด |
| `currentSessionId` | Session ID ปัจจุบัน |
| `isLoading` | สถานะกำลังโหลด |
| `createNewSession(message)` | สร้าง session ใหม่ |
| `addMessageToSession(id, message)` | เพิ่มข้อความ |
| `loadSession(id)` | โหลด session |
| `deleteSession(id)` | ลบ session |
| `deleteSessions(ids)` | ลบหลาย sessions |
| `renameSession(id, title)` | เปลี่ยนชื่อ |
| `clearHistory()` | ล้างทั้งหมด |
| `search(query)` | ค้นหา |
| `filterByDate(filter)` | กรองตามวันที่ |
| `resetFilter()` | รีเซ็ตการกรอง |

## 📱 Navigation Flow

```
หน้าแรก (/)
  ↓ พิมพ์ข้อความ
  ↓ สร้าง session อัตโนมัติ
  ↓ บันทึกลง localStorage
  ↓
หน้า History (/history_chat)
  ↓ คลิกเลือก chat
  ↓ redirect กลับหน้าแรก
  ↓ โหลด session เดิม
```

## ⚙️ Configuration

### ตั้งค่าใน chatStorage.ts
```typescript
const STORAGE_KEY = 'chat_history';  // ชื่อ key ใน localStorage
const MAX_SESSIONS = 100;            // จำนวน session สูงสุด
```

## 🐛 Error Handling

ระบบมีการจัดการ error ในทุกฟังก์ชัน:
```typescript
try {
  // ทำงาน
} catch (error) {
  console.error('Error:', error);
  // ไม่ให้ app crash
}
```

## 🔐 Data Persistence

- ✅ ข้อมูลเก็บใน browser localStorage
- ✅ ไม่หายแม้ปิด browser
- ✅ จำกัดที่ ~5-10MB (ขึ้นกับ browser)
- ⚠️ ถ้า clear browser data จะหายทั้งหมด

## 📝 To-Do / Future Features

- [ ] Export chat เป็น PDF/TXT
- [ ] Import/Export ประวัติ
- [ ] Star/Pin chats สำคัญ
- [ ] Tags/Categories
- [ ] Cloud sync (optional)
- [ ] Search ขั้นสูง (regex, filters)
- [ ] แบ่งประเภท chats (work, personal, etc.)

## 🎨 UI Customization

สามารถปรับแต่ง UI ได้ที่:
- `history_chat/page.tsx` - หน้าแสดงประวัติ
- Tailwind CSS classes
- Dark mode support

## 💡 Tips

1. **Performance:** ถ้ามี sessions เยอะ (~100+) อาจจะช้า ควรใช้ pagination
2. **Storage:** ตรวจสอบขนาด localStorage ด้วย `localStorage.length`
3. **Backup:** แนะนำให้ export ข้อมูลสำคัญสำรองไว้
4. **Testing:** ทดสอบใน Incognito mode เพื่อดู fresh state

## 🔗 Related Files

- `app/components/chat/ChatInterface.tsx` - Main chat component
- `app/components/chat/chatMessage/MessageList.tsx` - Message display
- `app/history_chat/page.tsx` - History page
- `app/utils/chatStorage.ts` - Storage utilities
- `app/hooks/useChatHistory.ts` - React hook

---

Made with ❤️ for สสส. Health Promotion Chatbot
