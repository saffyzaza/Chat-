"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface MarkdownProps {
  children: string;
  className?: string;
}

const NonMemoizedMarkdown = ({ children, className }: MarkdownProps) => {
  // ลบแท็ก wrapper ที่ไม่รองรับ เช่น <markdown> หรือ <md> เพื่อหลีกเลี่ยง React error
  const sanitized = typeof children === 'string'
    ? children.replace(/<\/?markdown[^>]*>/gi, '').replace(/<\/?md[^>]*>/gi, '')
    : children;
  const components = {
    table: ({ node, children, ...props }: any) => (
      <table className="w-full border-collapse text-sm my-3 overflow-hidden rounded-md" {...props}>
        {children}
      </table>
    ),
    thead: ({ node, children, ...props }: any) => (
      <thead className="bg-orange-500/90 text-white" {...props}>{children}</thead>
    ),
    tbody: ({ node, children, ...props }: any) => (
      <tbody className="bg-white" {...props}>{children}</tbody>
    ),
    tr: ({ node, children, ...props }: any) => (
      <tr className="odd:bg-white even:bg-gray-50 border-b last:border-0" {...props}>{children}</tr>
    ),
    th: ({ node, children, ...props }: any) => (
      <th className="text-left px-4 py-2 border border-orange-200/60 text-[13px]" {...props}>{children}</th>
    ),
    td: ({ node, children, ...props }: any) => (
      <td className="px-4 py-2 border border-gray-200 align-top text-[13px] text-gray-700" {...props}>{children}</td>
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <pre
          {...props}
          className={`${className} text-sm w-[80dvw] md:max-w-[500px] overflow-x-scroll bg-zinc-100 p-3 rounded-lg mt-2 dark:bg-zinc-800`}
        >
          <code className={match[1]}>{children}</code>
        </pre>
      ) : (
        <code
          className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
          {...props}
        >
          {children}
        </code>
      );
    },
    ol: ({ node, children, ...props }: any) => (
      <ol className="list-decimal list-outside ml-4" {...props}>{children}</ol>
    ),
    li: ({ node, children, ...props }: any) => (
      <li className="py-1" {...props}>{children}</li>
    ),
    ul: ({ node, children, ...props }: any) => (
      <ul className="list-disc list-outside ml-4" {...props}>{children}</ul>
    ),
    strong: ({ node, children, ...props }: any) => (
      <span className="font-semibold" {...props}>{children}</span>
    ),
    a: ({ node, children, ...props }: any) => (
      <a className="text-blue-500 hover:underline" target="_blank" rel="noreferrer" {...props}>{children}</a>
    ),
    h1: ({ node, children, ...props }: any) => (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>{children}</h1>
    ),
    h2: ({ node, children, ...props }: any) => (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>{children}</h2>
    ),
    h3: ({ node, children, ...props }: any) => (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>{children}</h3>
    ),
    h4: ({ node, children, ...props }: any) => (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>{children}</h4>
    ),
    h5: ({ node, children, ...props }: any) => (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>{children}</h5>
    ),
    h6: ({ node, children, ...props }: any) => (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>{children}</h6>
    ),
  };

  return (
    <div className={`markdown-body ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
        {sanitized as string}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);