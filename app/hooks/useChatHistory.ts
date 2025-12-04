'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChatSession,
  ChatMessage,
  getAllChatSessions,
  saveChatSession,
  deleteChatSession,
  deleteMultipleSessions,
  updateSessionTitle,
  clearAllSessions,
  generateSessionId,
  generateSessionTitle,
  addMessageToSession,
  searchSessions,
  filterSessionsByDate,
  getChatSession
} from '../utils/chatStorage';

export const useChatHistory = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // โหลดประวัติเมื่อ component mount
  useEffect(() => {
    loadSessions();
  }, []);

  // โหลดประวัติทั้งหมด
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const allSessions = await getAllChatSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // สร้าง session ใหม่
  const createNewSession = useCallback(async (firstMessage: string): Promise<string> => {
    const sessionId = generateSessionId();
    const title = generateSessionTitle(firstMessage);
    
    const newSession: ChatSession = {
      id: sessionId,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      preview: ''
    };
    
    await saveChatSession(newSession);
    setCurrentSessionId(sessionId);
    await loadSessions();
    
    return sessionId;
  }, [loadSessions]);

  // เพิ่มข้อความลงใน session
  const addMessage = useCallback(async (
    sessionId: string,
    message: ChatMessage
  ) => {
    try {
      // เพิ่ม timestamp ถ้ายังไม่มี
      const messageWithTimestamp: ChatMessage = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      };

      await addMessageToSession(sessionId, messageWithTimestamp);
      await loadSessions();
    } catch (error) {
      console.error('Error adding message:', error instanceof Error ? error.message : String(error));
      throw error; // Re-throw เพื่อให้ UI จัดการได้
    }
  }, [loadSessions]);

  // โหลด session เดียว
  const loadSession = useCallback(async (sessionId: string) => {
    const session = await getChatSession(sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      return session;
    }
    return null;
  }, []);

  // ลบ session
  const deleteSession = useCallback(async (sessionId: string) => {
    await deleteChatSession(sessionId);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
    await loadSessions();
  }, [currentSessionId, loadSessions]);

  // ลบหลาย sessions
  const deleteSessions = useCallback(async (sessionIds: string[]) => {
    await deleteMultipleSessions(sessionIds);
    if (currentSessionId && sessionIds.includes(currentSessionId)) {
      setCurrentSessionId(null);
    }
    await loadSessions();
  }, [currentSessionId, loadSessions]);

  // อัปเดตชื่อ session
  const renameSession = useCallback(async (sessionId: string, newTitle: string) => {
    await updateSessionTitle(sessionId, newTitle);
    await loadSessions();
  }, [loadSessions]);

  // ล้างประวัติทั้งหมด
  const clearHistory = useCallback(async () => {
    await clearAllSessions();
    setCurrentSessionId(null);
    await loadSessions();
  }, [loadSessions]);

  // ค้นหา sessions
  const search = useCallback(async (query: string) => {
    const results = await searchSessions(query);
    setSessions(results);
  }, []);

  // กรองตามวันที่
  const filterByDate = useCallback(async (filter: 'all' | 'today' | 'week' | 'month') => {
    const filtered = await filterSessionsByDate(filter);
    setSessions(filtered);
  }, []);

  // รีเซ็ตการค้นหา/กรอง
  const resetFilter = useCallback(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    currentSessionId,
    isLoading,
    createNewSession,
    addMessageToSession: addMessage,
    loadSession,
    deleteSession,
    deleteSessions,
    renameSession,
    clearHistory,
    search,
    filterByDate,
    resetFilter,
    loadSessions
  };
};
