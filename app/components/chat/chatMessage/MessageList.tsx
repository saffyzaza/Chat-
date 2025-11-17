import React from 'react';
import { IoHardwareChipOutline } from 'react-icons/io5';
import { ChartRenderer } from './ChartRenderer';
import { TableRenderer } from './TableRenderer';
import { CodeBlock } from './CodeBlock';
import { MessageContent } from './MessageContent';

// 1. กำหนด Type ของ Message (export เพื่อให้ ChatInterface ใช้ได้)
export interface Message {
  role: 'user' | 'assistant' | 'system'; // เพิ่ม 'system'
  content: string;
  images?: string[]; // URL ของรูปภาพที่แนบ (optional)
  charts?: any[]; // ข้อมูลกราฟ
  tables?: any[]; // ข้อมูลตาราง
  codeBlocks?: Array<{ code: string; language: string }>; // Code blocks
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
    <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {visibleMessages.map((msg, index) => (
        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`${msg.role === 'user' ? 'max-w-xl' : 'w-full max-w-full'} p-4 rounded-xl ${
            msg.role === 'user' 
              ? 'bg-[#eb6f45f1] text-white' 
              : 'bg-gray-200 text-gray-800'
          }`}>
            {/* แสดงรูปภาพถ้ามี */}
            {msg.images && msg.images.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {msg.images.map((imgUrl, imgIndex) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={imgIndex}
                    src={imgUrl}
                    alt={`attachment-${imgIndex}`}
                    className="rounded-lg object-cover border border-white/20"
                    style={{ width: '80px', height: '80px' }}
                  />
                ))}
              </div>
            )}
            {/* แสดง Code Blocks ถ้ามี */}
            {msg.codeBlocks && msg.codeBlocks.length > 0 && (
              <div className="mb-2">
                {msg.codeBlocks.map((block, blockIndex) => (
                  <CodeBlock key={blockIndex} code={block.code} language={block.language} />
                ))}
              </div>
            )}
            
            {/* แสดงกราฟถ้ามี */}
            {msg.charts && msg.charts.length > 0 && (
              <div className="mb-2">
                {msg.charts.map((chart, chartIndex) => (
                  <ChartRenderer key={chartIndex} chartData={chart} />
                ))}
              </div>
            )}
            
            {/* แสดงตารางถ้ามี */}
            {msg.tables && msg.tables.length > 0 && (
              <div className="mb-2">
                {msg.tables.map((table, tableIndex) => (
                  <TableRenderer key={tableIndex} tableData={table} />
                ))}
              </div>
            )}
            
            {/* ใช้ MessageContent component สำหรับแสดงผลข้อความที่ซับซ้อน */}
            {msg.content && (
              <MessageContent 
                content={msg.content} 
                isUser={msg.role === 'user'}
              />
            )}
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