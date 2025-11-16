import React from 'react';
import { IoHardwareChipOutline } from 'react-icons/io5';

// 1. กำหนด Type ของ Message (export เพื่อให้ ChatInterface ใช้ได้)
export interface Message {
  role: 'user' | 'assistant' | 'system'; // เพิ่ม 'system'
  content: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

// 2. Component สำหรับแสดงผลข้อความ
export const MessageList = ({ messages, isLoading }: MessageListProps) => {
  
  // 3. กรอง message ที่เป็น 'system' ออก ไม่ต้องแสดงผล
  const visibleMessages = messages.filter(msg => msg.role !== 'system');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {visibleMessages.map((msg, index) => (
        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl ${
            msg.role === 'user' 
              ? 'bg-[#eb6f45f1] text-white' 
              : 'bg-gray-200 text-gray-800'
          }`}>
            {/* ใช้ pre-wrap เพื่อให้ \n (ขึ้นบรรทัดใหม่) ทำงาน */}
            <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
          </div>
        </div>
      ))}

      {/* 4. แสดง "กำลังพิมพ์..." เมื่อ AI กำลังตอบ */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="flex items-center space-x-2 bg-gray-200 text-gray-800 p-3 rounded-xl">
            <IoHardwareChipOutline className="animate-spin text-gray-600" size={20} />
            <span className="text-sm">กำลังคิด...</span>
          </div>
        </div>
      )}
    </div>
  );
};