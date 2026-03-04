'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
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

  const simplifyReferenceLinks = (textRaw: string): string => {
    let t = textRaw || '';
    
    // 1. จัดการเรื่องช่องว่างระหว่าง ] ( ที่ AI มักจะเผลอใส่ ทำให้ Markdown ไม่ทำงาน
    // ค้นหา [ข้อความ] (URL) และแก้เป็น [ข้อความ](URL)
    t = t.replace(/\[([^\]]+)\]\s+\((https?:\/\/[^\s)]+)\)/g, '[$1]($2)');

    // 2. จัดการเรื่องลิงก์ซ้อน (บางครั้ง AI ใส่ URL ในวงเล็บซ้ำ)
    t = t.replace(/\(\((https?:\/\/[^\s)]+)\)\)/g, '($1)');

    // 3. ใหม่: บังคับให้ URL ที่เปิดด้วย http/https และไม่มี [] ครอบอยู่ เป็น [URL](URL) เพื่อให้คลิกได้
    // (เฉพาะบรรทัดที่ขึ้นต้นด้วยช่องว่างหรืออยู่โดดๆ ท้ายคำตอบ)
    t = t.replace(/(?:^|\n)([ \t]*)(https?:\/\/[^\s\n\(\)\[\]]+)([ \t]*(?:\n|$))/g, (match, space, url, tail) => {
      return `${space}[${url}](${url})${tail}`;
    });

    return t;
  };

  const enforceReferenceProducer = (textRaw: string, producerByIndex: string[]): string => {
    const text = textRaw || '';
    if (!text) return text;

    const lines = text.split(/\r?\n/);
    const normalized = lines.map((line) => {
      // คัดกรองบรรทัดรายการอ้างอิงท้ายคำตอบ [1] ... หรือ 1. ...
      const match = line.match(/(?:^|:)\s*(?:\[(\d+)\]|(\d+)\.)\s*(.+)$/);
      if (!match) return line;
      
      // ถ้าบรรทัดนี้ยาวเกินไป หรือ สั้นเกินไป ข้าม (กันกรณีเนื้อหาแชทมีตัวเลขนำหน้า)
      if (line.length > 800 || match[3].trim().length < 10) return line;

      // ถ้ามีการอ้างอิงถึงวันที่เข้าถึง หรือ ผู้จัดทำ อยู่แล้ว ไม่ต้องเติมซ้ำ
      if (/เข้าถึงเมื่อ|ผู้จัดทำ\s*:|producer\s*:/i.test(line)) return line;

      const index = parseInt(match[1] || match[2], 10);
      if (isNaN(index) || index < 1) return line;

      const producer = producerByIndex[index - 1];
      if (!producer || producer === 'ไม่ระบุผู้แต่ง' || producer === 'ไม่ระบุ') {
        return line;
      }
      
      // วันที่ปัจจุบันสำหรับใช้ในส่วนอ้างอิง
      const now = new Date();
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const dateStr = `${thaiMonths[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

      // รูปแบบ: ชื่อรายการ - ผู้จัดทำ, เข้าถึงเมื่อ [วันที่]
      // เพิ่ม \n\n ท้ายบรรทัดเพื่อให้ Markdown แสดงผลขึ้นบรรทัดใหม่แน่นอน (Paragraph Break)
      return `${line.trim()} - ${producer}, เข้าถึงเมื่อ ${dateStr}\n\n`;
    });

    return normalized.join('\n');
  };

  const removeDocumentReferenceSection = (textRaw: string): string => {
    let t = textRaw || '';
    t = t.replace(/\n{0,2}(?:\*\*)?(?:เอกสารอ้างอิง(?:เชิงวิชาการ)?|References?)(?:\*\*)?\s*:?[\s\S]*$/i, '');
    return t.trim();
  };

  const fixCitationSpacing = (textRaw: string): string => {
    let t = textRaw || '';
    
    // 1. ตรวจสอบว่ามี "เอกสารอ้างอิงเชิงวิชาการ:" หรือไม่
    const headerPattern = /(เอกสารอ้างอิง(?:เชิงวิชาการ)?\s*:)/gi;
    const match = headerPattern.exec(t);
    if (match) {
      const headerIdx = match.index;
      const headerText = match[0];
      const before = t.slice(0, headerIdx);
      let after = t.slice(headerIdx + headerText.length);
      
      // ในส่วนหลังหัวข้อ (รายการอ้างอิง): ให้ขึ้นบรรทัดใหม่หน้าทุกๆ [n] หรือ n.
      // เน้นกรณีที่ citation อยู่หลังตัวอักษรอื่นโดยตรงโดยไม่มี newline
      after = after.replace(/([^\n])\s*(\[\d+\]|(?:\d+)\.)/g, '$1\n\n$2').trim();
      
      return before + headerText + '\n\n' + after;
    }
    
    // 2. Fallback: ถ้าไม่มีห้วข้อชัดเจน แต่มีการ clumped (เช่น ปี 2568 [2])
    t = t.replace(/(\d{4}|เข้าถึงเมื่อ\s*[^[\]\n]+|[^\s\n][)\]\.])\s*(\[\d+\]|(?:\d+)\.)/g, '$1\n\n$2');
    
    return t;
  };

  const readGeminiSseText = async (response: Response): Promise<string> => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API failed: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return '';

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulated = '';

    const appendFromSseEvent = (eventBlock: string) => {
      const lines = eventBlock
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        try {
          const json = JSON.parse(payload);
          const parts = json?.candidates?.[0]?.content?.parts || [];
          const chunkText = Array.isArray(parts)
            ? parts
                .filter((p: any) => !p.thought && p.text) // กรองส่วนที่เป็น thought process ออก
                .map((p: any) => p.text)
                .join('')
            : '';
          if (chunkText) accumulated += chunkText;
        } catch {
          // ignore malformed chunk
        }
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        appendFromSseEvent(eventBlock);
      }
    }

    if (buffer.trim()) {
      appendFromSseEvent(buffer);
    }

    return accumulated.trim();
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

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      const answer = await readGeminiSseText(response) || 'null';
      
      if (answer === 'null' || answer === '""') return null;
      return answer.replace(/["']/g, ''); // ลบเครื่องหมายคำพูดถ้ามี
    } catch (e) {
      console.error('AI Tool Detection Error:', e);
      return null;
    }
  };

  type AdminApiCallPlan = {
    endpoint: 'accident' | 'chatweather' | 'thaijo' | 'diabetes' | 'mental';
    payload: Record<string, any>;
  };

  type AdminApiIntentDecision = {
    useAccident?: boolean;
    useChatweather?: boolean;
    useThaijo?: boolean;
    useDiabetes?: boolean;
    useMental?: boolean;
    accidentMessage?: string;
    diabetesMessage?: string;
    mentalMessage?: string;
    mentalTable?: string;
    thaijoTerm?: string;
    thaijoPage?: number;
    thaijoSize?: number;
    lat?: number;
    lon?: number;
    days?: number;
  };

  const aiPlanAdminApiCalls = async (text: string): Promise<AdminApiCallPlan[]> => {
    try {
      const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      if (!API_KEY) return [];

      const planningPrompt = `
คุณคือ AI Router สำหรับเลือก API ภายในระบบ โดยต้องตอบ JSON เท่านั้น

ให้วิเคราะห์คำถามผู้ใช้ และตัดสินใจเลือกใช้ API ที่เหมาะสม รวมถึงพารามิเตอร์ต่างๆ
ตอบ "JSON object" รูปแบบนี้เท่านั้น:
{
  "useAccident": false,
  "useChatweather": false,
  "useThaijo": false,
  "useDiabetes": false,
  "useMental": false,
  "accidentMessage": "",
  "diabetesMessage": "",
  "mentalMessage": "",
  "mentalTable": "bipola",
  "thaijoTerm": "",
  "thaijoPage": 1,
  "thaijoSize": 3,
  "lat": 13.7563,
  "lon": 100.5018,
  "days": 7
}

เงื่อนไขสำคัญ:
- accidentMessage ตัวอย่าง อุบัติเหตุทางถนนในกรุงเทพฯ ปี 2025 ,สถิติความปลอดภัยทางถนนในประเทศไทย, สาเหตุการเกิดอุบัติเหตุทางถนนที่พบบ่อย จังหวัดต่างๆ, จังหวัดไหนมีอุบัติเหตุเยอะสุด, อุบัติเหตุทางถนนกับโควิด, อุบัติเหตุทางถนนกับฤดูกาล, วิธีลดอุบัติเหตุทางถนน ,ไม่เอา คำ ช่วยเขียนแผนรายงานนโยบาย 
- useAccident = true สำหรับคำถามเกี่ยวกับสถิติอุบัติเหตุ/ความปลอดภัยบนถนน
- useChatweather = true สำหรับสภาพอากาศ
- useThaijo = true สำหรับคำถามวิชาการ/วิจัย (เช่น ค้นหางานวิจัย, หาผู้เชี่ยวชาญ, ข้อมูลวิชาการจากวารสารไทย)
- useDiabetes = true สำหรับคำถามเกี่ยวกับข้อมูลเบาหวาน, สถิติผู้ป่วยเบาหวาน, เป้าหมายและผลงานการดูแลเบาหวาน, รายงานเบาหวานรายพื้นที่/รายเดือน (diabetesMessage ใส่คำถามเต็มของผู้ใช้)
- useMental = true สำหรับคำถามเกี่ยวกับสุขภาพจิต, ข้อมูลผู้ป่วยไบโพลาร์/โรคซึมเศร้า/โรคจิตเวช, สถิติผู้ป่วยสุขภาพจิต, ข้อมูลจากฐานข้อมูลสุขภาพจิต (mentalMessage ใส่คำถามเต็มของผู้ใช้, mentalTable ใส่ชื่อตาราง เช่น 'bipola')
- ถ้า useThaijo=true:
  - thaijoTerm: คำสำคัญสั้นๆ (Key phrase) เช่น "เบาหวาน", "บุหรี่มือสอง", "อุบัติเหตุ"
  - thaijoPage: ปกติคือ 1
  - thaijoSize: จำนวนบทความที่ต้องการ (ปกติคือ 3-5 ถ้าถามแบบภาพรวม, แต่ถ้าขอดูเยอะๆ หรือระบุว่าขอสิบรายการ ให้เพิ่มเป็น 10-20 ตามความเหมาะสม ไม่เกิน 30) ถ้าทำนโยบาย เขียนแผนงาน ให้ใส่เป็น 5-10 เพื่อให้ได้ข้อมูลหลากหลาย
- ถ้า useAccident=true ให้ใส่ accidentMessage เป็นคำถามเต็มของผู้ใช้
- ถ้า useChatweather=true ให้กำหนด lat/lon ให้เหมาะสม และ days ช่วง 1-14 (default 7)
- ตอบเฉพาะ JSON object เท่านั้น ห้ามมีคำอธิบาย

ตัวอย่างคำถามที่ควร useThaijo=true:
- "หางานวิจัยเรื่องสุขภาพจิตวัยรุ่นให้หน่อย" -> size: 3
- "ขอข้อมูลสถิติงานวิจัยเกี่ยวกับโซเดียม 10 รายการ" -> size: 10
- "รวมบทความวิจัยเรื่องอุบัติเหตุทางถนน 5 หัวข้อล่าสุด" -> size: 5

ข้อมูลพิกัดแนะนำ (ใช้เมื่อผู้ใช้ระบุจังหวัด):
- อุบลราชธานี: lat 15.2447, lon 104.8472
- กรุงเทพฯ: lat 13.7563, lon 100.5018
- เชียงใหม่: lat 18.7883, lon 98.9853
- ขอนแก่น: lat 16.4322, lon 102.8236
- สงขลา: lat 7.1756, lon 100.6143

คำถามผู้ใช้: "${text}"
      `;

      const parseDecision = (rawText: string): AdminApiIntentDecision | null => {
        const raw = (rawText || '').trim();
        if (!raw) return null;

        const cleaned = raw
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();

        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const jsonText = firstBrace >= 0 && lastBrace > firstBrace
          ? cleaned.slice(firstBrace, lastBrace + 1)
          : cleaned;

        try {
          const parsed = JSON.parse(jsonText);
          if (!parsed || typeof parsed !== 'object') return null;
          return parsed as AdminApiIntentDecision;
        } catch {
          return null;
        }
      };

      const callPlannerOnce = async (prompt: string, temperature: number): Promise<AdminApiIntentDecision | null> => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature,
            }
          })
        });

        const raw = await readGeminiSseText(response) || '{}';
        return parseDecision(raw);
      };

      let decision = await callPlannerOnce(planningPrompt, 0.1);

      if (!decision) {
        const retryPrompt = `${planningPrompt}\n\nย้ำอีกครั้ง: ตอบเฉพาะ JSON object ตาม schema เดิมเท่านั้น`;
        decision = await callPlannerOnce(retryPrompt, 0);
      }

      if (!decision) return [];

      const normalizedCalls: AdminApiCallPlan[] = [];

      if (decision.useAccident === true) {
        normalizedCalls.push({
          endpoint: 'accident',
          payload: {
            message: String(decision.accidentMessage || text),
          },
        });
      }

      if (decision.useThaijo === true) {
        console.log(`🔎 AI Planner Decision -> ThaiJO: term="${decision.thaijoTerm}", page=${decision.thaijoPage}, size=${decision.thaijoSize}`);
        normalizedCalls.push({
          endpoint: 'thaijo',
          payload: {
            term: String(decision.thaijoTerm || text).substring(0, 50),
            page: Number(decision.thaijoPage || 1),
            size: Math.min(30, Math.max(1, Number(decision.thaijoSize || 3))),
            strict: true,
            title: true,
            author: true,
            abstract: true,
          },
        });
      }

      if (decision.useDiabetes === true) {
        normalizedCalls.push({
          endpoint: 'diabetes',
          payload: {
            message: String(decision.diabetesMessage || text),
          },
        });
      }

      if (decision.useMental === true) {
        normalizedCalls.push({
          endpoint: 'mental',
          payload: {
            message: String(decision.mentalMessage || text),
            tableName: String(decision.mentalTable || 'bipola'),
          },
        });
      }

      if (decision.useChatweather === true) {
        const latRaw = Number(decision.lat);
        const lonRaw = Number(decision.lon);
        const daysRaw = Number(decision.days ?? 7);

        const lat = Number.isFinite(latRaw) ? latRaw : 13.7563;
        const lon = Number.isFinite(lonRaw) ? lonRaw : 100.5018;
        const days = Number.isFinite(daysRaw) ? Math.min(14, Math.max(1, Math.floor(daysRaw))) : 7;

        normalizedCalls.push({
          endpoint: 'chatweather',
          payload: { lat, lon, days },
        });
      }

      console.log('🧠 AI planner decision:', decision);
      return normalizedCalls;
    } catch (error) {
      console.error('AI API planner error:', error);
      return [];
    }
  };

  const runPlannedAdminApis = async (plans: AdminApiCallPlan[]): Promise<{ context: string, raw: any[] }> => {
    if (!plans.length) return { context: '', raw: [] };

    const dedupedPlans = plans.filter((plan, index, arr) =>
      index === arr.findIndex((item) => item.endpoint === plan.endpoint)
    );

    const results = await Promise.all(
      dedupedPlans.map(async (plan) => {
        try {
          const endpoint = `/api/admin/${plan.endpoint}`;
          console.log('📡 AI dispatch API:', {
            endpoint,
            payload: plan.payload,
          });

          const response = await fetchWithAuth(endpoint, {
            method: 'POST',
            body: JSON.stringify(plan.payload),
          });

          const data = await response.json().catch(() => ({}));
          console.log('✅ AI API response:', {
            endpoint,
            ok: response.ok,
            status: response.status,
          });

          return {
            endpoint: plan.endpoint,
            payload: plan.payload,
            ok: response.ok,
            status: response.status,
            data,
          };
        } catch (error: any) {
          console.error('❌ AI API request failed:', {
            endpoint: plan.endpoint,
            error: error?.message || 'Unknown error',
          });

          return {
            endpoint: plan.endpoint,
            payload: plan.payload,
            ok: false,
            status: 0,
            data: { message: error?.message || 'Unknown error' },
          };
        }
      })
    );

    const compact = results.map((result) => {
      if (result.endpoint === 'accident') {
        return {
          endpoint: result.endpoint,
          ok: result.ok,
          status: result.status,
          sql: result.data?.sql,
          reply: result.data?.reply,
          total: result.data?.total,
          rows: Array.isArray(result.data?.rows) ? result.data.rows.slice(0, 30) : [],
          message: result.data?.message,
        };
      }

      if (result.endpoint === 'thaijo') {
        const thaijoData = (result.data as any)?.result || (result.data as any)?.results || result.data || {};
        let articles = Array.isArray(thaijoData) 
          ? thaijoData 
          : ((thaijoData as any)?.articles || (thaijoData as any)?.results || (thaijoData as any)?.result || []);
          
        const requestedSize = (result.payload as any)?.size || 3;
        const totalFound = (articles as any).length || 0;
        
        console.log(`📦 ThaiJO Data to AI: Found ${totalFound} articles, requested ${requestedSize}`);

        return {
          endpoint: result.endpoint,
          ok: result.ok,
          status: result.status,
          term: (result.payload as any)?.term,
          articles: Array.isArray(articles) ? articles.slice(0, Math.max(3, requestedSize)) : [],
          message: (result.data as any)?.message,
        };
      }

      if (result.endpoint === 'diabetes') {
        return {
          endpoint: result.endpoint,
          ok: result.ok,
          status: result.status,
          sql: result.data?.sql,
          reply: result.data?.reply,
          chart: result.data?.chart || null,
          total: result.data?.total,
          rows: Array.isArray(result.data?.rows) ? result.data.rows.slice(0, 50) : [],
          message: result.data?.message,
        };
      }

      if (result.endpoint === 'mental') {
        return {
          endpoint: result.endpoint,
          ok: result.ok,
          status: result.status,
          sql: result.data?.sql,
          reply: result.data?.reply,
          chart: result.data?.chart || null,
          total: result.data?.total,
          tableName: result.data?.tableName,
          rows: Array.isArray(result.data?.rows) ? result.data.rows.slice(0, 50) : [],
          message: result.data?.message,
        };
      }

      return {
        endpoint: result.endpoint,
        ok: result.ok,
        status: result.status,
        lat: result.data?.lat,
        lon: result.data?.lon,
        days: result.data?.days,
        summary: result.data?.summary,
        table: result.data?.table,
        reply: result.data?.reply,
        message: result.data?.message,
      };
    });

    return {
      context: [
        '## ADMIN_API_RESULTS',
        JSON.stringify(compact),
        '## END_ADMIN_API_RESULTS',
        '',
        'ข้อกำหนด: หากมี ADMIN_API_RESULTS ให้เรียบเรียงคำตอบโดยยึดข้อมูลจากผล API นี้เป็นหลัก และถ้าบาง endpoint ล้มเหลวให้แจ้งเหตุผลสั้นๆ',
      ].join('\n'),
      raw: compact
    };
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
      setLoadingStatus('สสส กำลังวิเคราะห์เอกสารที่เกี่ยวข้อง...');
      const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      
      // เตรียมข้อมูล metadata สำหรับให้ AI ตัดสินใจ (ลดข้อมูลเพื่อประหยัด Token)
      const metadataList = allReferences.map((ref) => ({
        title: ref.apa?.projectInfo?.titleThai || ref.apa?.titleThai || ref.meta?.file_name,
        author: ref.apa?.projectInfo?.responsibleAuthor || ref.apa?.projectInfo?.authorNames || 'ไม่ระบุ',
        organization: ref.apa?.projectInfo?.organization || 'ไม่ระบุ',
        abstract: (ref.apa?.abstract || '').substring(0, 300) + '...',
        projectInfo: ref.apa?.projectInfo || null,
        researchers: Array.isArray(ref.apa?.researchers) ? ref.apa.researchers : [],
        fileName: ref.meta?.file_name,
        filePath: ref.meta?.file_path || '/'
      }));

      // เรียก Gemini Flash (ประหยัดค่าใช้จ่ายและเร็ว) เพื่อเลือกไฟล์
      const selectionPrompt = `
        คุณคือ "ผู้ช่วยคัดเลือกเอกสารวิชาการ" ของ สสส.
        หน้าที่ของคุณคืออ่านรายการเอกสารด้านล่าง และเลือกเอกสารที่ "เกี่ยวข้องโดยตรง" กับคำถามของผู้ใช้
        
        คำถามผู้ใช้: "${query}"
        
        กติกาการเลือก:
        1. เลือกเฉพาะไฟล์ที่มีหัวข้อและเนื้อหา "ตรงประเด็นหลัก" (Primary Topic) ของคำถามเท่านั้น
        2. "ห้าม" เลือกไฟล์ที่แค่มีคำคล้ายกัน แต่ประเด็นหลักเป็นคนละเรื่อง (เช่น ถามเรื่อง "ซึมเศร้า" แต่ไฟล์หลักเป็น "เบาหวาน" ที่แค่มีบทคัดย่อกล่าวถึงเล็กน้อย ห้ามเลือกเด็ดขาด)
        3. เลือกมาไม่เกิน 10 ไฟล์ที่สำคัญที่สุด เอาเนื้อหาที่ตรงที่สุดเป็นหลัก ไม่ใช่แค่เกี่ยวข้องกว้างๆ
        4. ตอบกลับในรูปแบบ JSON Array ของชื่อไฟล์ (fileName) เท่านั้น เช่น ["research_paper_01.pdf", "health_report.pdf"]
        5. หากไม่มีไฟล์ใดเกี่ยวข้องโดยตรงเลย ให้ตอบ [] เท่านั้น ห้ามอธิบายเพิ่ม
        6. ให้พิจารณาความสอดคล้องตามนี้เป็นลำดับสำคัญ:
            - ประเด็นหลักตรงกัน (เช่น สุขภาพจิต, โรคเรื้อรัง, อุบัติเหตุ)
            - กลุ่มเป้าหมายตรงกัน (เช่น ผู้สูงอายุ, เด็ก, วัยทำงาน)
            - พื้นที่ระบุไว้ตรงกัน
        7. ห้ามเลือกไฟล์ที่แค่ "เกี่ยวข้องกว้างๆ" เช่น การส่งเสริมสุขภาพทั่วไป หากคำถามเจาะจงเรื่องโรค
        8. ถ้าไม่พบไฟล์ที่ตรงกับ Primary Topic จริงๆ ให้ตอบ [] ทันที ห้ามพยายามเลือกไฟล์อื่นมาทดแทน
        9. เรียงไฟล์จาก "ตรงที่สุด" ไป "รองลงมา"
        
        รายการเอกสาร:
        ${JSON.stringify(metadataList)}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${API_KEY}`, {
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

      const aiResponseText = await readGeminiSseText(response) || '[]';
      let selectedFileNames: string[] = [];
      try {
        selectedFileNames = JSON.parse(aiResponseText);
      } catch (e) {
        console.error('Failed to parse AI response:', aiResponseText);
      }
      
      if (!Array.isArray(selectedFileNames) || selectedFileNames.length === 0) {
        return [];
      }

      setLoadingStatus(`สสส เจอข้อมูล ${selectedFileNames.length} รายการ`);

      // โหมดเร็ว: ส่งเฉพาะ metadata + URL ของไฟล์ที่เลือก (ไม่ดาวน์โหลด PDF ทุกครั้ง)
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fileInfos = selectedFileNames
        .map((fileName: string) => {
          const cleanName = fileName.replace(/^\/+/g, '');
          const originalRef = allReferences.find(r => r.meta?.file_name === fileName);
          if (!originalRef) return null;

          const filePath = originalRef?.meta?.file_path || '%2F';
          return {
            name: cleanName,
            apa: originalRef?.apa || null,
            url: `${origin}/admin/view-pdf?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(cleanName)}`,
          };
        })
        .filter(Boolean) as any[];

      console.log(`✅ สสส เลือกเอกสารที่เกี่ยวข้องได้ ${fileInfos.length} รายการ (โหมด metadata เร็ว)`);
      return fileInfos;
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
    deleteSession,
    resetCurrentSession
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
    const sessionId = searchParams.get('session');

    // ถ้ามีการเปลี่ยน Session หรือเริ่มแชทใหม่ในขณะที่กำลัง loading ให้หยุด request เก่าก่อน
    // เพื่อป้องกันไม่ให้ async loop ของอันเก่าไป update state หรือ panel ของห้องใหม่
    if (isLoading) {
      console.log('🛑 Aborting background request due to session navigation');
      handleStop(true); 
    }

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
              maps: (m as any).maps,
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
          } else {
            setPlanContent('');
            setShowPlanPanel(false);
          }

          console.log('📝 Set messages to state:', loadedMessages.length, 'messages');

          // URL parameter จะถูกใช้งานจนกว่าจะเปลี่ยนหน้า
          // เราไม่ต้อง Clear หรือถ้าจะ Clear ให้แน่ใจว่าไม่ลูป
        } else {
          console.error('❌ Session not found:', sessionId);
          // ถ้าไม่พบ session ให้ล้างหน้าจอ
          setMessages([]);
          setPlanContent('');
          setShowPlanPanel(false);
        }
      }).catch(error => {
        console.error('❌ Error loading session:', error);
      });
    } else {
      // ถ้าไม่มี sessionId ใน URL ให้ล้างหน้าจอเพื่อเตรียม New Chat
      console.log('✨ Starting new chat (no session ID)');
      setMessages([]);
      setPlanContent('');
      setShowPlanPanel(false);
      resetCurrentSession();
    }
  }, [loadSession, activationChecked, searchParams, resetCurrentSession]);

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

    const optimisticUserMessage: Message = {
      role: 'user',
      content: prompt,
      images: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
    };
    setMessages(prev => [...prev, optimisticUserMessage]);

    // Smart File Search + Tool preflight (รันคู่ขนาน)
    const contextForSearch = messages.length > 0 
      ? `ประวัติการคุย: ${messages.slice(-2).map(m => m.content).join(' | ')}\nคำถามปัจจุบัน: ${prompt}`
      : prompt;

    const autoSearchPromise = searchRelevantFiles(contextForSearch);

    const aiToolPromise = selectedTool
      ? Promise.resolve(selectedTool)
      : aiDetectTool(prompt);

    const adminPlanPromise = aiPlanAdminApiCalls(prompt);

    const autoAttachedFiles = await autoSearchPromise;
    if (autoAttachedFiles.length > 0) {
      console.log('📎 Auto-attached files:', autoAttachedFiles.map(f => f.name).join(', '));
    } else {
      console.log('⏩ Auto file search found no direct match');
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

    const userMessageForStorage: Message = {
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
      ...userMessageForStorage,
      timestamp: new Date().toISOString()
    });
    console.log('💾 Saved user message to session:', sessionId);

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
    const recentMessages = messages.slice(-20); // หน่วยความจำย้อนหลัง 20 ข้อความ

    // หา index ของ planContent ล่าสุด เพื่อ include เต็ม ๆ เฉพาะอันนั้น อันเก่า truncate
    const lastPlanIdx = [...recentMessages].reverse().findIndex(m => m.planContent);
    const lastPlanAbsIdx = lastPlanIdx >= 0 ? recentMessages.length - 1 - lastPlanIdx : -1;

    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        let fullContent = msg.content;
        if (msg.planContent) {
          if (i === lastPlanAbsIdx) {
            // plan ล่าสุด — include เต็ม เพื่อให้ AI จำบริบทสำคัญ
            fullContent = `${msg.content}\n\n[เนื้อหาในแผงแผนงาน]:\n${msg.planContent}`;
          } else {
            // plan เก่า — truncate เพื่อไม่ให้บวม context
            const truncated = msg.planContent.substring(0, 800);
            fullContent = `${msg.content}\n\n[สรุปแผนงานก่อนหน้า (ตัดทอน)]:\n${truncated}…`;
          }
        }
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
    
    // ไฟล์ auto-search ใช้เป็น metadata context (ไม่แนบ PDF binary เพื่อให้เริ่มตอบเร็ว)
    if (autoAttachedFiles && autoAttachedFiles.length > 0) {
      console.log('📎 Fast metadata context enabled for auto-selected files');
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
    if (effectiveTool) {
      console.log('🧰 selectedTool (manual):', effectiveTool);
    }

    if (!effectiveTool) {
      effectiveTool = await aiToolPromise;
      console.log('🤖 selectedTool (AI detect):', effectiveTool ?? 'null');
      if (effectiveTool) {
        // เปิดแผงด้านข้างสำหรับเครื่องมือที่ต้องการพื้นที่แสดงผลเพิ่มเติม
        if (['เขียนแผนงาน', 'สรุปรายงาน', 'เทียบข้อมูล'].includes(effectiveTool)) {
          setPlanContent('');
          setShowPlanPanel(true);
        }
      }
    }

    console.log('✅ selectedTool (effective):', effectiveTool ?? 'null');

    const plannedAdminCalls = await adminPlanPromise;
    console.log('🧭 planned admin API calls:', plannedAdminCalls);

    let adminApiResults: any[] = [];
    if (plannedAdminCalls.length > 0) {
      setLoadingStatus('สสส กำลังเรียกใช้ข้อมูลจากระบบภายใน...');
      const { context: adminApiContext, raw } = await runPlannedAdminApis(plannedAdminCalls);
      adminApiResults = raw;

      if (adminApiContext) {
        const lastMsg = contents[contents.length - 1];
        const textPart = lastMsg?.parts?.find((part: any) => part.text !== undefined);
        if (textPart) {
          textPart.text += `\n\n${adminApiContext}`;
        } else {
          lastMsg.parts.push({ text: adminApiContext });
        }
      }
    }

    const usedAdminEndpoints = plannedAdminCalls.map((plan) => `/api/admin/${plan.endpoint}`);
    await performGeminiRequest(contents, effectiveTool, files, sessionId, controller, autoAttachedFiles, usedAdminEndpoints, adminApiResults);
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
    autoAttachedFiles?: any[],
    usedAdminEndpoints: string[] = [],
    adminApiResults: any[] = [] // <--- Add this!
  ) => {
    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    console.log('🚀 performGeminiRequest selectedTool:', selectedTool ?? 'null');

    try {
      setLoadingStatus('สสส กำลังระบุหัวข้อและวิเคราะห์เนื้อหา...');
      const manualFileCount = files?.length || 0;
      const autoFileCount = autoAttachedFiles?.length || 0;
      const totalAttachedFileCount = manualFileCount + autoFileCount;
      const isSpecialTool = !!(selectedTool && [
        'เขียนแผนงาน', 'สรุปรายงาน', 'เทียบข้อมูล', 'สร้างกราฟ',
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
        } else if (selectedTool === 'ค้นหาข้อมูล') {
          currentSystemPrompt = PROMPT_SEARCH;
        } else if (selectedTool === 'A = บทความต้นฉบับ') {
          currentSystemPrompt = PROMPTA;
        } else if (selectedTool === 'B = แนวทางการเฝ้าระวัง สอบสวน ควบคุมโรค') {
          currentSystemPrompt = PROMPTB;
        } else if (selectedTool === 'C = สถานการณ์โรค') {
          currentSystemPrompt = PROMPTC;
        }
      } else if (selectedTool === 'สร้างกราฟ') {
        // สร้างกราฟ: ไม่ใช่ special tool (ผลไม่ไปที่ plan panel) แต่ใช้ prompt เฉพาะ
        currentSystemPrompt = PROMPT_CHART_DOC;
      } else if (totalAttachedFileCount > 0) {
        // หากมีการค้นพบไฟล์อัตโนมัติ ให้ใช้ PROMPT_STEP_READ เพื่อวิเคราะห์และอ้างอิง
        currentSystemPrompt = PROMPT_STEP_READ;
      }

      const systemInstruction = {
        role: 'system',
        parts: [{ 
          text: (isSpecialTool || currentSystemPrompt === PROMPT_STEP_READ)
            ? currentSystemPrompt + "\n\n(โปรดเขียนเนื้อหาให้ละเอียดและครอบคลุมทุกมิติ ห้ามสรุปจบเร็วเกินไป ห้ามทวนคำสั่งเดิม และต้องเขียนให้จบประโยคห้ามค้างคา)"
            : currentSystemPrompt
        }]
      };

      const generationConfig = {
        temperature: isSpecialTool ? 0.8 : 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: (isSpecialTool || totalAttachedFileCount >= 2) ? 65536 : 4096,
      };

      // --- ส่วนการเรียก API (Unified Flow) ---

      // สร้างส่วนเสริมข้อมูลอ้างอิงจากไฟล์ (ใช้ทั้งแชทปกติและ Special Tools)
      let fileContext = '';
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      let allFileInfos: any[] = [];
      let hasAutoAttached = false;
      
      // 🔍 ขั้นตอนที่ 1: ค้นหาและรวบรวมไฟล์จาก Minio (สำหรับทุกโหมด)
      setLoadingStatus('สสส กำลังรวบรวมข้อมูลจากเอกสารอ้างอิง...');
      
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

      // 3. ✨ ใหม่: เพิ่มรายการจาก ThaiJO API เพื่อให้นำไปอ้างอิงในบรรณานุกรมได้ด้วย
      const thaijoResult = adminApiResults.find(r => r.endpoint === 'thaijo');
      if (thaijoResult && Array.isArray(thaijoResult.articles)) {
        const thaijoFileInfos = thaijoResult.articles.map((art: any) => {
          // ดึงผู้แต่งอย่างละเอียด (รองรับทั้ง Array และ String พร้อม fallback หลายรูปแบบ)
          let finalAuthor = 'ไม่ระบุผู้แต่ง';
          const rawAuthors = art.authors || art.author || art.author_name || art.author_name_th || art.authorNames || art.authorName;
          
          if (Array.isArray(rawAuthors)) {
            const filteredAuthors = rawAuthors.map(a => 
              typeof a === 'string' ? a : (a?.name || a?.name_th || '')
            ).filter(a => typeof a === 'string' && a.trim() !== '');
            
            if (filteredAuthors.length > 0) {
              finalAuthor = filteredAuthors.join(', ');
            }
          } else if (typeof rawAuthors === 'string' && rawAuthors.trim()) {
            finalAuthor = rawAuthors.trim();
          } else if (rawAuthors && typeof rawAuthors === 'object') {
            finalAuthor = rawAuthors.name || rawAuthors.name_th || 'ไม่ระบุผู้แต่ง';
          }

          return {
            name: art.title || art.title_th || art.article_title || art.articleTitle || 'บทความวิจัยจาก ThaiJO',
            apa: {
              projectInfo: {
                titleThai: art.title || art.title_th || art.article_title || art.articleTitle || 'ไม่ระบุชื่อบทความ',
                responsibleAuthor: finalAuthor,
                organization: art.journal_name || art.source || art.journalName || 'ฐานข้อมูล ThaiJO'
              },
              abstract: art.abstract || art.description || art.article_abstract || ''
            },
            url: art.url || art.link || art.article_url || '#',
            source: 'thaijo'
          };
        });
        allFileInfos = [...allFileInfos, ...thaijoFileInfos];
      }

      const referenceProducers = allFileInfos.map((info) => {
        const author = info.apa?.projectInfo?.responsibleAuthor || info.apa?.projectInfo?.authorNames || 'ไม่ระบุผู้แต่ง';
        const organization = info.apa?.projectInfo?.organization || '';
        return organization ? `${author}, ${organization}` : author;
      });

      // วันที่ปัจจุบันสำหรับใช้ในส่วนอ้างอิง
      const now = new Date();
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const dateStr = `${thaiMonths[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

      // 📋 สร้าง File Context จากไฟล์ที่รวบรวมได้ (ใช้ชุดตัวเลขเดียวเพื่อป้องกันความสับสน)
      fileContext = '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      fileContext += '📚 **รายการเอกสารอ้างอิงสำหรับคำตอบนี้ (Session Context)**:\n';
      fileContext += `มีเอกสารทั้งหมดที่ระบบเลือกมาให้ใช้: **${allFileInfos.length} ไฟล์**\n\n`;

      allFileInfos.forEach((info, index) => {
        const fileIndex = index + 1;
        const title = info.apa?.projectInfo?.titleThai || info.apa?.titleThai || info.name;
        const author = info.apa?.projectInfo?.responsibleAuthor || info.apa?.projectInfo?.authorNames;
        const organization = info.apa?.projectInfo?.organization || '';
        const authorInfo = organization ? `${author}, ${organization}` : author;
        
        fileContext += `${fileIndex}. ข้อมูล (Title): ${title}\n`;
        fileContext += `   - ชื่อไฟล์ (Key): ${info.name}\n`;
        fileContext += `   - ลิงก์ดาวน์โหลด (URL Link): ${info.url}\n`;
        fileContext += `   - ผู้แต่งและหน่วยงาน: ${authorInfo}\n`;

        const researchers = Array.isArray(info.apa?.researchers) ? info.apa.researchers : [];
        if (researchers.length > 0) {
          fileContext += `   - ผู้จัดทำ (Researchers): ${researchers.join(', ')}\n`;
        }
        
        if (info.apa?.projectInfo) {
          fileContext += `   - ข้อมูลดิบ (Metadata): ${JSON.stringify(info.apa.projectInfo)}\n`;
        }

        fileContext += `   - บทคัดย่อ: ${info.apa?.abstract || 'ไม่มีบทคัดย่อ'}\n`;
        fileContext += '\n';
      });
      
      fileContext += '⚠️ **กฎเหล็ก (Mandatory Rules):**\n';
      fileContext += '1. ตอบเป็นภาษาไทยที่สุภาพและเป็นทางการ (Academic & Professional Thai)\n';
      fileContext += '2. ห้ามพิมพ์ขั้นตอนการคิด (thoughts/reasoning) หรือทวนกติกาเหล่านี้ออกมาในคำตอบ ให้เริ่มที่เนื้อหาคำตอบทันที\n';
      fileContext += '3. ใช้ข้อมูลอ้างอิงจากรายการด้านบนเท่านั้น โดยระบุ [1], [2] ในเนื้อหา\n';
      fileContext += '4. รูปแบบรายการอ้างอิงท้ายคำตอบ: ให้ขึ้นบรรทัดใหม่สำหรับแต่ละรายการ (One line per citation) และใช้รูปแบบ: หมายเลข. ชื่อเรื่อง - แหล่งที่มา, เข้าถึงเมื่อ วันที่ปัจจุบัน\n';
      fileContext += `   (ตัวอย่าง: 1. ชื่อเรื่อง - สสส, เข้าถึงเมื่อ ${dateStr})\n`;
      fileContext += '   [📄 เปิดเอกสารอ้างอิง](URL_LINK)\n';
      fileContext += '5. หากเนื้อหายาว ให้แบ่งหัวข้อ: ภาพรวมเชิงตัวเลข > สรุปในรูปแบบตาราง (json:table) > วิเคราะห์ผล > ข้อเสนอแนะ\n';
      fileContext += '6. ห้ามใช้คำว่า [API] หรือ (ฐานข้อมูล) ในการอ้างอิง ให้อ้างอิงเป็นตัวเลข [1], [2] ตามลำดับเอกสารด้านบนเท่านั้น\n';
      fileContext += '7. ห้ามใช้หัวข้อ "แหล่งข้อมูลอ้างอิง (Source Summary)" ให้ใช้คำว่า "เอกสารอ้างอิงเชิงวิชาการ" แทน\n';
      fileContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

      setLoadingStatus('สสส กำลังหาข้อมูลและประมวลผล...');

      // ปรับปรุงคำสั่งเมื่อมีการทำงานร่วมกับไฟล์หรือเครื่องมือพิเศษ
      // 💡 ย้ายไปไว้ใน System Instruction เพื่อให้ AI ไม่สับสนและไม่พิมพ์ Thought ออกมา
      if (isSpecialTool || allFileInfos.length > 0) {
        let instructions = `\n\n${fileContext}`;
        if (isSpecialTool) {
          instructions += `\n\n(ภารกิจปัจจุบัน: ${selectedTool} - โปรดใช้ข้อมูลจากไฟล์ที่ระบุในรายการ [1] ถึง [${allFileInfos.length}] เท่านั้น ห้ามอ้างอิงนอกเหนือจากนี้)`;
        }
        systemInstruction.parts[0].text += instructions;
      }

      if (!isSpecialTool && allFileInfos.length === 0 && usedAdminEndpoints.length === 0) {
        systemInstruction.parts[0].text += '\n\nข้อกำหนดบังคับ: รอบนี้ไม่มีไฟล์อ้างอิงและไม่มีข้อมูลจาก API เพิ่มเติม ห้ามสร้างหัวข้อเอกสารอ้างอิง ห้ามใส่ [1] [2] หรือ URL อ้างอิงใดๆ';
      }

      if (usedAdminEndpoints.includes('/api/admin/diabetes')) {
        const diabetesInstruction = `

ข้อกำหนดเพิ่มเติมเมื่อมีข้อมูลเบาหวาน (ADMIN_API_RESULTS จาก diabetes):
- ให้วิเคราะห์และสรุปข้อมูลจากผลลัพธ์ diabetes API เป็นหลัก
- ถ้าผลลัพธ์มีข้อมูลตัวเลข ให้สร้าง JSON Chart ท้ายคำตอบในรูปแบบ:

\`\`\`json:chart-ai
{
  "type": "bar",
  "title": "ชื่อกราฟ",
  "data": {
    "labels": ["พื้นที่1", "พื้นที่2"],
    "datasets": [{
      "label": "ชื่อชุดข้อมูล",
      "data": [100, 200]
    }]
  }
}
\`\`\`

- ใช้ข้อมูลจาก rows ใน ADMIN_API_RESULTS เป็นตัวเลขจริงในกราฟ
- ห้ามสร้างตัวเลขสมมติ ให้ใช้แค่ค่าจากฐานข้อมูลจริงเท่านั้น`;
        systemInstruction.parts[0].text += diabetesInstruction;
      }

      if (usedAdminEndpoints.includes('/api/admin/mental')) {
        const mentalInstruction = `

ข้อกำหนดเพิ่มเติมเมื่อมีข้อมูลสุขภาพจิต (ADMIN_API_RESULTS จาก mental):
- ให้วิเคราะห์และสรุปข้อมูลจากผลลัพธ์ mental API เป็นหลัก
- ถ้าผลลัพธ์มีข้อมูลตัวเลข ให้สร้าง JSON Chart ท้ายคำตอบในรูปแบบ:

\`\`\`json:chart-ai
{
  "type": "bar",
  "title": "ชื่อกราฟ",
  "data": {
    "labels": ["รายการที่1", "รายการที่2"],
    "datasets": [{
      "label": "ชื่อชุดข้อมูล",
      "data": [100, 200]
    }]
  }
}
\`\`\`

- ใช้ข้อมูลจาก rows ใน ADMIN_API_RESULTS เป็นตัวเลขจริงในกราฟ
- ห้ามสร้างตัวเลขสมมติ ให้ใช้แค่ค่าจากฐานข้อมูลจริงเท่านั้น`;
        systemInstruction.parts[0].text += mentalInstruction;
      }

      if (usedAdminEndpoints.includes('/api/admin/accident')) {
        const mapInstruction = `

ข้อกำหนดเพิ่มเติมเมื่อมีข้อมูลอุบัติเหตุ:
- สรุปให้มีรายละเอียดที่ตรวจสอบได้: วันที่, เวลา, จุดเกิดเหตุ/สายทาง, LATITUDE, LONGITUDE, และประเภทรถ
- ถ้าผลลัพธ์มีพิกัดอย่างน้อย 1 จุด ให้แนบ JSON แผนที่ท้ายคำตอบในรูปแบบ code block ด้านล่างเท่านั้น

\`\`\`json:map-ai
{
  "type": "map",
  "title": "จุดเกิดเหตุสำคัญ",
  "points": [
    {
      "lat": 15.2447,
      "lon": 104.8472,
      "location": "จุดเกิดเหตุ",
      "road": "ชื่อสายทาง",
      "area": "บริเวณที่เกิดเหตุ",
      "date": "วันที่เกิดเหตุ",
      "time": "เวลา",
      "vehicleType": "ประเภทรถ"
    }
  ]
}
\`\`\`

- ห้ามใส่ข้อมูลสมมติ ถ้าไม่พบพิกัดหรือข้อมูลใดให้เว้นหรือระบุว่าไม่พบตามจริง`; 
        systemInstruction.parts[0].text += mapInstruction;
      }
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${API_KEY}`, {
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

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ไม่สามารถอ่าน stream response ได้');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const appendFromSseEvent = (eventBlock: string) => {
        const lines = eventBlock
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;

          try {
            const json = JSON.parse(payload);
            const parts = json?.candidates?.[0]?.content?.parts || [];
            const chunkText = Array.isArray(parts)
              ? parts
                  .filter((p: any) => !p.thought && p.text) // กรองส่วนที่เป็น thought process ออก
                  .map((p: any) => p.text)
                  .join('')
              : '';

            if (chunkText) {
              accumulatedResponse += chunkText;
              if (isSpecialTool) {
                setPlanContent(accumulatedResponse);
              }
            }
          } catch {
            // ignore malformed chunk
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          appendFromSseEvent(eventBlock);
        }
      }

      if (buffer.trim()) {
        appendFromSseEvent(buffer);
      }
      
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
        setLoadingStatus('สสส กำลังจัดรูปแบบข้อมูลและสร้างสื่อเสริม...');
        // ประมวลผลสำหรับแชทปกติ (Charts, Tables, CodeBlocks)
        const charts: any[] = [];
        const tables: any[] = [];
        const maps: any[] = [];
        const codeBlocks: Array<{ code: string; language: string }> = [];
        
        let processedContent = accumulatedResponse.replace(/```json:chart(?:-ai)?\s*\n?([\s\S]*?)```/gi, (match, p1) => {
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

        processedContent = processedContent.replace(/```json:table(?:-ai)?\s*\n?([\s\S]*?)```/gi, (match, p1) => {
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

        processedContent = processedContent.replace(/```json:map(?:-ai)?\s*\n?([\s\S]*?)```/gi, (match, p1) => {
          try {
            const cleanJson = p1
              .replace(/\/\/.*$/gm, '')
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .replace(/,(\s*[\]}])/g, '$1')
              .trim();
            const mapData = JSON.parse(cleanJson);
            maps.push(mapData);
            return `<MapAI index="${maps.length - 1}" />`;
          } catch (e) {
            console.error('Map JSON Parse Error:', e);
            return match;
          }
        });

        // รองรับกรณี AI ส่งเป็น ```json ปกติ แต่มีโครงสร้าง table/chart
        processedContent = processedContent.replace(/```json\s*\n?([\s\S]*?)```/gi, (match, p1) => {
          try {
            const cleanJson = p1
              .replace(/\/\/.*$/gm, '')
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .replace(/,(\s*[\]}])/g, '$1')
              .trim();

            const parsed = JSON.parse(cleanJson);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              return match;
            }

            const nestedTable = (parsed as any)?.table && typeof (parsed as any).table === 'object' && !Array.isArray((parsed as any).table)
              ? (parsed as any).table
              : null;
            const nestedChart = (parsed as any)?.chart && typeof (parsed as any).chart === 'object' && !Array.isArray((parsed as any).chart)
              ? (parsed as any).chart
              : null;
            const nestedMap = (parsed as any)?.map && typeof (parsed as any).map === 'object' && !Array.isArray((parsed as any).map)
              ? (parsed as any).map
              : null;

            const rawType = String((parsed as any).type || '').toLowerCase();
            const nestedRawType = String((nestedChart as any)?.type || '').toLowerCase();
            const isChartByType = ['bar', 'line', 'pie', 'doughnut', 'chart'].includes(rawType);
            const isNestedChartByType = ['bar', 'line', 'pie', 'doughnut', 'chart'].includes(nestedRawType);
            const hasChartShape =
              (Array.isArray((parsed as any)?.data?.labels) && Array.isArray((parsed as any)?.data?.datasets)) ||
              (Array.isArray((parsed as any)?.labels) && Array.isArray((parsed as any)?.datasets)) ||
              (Array.isArray((nestedChart as any)?.data?.labels) && Array.isArray((nestedChart as any)?.data?.datasets)) ||
              (Array.isArray((nestedChart as any)?.labels) && Array.isArray((nestedChart as any)?.datasets));

            const isTableByType = rawType === 'table';
            const hasTableShape =
              Array.isArray((parsed as any)?.rows) ||
              Array.isArray((parsed as any)?.data) ||
              Array.isArray((parsed as any)?.items) ||
              Array.isArray((nestedTable as any)?.rows) ||
              Array.isArray((nestedTable as any)?.data) ||
              Array.isArray((nestedTable as any)?.items);

            const isMapByType = rawType === 'map';
            const hasMapShape =
              Array.isArray((parsed as any)?.points) ||
              Array.isArray((nestedMap as any)?.points) ||
              (Array.isArray((parsed as any)?.rows) && (parsed as any).rows.some((row: any) => row && typeof row === 'object' && (
                row.lat !== undefined || row.latitude !== undefined
              ) && (
                row.lon !== undefined || row.lng !== undefined || row.longitude !== undefined
              )));

            const isMapPointList = Array.isArray((parsed as any)?.points)
              ? (parsed as any).points.some((row: any) => row && typeof row === 'object' && (
                  row.lat !== undefined || row.latitude !== undefined
                ) && (
                  row.lon !== undefined || row.lng !== undefined || row.longitude !== undefined
                ))
              : false;

            if (nestedMap && (Array.isArray((nestedMap as any)?.points) || isMapByType || hasMapShape)) {
              maps.push(nestedMap);
              return `<MapAI index="${maps.length - 1}" />`;
            }

            if (isMapByType || hasMapShape || isMapPointList) {
              maps.push(parsed);
              return `<MapAI index="${maps.length - 1}" />`;
            }

            if (nestedTable && (Array.isArray((nestedTable as any)?.rows) || Array.isArray((nestedTable as any)?.data) || Array.isArray((nestedTable as any)?.items))) {
              tables.push(nestedTable);
              return `<TableAI index="${tables.length - 1}" />`;
            }

            if (nestedChart && (isNestedChartByType || hasChartShape)) {
              charts.push(nestedChart);
              return `<ChartAI index="${charts.length - 1}" />`;
            }

            if (isChartByType || hasChartShape) {
              charts.push(parsed);
              return `<ChartAI index="${charts.length - 1}" />`;
            }

            if (isTableByType || hasTableShape) {
              tables.push(parsed);
              return `<TableAI index="${tables.length - 1}" />`;
            }

            return match;
          } catch (e) {
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
        finalSanitized = simplifyReferenceLinks(finalSanitized);
        finalSanitized = fixCitationSpacing(finalSanitized);
        finalSanitized = enforceReferenceProducer(finalSanitized, referenceProducers);

        // ✨ ใหม่: แปลง [API] เป็นตัวเลขที่ถูกต้อง (เช่น [4]) ถ้า AI ยังเผลอใช้
        const firstApiIdx = allFileInfos.findIndex(f => f.source === 'thaijo') + 1;
        if (firstApiIdx > 0) {
          finalSanitized = finalSanitized.replace(/\[API\]/g, `[${firstApiIdx}]`);
        }

        if (allFileInfos.length === 0 && usedAdminEndpoints.length === 0) {
          finalSanitized = removeDocumentReferenceSection(finalSanitized);
          finalSanitized = finalSanitized.replace(/\[(\d+)\]/g, '');
        }

        // กรณีที่การ Clean ทำให้ข้อความว่างเปล่า (เช่น มีแต่คำแนะนำคำถามต่อ)
        // ให้ใช้ข้อความดั้งเดิมที่ Trim แล้ว หรือข้อความเริ่มต้นหากว่างจริงๆ
        if (!finalSanitized && !charts.length && !tables.length && !maps.length && !codeBlocks.length) {
          if (fups.length > 0) {
            finalSanitized = "นี่คือประเด็นที่น่าสนใจที่คุณสามารถถามต่อได้ครับ:";
          } else {
            finalSanitized = processedContent.trim() || "...";
          }
        }

        // 💉 inject chart จาก diabetes API (ที่ AI วิเคราะห์แล้วใน route.ts)
        // กรณีที่ AI ตอบกลับแต่ไม่ได้ generate ```json:chart-ai``` มาเอง
        for (const apiResult of adminApiResults) {
          if (apiResult.endpoint === 'diabetes' && apiResult.chart && typeof apiResult.chart === 'object') {
            const hasDuplicateChart = charts.some(c =>
              JSON.stringify(c?.data?.labels) === JSON.stringify(apiResult.chart?.data?.labels)
            );
            if (!hasDuplicateChart) {
              charts.push(apiResult.chart);
            }
          }
          if (apiResult.endpoint === 'mental' && apiResult.chart && typeof apiResult.chart === 'object') {
            const hasDuplicateChart = charts.some(c =>
              JSON.stringify(c?.data?.labels) === JSON.stringify(apiResult.chart?.data?.labels)
            );
            if (!hasDuplicateChart) {
              charts.push(apiResult.chart);
            }
          }
        }

        const aiMessage: Message = {
          role: 'assistant',
          content: finalSanitized,
          charts: charts.length > 0 ? charts : undefined,
          tables: tables.length > 0 ? tables : undefined,
          maps: maps.length > 0 ? maps : undefined,
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
  const handleStop = async (preserveMessages: boolean = false) => {
    stopRequestedRef.current = true;
    setLoadingStatus('');
    try {
      abortControllerRef.current?.abort();
    } catch {}

    if (preserveMessages) {
       setIsLoading(false);
       return;
    }

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