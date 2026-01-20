"use client";

import React from "react";
import { Markdown } from "../../ui/Markdown";
import Typewriter from "../../ui/Typewriter";

interface MessageContentProps {
  content: string;
  isUser: boolean;
  isNewMessage?: boolean; 
  onCharacterTyped?: () => void; 
  onComplete?: () => void;
  charts?: any[];
  tables?: any[];
  codeBlocks?: any[];
}

export const MessageContent: React.FC<MessageContentProps> = ({
  content,
  isUser,
  isNewMessage,
  charts,
  tables,
  codeBlocks,
  onComplete,
}) => {
  // เมื่อเรนเดอร์เสร็จแล้วให้เรียก onComplete ทันที (สำหรับ User หรือข้อความเก่าที่ไม่ใช้ animation)
  React.useEffect(() => {
    if (!isUser && !isNewMessage && onComplete) {
      onComplete();
    }
  }, [isUser, isNewMessage, onComplete]);

  // ถ้าเป็นข้อความของ user ให้แสดงแบบปกติ
  if (isUser) {
    return (
      <div className="text-white text-left mr-2 ml-2">
        {content}
      </div>
    );
  }

  // ถ้าเป็นข้อความใหม่ของ AI ให้ใช้ Typewriter animation
  if (isNewMessage) {
    return (
      <div className="text-gray-800">
        <Typewriter
          text={content}
          speed={5}
          onComplete={onComplete}
          renderContent={(displayed) => (
            <Markdown charts={charts} tables={tables} codeBlocks={codeBlocks}>
              {displayed}
            </Markdown>
          )}
        />
      </div>
    );
  }

  // แสดงผลด้วย Markdown ปกติ (สำหรับข้อความเก่า)
  return (
    <div className="text-gray-800">
      <Markdown charts={charts} tables={tables} codeBlocks={codeBlocks}>
        {content}
      </Markdown>
    </div>
  );
};
