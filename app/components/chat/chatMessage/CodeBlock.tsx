'use client';

import React, { useEffect } from 'react';

interface CodeBlockProps {
  code: string;
  language: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  useEffect(() => {
    // Highlight code เมื่อ component mount
    if (typeof window !== 'undefined' && (window as any).Prism) {
      (window as any).Prism.highlightAll();
    }
  }, [code, language]);

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-gray-200">
      <div className="bg-gray-800 px-4 py-2 text-sm text-gray-300 font-mono">
        {language}
      </div>
      <pre className="m-0" style={{ margin: 0 }}>
        <code className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};
