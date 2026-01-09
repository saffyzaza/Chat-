'use client';

import React from 'react';
import { TextType } from '../../ui/TextType';
import { Markdown } from '../../ui/Markdown';

interface MessageContentProps {
  content: string;
  isUser: boolean;
  isNewMessage?: boolean; // กำหนดว่าเป็นข้อความใหม่หรือไม่ (สำหรับ animation)
  onCharacterTyped?: () => void; // Callback สำหรับ auto-scroll
  onComplete?: () => void; // Callback เมื่อพิมพ์ข้อความเสร็จสิ้น
}

export const MessageContent: React.FC<MessageContentProps> = ({ 
  content, 
  isUser, 
  isNewMessage = false,
  onCharacterTyped,
  onComplete
}) => {
  
  // ตรวจจับตารางเพื่อเร่งความเร็วการแสดงผล (แสดงทันที แทนการพิมพ์ทีละตัว)
  const hasHtmlTable = content.includes('<');
  const hasGfmTable = /\n\|[^\n]*\|\n\|\s*:?[-]{3,}?:?\s*(\|\s*:?[-]{3,}?:?\s*)+\n/.test(content);
  const shouldRenderTableImmediately = hasHtmlTable || hasGfmTable;

  // เรนเดอร์ผ่าน Markdown เสมอ (รองรับ HTML ฝังตัวผ่าน Markdown renderer)
  
  // ถ้าเป็นข้อความของ user ให้แสดงแบบปกติ
  if (isUser) {
    return (
      <div className={isUser ? 'text-white text-left mr-2 ml-2' : 'text-gray-800'}>
        <Markdown>{content}</Markdown>
      </div>
    );
  }
  
  // ถ้าเป็นข้อความใหม่จาก AI ให้ใช้ TextType animation
  if (isNewMessage) {
    if (shouldRenderTableImmediately) {
      return (
        <div className="text-gray-800">
          <Markdown>{content}</Markdown>
        </div>
      );
    }
    return (
      <TextType 
        text={content} 
        typingSpeed={10}
        showCursor={false}
        onCharacterTyped={onCharacterTyped}
        onComplete={onComplete}
        className="text-gray-800"
      />
    );
  }
  
  // ถ้าเป็นข้อความจากประวัติ (history) ให้แสดงทันที
  return (
    <div className='text-gray-800'>
      <Markdown>{content}</Markdown>
    </div>
  );
};
