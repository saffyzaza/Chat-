'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Markdown } from './markdown';

interface TextTypeProps {
  text: string;
  typingSpeed?: number; // ความเร็วในการพิมพ์ (ms)
  loop?: boolean; // พิมพ์วนซ้ำหรือไม่
  showCursor?: boolean; // แสดง cursor หรือไม่
  onComplete?: () => void; // Callback เมื่อพิมพ์เสร็จ
  onCharacterTyped?: () => void; // Callback เมื่อพิมพ์แต่ละตัว (สำหรับ scroll)
  className?: string;
  cursorChar?: string; // รูปแบบ cursor
  deleteSpeed?: number; // ความเร็วในการลบ (ถ้า loop=true)
  pauseTime?: number; // เวลาหยุดก่อนพิมพ์ใหม่ (ถ้า loop=true)
  isComplete?: boolean; // บอกว่าพิมพ์เสร็จหรือยัง (ควบคุมจากภายนอก)
}

export const TextType: React.FC<TextTypeProps> = ({
  text,
  typingSpeed = 20, // ค่าเริ่มต้น 20ms
  loop = false,
  showCursor = false,
  onComplete,
  onCharacterTyped,
  className = '',
  cursorChar = '|',
  deleteSpeed = 50,
  pauseTime = 1000,
  isComplete = false
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Effect สำหรับการพิมพ์และลบ
  useEffect(() => {
    // ถ้าบอกว่าเสร็จแล้ว ให้แสดงข้อความเต็ม
    if (isComplete) {
      setDisplayText(text);
      setCurrentIndex(text.length);
      return;
    }

    // ถ้ากำลัง pause ให้รอก่อน
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseTime);
      return () => clearTimeout(pauseTimer);
    }

    // ถ้ากำลังลบ
    if (isDeleting) {
      if (currentIndex === 0) {
        setIsDeleting(false);
        return;
      }

      const deleteTimer = setTimeout(() => {
        setDisplayText(text.substring(0, currentIndex - 1));
        setCurrentIndex(currentIndex - 1);
      }, deleteSpeed);

      return () => clearTimeout(deleteTimer);
    }

    // ถ้ากำลังพิมพ์
    if (currentIndex < text.length) {
      const typingTimer = setTimeout(() => {
        setDisplayText(text.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
        
        // เรียก callback เมื่อพิมพ์แต่ละตัว (สำหรับ auto-scroll)
        if (onCharacterTyped) {
          onCharacterTyped();
        }
      }, typingSpeed);

      return () => clearTimeout(typingTimer);
    } else {
      // พิมพ์เสร็จแล้ว
      if (onComplete) {
        onComplete();
      }

      // ถ้าเปิด loop ให้เตรียมลบ
      if (loop) {
        setIsPaused(true);
      }
    }
  }, [
    currentIndex,
    text,
    typingSpeed,
    deleteSpeed,
    pauseTime,
    loop,
    isDeleting,
    isPaused,
    onComplete,
    onCharacterTyped,
    isComplete
  ]);
  console.log(JSON.stringify(text));
  return (
  <Markdown>{smartMarkdownFormatter(text)}</Markdown>
    
    // <span className='text-blue-600' style={{ whiteSpace: 'pre-wrap' }}>
    //   {displayText}
    //   {showCursor && (
    //     <span className="animate-pulse">{cursorChar}</span>
    //   )}
    // </span>
  );
};

function smartMarkdownFormatter(text: string): string {
  return text
    .replace(/^#\s*/, '# ')
    .replace(/(\d+\.\d+)\s/g, '\n\n### $1 ')
    .replace(/(\n)?(?=\d+\.\s)/g, '\n\n## ')
    .replace(/\*\*(.+?)\*\*(?!\n)/g, '**$1**\n\n')
    .replace(/([^\n])\n(#{2,3}\s)/g, '$1\n\n$2')
    .replace(/(#{2,3}\s[^\n]+)\n([^\n#])/g, '$1\n\n$2')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n[ ]+/g, '\n')
    .trim();
}
