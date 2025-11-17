/**
 * chatStorage.ts - จัดการ localStorage สำหรับประวัติการสนทนา
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
const MAX_SESSIONS = 100; // จำกัดจำนวน session สูงสุด

/**
 * ดึงประวัติการสนทนาทั้งหมดจาก localStorage
 */
export const getAllChatSessions = (): ChatSession[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const sessions: ChatSession[] = JSON.parse(stored);
    // เรียงตาม updatedAt จากใหม่ไปเก่า
    return sessions.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Error loading chat sessions:', error);
    return [];
  }
};

/**
 * บันทึก session ใหม่
 */
export const saveChatSession = (session: ChatSession): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const sessions = getAllChatSessions();
    
    // ตรวจสอบว่ามี session นี้อยู่แล้วหรือไม่
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      // อัปเดต session เดิม
      sessions[existingIndex] = session;
    } else {
      // เพิ่ม session ใหม่
      sessions.unshift(session);
      
      // จำกัดจำนวน sessions
      if (sessions.length > MAX_SESSIONS) {
        sessions.splice(MAX_SESSIONS);
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving chat session:', error);
  }
};

/**
 * ดึง session เดียวจาก ID
 */
export const getChatSession = (id: string): ChatSession | null => {
  const sessions = getAllChatSessions();
  return sessions.find(s => s.id === id) || null;
};

/**
 * ลบ session
 */
export const deleteChatSession = (id: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const sessions = getAllChatSessions();
    const filtered = sessions.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting chat session:', error);
  }
};

/**
 * ลบหลาย sessions พร้อมกัน
 */
export const deleteMultipleSessions = (ids: string[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const sessions = getAllChatSessions();
    const filtered = sessions.filter(s => !ids.includes(s.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting multiple sessions:', error);
  }
};

/**
 * อัปเดตชื่อ session
 */
export const updateSessionTitle = (id: string, newTitle: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const sessions = getAllChatSessions();
    const sessionIndex = sessions.findIndex(s => s.id === id);
    
    if (sessionIndex >= 0) {
      sessions[sessionIndex].title = newTitle;
      sessions[sessionIndex].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch (error) {
    console.error('Error updating session title:', error);
  }
};

/**
 * ล้างประวัติทั้งหมด
 */
export const clearAllSessions = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing sessions:', error);
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
 * ค้นหา sessions
 */
export const searchSessions = (query: string): ChatSession[] => {
  const sessions = getAllChatSessions();
  
  if (!query.trim()) return sessions;
  
  const lowerQuery = query.toLowerCase();
  
  return sessions.filter(session => {
    // ค้นหาในชื่อ
    if (session.title.toLowerCase().includes(lowerQuery)) return true;
    
    // ค้นหาใน preview
    if (session.preview.toLowerCase().includes(lowerQuery)) return true;
    
    // ค้นหาใน messages
    return session.messages.some(msg => 
      msg.content.toLowerCase().includes(lowerQuery)
    );
  });
};

/**
 * กรอง sessions ตามช่วงเวลา
 */
export const filterSessionsByDate = (
  sessions: ChatSession[],
  filter: 'all' | 'today' | 'week' | 'month'
): ChatSession[] => {
  if (filter === 'all') return sessions;
  
  const now = new Date();
  const filterDate = new Date();
  
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
  
  return sessions.filter(session => 
    new Date(session.updatedAt) >= filterDate
  );
};
