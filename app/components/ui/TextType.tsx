'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Markdown } from './Markdown';


interface TextTypeProps {
  text: string;
  typingSpeed?: number; // ความเร็วในการพิมพ์ (ms)
  loop?: boolean; // พิมพ์วนซ้ำหรือไม่
  showCursor?: boolean; // แสดง cursor หรือไม่
  onComplete?: () => void; // Callback เมื่อพิมพ์เสร็จ
  onCharacterTyped?: () => void; // Callback เมื่อพิมพ์แต่ละตัว (สำหรับ scroll)
  className?: string;
  contentClassName?: string; // ตกแต่งเนื้อหา Markdown ที่พิมพ์
  cursorChar?: string; // รูปแบบ cursor
  cursorClassName?: string; // ตกแต่ง cursor
  deleteSpeed?: number; // ความเร็วในการลบ (ถ้า loop=true)
  pauseTime?: number; // เวลาหยุดก่อนพิมพ์ใหม่ (ถ้า loop=true)
  isComplete?: boolean; // บอกว่าพิมพ์เสร็จหรือยัง (ควบคุมจากภายนอก)
}

export const TextType: React.FC<TextTypeProps> = ({
  text,
  typingSpeed = 25,
  loop = false,
  showCursor = false,
  onComplete,
  onCharacterTyped,
  className,
  contentClassName,
  cursorChar = '▍',
  cursorClassName,
  deleteSpeed = 15,
  pauseTime = 800,
  isComplete,
}) => {
  const [displayed, setDisplayed] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [done, setDone] = useState(false);
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const wasCompletedExternally = useRef(false);
  const targetTextRef = useRef(text);

  // Handle incoming streaming text without resetting when it's an extension
  useEffect(() => {
    const isContinuation = text.startsWith(displayed) && text.length >= displayed.length;
    targetTextRef.current = text;
    if (!isContinuation) {
      setDisplayed('');
      setIndex(0);
      setIsDeleting(false);
      setDone(false);
      wasCompletedExternally.current = false;
    }
  }, [text, displayed]);

  // If parent says complete, snap to full text
  useEffect(() => {
    if (isComplete && !wasCompletedExternally.current) {
      wasCompletedExternally.current = true;
      if (typingRef.current) clearTimeout(typingRef.current);
      setDisplayed(text);
      setIndex(text.length);
      setIsDeleting(false);
      setDone(true);
    }
  }, [isComplete, text]);

  // Typing effect
  useEffect(() => {
    if (done && !loop) return;

    const tick = () => {
      const target = targetTextRef.current;
      if (!isDeleting) {
        const nextIndex = Math.min(index + 1, target.length);
        setDisplayed(target.slice(0, nextIndex));
        setIndex(nextIndex);
        if (onCharacterTyped) onCharacterTyped();

        if (nextIndex === target.length) {
          if (loop) {
            typingRef.current = setTimeout(() => setIsDeleting(true), pauseTime);
          } else {
            // Only mark done if target isn't growing anymore
            if (target === text) {
              setDone(true);
              if (onComplete) onComplete();
            }
          }
          return;
        }
      } else {
        const nextIndex = Math.max(index - 1, 0);
        setDisplayed(target.slice(0, nextIndex));
        setIndex(nextIndex);
        if (nextIndex === 0) setIsDeleting(false);
      }

      typingRef.current = setTimeout(tick, isDeleting ? deleteSpeed : typingSpeed);
    };

    typingRef.current = setTimeout(tick, isDeleting ? deleteSpeed : typingSpeed);
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [index, isDeleting, typingSpeed, deleteSpeed, loop, pauseTime, done, text, onCharacterTyped, onComplete]);

  const cursor = showCursor ? (
    <span className={`inline-block ml-1 align-baseline ${cursorClassName ?? 'animate-pulse'}`} aria-hidden>
      {cursorChar}
    </span>
  ) : null;

  const content = useMemo(() => displayed, [displayed]);

  return (
    <div className={className}>
      <div className={contentClassName}>
        <Markdown>{content}</Markdown>
      </div>
      {cursor}
    </div>
  );
};
