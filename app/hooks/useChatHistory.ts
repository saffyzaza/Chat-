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
  generatePreview,
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
  const loadSessions = useCallback(() => {
    setIsLoading(true);
    try {
      const allSessions = getAllChatSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // สร้าง session ใหม่
  const createNewSession = useCallback((firstMessage: string): string => {
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
    
    saveChatSession(newSession);
    setCurrentSessionId(sessionId);
    loadSessions();
    
    return sessionId;
  }, [loadSessions]);

  // เพิ่มข้อความลงใน session
  const addMessageToSession = useCallback((
    sessionId: string,
    message: ChatMessage
  ) => {
    const session = getChatSession(sessionId);
    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }

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

    saveChatSession(session);
    loadSessions();
  }, [loadSessions]);

  // โหลด session เดียว
  const loadSession = useCallback((sessionId: string) => {
    const session = getChatSession(sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      return session;
    }
    return null;
  }, []);

  // ลบ session
  const deleteSession = useCallback((sessionId: string) => {
    deleteChatSession(sessionId);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
    loadSessions();
  }, [currentSessionId, loadSessions]);

  // ลบหลาย sessions
  const deleteSessions = useCallback((sessionIds: string[]) => {
    deleteMultipleSessions(sessionIds);
    if (currentSessionId && sessionIds.includes(currentSessionId)) {
      setCurrentSessionId(null);
    }
    loadSessions();
  }, [currentSessionId, loadSessions]);

  // อัปเดตชื่อ session
  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    updateSessionTitle(sessionId, newTitle);
    loadSessions();
  }, [loadSessions]);

  // ล้างประวัติทั้งหมด
  const clearHistory = useCallback(() => {
    clearAllSessions();
    setCurrentSessionId(null);
    loadSessions();
  }, [loadSessions]);

  // ค้นหา sessions
  const search = useCallback((query: string) => {
    const results = searchSessions(query);
    setSessions(results);
  }, []);

  // กรองตามวันที่
  const filterByDate = useCallback((filter: 'all' | 'today' | 'week' | 'month') => {
    const allSessions = getAllChatSessions();
    const filtered = filterSessionsByDate(allSessions, filter);
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
    addMessageToSession,
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
