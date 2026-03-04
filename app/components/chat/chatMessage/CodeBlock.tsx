'use client';

import React, { useEffect, useRef } from 'react';

interface CodeBlockProps {
  code: string;
  language: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Highlight เฉพาะ element นี้ ไม่ใช่ highlightAll() เพื่อป้องกันกระพริบ
    if (typeof window !== 'undefined' && (window as any).Prism && codeRef.current) {
      (window as any).Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <div className="code-block my-2 rounded-lg overflow-hidden border border-gray-200">
      <div className="bg-gray-800 px-4 py-2 text-sm text-gray-300 font-mono">
        {language}
      </div>
      <pre className="m-0" style={{ margin: 0 }}>
        <code ref={codeRef} className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};
