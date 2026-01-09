/**
 * chatStorage.ts - จัดการ PostgreSQL API สำหรับประวัติการสนทนา
 * รองรับทั้ง localStorage (สำหรับ guest) และ PostgreSQL (สำหรับ user ที่ login)
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  charts?: any[];
  tables?: any[];
  codeBlocks?: Array<{ code: string; language: string }>;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string; // ตัวอย่างข้อความแรก
}

const STORAGE_KEY = 'chat_history';
const MAX_SESSIONS = 100; // จำกัดจำนวน session สูงสุดสำหรับ localStorage

/**
 * ตรวจสอบว่า user login หรือไม่
 */
const getCurrentUserId = (): number | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
    return user.id || null;
  } catch {
    return null;
  }
};

/**
 * ดึงประวัติการสนทนาทั้งหมด (จาก PostgreSQL หรือ localStorage)
 */
export const getAllChatSessions = async (filter?: string, search?: string): Promise<ChatSession[]> => {
  if (typeof window === 'undefined') return [];
  
  const userId = getCurrentUserId();
  
  // ถ้า user login แล้ว ใช้ PostgreSQL
  if (userId) {
    try {
      const params = new URLSearchParams({ userId: userId.toString() });
      if (filter) params.append('filter', filter);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/chat/sessions?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        return data.sessions || [];
      }
      console.error('Error from API:', data.message);
    } catch (error) {
      console.error('Error fetching sessions from API:', error);
    }
  }
  
  // Fallback: ใช้ localStorage สำหรับ guest
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const sessions: ChatSession[] = JSON.parse(stored);
    
    // กรองและค้นหา
    let filtered = sessions;
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(lowerSearch) ||
        s.preview.toLowerCase().includes(lowerSearch)
      );
    }
    
    if (filter && filter !== 'all') {
      const now = new Date();
      let filterDate = new Date();
      
      switch (filter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(s => new Date(s.updatedAt) >= filterDate);
    }
    
    // เรียงตาม updatedAt จากใหม่ไปเก่า
    return filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Error loading chat sessions from localStorage:', error);
    return [];
  }
};

/**
 * บันทึก session ใหม่ (PostgreSQL หรือ localStorage)
 */
export const saveChatSession = async (session: ChatSession): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  const userId = getCurrentUserId();
  
  // ถ้า user login แล้ว ใช้ PostgreSQL
  if (userId) {
    try {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          userId,
          title: session.title,
          preview: session.preview
        })
      });
      
      if (response.ok) return;
      console.error('Error saving session to API');
    } catch (error) {
      console.error('Error saving session to API:', error);
    }
  }
  
  // Fallback: ใช้ localStorage
  try {
    const sessions = await getAllChatSessions();
    
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session);
      
      if (sessions.length > MAX_SESSIONS) {
        sessions.splice(MAX_SESSIONS);
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving chat session to localStorage:', error);
  }
};

/**
 * ดึง session เดียวจาก ID (จาก PostgreSQL หรือ localStorage)
 */
export const getChatSession = async (id: string): Promise<ChatSession | null> => {
  if (typeof window === 'undefined') return null;
  
  const userId = getCurrentUserId();
  
  // ถ้า user login แล้ว ใช้ PostgreSQL
  if (userId) {
    try {
      const response = await fetch(`/api/chat/sessions/${id}`);
      const data = await response.json();
      
      if (response.ok && data.session) {
        return data.session;
      }
    } catch (error) {
      console.error('Error fetching session from API:', error);
    }
  }
  
  // Fallback: ใช้ localStorage
  const sessions = await getAllChatSessions();
  return sessions.find(s => s.id === id) || null;
};

/**
 * ลบ session (จาก PostgreSQL หรือ localStorage)
 */
export const deleteChatSession = async (id: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  const userId = getCurrentUserId();
  
  // ถ้า user login แล้ว ใช้ PostgreSQL
  if (userId) {
    try {
      const response = await fetch(`/api/chat/sessions/${id}?userId=${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) return;
      console.error('Error deleting session from API');
    } catch (error) {
      console.error('Error deleting session from API:', error);
    }
  }
  
  // Fallback: ใช้ localStorage
  try {
    const sessions = await getAllChatSessions();
    const filtered = sessions.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting chat session from localStorage:', error);
  }
};

/**
 * ลบหลาย sessions พร้อมกัน (จาก PostgreSQL หรือ localStorage)
 */
export const deleteMultipleSessions = async (ids: string[]): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  const userId = getCurrentUserId();
  
  // ถ้า user login แล้ว ใช้ PostgreSQL
  if (userId) {
    try {
      const response = await fetch(
        `/api/chat/sessions?ids=${ids.join(',')}&userId=${userId}`,
        { method: 'DELETE' }
      );
      
      if (response.ok) return;
      console.error('Error deleting sessions from API');
    } catch (error) {
      console.error('Error deleting sessions from API:', error);
    }
  }
  
  // Fallback: ใช้ localStorage
  try {
    const sessions = await getAllChatSessions();
    const filtered = sessions.filter(s => !ids.includes(s.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting multiple sessions from localStorage:', error);
  }
};

/**
 * อัปเดตชื่อ session (PostgreSQL หรือ localStorage)
 */
export const updateSessionTitle = async (id: string, newTitle: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  const userId = getCurrentUserId();
  
  // ถ้า user login แล้ว ใช้ PostgreSQL
  if (userId) {
    try {
      const response = await fetch(`/api/chat/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      
      if (response.ok) return;
      console.error('Error updating session title in API');
    } catch (error) {
      console.error('Error updating session title in API:', error);
    }
  }
  
  // Fallback: ใช้ localStorage
  try {
    const sessions = await getAllChatSessions();
    const sessionIndex = sessions.findIndex(s => s.id === id);
    
    if (sessionIndex >= 0) {
      sessions[sessionIndex].title = newTitle;
      sessions[sessionIndex].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('Error updating session title in localStorage:', error);
  }
};

/**
 * ล้างประวัติทั้งหมด (PostgreSQL หรือ localStorage)
 */
export const clearAllSessions = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  const userId = getCurrentUserId();
  
  // ถ้า user login แล้ว ลบจาก PostgreSQL
  if (userId) {
    try {
      const sessions = await getAllChatSessions();
      const ids = sessions.map(s => s.id);
      
      if (ids.length > 0) {
        await deleteMultipleSessions(ids);
      }
      return;
    } catch (error) {
      console.error('Error clearing sessions from API:', error);
    }
  }
  
  // Fallback: ใช้ localStorage
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing sessions from localStorage:', error);
  }
};

/**
 * สร้าง session ID ใหม่
 */
export const generateSessionId = (): string => {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * สร้างชื่อ session อัตโนมัติจากข้อความแรก
 */
export const generateSessionTitle = (firstMessage: string): string => {
  // ตัดข้อความให้เหลือ 50 ตัวอักษร
  const maxLength = 50;
  if (firstMessage.length <= maxLength) {
    return firstMessage;
  }
  return firstMessage.substring(0, maxLength) + '...';
};

/**
 * สร้าง preview จากข้อความล่าสุด
 */
export const generatePreview = (messages: ChatMessage[]): string => {
  // หา message ล่าสุดที่ไม่ใช่ system
  const lastMessage = [...messages]
    .reverse()
    .find(m => m.role !== 'system');
  
  if (!lastMessage) return '';
  
  const maxLength = 100;
  const content = lastMessage.content;
  
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '...';
};

/**
 * ค้นหา sessions (ใช้ getAllChatSessions ที่รองรับ search แล้ว)
 */
export const searchSessions = async (query: string): Promise<ChatSession[]> => {
  return getAllChatSessions(undefined, query);
};

/**
 * กรอง sessions ตามช่วงเวลา (ใช้ getAllChatSessions ที่รองรับ filter แล้ว)
 */
export const filterSessionsByDate = async (
  filter: 'all' | 'today' | 'week' | 'month'
): Promise<ChatSession[]> => {
  return getAllChatSessions(filter);
};

/**
 * เพิ่มข้อความใน session (PostgreSQL หรือ localStorage)
 */
export const addMessageToSession = async (
  sessionId: string,
  message: ChatMessage
): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  const userId = getCurrentUserId();
  
  // ถ้า user login แล้ว ใช้ PostgreSQL
  if (userId) {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: message.role,
          content: message.content,
          images: message.images,
          charts: message.charts,
          tables: message.tables,
          codeBlocks: message.codeBlocks
        })
      });
      
      if (response.ok) return;
      
      // แสดง error details (รองรับ JSON หรือ text)
      const contentType = response.headers.get('content-type') || '';
      let errorPayload: any = null;
      let errorText: string | null = null;
      try {
        if (contentType.includes('application/json')) {
          errorPayload = await response.json();
        } else {
          errorText = await response.text();
        }
      } catch {
        // ignore parse errors
      }

      const detail = {
        status: response.status,
        statusText: response.statusText,
        ...(errorPayload ? { error: errorPayload } : {}),
        ...(errorText ? { errorText } : {})
      };

      // ใช้ stringify เพื่อหลีกเลี่ยงการแสดงผลเป็น {}
      console.error('Error adding message to API:', JSON.stringify(detail, null, 2));

      const messageHint =
        (errorPayload && (errorPayload.message || errorPayload.error)) ||
        (errorText ? errorText : '');

      throw new Error(
        `Failed to add message: ${response.status} ${response.statusText}${messageHint ? ` - ${messageHint}` : ''}`
      );
    } catch (error) {
      console.error('Error adding message to API:', error instanceof Error ? error.message : String(error));
      throw error; // Re-throw เพื่อให้ caller จัดการได้
    }
  }
  
  // Fallback: ใช้ localStorage
  try {
    const sessions = await getAllChatSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex >= 0) {
      const session = sessions[sessionIndex];
      
      // เพิ่ม timestamp ถ้ายังไม่มี
      const messageWithTimestamp: ChatMessage = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      };
      
      session.messages.push(messageWithTimestamp);
      session.messageCount = session.messages.filter(m => m.role !== 'system').length;
      session.updatedAt = new Date().toISOString();
      session.preview = generatePreview(session.messages);
      
      // อัปเดตชื่อถ้ายังเป็นค่าเริ่มต้น และมีข้อความแรกจาก user
      if (session.messages.length === 1 && message.role === 'user') {
        session.title = generateSessionTitle(message.content);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('Error adding message to localStorage:', error);
  }
};
