'use client';

import React from 'react';

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content, isUser }) => {
  
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
  
  // ถ้าไม่มี HTML ให้ render แบบ text ธรรมดา
  return (
    <p style={{ whiteSpace: 'pre-wrap' }}>
      {content}
    </p>
  );
};
