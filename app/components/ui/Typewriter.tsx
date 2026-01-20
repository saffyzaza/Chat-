"use client";

import React, { useState, useEffect, useRef, memo } from "react";

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  charts?: any[];
  tables?: any[];
  codeBlocks?: any[];
  // Pass Markdown component to avoid circular dependency if needed, 
  // but we can just use children if we want to type the raw string.
  renderContent: (text: string) => React.ReactNode;
}

const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 10,
  onComplete,
  className,
  renderContent
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    // If text changes significantly (new message), reset
    if (!text.startsWith(displayedText)) {
      setDisplayedText("");
      setCurrentIndex(0);
    }
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        // Find next chunk to avoid breaking tags like <ChartAI />
        const remaining = text.slice(currentIndex);
        const tagMatch = remaining.match(/^<(ChartAI|TableAI|CodeBlockAI)[^>]*\/>/);
        
        if (tagMatch) {
          const tag = tagMatch[0];
          setDisplayedText(prev => prev + tag);
          setCurrentIndex(prev => prev + tag.length);
        } else {
          setDisplayedText(prev => prev + text[currentIndex]);
          setCurrentIndex(prev => prev + 1);
        }
      }, speed);
      return () => clearTimeout(timeout);
    } else if (currentIndex >= text.length && text.length > 0) {
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete]);

  return <div className={className}>{renderContent(displayedText)}</div>;
};

export default memo(Typewriter);
