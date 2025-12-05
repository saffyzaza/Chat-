import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  // ฟังก์ชันสำหรับจัดรูปแบบ markdown ที่มาจากเอกสาร
  const preprocessMarkdown = (text: string): string => {
    // แทนที่บรรทัดที่ขึ้นต้นด้วย # แต่ไม่มีเว้นวรรค
    let processed = text
      // จัดการ h1 (#)
      .replace(/^#([^\s#])/gm, '# $1')
      // จัดการ h2 (##)
      .replace(/^##([^\s#])/gm, '## $1')
      // จัดการ h3 (###)
      .replace(/^###([^\s#])/gm, '### $1')
      // จัดการ h4 (####)
      .replace(/^####([^\s#])/gm, '#### $1')
      // จัดการ h5 (#####)
      .replace(/^#####([^\s#])/gm, '##### $1')
      // จัดการ h6 (######)
      .replace(/^######([^\s#])/gm, '###### $1');
    
    // เพิ่มบรรทัดว่างก่อนหัวข้อเพื่อให้ markdown parser ทำงานได้ถูกต้อง
    processed = processed
      .replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
      .replace(/(#{1,6}\s[^\n]+)\n([^\n#])/g, '$1\n\n$2');
    
    return processed;
  };

  const components = {
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
    ol: ({ node, children, ...props }: any) => {
      return (
        <ol className="list-decimal list-outside ml-4" {...props}>
          {children}
        </ol>
      );
    },
    li: ({ node, children, ...props }: any) => {
      return (
        <li className="py-1" {...props}>
          {children}
        </li>
      );
    },
    ul: ({ node, children, ...props }: any) => {
      return (
        <ul className="list-disc list-outside ml-4" {...props}>
          {children}
        </ul>
      );
    },
    strong: ({ node, children, ...props }: any) => {
      return (
        <span className="font-semibold" {...props}>
          {children}
        </span>
      );
    },
    a: ({ node, children, ...props }: any) => {
      return (
        <a
          className="text-blue-500 hover:underline"
          target="_blank"
          rel="noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },
    h1: ({ node, children, ...props }: any) => {
      return (
        <h1 className="text-3xl font-bold mt-8 mb-4" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ node, children, ...props }: any) => {
      return (
        <h2 className="text-2xl font-bold mt-6 mb-3" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ node, children, ...props }: any) => {
      return (
        <h3 className="text-xl font-semibold mt-5 mb-2" {...props}>
          {children}
        </h3>
      );
    },
    h4: ({ node, children, ...props }: any) => {
      return (
        <h4 className="text-lg font-semibold mt-4 mb-2" {...props}>
          {children}
        </h4>
      );
    },
    h5: ({ node, children, ...props }: any) => {
      return (
        <h5 className="text-base font-semibold mt-3 mb-2" {...props}>
          {children}
        </h5>
      );
    },
    h6: ({ node, children, ...props }: any) => {
      return (
        <h6 className="text-sm font-semibold mt-3 mb-1" {...props}>
          {children}
        </h6>
      );
    },
    p: ({ node, children, ...props }: any) => {
      return (
        <p className="mb-4 leading-7" {...props}>
          {children}
        </p>
      );
    },
    table: ({ node, children, ...props }: any) => {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700" {...props}>
            {children}
          </table>
        </div>
      );
    },
    thead: ({ node, children, ...props }: any) => {
      return (
        <thead className="bg-gray-100 dark:bg-gray-800" {...props}>
          {children}
        </thead>
      );
    },
    th: ({ node, children, ...props }: any) => {
      return (
        <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold" {...props}>
          {children}
        </th>
      );
    },
    td: ({ node, children, ...props }: any) => {
      return (
        <td className="border border-gray-300 dark:border-gray-700 px-4 py-2" {...props}>
          {children}
        </td>
      );
    },
  };

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]} 
      components={components}
    >
      {preprocessMarkdown(children)}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);