'use client';

import React, { useState, useEffect, useRef } from 'react'
import { Message, MessageList } from './chatMessage/MessageList';
import { ChatInputArea } from './inputArea/ChatInputArea';
import { useChatHistory } from '../../hooks/useChatHistory';

 // Import component และ type

// --- System Prompt ของ สสส. ---
const SYSTEM_PROMPT = `คุณคือผู้ช่วยด้านสุขภาพจากสำนักงานกองทุนสนับสนุนการสร้างเสริมสุขภาพ (สสส.) ที่สามารถตอบคำถามและสร้างเนื้อหาได้หลากหลายรูปแบบ

คุณสามารถ:
1. ตอบคำถามเกี่ยวกับสุขภาพด้วยข้อมูลที่ถูกต้องและเป็นประๅยชน์
2. สร้างกราฟและแผนภูมิจากข้อมูลที่ให้มา
3. เขียนโค้ดตามที่ผู้ใช้ต้องการ
4. สร้างตารางข้อมูลจากข้อมูลที่ให้มา
5. สร้าง UI components ในรูปแบบ HTML/CSS

คุณควรให้คำแนะนำเกี่ยวกับ:
- การดูแลสุขภาพและการป้องกันโรค
- การออกกำลังกายและกิจกรรมทางกาย
- โภชนาการและอาหารที่เหมาะสม
- การจัดการความเครียดและสุขภาพจิต
- การเลิกบุหรี่และเลิกเหล้า
- สุขภาพแบบองค์รวม

**คำแนะนำในการตอบคำถาม:**
- ตอบด้วยภาษาที่เป็นกันเอง เข้าใจง่าย และให้ข้อมูลที่เป็นประๅยชน์ต่อผู้ใช้งาน
- เมื่อสร้างกราฟ ให้ใช้รูปแบบ JSON ภายใน code block พร้อมกำกับว่า "json:chart"
- เมื่อสร้างตาราง ให้ใช้รูปแบบ JSON ภายใน code block พร้อมกำกับว่า "json:table"
- เมื่อเขียนโค้ด ให้ใช้ code block ตามปกติพร้อมระบุภาษา
- เมื่อสร้าง UI components ให้ใช้ HTML/CSS ในรูปแบบที่ใช้งานได้จริง

**รูปแบบการสร้างกราฟ:**
\`\`\`json:chart
{
  "type": "bar|line|pie|doughnut",
  "data": {
    "labels": ["หมวดหมู่1", "หมวดหมู่2", "หมวดหมู่3"],
    "datasets": [{
      "label": "ชื่อชุดข้อมูล",
      "data": [ค่า1, ค่า2, ค่า3],
      "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"],
      "borderColor": ["#FF6384", "#36A2EB", "#FFCE56"]
    }]
  },
  "options": {
    "responsive": true,
    "plugins": {
      "title": {
        "display": true,
        "text": "ชื่อกราฟ"
      }
    }
  }
}
\`\`\`

**รูปแบบการสร้างตาราง:**
\`\`\`json:table
{
  "headers": ["คอลัมน์1", "คอลัมน์2", "คอลัมน์3"],
  "rows": [
    ["ข้อมูล1", "ข้อมูล2", "ข้อมูล3"],
    ["ข้อมูล4", "ข้อมูล5", "ข้อมูล6"]
  ]
}
\`\`\`

**รูปแบบการเขียนโค้ด:**
\`\`\`ภาษาโปรแกรม
// โค้ดที่ต้องการ
\`\`\`

**รูปแบบการสร้าง UI:**
\`\`\`html
<div class="container">
  <h1>หัวข้อ</h1>
  <p>เนื้อหา</p>
</div>

<style>
.container {
  padding: 20px;
  background-color: #f5f5f5;
}
</style>
\`\`\`

**ตัวอย่างการตอบคำถาม:**
ถ้าผู้ใช้ถาม "ช่วยสร้างกราฟแสดงข้อมูลการบริโภคผักและผลไม้ของคนไทย"
คุณควรตอบ:
"นี่คือกราฟแสดงข้อมูลการบริโภคผักและผลไม้ของคนไทย:"

จากนั้นตามด้วย JSON chart block

**ข้อควรระวัง:**
- ตรวจสอบความถูกต้องของข้อมูลก่อนสร้างกราฟหรือตาราง
- ใช้สีที่เหมาะสมและอ่านง่ายในกราฟ
- จัดรูปแบบตารางให้อ่านง่าย
- เขียนโค้ดที่สามารถใช้งานได้จริง
- สร้าง UI ที่สวยงามและใช้งานง่าย

ตอบด้วยภาษาไทยเสมอ และให้ข้อมูลที่เป็นประๅยชน์แก่ผู้ใช้งาน`;



// --- Component ย่อย (คงไว้ในไฟล์นี้) ---
const SuggestionCard = ({ title, description, onClick }: { title: string, description: string, onClick?: () => void }) => (
  <div onClick={onClick} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-shadow border border-gray-100">
    <p className="font-semibold text-gray-700">{title}</p>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

const WelcomeScreen = ({ onSuggestionClick }: { onSuggestionClick: (prompt: string) => void }) => (
  <>
    <div className='flex flex-col items-center space-y-4 mb-8 mt-40'>
      <img src="https://www.thaihealth.or.th/wp-content/uploads/2023/08/Logo-thaihealth.png" alt="Logo" className="h-20" />
      <p className="text-xl font-semibold text-gray-600">
        สำนักงานกองทุนสนับสนุนการสร้างเสริมสุขภาพ
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <SuggestionCard 
        title="วิธีลดความเครียด" 
        description="ค้นหาเทคนิคและกิจกรรมผ่อนคลา" 
        onClick={() => onSuggestionClick("แนะนำวิธีลดความเครียดและเทคนิคผ่อนคลายที่ใช้ได้ในชีวิตประจำวัน")}
      />
      <SuggestionCard 
        title="อาหารสุขภาพ" 
        description="ไอเดียเมนูสำหรับคนทำงาน" 
        onClick={() => onSuggestionClick("แนะนำเมนูอาหารสุขภาพที่เหมาะสำหรับคนทำงาน ทำง่าย มีประโยชน์")}
      />
      <SuggestionCard 
        title="ออกกำลังกายที่บ้าน" 
        description="แนะนำท่าง่ายๆ ไม่ต้องใช้อุปกรณ์" 
        onClick={() => onSuggestionClick("แนะนำท่าออกกำลังกายง่ายๆ ที่สามารถทำได้ที่บ้านโดยไม่ต้องใช้อุปกรณ์")}
      />
      <SuggestionCard 
        title="ปรึกษาการเลิกบุหรี่" 
        description="ขั้นตอนและเคล็ดลับในการเลิก" 
        onClick={() => onSuggestionClick("ต้องการคำปรึกษาเกี่ยวกับการเลิกบุหรี่ มีขั้นตอนและเคล็ดลับอะไรบ้าง")}
      />
    </div>
  </>
);

// --- Component หลัก ---
export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  
  // Request throttling: เก็บเวลาของ request ล่าสุด
  const lastRequestTimeRef = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 1000; // 1 วินาที
  
  // ใช้ chat history hook
  const {
    currentSessionId,
    createNewSession,
    addMessageToSession,
    loadSession
  } = useChatHistory();
  
  // โหลด session จาก URL parameter
  useEffect(() => {
    // ตรวจสอบว่ามี session ID ใน URL หรือไม่
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    
    if (sessionId) {
      console.log('🔍 Loading session from URL:', sessionId);
      
      // โหลดประวัติจาก session ID
      const session = loadSession(sessionId);
      if (session) {
        console.log('✅ Session loaded:', session.title, 'Messages:', session.messages.length);
        
        // แปลง ChatMessage[] เป็น Message[]
        const loadedMessages: Message[] = session.messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role,
            content: m.content,
            images: m.images,
            charts: m.charts,
            tables: m.tables,
            codeBlocks: m.codeBlocks,
            isNewMessage: false // ข้อความจากประวัติไม่ต้องใช้ TextType animation
          }));
        
        setMessages(loadedMessages);
        console.log('📝 Set messages to state:', loadedMessages.length, 'messages');
        
        // Clear URL parameter หลังโหลดเสร็จ (optional - เพื่อให้ URL สะอาด)
        window.history.replaceState({}, '', '/');
      } else {
        console.error('❌ Session not found:', sessionId);
      }
    }
  }, [loadSession]);
  
  const handleSendChat = async (prompt: string, imageUrls?: string[], files?: File[]) => {
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
      console.warn(`⚠️ Request throttled, please wait ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestTimeRef.current = Date.now();
    
    // ตรวจสอบ prompt ว่างเปล่า
    if (!prompt || prompt.trim() === '') {
      console.warn('⚠️ Empty prompt');
      return;
    }

    setIsLoading(true);
    console.log('📤 Sending chat:', { promptLength: prompt.length, images: imageUrls?.length, files: files?.length });

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
      sessionId = createNewSession(prompt);
      console.log('🆕 Created new session:', sessionId);
    }
    
    // บันทึก user message ลง localStorage (เพิ่ม timestamp)
    addMessageToSession(sessionId, {
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

    // สร้าง System Message
    const systemMessage: Message = {
      role: 'system',
      content: SYSTEM_PROMPT 
    };

    try {
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

      // ใช้ Google Gemini API โดยตรง
      const API_KEY = "AIzaSyC6Vug47p79HbOtK_setrPYKxUizk3EfA8";
      
      // สร้าง contents สำหรับ Gemini API พร้อม conversation history
      const contents = [];
      
      // เพิ่ม system instruction ใน parts แรก
      contents.push({
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }]
      });
      
      // เพิ่ม conversation history (ไม่เกิน 10 ข้อความล่าสุด เพื่อประหยัด token)
      // และไม่รวมรูปภาพจาก history เพื่อลดขนาด request
      const recentMessages = messages.slice(-10);
      for (const msg of recentMessages) {
        if (msg.role === 'user') {
          const userParts: any[] = [{ text: msg.content }];
          
          // หมายเหตุ: ไม่ส่งรูปภาพจาก history เพื่อประหยัด bandwidth และ token
          // เนื่องจาก Gemini API มี context window จำกัด
          // ถ้าต้องการส่งรูปจาก history ให้เปิด comment ด้านล่าง
          
          // if (msg.images && msg.images.length > 0 && msg.images.length <= 2) {
          //   for (const base64Image of msg.images.slice(0, 2)) { // จำกัดแค่ 2 รูปแรก
          //     const base64Data = base64Image.split(',')[1];
          //     const mimeType = base64Image.match(/data:(.*?);/)?.[1] || 'image/jpeg';
          //     userParts.push({
          //       inlineData: {
          //         mimeType: mimeType,
          //         data: base64Data
          //       }
          //     });
          //   }
          // }
          
          contents.push({
            role: 'user',
            parts: userParts
          });
        } else if (msg.role === 'assistant') {
          contents.push({
            role: 'model',
            parts: [{ text: msg.content }]
          });
        }
      }
      
      // สร้าง parts สำหรับข้อความปัจจุบัน
      const currentParts: any[] = [];
      
      // เพิ่มรูปภาพ
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
      
      // เพิ่ม PDF
      for (const base64Pdf of pdfBase64Array) {
        const base64Data = base64Pdf.split(',')[1];
        currentParts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data
          }
        });
      }
      
      // เพิ่มข้อความ
      if (prompt) {
        currentParts.push({ text: prompt });
      }
      
      // เพิ่ม message ปัจจุบันเข้าไป
      contents.push({
        role: 'user',
        parts: currentParts
      });

      console.log('📊 Sending', contents.length, 'messages to API');

      // Retry mechanism
      let retries = 3;
      let lastError: Error | null = null;
      let response: Response | null = null;
      
      while (retries > 0) {
        try {
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: contents,
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              }
            }),
            signal: AbortSignal.timeout(60000) // 60 second timeout
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("❌ API Error Response:", errorData);
            
            // ถ้าเป็น rate limit error ให้ retry
            if (response.status === 429 && retries > 1) {
              console.warn('⚠️ Rate limit hit, retrying in 2s...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              retries--;
              continue;
            }
            
            throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
          }
          
          // Success - break out of retry loop
          lastError = null;
          break;
        } catch (error: any) {
          lastError = error;
          retries--;
          
          if (retries > 0) {
            console.warn(`⚠️ Request failed, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (lastError || !response) {
        throw lastError || new Error('Failed to get response');
      }

      const data = await response.json();
      console.log('✅ Got API response');
      
      // Gemini API ส่ง response ในรูปแบบ candidates[0].content.parts[0].text
      const aiResponse: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "ขออภัย ไม่สามารถสร้างคำตอบได้";
      
      if (!aiResponse || aiResponse === "ขออภัย ไม่สามารถสร้างคำตอบได้") {
        console.error('❌ Empty or invalid AI response');
        throw new Error('Invalid AI response');
      }
      
      console.log('📝 AI response length:', aiResponse.length, 'characters');

      // แยก charts, tables, และ code blocks จากข้อความ
      const charts: any[] = [];
      const tables: any[] = [];
      const codeBlocks: Array<{ code: string; language: string }> = [];
      let cleanedContent = aiResponse;

      // แยก ```json:chart blocks
      const chartRegex = /```json:chart\n([\s\S]*?)```/g;
      let chartMatch;
      while ((chartMatch = chartRegex.exec(aiResponse)) !== null) {
        try {
          const chartData = JSON.parse(chartMatch[1]);
          charts.push(chartData);
          cleanedContent = cleanedContent.replace(chartMatch[0], '');
        } catch (e) {
          console.error('Error parsing chart:', e);
        }
      }

      // แยก ```json:table blocks
      const tableRegex = /```json:table\n([\s\S]*?)```/g;
      let tableMatch;
      while ((tableMatch = tableRegex.exec(aiResponse)) !== null) {
        try {
          const tableData = JSON.parse(tableMatch[1]);
          tables.push(tableData);
          cleanedContent = cleanedContent.replace(tableMatch[0], '');
        } catch (e) {
          console.error('Error parsing table:', e);
        }
      }

      // แยก code blocks ปกติ
      const codeRegex = /```(\w+)\n([\s\S]*?)```/g;
      let codeMatch;
      while ((codeMatch = codeRegex.exec(aiResponse)) !== null) {
        const language = codeMatch[1];
        const code = codeMatch[2];
        if (language !== 'json') {  // ไม่เอา json blocks ที่เป็น chart/table
          codeBlocks.push({ code, language });
          cleanedContent = cleanedContent.replace(codeMatch[0], '');
        }
      }

      // สร้าง AI message object
      const aiMessage: Message = {
        role: 'assistant', 
        content: cleanedContent.trim(),
        charts: charts.length > 0 ? charts : undefined,
        tables: tables.length > 0 ? tables : undefined,
        codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
        isNewMessage: true // ข้อความใหม่จาก AI ให้ใช้ TextType animation
      };
      
      // เพิ่มคำตอบของ AI ลงใน State
      setMessages(prevMessages => [...prevMessages, aiMessage]);
      
      // บันทึก AI response ลง localStorage
      if (sessionId) {
        addMessageToSession(sessionId, {
          ...aiMessage,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error: any) {
      console.error("❌ Error fetching AI response:", error);
      
      // สร้าง error message ที่เป็นมิตรกับผู้ใช้
      let errorMessage = "ขออภัย เกิดข้อผิดพลาดในการติดต่อ AI";
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = "❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
      } else if (error.message?.includes('429')) {
        errorMessage = "⚠️ ขออภัย มีการใช้งานเกินกำหนด กรุณาลองใหม่อีกครั้งในอีกสักครู่";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "⏱️ หมดเวลาในการรอคำตอบ กรุณาลองใหม่อีกครั้ง";
      } else if (error.message?.includes('400')) {
        errorMessage = "❌ ข้อมูลที่ส่งไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        errorMessage = "🔐 ไม่มีสิทธิ์เข้าถึง API กรุณาติดต่อผู้ดูแลระบบ";
      } else if (error.message) {
        errorMessage = `❌ เกิดข้อผิดพลาด: ${error.message}`;
      }
      
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          role: 'assistant', 
          content: `${errorMessage}\n\n💡 **คำแนะนำ:**\n• ลองส่งข้อความอีกครั้ง\n• ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต\n• ถ้ายังไม่ได้ กรุณารีเฟรชหน้าเว็บ`
        }
      ]);
    } finally {
      setIsLoading(false);
      console.log('✅ Request completed');
    }
  };

  // ฟังก์ชันเริ่มแชทใหม่
  const handleNewChat = () => {
    setMessages([]);
    window.history.replaceState({}, '', '/');
    console.log('Started new chat');
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
    
    // รักษา conversation context โดยเก็บข้อความก่อนหน้า AI message ที่จะ regenerate
    const contextMessages = messages.slice(0, messageIndex);
    setMessages(contextMessages);
    
    // รอให้ UI update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // ส่ง request ใหม่พร้อม context
    await handleSendChat(
      userMessage.content,
      userMessage.images,
      [] // ไม่มีไฟล์ในการ regenerate
    );
    
    console.log('✅ Regeneration completed');
  };
  
  // ฟังก์ชัน Copy (แสดง toast notification)
  const handleCopy = (content: string) => {
    console.log('📋 Copied to clipboard');
    // อาจเพิ่ม toast notification ในอนาคต
  };

  return (
    // เปลี่ยน layout ให้เป็น Flex Column เต็มจอ
    <div className='h-screen bg-gray-100 flex flex-col'>
      
      {/* Header พร้อมปุ่ม New Chat */}
      
      
      {/* ส่วนแสดงผลแชท หรือ หน้าจอ Welcome */}
      <div className='flex-1 flex flex-col items-center w-full overflow-y-auto pt-8'>
        <div className="w-full max-w-7xl">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={handleSendChat} />
          ) : (
            <MessageList 
              messages={messages} 
              isLoading={isLoading}
              onRegenerate={handleRegenerate}
              onCopy={handleCopy}
            />
          )}
        </div>
      </div>

      {/* ส่วน Input (จะอยู่ที่ด้านล่างเสมอ) */}
      <div className="w-full p-4 flex justify-center sticky bottom-0 bg-gray-100">
        <div className="w-full max-w-3xl">
          <ChatInputArea onSend={handleSendChat} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}