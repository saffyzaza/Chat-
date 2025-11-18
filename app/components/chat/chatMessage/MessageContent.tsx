'use client';

import React from 'react';
import { TextType } from '../../ui/TextType';

interface MessageContentProps {
  content: string;
  isUser: boolean;
  isNewMessage?: boolean; // กำหนดว่าเป็นข้อความใหม่หรือไม่ (สำหรับ animation)
  onCharacterTyped?: () => void; // Callback สำหรับ auto-scroll
}

export const MessageContent: React.FC<MessageContentProps> = ({ 
  content, 
  isUser, 
  isNewMessage = false,
  onCharacterTyped 
}) => {
  
  // ตรวจสอบว่ามี HTML table หรือไม่
  const hasHTMLTable = content.includes('<table') || content.includes('</table>');
  
  // ตรวจสอบว่ามี styled content หรือไม่
  const hasStyledContent = content.includes('<div') || content.includes('<span');
  
  // ถ้ามี HTML ให้ render แบบ HTML
  if (hasHTMLTable || hasStyledContent) {
    return (
      <div 
        className={`${isUser ? 'text-white' : 'text-gray-800'}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  
  // ถ้าเป็นข้อความของ user ให้แสดงแบบปกติ
  if (isUser) {
    return (
      <p style={{ whiteSpace: 'pre-wrap' }}>
        {content}
      </p>
    );
  }
  
  // ถ้าเป็นข้อความใหม่จาก AI ให้ใช้ TextType animation
  if (isNewMessage) {
    return (
      <TextType 
        text={content} 
        typingSpeed={20}
        showCursor={false}
        onCharacterTyped={onCharacterTyped}
        className="text-gray-800"
      />
    );
  }
  
  // ถ้าเป็นข้อความจากประวัติ (history) ให้แสดงทันที
  return (
    <p style={{ whiteSpace: 'pre-wrap' }}>
      {content}
    </p>
  );
};
