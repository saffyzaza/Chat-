import React, { useRef, useEffect, useState } from 'react';
import { IoHardwareChipOutline, IoRefreshOutline, IoCopyOutline, IoCheckmarkOutline, IoCreateOutline, IoDocumentTextOutline } from 'react-icons/io5';
import { ChartRenderer } from './ChartRenderer';
import { TableRenderer } from './TableRenderer';
import { CodeBlock } from './CodeBlock';
import { MessageContent } from './MessageContent';

// 1. กำหนด Type ของ Message
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; 
  charts?: any[]; 
  tables?: any[]; 
  codeBlocks?: Array<{ code: string; language: string }>; 
  planContent?: string; 
  isNewMessage?: boolean; 
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  loadingStatus?: string;
  onRegenerate?: (messageIndex: number) => void;
  onCopy?: (content: string) => void;
  onEdit?: (messageIndex: number, content: string) => void;
  onTypingComplete?: (messageIndex: number) => void;
  onViewPlan?: (planContent: string) => void;
}

// 2. Component สำหรับแสดงผลข้อความ
export const MessageList = ({ messages, isLoading, loadingStatus, onRegenerate, onCopy, onEdit, onTypingComplete, onViewPlan }: MessageListProps) => {
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'end' 
    });
  }, [messages, isLoading]);
  
  const visibleMessages = messages.filter(msg => msg.role !== 'system');
  
  const handleCopy = async (content: string, index: number) => {
    const tryNativeClipboard = async () => {
      if (typeof navigator === 'undefined') return false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(content);
          return true;
        }
      } catch {}
      return false;
    };

    const tryLegacyCopy = () => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    };

    const ok = (await tryNativeClipboard()) || tryLegacyCopy();
    if (ok) {
      setCopiedIndex(index);
      if (onCopy) onCopy(content);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };
  
  const handleRegenerate = (index: number) => {
    if (onRegenerate) onRegenerate(index);
  };
  
  const startEdit = (index: number, content: string) => {
    setEditingIndex(index);
    setEditContent(content);
  };
  
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditContent('');
  };
  
  const saveEdit = (index: number) => {
    if (onEdit && editContent.trim()) {
      onEdit(index, editContent.trim());
      setEditingIndex(null);
      setEditContent('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {visibleMessages.map((msg, index) => (
        <div 
          key={index} 
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <div className={`relative group w-full max-w-full ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            <div className={`${msg.role === 'user' ? 'inline-block max-w-xl' : 'w-full max-w-full'} p-2 rounded-xl ${
              msg.role === 'user' 
                ? 'bg-[#eb6f45f1] shadow shadow-amber-600 text-white' 
                : 'bg-white border border-gray-100 shadow-sm text-gray-800'
            }`}>
              {/* 1. แสดงข้อความหลัก (หรือฟอร์มแก้ไข) ก่อน */}
              {editingIndex === index ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className={`w-full p-2 rounded-lg border resize-none ${
                      msg.role === 'user' 
                        ? 'bg-white/10 text-white border-white/30' 
                        : 'bg-white text-gray-800 border-gray-300'
                    }`}
                    rows={4}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelEdit} className={`px-3 py-1 rounded-lg text-sm ${msg.role === 'user' ? 'bg-white/10 text-white' : 'bg-gray-300 text-gray-800'}`}>
                      ยกเลิก
                    </button>
                    <button onClick={() => saveEdit(index)} className={`px-3 py-1 rounded-lg text-sm ${msg.role === 'user' ? 'bg-white text-[#eb6f45f1]' : 'bg-[#eb6f45f1] text-white'}`}>
                      บันทึก
                    </button>
                  </div>
                </div>
              ) : (
                msg.content && (
                  <MessageContent 
                    content={msg.content} 
                    isUser={msg.role === 'user'}
                    isNewMessage={msg.isNewMessage}
                    charts={msg.charts}
                    tables={msg.tables}
                    codeBlocks={msg.codeBlocks}
                    onComplete={() => {
                      if (onTypingComplete) onTypingComplete(index);
                    }}
                  />
                )
              )}

              {/* สื่อเสริมจะถูกจัดการผ่าน placeholder ใน MessageContent แล้ว */}
              {/* แต่ยังคงเผื่อไว้สำหรับเคสที่ไม่มี placeholder */}
              {!msg.content?.includes('<ChartAI') && !msg.content?.includes('<TableAI') && !msg.content?.includes('<CodeBlockAI') && (
                <div className="space-y-3">
                  {msg.images && msg.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.images.map((imgUrl, imgIndex) => (
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

                  {msg.codeBlocks && msg.codeBlocks.length > 0 && (
                    <div className="mt-2 text-left">
                      {msg.codeBlocks.map((block, blockIndex) => (
                        <CodeBlock key={blockIndex} code={block.code} language={block.language} />
                      ))}
                    </div>
                  )}
                  
                  {msg.charts && msg.charts.length > 0 && (
                    <div className="mt-2">
                      {msg.charts.map((chart, chartIndex) => (
                        <ChartRenderer key={chartIndex} chartData={chart} />
                      ))}
                    </div>
                  )}
                  
                  {msg.tables && msg.tables.length > 0 && (
                    <div className="mt-2">
                      {msg.tables.map((table, tableIndex) => (
                        <TableRenderer key={tableIndex} tableData={table} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {msg.planContent && (
                <div className="mt-3 pt-3 border-t border-gray-200/50">
                  <button
                    onClick={() => onViewPlan && onViewPlan(msg.planContent!)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm text-sm"
                  >
                    <IoDocumentTextOutline size={18} />
                    <span>เปิดดูแผนงานที่บันทึกไว้</span>
                  </button>
                </div>
              )}
            </div>
            
            {hoveredIndex === index && editingIndex !== index && (
              <div className="absolute flex gap-1 top-2 right-2">
                <button
                  onClick={() => handleCopy(msg.content, index)}
                  className={`p-1.5 rounded-lg transition-all ${
                    msg.role === 'user'
                      ? 'bg-white/20 hover:bg-white/30 text-white'
                      : 'bg-white hover:bg-gray-100 text-gray-600 shadow-md'
                  }`}
                  title="คัดลอก"
                >
                  {copiedIndex === index ? (
                    <IoCheckmarkOutline className={msg.role === 'user' ? 'text-white' : 'text-green-500'} size={16} />
                  ) : (
                    <IoCopyOutline size={16} />
                  )}
                </button>
                
                {msg.role === 'user' && (
                  <button
                    onClick={() => startEdit(index, msg.content)}
                    className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
                    title="แก้ไข"
                  >
                    <IoCreateOutline size={16} />
                  </button>
                )}
                
                {msg.role === 'assistant' && onRegenerate && (
                  <button
                    onClick={() => handleRegenerate(index)}
                    className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 rounded-lg transition-all shadow-md"
                    title="สร้างใหม่"
                  >
                    <IoRefreshOutline size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="flex items-center space-x-3 bg-white border border-gray-100 shadow-sm text-gray-800 p-3 px-4 rounded-xl">
            <div className="relative flex h-5 w-5">
              <IoHardwareChipOutline className="animate-spin text-orange-500 absolute inset-0" size={20} />
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-20"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-700 animate-pulse">
                {loadingStatus || 'กำลังประมวลผล...'}
              </span>
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">AI Thinking Engine</span>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
