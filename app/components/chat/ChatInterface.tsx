'use client';

import React, { useState } from 'react'
import { Message, MessageList } from './chatMessage/MessageList';
import { ChatInputArea } from './inputArea/ChatInputArea';

 // Import component และ type

// --- System Prompt ของ สสส. ---
const SYSTEM_PROMPT = `คุณคือ "ผู้ช่วย AI สร้างเสริมสุขภาวะ" จาก สำนักงานกองทุนสนับสนุนการสร้างเสริมสุขภาพ (สสส.)

**ตัวตน (Persona):**
คุณคือนักสร้างเสริมสุขภาพ (Health Promotion Specialist) ที่มีความเชี่ยวชาญ, ใจดี, เข้าใจง่าย และพร้อมให้การสนับสนุน
* **น้ำเสียง (Tone):** เป็นมิตร, ให้กำลังใจ, น่าเชื่อถือ, ใช้ภาษาที่เข้าใจง่าย (ไม่ใช้ศัพท์เทคนิคยากจนเกินไป) และมีความกระตือรือล้นที่จะช่วยเหลือ

**วัตถุประสงค์หลัก (Core Objective):**
ภารกิจของคุณคือการ สร้างเสริมสุขภาพของคนไทยให้ดีขึ้นในทุกมิติ โดยการให้ข้อมูลที่ถูกต้อง, ริเริ่ม, ผลักดัน, กระตุ้น, และสนับสนุนให้ผู้ใช้มี สุขภาวะที่ดีทั้ง 4 ด้าน (กาย, จิต, ปัญญา, สังคม)

**แนวทางการปฏิบัติ (Guidelines):**

1. **เมื่อถูกถามเกี่ยวกับสุขภาพกาย:**
   * **ลดปัจจัยเสี่ยง:** ให้ข้อมูลที่ถูกต้อง ชัดเจน และเป็นปัจจุบัน เกี่ยวกับโทษของสุรา ยาสูบ และสารเสพติด หากผู้ใช้ต้องการเลิก ให้แนะนำแนวทาง, เคล็ดลับ หรือชี้เป้าไปยังสายด่วน (เช่น 1413) หรือหน่วยงานที่เกี่ยวข้อง
   * **ส่งเสริมพฤติกรรม:** ให้คำแนะนำเชิงปฏิบัติ (Actionable) เกี่ยวกับการออกกำลังกายที่เหมาะสม, การรับประทานอาหารที่มีประโยชน์ (เช่น ลด หวาน มัน เค็ม), การนอนหลับที่เพียงพอ

2. **เมื่อถูกถามเกี่ยวกับสุขภาพจิตและปัญญา:**
   * **สุขภาพจิต:** ให้คำแนะนำในการจัดการความเครียด, การผ่อนคลาย, การมองโลกในแง่ดี และตระหนักถึงความสำคัญของการขอความช่วยเหลือ
   * **สุขภาพปัญญา:** ส่งเสริมการเรียนรู้, การพัฒนาตนเอง, และการมีความคิดอย่างมีวิจารณญาณต่อข้อมูลสุขภาพ

3. **เมื่อถูกถามเกี่ยวกับสุขภาพสังคม:**
   * **สร้างสภาพแวดล้อม:** ให้คำแนะนำในการสร้างสภาพแวดล้อมที่เอื้อต่อสุขภาพ ทั้งในบ้าน, ที่ทำงาน, ชุมชน (เช่น พื้นที่ปลอดบุหรี่, พื้นที่สีเขียวสำหรับออกกำลังกาย)
   * **พัฒนาศักยภาพ:** หากผู้ใช้เป็นตัวแทนชุมชนหรือองค์กร ให้ชี้แนะแนวทางในการขอรับการสนับสนุนโครงการจาก สสส. หรือการสร้างเครือข่ายเพื่อขับเคลื่อนงานสุขภาพ

**หลักการทำงาน:**
* **ใช้ความรู้เป็นฐาน (Knowledge-Based):** คำตอบของคุณต้องอยู่บนพื้นฐานของข้อมูลและงานวิจารณที่น่าเชื่อถือ
* **รณรงค์สร้างความตระลัก (Awareness Campaign):** สอดแทรกความสำคัญของการ "ป้องกัน" มากกว่า "การรักษา" เสมอ สร้างทัศนคติที่ถูกต้องว่า "การมีสุขภาพดีคือหน้าที่ของทุกคน"
* **สนับสนุนและร่วมมือ (Support & Collaborate):** ทำตัวเป็น "เครือข่าย" ของผู้ใช้ หากไม่ทราบข้อมูล ให้พยายามชี้เป้าไปยังหน่วยงานพันธมิตรของ สสส. ที่เกี่ยวข้อง

**ขอบเขตและข้อจำกัด (Boundaries) - (สำคัญมาก):**

* **ห้ามวินิจฉัยโรค (No Diagnosis):** คุณไม่ใช่แพทย์หรือจิตแพทย์ ห้ามวินิจฉัยอาการป่วยทางกายหรือจิตใจโดยเด็ดขาด
* **ห้ามสั่งยา (No Prescription):** ห้ามแนะนำหรือสั่งยาให้ผู้ใช้
* **ยึดหลัก "ส่งต่อ" (Referral):** หากผู้ใช้แสดงอาการเจ็บป่วยที่ชัดเจน หรือมีภาวะฉุกเฉินทางอารมณ์ ให้แนะนำให้พวกเขา ปรึกษาแพทย์, เภสัชกร หรือผู้เชี่ยวชาญทางการแพทย์ทันที
* **ปฏิเสธอย่างสุภาพ:** หากถูกถามในสิ่งที่ไม่เกี่ยวข้องกับภารกิจของ สสส. (เช่น การเมือง, การเงิน, การพนัน) ให้ปฏิเสSอย่างสุภาพและดึงการสนทนากลับมาที่เรื่องสุขภาพ`;


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
  
  const handleSendChat = async (prompt: string, imageUrls?: string[], files?: File[]) => {
    if (isLoading) return;

    setIsLoading(true);

    const userMessage: Message = { 
      role: 'user', 
      content: prompt,
      images: imageUrls && imageUrls.length > 0 ? imageUrls : undefined
    };
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
      // แปลง messages เป็นรูปแบบที่ OpenRouter ต้องการ
      const apiMessages = await Promise.all(newMessages.map(async (msg) => {
        if (msg.role === 'system') {
          return {
            role: 'system',
            content: msg.content
          };
        }
        
        // ถ้ามีรูปภาพ ต้องแปลงเป็น base64
        if (msg.images && msg.images.length > 0) {
          const imageContents = await Promise.all(
            msg.images.map(async (imageUrl) => {
              try {
                // แปลง blob URL เป็น base64
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                return new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64 = reader.result as string;
                    resolve(base64);
                  };
                  reader.readAsDataURL(blob);
                });
              } catch (error) {
                console.error('Error converting image:', error);
                return null;
              }
            })
          );

          // สร้าง content array ที่มีทั้งข้อความและรูปภาพ
          const content: any[] = [];
          
          // เพิ่มรูปภาพก่อน
          imageContents.forEach(base64 => {
            if (base64) {
              content.push({
                type: 'image_url',
                image_url: {
                  url: base64
                }
              });
            }
          });
          
          // เพิ่มข้อความ
          if (msg.content) {
            content.push({
              type: 'text',
              text: msg.content
            });
          }

          return {
            role: msg.role,
            content: content
          };
        }
        
        // ไม่มีรูปภาพ ส่งแค่ข้อความ
        return {
          role: msg.role,
          content: msg.content
        };
      }));

      // ใช้ Google Gemini API โดยตรง
      const API_KEY = "AIzaSyC6Vug47p79HbOtK_setrPYKxUizk3EfA8";
      
      // สร้าง contents สำหรับ Gemini API
      const contents = [];
      
      // เพิ่ม system instruction ใน parts แรก
      contents.push({
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }]
      });
      
      // แปลง messages เป็นรูปแบบของ Gemini
      for (const msg of apiMessages) {
        if (msg.role === 'system') continue; // ข้าม system message
        
        const parts: any[] = [];
        
        if (Array.isArray(msg.content)) {
          // มีรูปภาพ
          for (const item of msg.content) {
            if (item.type === 'image_url') {
              // แปลง base64 เป็นรูปแบบที่ Gemini ต้องการ
              const base64Data = item.image_url.url.split(',')[1];
              const mimeType = item.image_url.url.match(/data:(.*?);/)?.[1] || 'image/jpeg';
              parts.push({
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              });
            } else if (item.type === 'text') {
              parts.push({ text: item.text });
            }
          }
        } else {
          // ข้อความธรรมดา
          parts.push({ text: msg.content });
        }
        
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: parts
        });
      }
      
      // เพิ่มไฟล์ PDF ถ้ามี
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.type === 'application/pdf') {
            // แปลง PDF เป็น base64
            const base64Data = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
              };
              reader.readAsDataURL(file);
            });
            
            // เพิ่ม PDF เข้าไปใน parts ของ message สุดท้าย
            if (contents.length > 1) {
              contents[contents.length - 1].parts.push({
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data
                }
              });
            }
          }
        }
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`, {
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
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error Response:", errorData);
        throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      // Gemini API ส่ง response ในรูปแบบ candidates[0].content.parts[0].text
      const aiResponse: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "ขออภัย ไม่สามารถสร้างคำตอบได้";

      // เพิ่มคำตอบของ AI ลงใน State
      setMessages(prevMessages => [
        ...prevMessages, 
        { role: 'assistant', content: aiResponse }
      ]);

    } catch (error) {
      console.error("Error fetching OpenRouter:", error);
      setMessages(prevMessages => [
        ...prevMessages, 
        { role: 'assistant', content: "ขออภัย, มีข้อผิดพลาดเกิดขึ้น" }
      ]);
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    // เปลี่ยน layout ให้เป็น Flex Column เต็มจอ
    <div className='h-screen bg-gray-100 flex flex-col'>
      
      {/* ส่วนแสดงผลแชท หรือ หน้าจอ Welcome */}
      <div className='flex-1 flex flex-col items-center w-full overflow-y-auto pt-8'>
        <div className="w-full max-w-3xl">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={handleSendChat} />
          ) : (
            <MessageList messages={messages} isLoading={isLoading} />
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