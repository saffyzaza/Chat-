"use client";

import { memo } from "react";
import MarkdownToJsx from "markdown-to-jsx";
import { ChartRenderer } from "../chat/chatMessage/ChartRenderer";
import { TableRenderer } from "../chat/chatMessage/TableRenderer";
import { CodeBlock } from "../chat/chatMessage/CodeBlock";

interface MarkdownProps {
  children: string;
  className?: string;
  charts?: any[];
  tables?: any[];
  codeBlocks?: any[];
}

const NonMemoizedMarkdown = ({ children, className, charts, tables, codeBlocks }: MarkdownProps) => {
  // ลบแท็ก wrapper ที่ไม่รองรับ เช่น <markdown> หรือ <md> เพื่อหลีกเลี่ยง React error
  const sanitized = typeof children === 'string'
    ? children.replace(/<\/?markdown[^>]*>/gi, '').replace(/<\/?md[^>]*>/gi, '')
    : children;

  return (
    <div className={`markdown-body ${className ?? ''}`}>
      <MarkdownToJsx
        options={{
          overrides: {
            ChartAI: {
              component: ({ index }: { index: string }) => {
                const idx = parseInt(index);
                const data = charts?.[idx];
                return data ? <ChartRenderer chartData={data} /> : null;
              }
            },
            TableAI: {
              component: ({ index }: { index: string }) => {
                const idx = parseInt(index);
                const data = tables?.[idx];
                return data ? <TableRenderer tableData={data} /> : null;
              }
            },
            CodeBlockAI: {
              component: ({ index }: { index: string }) => {
                const idx = parseInt(index);
                const data = codeBlocks?.[idx];
                return data ? <CodeBlock code={data.code} language={data.language} /> : null;
              }
            },
            code: {
              component: ({ className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || "");
                const isBlock = className && className.includes('language-');
                return isBlock ? (
                  <pre
                    className={`${className} text-sm w-[80dvw] md:max-w-[500px] overflow-x-scroll bg-zinc-100 p-3 rounded-lg mt-2 dark:bg-zinc-800`}
                  >
                    <code className={match ? match[1] : ''}>{children}</code>
                  </pre>
                ) : (
                  <code
                    className={`${className || ''} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
            },
            ol: {
              component: 'ol',
              props: { className: 'list-decimal list-outside ml-4' }
            },
            li: {
              component: 'li',
              props: { className: 'py-1' }
            },
            ul: {
              component: 'ul',
              props: { className: 'list-disc list-outside ml-4' }
            },
            strong: {
              component: 'span',
              props: { className: 'font-semibold' }
            },
            a: {
              component: 'a',
              props: { className: 'text-blue-500 hover:underline', target: '_blank', rel: 'noreferrer' }
            },
            h1: {
              component: 'h1',
              props: { className: 'text-3xl font-semibold mt-6 mb-2' }
            },
            h2: {
              component: 'h2',
              props: { className: 'text-2xl font-semibold mt-6 mb-2' }
            },
            h3: {
              component: 'h3',
              props: { className: 'text-xl font-semibold mt-6 mb-2' }
            },
            h4: {
              component: 'h4',
              props: { className: 'text-lg font-semibold mt-6 mb-2' }
            },
            h5: {
              component: 'h5',
              props: { className: 'text-base font-semibold mt-6 mb-2' }
            },
            h6: {
              component: 'h6',
              props: { className: 'text-sm font-semibold mt-6 mb-2' }
            },
          }
        }}
      >
        {sanitized as string}
      </MarkdownToJsx>
    </div>
  );
};

export const Markdown = memo(NonMemoizedMarkdown);