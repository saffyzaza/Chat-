'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Message, MessageList } from './chatMessage/MessageList';
import { ChatInputArea } from './inputArea/ChatInputArea';
import { useChatHistory } from '../../hooks/useChatHistory';
import { PROMPT } from './promptchat';
import { PROMPT_PLAN } from './promptplan';
import { PROMPT_SEARCH } from './promptsearch';
import { PROMPT_COMPARE } from './promptcompare';
import { PROMPT_CONSULT } from './promptconsult';
import { PROMPT_SUMMARY } from './promptsummary';
import { PROMPT_CHART as PROMPT_CHART_DOC } from './promptchart_doc';
import { PROMPT_STEP_READ } from './promptstepRead';
import { PROMPTA } from './prompta';
import { PROMPTB } from './promptb';
import { PROMPTC } from './promptc';
import { getChatSession, saveChatSession } from '../../utils/chatStorage';
import { fetchWithAuth } from '@/app/utils/auth';
import { LoginPopup } from '../auth/LoginPopup';
import { ProjectPlan } from './chatMessage/ProjectPlan';

// --- System Prompt imported from promptchat.js ---
const SYSTEM_PROMPT = PROMPT;
const PLANNING_PROMPT = PROMPT_PLAN;

// --- Component ย่อย (คงไว้ในไฟล์นี้) ---
const SuggestionCard = ({ title, description, onClick }: { title: string, description: string, onClick?: () => void }) => (
  <div onClick={onClick} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-shadow border border-gray-100">
    <p className="font-semibold text-gray-700">{title}</p>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

const WelcomeScreen = ({ onSuggestionClick }: { onSuggestionClick: (prompt: string) => void }) => (
  <>
    <div className="w-full flex flex-col items-center justify-center text-center gap-4  min-h-[30vh]">
      <img src="https://s.imgz.io/2025/12/27/Logo-thaihealth149429a17bc1ae40.webp" alt="Logo" className="h-20" />
      <p className="text-xl font-semibold text-gray-600">
        สำนักงานกองทุนสนับสนุนการสร้างเสริมสุขภาพ
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-2">
      <SuggestionCard
        
        title="วิธีลดความเครียด"
        description="ค้นหาเทคนิคและกิจกรรมผ่อนคลาย"
        onClick={() => onSuggestionClick("วิธีลดความเครียดที่ทำได้จริงในชีวิตประจำวัน เป็นข้อๆ พร้อมตัวอย่างกิจกรรมและเวลาใช้ ไม่ต้องทักทาย เริ่มด้วยหัวข้อวิธีทันที")}
      />
      <SuggestionCard
        title="อาหารสุขภาพ"
        description="ไอเดียเมนูสำหรับคนทำงาน"
        onClick={() => onSuggestionClick("ไอเดียเมนูอาหารสุขภาพสำหรับคนทำงานที่มีเวลา จำกัด 5 เมนู ทำง่าย วัตถุดิบหาง่าย ระบุแคลอรี่คร่าวๆ ไม่ต้องทักทาย เริ่มด้วยรายการเมนูเลย")}
      />
      <SuggestionCard
        title="ออกกำลังกายที่บ้าน"
        description="แนะนำท่าง่ายๆ ไม่ต้องใช้อุปกรณ์"
        onClick={() => onSuggestionClick("ท่าออกกำลังกายง่ายๆ ที่ทำได้ที่บ้านโดยไม่ใช้อุปกรณ์ พร้อมตัวอย่างโปรแกรม 7 วันสำหรับมือใหม่ หลีกเลี่ยงการทักทาย ให้เริ่มตอบด้วยรายการท่าและท่าความปลอดภัยทันที")}
      />
      <SuggestionCard
        title="ปรึกษาการเลิกบุหรี่"
        description="ขั้นตอนและเคล็ดลับในการเลิก"
        onClick={() => onSuggestionClick("ขั้นตอนการเลิกบุหรี่แบบเป็นลำดับ พร้อมเทคนิครับมืออาการอยากและแหล่งช่วยเหลือในไทย สรุปสั้น กระชับ ไม่ต้องทักทาย เริ่มด้วยขั้นตอนที่ 1")}
      />
    </div>
  </>
);

// --- Component หลัก ---
export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef<boolean>(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [typingComplete, setTypingComplete] = useState<boolean>(false);
  const [activationChecked, setActivationChecked] = useState(false);
  const [requireLogin, setRequireLogin] = useState(false);
  const [userStatus, setUserStatus] = useState<'Active' | 'Inactive' | 'Unknown'>('Unknown');
  const [allReferences, setAllReferences] = useState<any[]>([]);

  // --- Resizing Logic for MessageList and ProjectPlan ---
  const [leftWidth, setLeftWidth] = useState(60); // Initial width 60%
  const [isResizing, setIsResizing] = useState(false);
  const [planContent, setPlanContent] = useState<string>('');
  const [showPlanPanel, setShowPlanPanel] = useState<boolean>(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) { // Limit resizing between 20% and 80%
        setLeftWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // helper: ดึง 3 คำถามต่อจากหัวข้อและลบออกจากเนื้อหาหลัก
  const extractFollowUpsAndClean = (textRaw: string): { cleaned: string; followUps: string[] } => {
    let text = textRaw || '';
    
    // กำหนดหัวข้อที่ต้องการค้นหา (เรียงจากยาวไปสั้นเพื่อให้จับตัวยาวก่อน)
    const headers = [
      'ไกด์แนะนำคำถามต่อไป',
      'คำถามที่เกี่ยวข้อง',
      'ไกด์แนะนำคำ',
      'คำถามแนะนำ',
      'ถามต่อ'
    ];

    let foundIdx = -1;
    let foundHeaderLen = 0;

    for (const h of headers) {
      // ค้นหาหัวข้อแบบไม่สนใจสัญลักษณ์ Markdown ด้านหน้าหรือด้านหลัง
      const regex = new RegExp(`[#* \t]*${h}[:* \n\t]*`, 'g');
      const matches = Array.from(text.matchAll(regex));
      if (matches.length > 0) {
        // หาตำแหน่งที่เจอตัวแรกสุดในบรรดาหัวข้อที่ระบุ
        const firstMatch = matches[0];
        if (foundIdx === -1 || firstMatch.index! < foundIdx) {
          foundIdx = firstMatch.index!;
          foundHeaderLen = firstMatch[0].length;
        }
      }
    }
    
    if (foundIdx === -1) {
      return { cleaned: text.trim(), followUps: [] };
    }

    // ตั้งแต่หลังหัวข้อลงไป
    const tail = text.slice(foundIdx + foundHeaderLen);
    const lines = tail.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const arr: string[] = [];
    
    for (const ln of lines) {
      // รองรับ 1. 2. 3. หรือ 1) 2) 3) หรือ - หรือ * หรือ •
      const m = ln.match(/^([0-9]+[\.)]|\*|-|•)\s*(.+)$/);
      if (m && m[2]) {
        let q = m[2].trim();
        // ลบเครื่องหมายคำพูดหรือดอกจันที่อาจครอบคำถามอยู่
        q = q.replace(/^["'*(]+|[)"'*]+$/g, '');
        arr.push(q);
        if (arr.length >= 3) break;
      }
    }

    // ตัดคำถามที่อาจติดมาในรูปแบบบรรทัดสั้นๆ โดยไม่มีตัวเลขนำหน้า ( fallback )
    if (arr.length === 0 && lines.length > 0) {
      for (const ln of lines.slice(0, 3)) {
        if (ln.length < 100) {
          arr.push(ln.replace(/^["'*(]+|[)"'*]+$/g, ''));
        }
      }
    }

    // เนื้อหาก่อนถึงหัวข้อ
    let cleaned = text.slice(0, foundIdx).trim();
    return { cleaned, followUps: arr.slice(0, 3) };
  };

  // helper: ลบตัวอักษรตกค้างท้ายข้อความ เช่น ** หรือเครื่องหมายคำพูด หรือเครื่องหมาย Header
  const sanitizeTail = (textRaw: string): string => {
    let t = textRaw || '';
    // ลบ Markdown decoration ท้ายข้อความ เช่น ** หรือ # หรือ : หรือบรรทัดว่าง
    // เพิ่มการลบ - และ * ที่อาจเป็น bullet ตกค้าง
    t = t.replace(/[ \t\n]*[#*:\- \t"'`]+$/g, '');
    // ลบบรรทัดว่างเกินจำเป็นท้ายข้อความ
    t = t.replace(/\n{3,}$/g, '\n\n');
    return t.trim();
  };

  /**
   * AI Tool Router: ใช้ AI วิเคราะห์เจตนาของผู้ใช้และเลือกเครื่องมือที่เหมาะสมโดยอัตโนมัติ
   */
  const aiDetectTool = async (text: string): Promise<string | null> => {
    try {
      const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      const prompt = `
        ทำหน้าที่เป็น "ตัวเลือกเครื่องมืออัตโนมัติ" ของระบบ สสส.
        วิเคราะห์คำถามของผู้ใช้และเลือกเครื่องมือที่เหมาะสมที่สุดเพียง "หนึ่งเดียว" จากรายการด้านล่าง
        
        คำถามผู้ใช้: "${text}"
        
        รายการเครื่องมือ (Tools):
        1. "เขียนแผนงาน": เมื่อผู้ใช้ "สั่งให้เริ่ม" เขียนโครงการ, แผนการดำเนินงาน, หรือ "ยืนยันตกลง" หลังจากที่คุณเสนอในข้อความก่อนหน้า
        2. "สร้างกราฟ": เมื่อผู้ใช้ "สั่งให้เริ่ม" ทำกราฟ, แดชบอร์ด หรือขอดูสถิติจริงจัง
        3. "สรุปรายงาน": เมื่อผู้ใช้ "สั่งให้เริ่ม" สรุปเอกสารยาวๆ หรือ "ยืนยัน" ให้ทำข้อสรุป
        4. "ขอคำปรึกษา": เมื่อผู้ใช้ "สั่งให้เริ่ม" เข้าสู่โหมดปรึกษาเชิงลึก
        5. "เทียบข้อมูล": เมื่อผู้ใช้ "สั่งให้เริ่ม" เปรียบเทียบไฟล์ หรือ "ยืนยัน" ให้หาจุดต่าง
        
        กติกาสำคัญ:
        - หากผู้ใช้ "ถามคำถามทั่วไป" หรือ "ขอข้อมูลเบื้องต้น" แม้จะเป็นเรื่องที่เกี่ยวกับโครงการ (เช่น "อยากรู้วิธีทำโครงการลดพุง") ให้ตอบค่า "null" เพื่อให้ระบบตอบแบบแชทปกติก่อน
        - ให้เลือกเครื่องมือเฉพาะเมื่อมีการใช้คำสั่งที่ "ชัดเจน" (เช่น "เขียนแผนให้หน่อย", "ตกลงทำเลย", "จัดทำเอกสารโครงการมา")
        - หากไม่แน่ใจ ให้ตอบค่า "null"
        - ตอบเฉพาะ "ชื่อเครื่องมือ" หรือ "null" เท่านั้น ห้ามมีคำอธิบายอื่นเด็ดขาด
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) return null;
      const result = await response.json();
      const answer = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'null';
      
      if (answer === 'null' || answer === '""') return null;
      return answer.replace(/["']/g, ''); // ลบเครื่องหมายคำพูดถ้ามี
    } catch (e) {
      console.error('AI Tool Detection Error:', e);
      return null;
    }
  };

  // Request throttling: เก็บเวลาของ request ล่าสุด
  const lastRequestTimeRef = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 1000; // 1 วินาที

  // AI-Powered File Search: ให้ AI ตัดสินใจเลือกไฟล์ที่เกี่ยวข้องจาก Title และ Abstract (ไม่ใช้ Keyword Heuristic แบบเดิม)
  const searchRelevantFiles = async (query: string): Promise<any[]> => {
    if (!allReferences || allReferences.length === 0) {
      console.warn('⚠️ No references available for AI selection');
      return [];
    }
    
    try {
      setLoadingStatus('🔍 AI กำลังวิเคราะห์และเลือกเอกสารที่เกี่ยวข้อง...');
      const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      
      // เตรียมข้อมูล metadata สำหรับให้ AI ตัดสินใจ (ลดข้อมูลเพื่อประหยัด Token)
      const metadataList = allReferences.map((ref) => ({
        title: ref.apa?.projectInfo?.titleThai || ref.apa?.titleThai || ref.meta?.file_name,
        author: ref.apa?.projectInfo?.responsibleAuthor || ref.apa?.projectInfo?.authorNames || 'ไม่ระบุ',
        organization: ref.apa?.projectInfo?.organization || 'ไม่ระบุ',
        abstract: (ref.apa?.abstract || '').substring(0, 300) + '...',
        fileName: ref.meta?.file_name
      }));

      // เรียก Gemini Flash (ประหยัดค่าใช้จ่ายและเร็ว) เพื่อเลือกไฟล์
      const selectionPrompt = `
        คุณคือ "ผู้ช่วยคัดเลือกเอกสารวิชาการ" ของ สสส.
        หน้าที่ของคุณคืออ่านรายการเอกสารด้านล่าง และเลือกเอกสารที่ "เกี่ยวข้องโดยตรง" กับคำถามของผู้ใช้
        
        คำถามผู้ใช้: "${query}"
        
        กติกาการเลือก:
        1. เลือกเฉพาะไฟล์ที่มีเนื้อหาสามารถตอบคำถามผู้ใช้ได้จริง
        2. เลือกมาไม่เกิน 3 ไฟล์ที่สำคัญที่สุด
        3. ตอบกลับในรูปแบบ JSON Array ของชื่อไฟล์ (fileName) เท่านั้น เช่น ["research_paper_01.pdf", "health_report.pdf"]
        4. หากไม่มีไฟล์ใดเกี่ยวข้องเลย ให้ตอบ [] เท่านั้น ห้ามอธิบายเพิ่ม
        
        รายการเอกสาร:
        ${JSON.stringify(metadataList)}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: selectionPrompt }] }],
          generationConfig: { 
            response_mime_type: "application/json",
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ AI Selection API Error:', response.status, errorData);
        return []; // คืนค่าว่างถ้า API พลาด เพื่อให้แชททำงานต่อได้
      }
      
      const result = await response.json();
      const aiResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      let selectedFileNames: string[] = [];
      try {
        selectedFileNames = JSON.parse(aiResponseText);
      } catch (e) {
        console.error('Failed to parse AI response:', aiResponseText);
      }
      
      if (!Array.isArray(selectedFileNames) || selectedFileNames.length === 0) {
        return [];
      }

      setLoadingStatus(`📎 AI เลือกเอกสารที่เกี่ยวข้องได้ ${selectedFileNames.length} รายการ กำลังโหลดข้อมูล...`);

      // ดาวน์โหลดไฟล์ที่ AI เลือกและแปลงเป็นข้อมูลพร้อมใช้
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fileInfos = await Promise.all(
        selectedFileNames.map(async (fileName: string) => {
          try {
            const cleanName = fileName.replace(/^\/+/g, '');
            // ค้นหา metadata เดิม
            const originalRef = allReferences.find(r => r.meta?.file_name === fileName);
            const filePath = originalRef?.meta?.file_path || '%2F';
            
            // ดาวน์โหลดไฟล์จาก Minio
            const downloadUrl = `/api/files/download?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(cleanName)}`;
            const fileRes = await fetchWithAuth(downloadUrl);
            
            let pdfBase64 = null;
            if (fileRes.ok) {
              const blob = await fileRes.blob();
              pdfBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            }
            
            return {
              name: cleanName,
              apa: originalRef?.apa || null,
              url: `${origin}/admin/view-pdf?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(cleanName)}`,
              pdfBase64: pdfBase64
            };
          } catch (error) {
            console.error(`❌ Error processing AI selected file ${fileName}:`, error);
            return null;
          }
        })
      );
      
      const validFiles = fileInfos.filter(f => f !== null && f.pdfBase64 !== null) as any[];
      console.log(`✅ Automatically attached ${validFiles.length} files selected by AI`);
      return validFiles;
    } catch (error) {
      console.error('❌ Error in AI Smart Search:', error);
      return [];
    }
  };

  // ใช้ chat history hook
  const {
    currentSessionId,
    createNewSession,
    addMessageToSession,
    loadSession,
    deleteSession
  } = useChatHistory();

  // โหลดรายการเอกสารอ้างอิงทั้งหมดไว้ล่วงหน้า
  useEffect(() => {
    const fetchAllRefs = async () => {
      try {
        const response = await fetchWithAuth('/api/files/apa');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.references) {
            setAllReferences(data.references);
            console.log(`📚 Loaded ${data.references.length} academic references for AI decision`);
          }
        }
      } catch (error) {
        console.error('Error fetching all references:', error);
      }
    };
    fetchAllRefs();
  }, []);

  // โหลด session จาก URL parameter
  useEffect(() => {
    // Activation gate: ตรวจสอบโปรไฟล์และสถานะ
    (async () => {
      try {
        const res = await fetchWithAuth('/api/user/profile');
        if (!res.ok) {
          // ถ้ายังไม่ได้ login หรือ token ไม่ถูกต้อง ให้เปิด login popup
          setRequireLogin(true);
          setUserStatus('Unknown');
        } else {
          const json = await res.json();
          const status = json?.user?.activationStatus as ('Active' | 'Inactive') | undefined;
          if (status === 'Active') {
            setRequireLogin(false);
            setUserStatus('Active');
          } else {
            // Inactive -> ให้ login popup ก่อนใช้งาน
            setRequireLogin(true);
            setUserStatus('Inactive');
          }
        }
      } catch (e) {
        setRequireLogin(true);
        setUserStatus('Unknown');
      } finally {
        setActivationChecked(true);
      }
    })();
  }, []);

  const handleLoginSuccess = () => {
    // หลัง login สำเร็จ ตรวจสอบสถานะอีกครั้ง
    (async () => {
      try {
        const res = await fetchWithAuth('/api/user/profile');
        if (res.ok) {
          const json = await res.json();
          const status = json?.user?.activationStatus as ('Active' | 'Inactive') | undefined;
          if (status === 'Active') {
            setRequireLogin(false);
            setUserStatus('Active');
          } else {
            setRequireLogin(true);
            setUserStatus('Inactive');
          }
        } else {
          setRequireLogin(true);
          setUserStatus('Unknown');
        }
      } catch {
        setRequireLogin(true);
        setUserStatus('Unknown');
      }
    })();
  };

  // โหลด session จาก URL parameter (แยก useEffect ออกมา)
  useEffect(() => {
    // ต้องรอให้ตรวจสอบ Activation และ Login เสร็จก่อน เพื่อให้ getChatSession รู้ว่าเป็น Guest หรือ User
    if (!activationChecked) return;

    // ตรวจสอบว่ามี session ID ใน URL หรือไม่
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');

    if (sessionId) {
      console.log('🔍 Loading session from URL:', sessionId);

      // โหลดประวัติจาก session ID (async)
      loadSession(sessionId).then(session => {
        if (session) {
          console.log('✅ Session loaded:', session.title, 'Messages:', session.messages?.length || 0);

          // แปลง ChatMessage[] เป็น Message[]
          const loadedMessages: Message[] = (session.messages || [])
            .filter(m => m.role !== 'system')
            .map(m => ({
              role: m.role,
              content: m.content,
              images: m.images,
              charts: m.charts,
              tables: m.tables,
              codeBlocks: m.codeBlocks,
              planContent: m.planContent,
              isNewMessage: false // ข้อความจากประวัติไม่ต้องใช้ TextType animation
            }));

          setMessages(loadedMessages);
          
          // ค้นหา planContent ล่าสุดแล้วนำมาแสดง
          const lastPlanMessage = [...loadedMessages].reverse().find(m => m.planContent);
          if (lastPlanMessage && lastPlanMessage.planContent) {
            setPlanContent(lastPlanMessage.planContent);
            setShowPlanPanel(true);
          }

          console.log('📝 Set messages to state:', loadedMessages.length, 'messages');

          // Clear URL parameter หลังโหลดเสร็จ (optional - เพื่อให้ URL สะอาด)
          window.history.replaceState({}, '', '/');
        } else {
          console.error('❌ Session not found:', sessionId);
        }
      }).catch(error => {
        console.error('❌ Error loading session:', error);
      });
    }
  }, [loadSession, activationChecked]);

  const handleSendChat = async (prompt: string, imageUrls?: string[], files?: File[], selectedTool?: string | null) => {
    // Gate: ถ้ายังไม่ผ่าน activation ให้บล็อกการส่ง
    if (!activationChecked || requireLogin) {
      setRequireLogin(true);
      return;
    }
    // ป้องกันการส่งซ้ำ
    if (isLoading) {
      console.warn('⚠️ Request already in progress');
      return;
    }

    // Request throttling: ป้องกันการส่งถี่เกินไป
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.warn(`⚠️ Request throttled, please wait ${waitTime} ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTimeRef.current = Date.now();

    // ตรวจสอบ prompt ว่างเปล่า
    if (!prompt || prompt.trim() === '') {
      console.warn('⚠️ Empty prompt');
      return;
    }

    setIsLoading(true);
    setFollowUps([]);
    setTypingComplete(false); // รีเซ็ตสถานะการพิมพ์เมื่อส่งข้อความใหม่
    if (selectedTool) {
      setPlanContent('');
      setShowPlanPanel(true);
    }
    stopRequestedRef.current = false;
    abortControllerRef.current = new AbortController();
    const controller = abortControllerRef.current;
    console.log('📤 Sending chat:', { promptLength: prompt.length, images: imageUrls?.length, files: files?.length });

    // Smart File Search: ค้นหาไฟล์ที่เกี่ยวข้องอัตโนมัติ (ส่งประวัติล่าสุดไปด้วยเพื่อให้ AI รู้บริบท)
    const contextForSearch = messages.length > 0 
      ? `ประวัติการคุย: ${messages.slice(-2).map(m => m.content).join(' | ')}\nคำถามปัจจุบัน: ${prompt}`
      : prompt;

    const autoAttachedFiles = await searchRelevantFiles(contextForSearch);
    if (autoAttachedFiles.length > 0) {
      console.log('📎 Auto-attached files:', autoAttachedFiles.map(f => f.name).join(', '));
    }

    // แปลง blob URLs เป็น base64 ถาวรสำหรับแสดงผล (แบบ parallel)
    const permanentImageUrls: string[] = [];
    if (imageUrls && imageUrls.length > 0) {
      try {
        const imagePromises = imageUrls.map(async (imageUrl) => {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        });

        const results = await Promise.all(imagePromises);
        permanentImageUrls.push(...results);
        console.log('✅ Converted', permanentImageUrls.length, 'images to base64');
      } catch (error) {
        console.error('❌ Error converting images:', error);
        // ไม่ return ให้ทำงานต่อโดยไม่มีรูป
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: prompt,
      images: permanentImageUrls.length > 0 ? permanentImageUrls : undefined
    };

    // สร้าง session ใหม่ถ้ายังไม่มี
    let sessionId = currentSessionId;
    console.log('📌 Current session ID:', sessionId);

    if (!sessionId) {
      sessionId = await createNewSession(prompt);
      console.log('🆕 Created new session:', sessionId);
    }

    // บันทึก user message ลง localStorage (เพิ่ม timestamp)
    await addMessageToSession(sessionId, {
      ...userMessage,
      timestamp: new Date().toISOString()
    });
    console.log('💾 Saved user message to session:', sessionId);

    // เพิ่ม System Prompt เข้าไปใน State ด้วย (เพื่อให้ ChatInputArea ไม่ต้องส่ง)
    const newMessages: Message[] = [
      ...messages,
      userMessage
    ];

    // ตั้งค่าข้อความที่จะแสดงผลบน UI
    setMessages(newMessages);

    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    // แปลง PDF files เป็น base64 (แบบ parallel)
    const pdfBase64Array: string[] = [];
    if (files && files.length > 0) {
      try {
        const pdfPromises = files
          .filter(file => file.type === 'application/pdf')
          .map(file => new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          }));

        const results = await Promise.all(pdfPromises);
        pdfBase64Array.push(...results);
        console.log('✅ Converted', pdfBase64Array.length, 'PDFs to base64');
      } catch (error) {
        console.error('❌ Error converting PDFs:', error);
      }
    }

    // สร้าง contents สำหรับ Gemini API พร้อม conversation history (ไม่ยัดระบบเป็น user)
    const contents: any[] = [];
    const recentMessages = messages.slice(-10); // เพิ่มหน่วยความจำย้อนหลัง
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        const userParts: any[] = [{ text: msg.content }];
        contents.push({
          role: 'user',
          parts: userParts
        });
      } else if (msg.role === 'assistant') {
        // รวมเนื้อหาจากทั้ง content และ planContent (ถ้ามี) เพื่อให้ AI จำสิ่งที่ร่างไว้ในแผงข้างได้
        const fullContent = msg.planContent 
          ? `${msg.content}\n\n[เนื้อหาในแผงแผนงาน]:\n${msg.planContent}`
          : msg.content;
          
        contents.push({
          role: 'model',
          parts: [{ text: fullContent }]
        });
      }
    }

    const currentParts: any[] = [];
    for (const base64Image of permanentImageUrls) {
      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.match(/data:(.*?);/)?.[1] || 'image/jpeg';
      currentParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }
    for (const base64Pdf of pdfBase64Array) {
      const base64Data = base64Pdf.split(',')[1];
      currentParts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data
        }
      });
    }
    
    // แนบไฟล์ที่ค้นหาอัตโนมัติจาก Smart Search
    if (autoAttachedFiles && autoAttachedFiles.length > 0) {
      console.log('📎 Attaching auto-searched files to API call...');
      for (const autoFile of autoAttachedFiles) {
        if (autoFile.pdfBase64) {
          const base64Data = autoFile.pdfBase64.split(',')[1];
          currentParts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data
            }
          });
          console.log(`✅ Attached: ${autoFile.name}`);
        }
      }
    }
    
    if (prompt) {
      currentParts.push({ text: prompt });
    }
    contents.push({
      role: 'user',
      parts: currentParts
    });

    // --- Automatic Tool Detection (AI Routing) ---
    // ถ้าผู้ใช้ไม่ได้เลือกเครื่องมือมาเอง ให้ระบบช่วยวิเคราะห์จาก Prompt
    let effectiveTool = selectedTool;
    if (!effectiveTool) {
      effectiveTool = await aiDetectTool(prompt);
      if (effectiveTool) {
        // เปิดแผงด้านข้างสำหรับเครื่องมือที่ต้องการพื้นที่แสดงผลเพิ่มเติม
        if (['เขียนแผนงาน', 'สรุปรายงาน', 'สร้างกราฟ'].includes(effectiveTool)) {
          setPlanContent('');
          setShowPlanPanel(true);
        }
      }
    }

    await performGeminiRequest(contents, effectiveTool, files, sessionId, controller, autoAttachedFiles);
  };

  /**
   * Unified logic to call Gemini API and process response
   */
  const performGeminiRequest = async (
    contentsToSend: any[],
    selectedTool: string | null = null,
    files?: File[],
    sessionId?: string | null,
    controller?: AbortController,
    autoAttachedFiles?: any[]
  ) => {
    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    try {
      setLoadingStatus('กำลังระบุหัวข้อและวิเคราะห์เนื้อหา...');
      const isSpecialTool = !!(selectedTool && [
        'เขียนแผนงาน', 'สร้างกราฟ', 'สรุปรายงาน', 'ขอคำปรึกษา', 'เทียบข้อมูล',
        'A = บทความต้นฉบับ'
        , 'B = แนวทางการเฝ้าระวัง สอบสวน ควบคุมโรค', 'C = สถานการณ์โรค'
      ].includes(selectedTool));
      const modelName = "gemini-3-flash-preview";
      let accumulatedResponse = "";
      let currentContents = [...contentsToSend];
      
      // กำหนดค่า Config และ System Instruction ตามประเภทการใช้งาน
      let currentSystemPrompt = SYSTEM_PROMPT;
      
      if (isSpecialTool) {
        if (selectedTool?.includes('แผนงาน') || selectedTool === 'เขียนแผนงาน') {
          currentSystemPrompt = PLANNING_PROMPT;
        } else if (selectedTool === 'สรุปรายงาน') {
          currentSystemPrompt = PROMPT_SUMMARY;
        } else if (selectedTool === 'ขอคำปรึกษา') {
          currentSystemPrompt = PROMPT_CONSULT;
        } else if (selectedTool === 'เทียบข้อมูล' || selectedTool === 'เปรียบเทียบข้อมูล') {
          currentSystemPrompt = PROMPT_COMPARE;
        } else if (selectedTool === 'สร้างกราฟ') {
          currentSystemPrompt = PROMPT_CHART_DOC;
        } else if (selectedTool === 'ค้นหาข้อมูล') {
          currentSystemPrompt = PROMPT_SEARCH;
        } else if (selectedTool === 'A = บทความต้นฉบับ') {
          currentSystemPrompt = PROMPTA;
        } else if (selectedTool === 'B = แนวทางการเฝ้าระวัง สอบสวน ควบคุมโรค') {
          currentSystemPrompt = PROMPTB;
        } else if (selectedTool === 'C = สถานการณ์โรค') {
          currentSystemPrompt = PROMPTC;
        }
      } else if (autoAttachedFiles && autoAttachedFiles.length > 0) {
        // หากมีการค้นพบไฟล์อัตโนมัติ ให้ใช้ PROMPT_STEP_READ เพื่อวิเคราะห์และอ้างอิง
        currentSystemPrompt = PROMPT_STEP_READ;
      }

      const systemInstruction = {
        role: 'system',
        parts: [{ 
          text: (isSpecialTool || currentSystemPrompt === PROMPT_STEP_READ)
            ? currentSystemPrompt + "\n\n(โปรดเขียนเนื้อหาให้ละเอียดและครอบคลุมทุกมิติ ห้ามสรุปจบเร็วเกินไป และห้ามทวนคำสั่งเดิม)"
            : currentSystemPrompt
        }]
      };

      const generationConfig = {
        temperature: isSpecialTool ? 0.8 : 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: isSpecialTool ? 4096 : 4096,
      };

      // --- ส่วนการเรียก API (Unified Flow) ---

      // สร้างส่วนเสริมข้อมูลอ้างอิงจากไฟล์ (ใช้ทั้งแชทปกติและ Special Tools)
      let fileContext = '';
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      let allFileInfos: any[] = [];
      let hasAutoAttached = false;
      
      // 🔍 ขั้นตอนที่ 1: ค้นหาและรวบรวมไฟล์จาก Minio (สำหรับทุกโหมด)
      setLoadingStatus('🔍 กำลังรวบรวมข้อมูลเอกสาร...');
      
      // 1. ตักไฟล์ที่แนบมาด้วยตนเอง (สูงสุด)
      if (files && files.length > 0) {
        const currentFileInfos = await Promise.all(files.map(async (file) => {
          try {
            const cleanName = file.name.replace(/^\/+/, '');
            const res = await fetchWithAuth(`/api/files/apa?name=${encodeURIComponent(cleanName)}&path=%2F`);
            const data = await res.json();
            return { 
              name: cleanName, 
              apa: data.success ? data.apa : null, 
              url: `${origin}/admin/view-pdf?path=%2F&name=${encodeURIComponent(cleanName)}`,
              source: 'attached'
            };
          } catch {
            const cleanName = file.name.replace(/^\/+/, '');
            return { 
              name: cleanName, 
              apa: null, 
              url: `${origin}/admin/view-pdf?path=%2F&name=${encodeURIComponent(cleanName)}`,
              source: 'attached'
            };
          }
        }));
        allFileInfos = [...currentFileInfos];
      }

      // 2. เพิ่มไฟล์ที่ระบบเลือกให้โดย AI (Auto Search)
      if (autoAttachedFiles && autoAttachedFiles.length > 0) {
        const autoFilesWithSource = autoAttachedFiles.map(f => ({ ...f, source: 'auto' }));
        allFileInfos = [...allFileInfos, ...autoFilesWithSource];
        hasAutoAttached = true;
      }

      // 📋 สร้าง File Context จากไฟล์ที่รวบรวมได้ (ใช้ชุดตัวเลขเดียวเพื่อป้องกันความสับสน)
      fileContext = '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      fileContext += '📚 **รายการเอกสารอ้างอิงสำหรับคำตอบนี้ (Source Context)**:\n';
      fileContext += `มีเอกสารทั้งหมดที่ระบบเลือกมาให้ใช้: **${allFileInfos.length} ไฟล์**\n\n`;

      allFileInfos.forEach((info, index) => {
        const fileIndex = index + 1;
        const title = info.apa?.projectInfo?.titleThai || info.apa?.titleThai || info.name;
        const author = info.apa?.projectInfo?.responsibleAuthor || info.apa?.projectInfo?.authorNames || 'ไม่ระบุผู้แต่ง';
        const organization = info.apa?.projectInfo?.organization || '';
        const authorInfo = organization ? `${author}, ${organization}` : author;
        
        fileContext += `${fileIndex}. [${info.name}]\n`;
        fileContext += `   - ข้อมูล (Title): ${title}\n`;
        fileContext += `   - ลิงก์จริง (URL): ${info.url}\n`;
        fileContext += `   - ผู้แต่งและหน่วยงาน (Author/Org): ${authorInfo}\n`;
        
        if (info.apa?.projectInfo) {
          fileContext += `   - ข้อมูลดิบ (Metadata): ${JSON.stringify(info.apa.projectInfo)}\n`;
        }

        fileContext += `   - บทคัดย่อ: ${info.apa?.abstract || 'ไม่มีบทคัดย่อ'}\n`;
        fileContext += '\n';
      });
      
      fileContext += '⚠️ **กฎสำคัญ:**\n';
      fileContext += '1. ให้ใช้ข้อมูล "เฉพาะ" จากไฟล์ที่ระบุข้างต้นเท่านั้น\n';
      fileContext += '2. อ้างอิงด้วยหมายเลขลำดับในเนื้อหา เช่น [1], [2]\n';
      fileContext += '3. หากไฟล์ใดไม่อยู่ในรายการด้านบน "ห้าม" นำมาเขียนอ้างอิงหรือสร้างชื่อไฟล์ขึ้นมาเองเด็ดขาด\n';
      fileContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

      setLoadingStatus('กำลังหาข้อมูลและประมวลผล...');

      // ปรับปรุงคำสั่งเมื่อมีการทำงานร่วมกับไฟล์หรือเครื่องมือพิเศษ
      if (isSpecialTool || hasAutoAttached) {
        const lastMsg = currentContents[currentContents.length - 1];
        
        // แนบ fileContext เข้าไปใน User Turn ล่าสุด
        let instructions = `\n\n${fileContext}`;
        if (isSpecialTool) {
          instructions += `\n\n(ภารกิจ: ${selectedTool} - โปรดใช้ข้อมูลจากไฟล์ที่ระบุในรายการ [1] ถึง [${allFileInfos.length}] เท่านั้น ห้ามอ้างอิงนอกเหนือจากนี้)`;
        }
        
        // ค้นหา text part เพื่อเตรียมส่งคำสั่ง (หลีกเลี่ยงการเขียนทับ inlineData/binary)
        const textPart = lastMsg.parts.find((p: any) => p.text !== undefined);
        if (textPart) {
          textPart.text += instructions;
        } else {
          lastMsg.parts.push({ text: instructions });
        }
      }
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: systemInstruction,
          contents: currentContents,
          generationConfig: generationConfig
        }),
        signal: controller?.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      accumulatedResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (isSpecialTool) {
        setPlanContent(accumulatedResponse);
      }

      if (stopRequestedRef.current) {
        setIsLoading(false);
        return;
      }

      // --- ส่วนการประมวลผลคำตอบสุดท้าย ---
      if (isSpecialTool) {
        const attachedFilenames = files && files.length > 0 
          ? `\n\n📁 **ไฟล์ที่แนบ:** ${files.map(f => f.name).join(', ')}` 
          : '';
        
        const statusMessage: Message = {
          role: 'assistant',
          content: `✅ ดำเนินการ${selectedTool}ให้เรียบร้อยแล้วครับ! ระบบได้ร่างรายละเอียดเชิงลึกไว้ในแผงด้านขวาแล้ว${attachedFilenames}`,
          planContent: accumulatedResponse,
          isNewMessage: true
        };
        setMessages(prev => [...prev, statusMessage]);
        
        if (sessionId) {
          await addMessageToSession(sessionId, {
            role: 'assistant',
            content: statusMessage.content,
            planContent: accumulatedResponse,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        setLoadingStatus('กำลังจัดรูปแบบข้อมูลและสร้างสื่อเสริม...');
        // ประมวลผลสำหรับแชทปกติ (Charts, Tables, CodeBlocks)
        const charts: any[] = [];
        const tables: any[] = [];
        const codeBlocks: Array<{ code: string; language: string }> = [];
        
        let processedContent = accumulatedResponse.replace(/```json:chart(?:-ai)?\s*\n?([\s\S]*?)```/g, (match, p1) => {
          try {
            const cleanJson = p1
              .replace(/\/\/.*$/gm, '') // ลบ comment //
              .replace(/\/\*[\s\S]*?\*\//g, '') // ลบ block comment
              .replace(/,(\s*[\]}])/g, '$1') // ลบ trailing commas
              .trim();
            const chartData = JSON.parse(cleanJson);
            charts.push(chartData);
            return `<ChartAI index="${charts.length - 1}" />`;
          } catch (e) { 
            console.error('Chart JSON Parse Error:', e);
            return match; 
          }
        });

        processedContent = processedContent.replace(/```json:table(?:-ai)?\s*\n?([\s\S]*?)```/g, (match, p1) => {
          try {
            // ทำความสะอาด JSON เบื้องต้น (ลบ trailing commas และบรรทัดคอมเมนต์ที่ AI อาจแถมมา)
            const cleanJson = p1
              .replace(/\/\/.*$/gm, '') // ลบ comment //
              .replace(/\/\*[\s\S]*?\*\//g, '') // ลบ block comment
              .replace(/,(\s*[\]}])/g, '$1') // ลบ trailing commas
              .trim();
            const tableData = JSON.parse(cleanJson);
            tables.push(tableData);
            return `<TableAI index="${tables.length - 1}" />`;
          } catch (e) { 
            console.error('Table JSON Parse Error:', e);
            return match; 
          }
        });

        processedContent = processedContent.replace(/```(\w+)?\s*\n?([\s\S]*?)```/g, (match, langRaw, code) => {
          const language = (langRaw || '').toLowerCase();
          if (language === 'markdown' || language === 'md') return code;
          codeBlocks.push({ code, language });
          return `<CodeBlockAI index="${codeBlocks.length - 1}" />`;
        });

        const { cleaned: finalContent, followUps: fups } = extractFollowUpsAndClean(processedContent.trim());
        let finalSanitized = sanitizeTail(finalContent);

        // กรณีที่การ Clean ทำให้ข้อความว่างเปล่า (เช่น มีแต่คำแนะนำคำถามต่อ)
        // ให้ใช้ข้อความดั้งเดิมที่ Trim แล้ว หรือข้อความเริ่มต้นหากว่างจริงๆ
        if (!finalSanitized && !charts.length && !tables.length && !codeBlocks.length) {
          if (fups.length > 0) {
            finalSanitized = "นี่คือประเด็นที่น่าสนใจที่คุณสามารถถามต่อได้ครับ:";
          } else {
            finalSanitized = processedContent.trim() || "...";
          }
        }

        const aiMessage: Message = {
          role: 'assistant',
          content: finalSanitized,
          charts: charts.length > 0 ? charts : undefined,
          tables: tables.length > 0 ? tables : undefined,
          codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
          isNewMessage: true
        };

        setMessages(prevMessages => [...prevMessages, aiMessage]);
        setTypingComplete(false);
        setFollowUps(fups);

        if (sessionId) {
          await addMessageToSession(sessionId, { ...aiMessage, content: finalSanitized, timestamp: new Date().toISOString() });
        }
      }

    } catch (error: any) {
      if (error?.name === 'AbortError' || stopRequestedRef.current) {
        console.warn('🛑 Request aborted by user');
      } else {
        console.error("❌ Error fetching AI response:", error);
        let errorMessage = "ขออภัย เกิดข้อผิดพลาดในการติดต่อ AI";
        if (error.message?.includes('Failed to fetch')) errorMessage = "❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้";
        else if (error.message?.includes('429')) errorMessage = "⚠️ ขออภัย มีการใช้งานเกินกำหนด";
        else if (error.message?.includes('timeout')) errorMessage = "⏱️ หมดเวลาในการรอคำตอบ";
        else if (error.message) errorMessage = `❌ เกิดข้อผิดพลาด: ${error.message}`;

        setMessages(prevMessages => [...prevMessages, {
          role: 'assistant',
          content: `${errorMessage}\n\n💡 กรุณาลองใหม่อีกครั้ง`
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // note: follow-ups ถูกสกัดและตั้งค่าเมื่อได้รับคำตอบแล้วด้านบน

  // ฟังก์ชันหยุดการตอบ กู้คืนสภาพ และลบข้อความล่าสุด (user + assistant)
  const handleStop = async () => {
    stopRequestedRef.current = true;
    setLoadingStatus('');
    try {
      abortControllerRef.current?.abort();
    } catch {}

    // ถ้าเป็นคำถามแรกของแชท ให้ลบ history (ลบทั้ง session)
    try {
      const userMsgCount = messages.filter(m => m.role === 'user').length;
      if (userMsgCount <= 1 && currentSessionId) {
        try {
          await deleteSession(currentSessionId);
        } catch (e) {
          console.warn('Failed to delete session on stop:', e);
        }
        setMessages([]);
        setIsLoading(false);
        return;
      }
    } catch {}

    // ลบข้อความล่าสุดใน UI: assistant (ถ้ามี) และ user ที่เพิ่งส่ง
    setMessages(prev => {
      const updated = [...prev];
      if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') updated.pop();
      if (updated.length > 0 && updated[updated.length - 1].role === 'user') updated.pop();
      return updated;
    });

    // ลบใน session เก็บประวัติ (เฉพาะกรณี guest หรือ localStorage เท่านั้น เพื่อเลี่ยง API error)
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const isLoggedIn = !!(userStr && (() => { try { return JSON.parse(userStr)?.id; } catch { return null; } })());

      if (!isLoggedIn && currentSessionId) {
        const session = await getChatSession(currentSessionId);
        if (session) {
          if (session.messages.length > 0 && session.messages[session.messages.length - 1].role === 'assistant') {
            session.messages.pop();
          }
          if (session.messages.length > 0 && session.messages[session.messages.length - 1].role === 'user') {
            session.messages.pop();
          }
          session.messageCount = session.messages.filter(m => m.role !== 'system').length;
          session.updatedAt = new Date().toISOString();
          // อัปเดต preview จากข้อความล่าสุด
          try {
            const last = [...session.messages].reverse().find(m => m.role !== 'system');
            session.preview = last ? (last.content.length <= 100 ? last.content : last.content.substring(0, 100) + '...') : '';
          } catch {}
          await saveChatSession(session);
        }
      }
    } catch (e) {
      console.warn('Failed to update local session on stop:', e);
    }

    setIsLoading(false);
  };

  // ฟังก์ชัน Regenerate
  const handleRegenerate = async (messageIndex: number) => {
    console.log('🔄 Regenerating message at index:', messageIndex);

    // ป้องกันการ regenerate ขณะที่กำลัง loading
    if (isLoading) {
      console.warn('⚠️ Cannot regenerate while loading');
      return;
    }

    // หา user message ก่อนหน้า AI message ที่ต้องการ regenerate
    let userMessageIndex = -1;
    let userMessage: Message | null = null;

    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMessageIndex = i;
        userMessage = messages[i];
        break;
      }
    }

    if (userMessageIndex === -1 || !userMessage) {
      console.error('❌ Cannot find user message for regeneration');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ ไม่สามารถ regenerate ได้ เนื่องจากไม่พบข้อความต้นฉบับ'
        }
      ]);
      return;
    }

    console.log('📝 Found user message at index:', userMessageIndex);
    console.log('💬 User message:', userMessage.content.substring(0, 50) + '...');

    // รักษา conversation context โดยเก็บข้อความก่อนหน้าที่ส่ง User Prompt ครั้งนั้น
    // เพื่อให้การเรียก handleSendChat ด้านล่างไม่เป็นการเพิ่มข้อความซ้ำ
    const contextMessages = messages.slice(0, userMessageIndex);
    setMessages(contextMessages);

    // รอให้ UI update
    await new Promise(resolve => setTimeout(resolve, 100));

    // ส่ง request ใหม่พร้อม context และรูปภาพเดิม
    await handleSendChat(
      userMessage.content,
      userMessage.images || [],
      [] // ไม่มีไฟล์ในการ regenerate
    );

    console.log('✅ Regeneration completed');
  };

  // ฟังก์ชันแก้ไขข้อความ
  const handleEdit = async (messageIndex: number, newContent: string) => {
    console.log('✏️ Editing message at index:', messageIndex);

    const userMessage = messages[messageIndex];
    if (!userMessage) return;

    // ตัดประวัติข้อความเหลือแค่ก่อนถึงข้อความที่แก้ไข
    // เพื่อไม่ให้เกิดข้อความซ้ำเมื่อ handleSendChat ทำงาน
    const contextMessages = messages.slice(0, messageIndex);
    setMessages(contextMessages);

    // รอให้ UI update
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('📤 Re-sending edited message');

    // เรียก handleSendChat โดยส่งเนื้อหาที่แก้ไข
    await handleSendChat(
      newContent,
      userMessage.images || [],
      []
    );
  };

  return (
    // เปลี่ยน layout ให้เป็น Flex Column เต็มจอ (ใช้พื้นหลังสีขาวเพื่อให้ดูคลีนขึ้น)
    <div className='h-screen bg-white flex flex-col'>
      {/* Activation Gate Banner + Popup */}
      {activationChecked && requireLogin && (
        <div className="bg-yellow-100 text-yellow-900 border border-yellow-300 px-4 py-2 text-sm text-center">
          {userStatus === 'Inactive' ? 'บัญชีของคุณยังไม่เปิดใช้งาน โปรดเข้าสู่ระบบหรือติดต่อผู้ดูแลระบบ' : 'กรุณาเข้าสู่ระบบเพื่อใช้งานระบบ'}
        </div>
      )}

      {/* Inline Login Popup when required */}
      <LoginPopup
        isOpen={requireLogin}
        onClose={() => setRequireLogin(true)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Header พร้อมปุ่ม New Chat */}


      {/* ส่วนแสดงผลแชท หรือ หน้าจอ Welcome */}
      <div className={`flex-1 flex w-full overflow-hidden pt-2 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
        {messages.length === 0 ? (
          <div className="flex-1 overflow-y-auto flex flex-col items-center">
            <div className="w-full max-w-4xl px-4">
              <WelcomeScreen onSuggestionClick={handleSendChat} />
            </div>
          </div>
        ) : (
          <div className='flex w-full h-full'>
            {/* Left Side: MessageList */}
            <div 
              className={`overflow-y-auto flex flex-col items-center ${showPlanPanel ? 'border-r border-gray-200' : ''} ${isResizing ? 'pointer-events-none' : ''}`} 
              style={{ width: showPlanPanel ? `${leftWidth}%` : '100%' }}
            >
              <div className="w-full max-w-3xl">
                <MessageList
                  messages={messages}
                  isLoading={isLoading}
                  loadingStatus={loadingStatus}
                  onRegenerate={handleRegenerate}
                  onEdit={handleEdit}
                  onViewPlan={(content) => {
                    setPlanContent(content);
                    setShowPlanPanel(true);
                  }}
                  onTypingComplete={(index) => {
                    // แสดง followUps เฉพาะเมื่อข้อความล่าสุดของ AI พิมพ์เสร็จ
                    const isLast = index === messages.filter(m => m.role !== 'system').length - 1;
                    if (isLast) setTypingComplete(true);
                  }}
                />
              </div>
            </div>

            {showPlanPanel && (
              <>
                {/* Resizer Divider */}
                <div
                  className={`w-1.5 hover:w-2 cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-all flex items-center justify-center relative z-10 ${isResizing ? 'bg-blue-500 w-2' : ''}`}
                  onMouseDown={startResizing}
                >
                  <div className="h-10 w-0.5 bg-gray-400 rounded-full"></div>
                </div>

                {/* Right Side: ProjectPlan */}
                <div 
                  className={`flex-1 overflow-y-auto bg-white ${isResizing ? 'pointer-events-none' : ''}`}
                >
                  <div className="p-6 h-full">
                    <ProjectPlan 
                      content={planContent} 
                      isLoading={isLoading} 
                      status={loadingStatus}
                      onClose={() => setShowPlanPanel(false)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ส่วน Input (จะอยู่ที่ด้านล่างเสมอ) */}
      <div className="w-full p-4 flex justify-center sticky bottom-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-3xl">
          {followUps.length > 0 && typingComplete && (
            <div className="mb-3 flex flex-wrap gap-1.5 md:gap-2">
              {followUps.map((q, i) => (
                <button
                  key={`fu-${i}`}
                  onClick={() => handleSendChat(q)}
                  className="px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-xs md:text-sm shadow-sm leading-tight wrap-break-word max-w-full"
                  title="คลิกเพื่อถามต่อ"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <ChatInputArea onSend={handleSendChat} isLoading={isLoading} onStop={handleStop} />
        </div>
      </div>
    </div>
  );
}