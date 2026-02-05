"use client";

import React from 'react';
import Markdown from 'markdown-to-jsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  VerticalAlign,
  PageBreak,
  Header,
  Footer,
  TableLayoutType,
  PageNumber,
  ExternalHyperlink,
} from 'docx';
import { saveAs } from 'file-saver';
import { FiDownload, FiX } from 'react-icons/fi';
import { ChartRenderer } from './ChartRenderer';
import { TableRenderer } from './TableRenderer';

interface ProjectPlanProps {
  content?: string;
  isLoading?: boolean;
  status?: string;
  onClose?: () => void;
}

// Configuration constants for document styling (Thai Government Standard)
const DOC_CONFIG = {
  font: 'TH Sarabun PSK',
  sizeMain: 32, // 16pt
  sizeHeader: 40, // 20pt
  sizeTitle: 56, // 28pt
  margins: {
    top: 1440,
    right: 1134,
    bottom: 1134,
    left: 1700,
  },
};

export const ProjectPlan = ({ content, isLoading, status, onClose }: ProjectPlanProps) => {
  if (!content && !isLoading) return null;

  const isDeepResearch = status?.toLowerCase().includes('deep research') || 
                         status?.toLowerCase().includes('deep search') ||
                         content?.toLowerCase().includes('deep research') ||
                         content?.toLowerCase().includes('deep search');
  const displayTitle = isDeepResearch ? 'Deep Research' : 'Project Planning Canvas';

  const handleDownload = async () => {
    if (!content) return;

    const lines = content.split('\n');
    const docChildren: any[] = [];

    const parseTextToWordElements = (text: string, options: { size?: number, color?: string, forceBold?: boolean } = {}): any[] => {
      const { size = DOC_CONFIG.sizeMain, color, forceBold = false } = options;
      
      // 1. Clean up technical artifacts and fix broken markdown links across lines
      const cleanedText = text
        .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, (match, t, u) => {
          return `[${t}](${u.replace(/\s+/g, '')})`;
        })
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/\\n/g, ' ')
        .replace(/`/g, '')
        .replace(/#{1,6}\s/g, '');

      // 2. Multi-stage parsing for Bold and Links
      // We'll use a placeholder technique to handle both without complex regex collisions
      const elements: any[] = [];
      
      // Pattern: [text](url) OR **bold**
      const pattern = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*.*?\*\*)/g;
      
      let lastIndex = 0;
      let match;

      while ((match = pattern.exec(cleanedText)) !== null) {
        // Add plain text before match
        if (match.index > lastIndex) {
          elements.push(new TextRun({
            text: cleanedText.substring(lastIndex, match.index),
            font: DOC_CONFIG.font,
            size: size,
            color: color,
            bold: forceBold,
          }));
        }

        if (match[1]) { // It's a link: [text](url)
          elements.push(new ExternalHyperlink({
            children: [
              new TextRun({
                text: match[2],
                font: DOC_CONFIG.font,
                size: 18, // ปรับเป็น 9pt ตามคำขอ "สัก 5" ให้ตัวเล็กมาก
                color: '0563C1', // Standard link color
                underline: {},
                bold: false, // ลิงก์ยาวๆ ไม่ควรหนา
              }),
            ],
            link: match[3],
          }));
        } else if (match[4]) { // It's bold: **bold**
          elements.push(new TextRun({
            text: match[4].slice(2, -2),
            bold: true,
            font: DOC_CONFIG.font,
            size: size,
            color: color,
          }));
        }

        lastIndex = pattern.lastIndex;
      }

      // Add remaining text
      if (lastIndex < cleanedText.length) {
        elements.push(new TextRun({
          text: cleanedText.substring(lastIndex),
          font: DOC_CONFIG.font,
          size: size,
          color: color,
          bold: forceBold,
        }));
      }

      return elements.length > 0 ? elements : [new TextRun({ text: cleanedText, font: DOC_CONFIG.font, size, color, bold: forceBold })];
    };

    const createStyledParagraph = (text: string, options: any = {}) => {
      const { isList = false, listIdx = 1, bold = false, color, size, ...props } = options;
      const children: any[] = [];

      if (isList) {
        children.push(
          new TextRun({
            text: `${listIdx}. `,
            bold: true,
            font: DOC_CONFIG.font,
            size: DOC_CONFIG.sizeMain,
          })
        );
      }

      children.push(...parseTextToWordElements(text, { forceBold: bold, color, size }));

      return new Paragraph({
        children,
        ...props,
      });
    };

    let i = 0;
    let listCounter = 1;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Handle Page Breaks (Case-insensitive catch-all, handles backslashes like [PAGE\_BREAK])
      const isPageBreak = /\[PAGE[\\_]*BREAK\]/i.test(trimmed) || trimmed === '---page-break---';
      if (isPageBreak) {
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
        i++;
        continue;
      }

      // Handle tables - more robust detection for separator line within top 3 lines
      let isTableBlock = false;
      if (trimmed.startsWith('|')) {
        for (let j = 0; j <= 2 && i + j < lines.length; j++) {
          const checkLine = lines[i + j].trim();
          if (checkLine.includes('|---') || checkLine.includes('| ---') || checkLine.includes('| :-')) {
            isTableBlock = true;
            break;
          }
        }
      }

      if (isTableBlock) {
        listCounter = 1;
        const rows: TableRow[] = [];
        const tableLines: string[] = [];

        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const tTrim = lines[i].trim();
          // Skip separator lines
          if (!tTrim.includes('|---') && !tTrim.includes('| ---') && !tTrim.includes('| :-')) {
            tableLines.push(tTrim);
          }
          i++;
        }

        tableLines.forEach((tLine, rowIdx) => {
          const cells = tLine
            .split('|')
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          if (cells.length > 0) {
            const isHeader = rowIdx === 0;
            const cellWidth = 100 / cells.length;

            rows.push(
              new TableRow({
                children: cells.map(
                  (cell) =>
                    new TableCell({
                      width: { size: cellWidth, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: parseTextToWordElements(cell.trim(), {
                            size: isHeader ? 28 : 24,
                            color: '000000',
                            forceBold: isHeader
                          }),
                          alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                          spacing: { line: 240 },
                        }),
                      ],
                      shading: { fill: 'FFFFFF' },
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                      },
                      margins: { top: 120, bottom: 120, left: 120, right: 120 },
                      verticalAlign: VerticalAlign.CENTER,
                    })
                ),
              })
            );
          }
        });

        if (rows.length > 0) {
          docChildren.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              layout: TableLayoutType.FIXED,
              rows,
              margins: { bottom: 400 },
            })
          );
        }
        continue;
      }

      if (trimmed === '```json:chart') {
        let chartContent = '';
        i++;
        while (i < lines.length && !lines[i].trim().includes('```')) {
          chartContent += lines[i];
          i++;
        }
        try {
          const chartData = JSON.parse(chartContent);
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[📊 กราฟแสดงผล: ${chartData.options?.plugins?.title?.text || chartData.type || 'ข้อมูลสถิติ'}]`,
                  bold: true,
                  color: '1A5F7A',
                  font: DOC_CONFIG.font,
                  size: 24,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            })
          );
        } catch (e) {
          console.error('Chart parse error in word export', e);
        }
        i++;
        continue;
      }

      if (trimmed === '```json:table' || trimmed === '```json:table-ai') {
        let tableJsonContent = '';
        i++;
        while (i < lines.length && !lines[i].trim().includes('```')) {
          tableJsonContent += lines[i];
          i++;
        }
        try {
          const cleanJson = tableJsonContent
            .replace(/\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/,(\s*[\]}])/g, '$1')
            .trim();
          const tableData = JSON.parse(cleanJson);
          const rawHeaders = tableData.columns || tableData.headers || tableData.header || [];
          let rawRows = tableData.rows || tableData.data || tableData.items || [];
          
          if (Array.isArray(tableData)) rawRows = tableData;
          
          let processedHeaders = [...rawHeaders];
          let processedRows = Array.isArray(rawRows) ? [...rawRows] : [];

          if (processedRows.length > 0 && typeof processedRows[0] === 'object' && !Array.isArray(processedRows[0])) {
            if (processedHeaders.length === 0) processedHeaders = Object.keys(processedRows[0]);
            processedRows = processedRows.map(rowObj => {
              if (typeof rowObj === 'object' && !Array.isArray(rowObj)) {
                return processedHeaders.map(h => rowObj[h] ?? rowObj[String(h)] ?? '');
              }
              return rowObj;
            });
          }

          const docTableRows: TableRow[] = [];
          
          // Header Row
          if (processedHeaders.length > 0) {
            docTableRows.push(new TableRow({
              children: processedHeaders.map(h => new TableCell({
                width: { size: 100 / processedHeaders.length, type: WidthType.PERCENTAGE },
                children: [new Paragraph({
                  children: parseTextToWordElements(String(h), { bold: true, size: 24 }),
                  alignment: AlignmentType.CENTER,
                })],
                shading: { fill: 'F2F2F2' },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4 },
                  bottom: { style: BorderStyle.SINGLE, size: 4 },
                  left: { style: BorderStyle.SINGLE, size: 4 },
                  right: { style: BorderStyle.SINGLE, size: 4 },
                }
              }))
            }));
          }

          // Data Rows
          processedRows.forEach(row => {
            if (Array.isArray(row)) {
              docTableRows.push(new TableRow({
                children: row.map(cell => new TableCell({
                  children: [new Paragraph({
                    children: parseTextToWordElements(String(cell), { size: 24 }),
                    spacing: { line: 240 }
                  })],
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4 },
                    bottom: { style: BorderStyle.SINGLE, size: 4 },
                    left: { style: BorderStyle.SINGLE, size: 4 },
                    right: { style: BorderStyle.SINGLE, size: 4 },
                  }
                }))
              }));
            }
          });

          if (docTableRows.length > 0) {
            docChildren.push(new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: docTableRows,
              margins: { bottom: 400 },
            }));
          }
        } catch (e) {
          console.error('Table AI parse error in word export', e);
        }
        i++;
        continue;
      }

      if (trimmed.startsWith('# ')) {
        listCounter = 1;
        docChildren.push(
          createStyledParagraph(trimmed.substring(2), {
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            alignment: AlignmentType.CENTER,
            bold: true,
            size: DOC_CONFIG.sizeTitle,
          })
        );
      } else if (trimmed.startsWith('## ')) {
        listCounter = 1;
        docChildren.push(
          createStyledParagraph(trimmed.substring(3), {
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            bold: true,
            color: '1A5F7A',
            size: DOC_CONFIG.sizeHeader,
          })
        );
      } else if (trimmed.startsWith('### ')) {
        listCounter = 1;
        docChildren.push(
          createStyledParagraph(trimmed.substring(4), {
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
            bold: true,
            size: DOC_CONFIG.sizeMain + 4, // Slightly larger than main
            indent: { left: 360 },
          })
        );
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.match(/^\d+\. /)) {
        const contentText =
          trimmed.startsWith('* ') || trimmed.startsWith('- ') ? trimmed.substring(2) : trimmed.replace(/^\d+\. /, '');
        docChildren.push(
          createStyledParagraph(contentText, {
            isList: true,
            listIdx: listCounter++,
            spacing: { after: 100 },
            indent: { left: 720, hanging: 360 },
          })
        );
      } else if (trimmed !== '') {
        listCounter = 1;
        docChildren.push(
          createStyledParagraph(trimmed, {
            spacing: { after: 150 },
            lineSpacing: { line: 240 },
            alignment: AlignmentType.LEFT,
          })
        );
      } else {
        listCounter = 1;
      }
      i++;
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { size: DOC_CONFIG.sizeMain, font: DOC_CONFIG.font },
            paragraph: { spacing: { line: 240 } },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: DOC_CONFIG.margins,
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'เอกสารนี้สร้างโดยระบบ AI - สสส.', font: DOC_CONFIG.font, size: 20, color: '888888' }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'หน้า ', font: DOC_CONFIG.font }),
                    new TextRun({ children: [PageNumber.CURRENT], font: DOC_CONFIG.font }),
                    new TextRun({ text: ' / ', font: DOC_CONFIG.font }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES], font: DOC_CONFIG.font }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'รายงานสรุปข้อมูลเชิงวิชาการและการดำเนินงาน',
                  bold: true,
                  size: DOC_CONFIG.sizeTitle,
                  font: DOC_CONFIG.font,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
            }),
            ...docChildren,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Project-Plan-${new Date().toISOString().split('T')[0]}.docx`);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden border-l border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"></div>
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 [animation-delay:0.2s]"></div>
          </div>
          <span className="font-bold tracking-tight text-gray-800">{displayTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          {content && !isLoading && (
            <button
              onClick={handleDownload}
              className="active:scale-95 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
            >
              <FiDownload className="h-4 w-4" />
              ส่งออกเป็น Word
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="hover:border-red-100 hover:bg-red-50 rounded-lg border border-transparent p-2 text-gray-400 transition-all hover:text-red-500"
            >
              <FiX className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col items-center overflow-y-auto bg-gray-50/50 p-8 ${!content && isLoading ? 'justify-start' : ''}`}>
        {isLoading && (
          <div className={`mb-10 flex w-full max-w-4xl flex-col items-center justify-center gap-8 transition-all ${!content ? 'mt-10' : 'items-start'}`}>
            {/* --- Skeleton Document Animation (กระดาษจำลอง) --- */}
            {!content && (
              <div className="w-full max-w-4xl bg-white shadow-2xl border border-gray-100 rounded-sm p-16 md:p-24 min-h-[800px] relative overflow-hidden animate-pulse">
                {/* แสงวิบวับวิ่งผ่านกระดาษ */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-gray-100/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                
                {/* ประทับตราหรือไอคอนที่หัวกระดาษ */}
                <div className="flex flex-col items-center mb-16 opacity-20">
                   <div className="w-16 h-16 bg-blue-600 rounded-full mb-4"></div>
                   <div className="w-64 h-4 bg-gray-200 rounded"></div>
                </div>

                {/* ส่วนหัวข้อหลัก */}
                <div className="space-y-4 mb-12">
                   <div className="w-3/4 h-10 bg-gray-200 rounded"></div>
                   <div className="w-1/2 h-10 bg-gray-100 rounded"></div>
                </div>

                {/* เนื้อหาจำลองบรรทัดต่างๆ */}
                <div className="space-y-6">
                   <div className="flex gap-4">
                      <div className="w-full h-4 bg-gray-100 rounded"></div>
                   </div>
                   <div className="w-full h-4 bg-gray-100 rounded"></div>
                   <div className="w-5/6 h-4 bg-gray-100 rounded"></div>
                   <div className="w-full h-4 bg-gray-100 rounded"></div>
                   <div className="w-4/6 h-4 bg-gray-100 rounded"></div>

                   <div className="pt-8 w-1/3 h-8 bg-gray-200 rounded mb-4"></div>
                   <div className="w-full h-4 bg-gray-100 rounded"></div>
                   <div className="w-full h-4 bg-gray-100 rounded"></div>
                   <div className="w-3/4 h-4 bg-gray-100 rounded"></div>
                   
                   {/* ตารางจำลอง */}
                   <div className="mt-10 grid grid-cols-3 gap-2 opacity-50">
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                      <div className="h-20 bg-gray-100 rounded"></div>
                      <div className="h-20 bg-gray-100 rounded"></div>
                      <div className="h-20 bg-gray-100 rounded"></div>
                   </div>
                </div>

            {/* ส่วนข้อความ Loading ตรงกลางกระดาษ */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px]">
               <div className="relative">
                  <div className="h-24 w-24 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-12 h-12 bg-blue-600 rounded-lg animate-bounce flex items-center justify-center shadow-lg">
                       <div className="w-6 h-1 bg-white rounded-full"></div>
                     </div>
                  </div>
               </div>
               <h3 className="mt-8 text-2xl font-black text-blue-600 tracking-widest animate-pulse uppercase">Creating Document</h3>
               
               {/* เพิ่ม Status เล็กๆ ใต้ Creating Document แทนกล่องใหญ่ */}
               <div className="mt-6 flex flex-col items-center gap-2 max-w-[80%]">
                  <div className="flex items-center gap-2 text-blue-500 font-bold italic animate-pulse">
                    <span className="relative flex h-2 w-2">
                       <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                       <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                    </span>
                    <span className="text-sm">{status?.split('\n')[0] || "AI กำลังประมวลผล..."}</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0s]"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
               </div>
            </div>

            <div className="absolute bottom-12 left-0 right-0 text-center text-[10px] text-gray-300 font-bold uppercase tracking-[0.5em] opacity-40">
              Document Construction Engine v2.0
            </div>
          </div>
        )}

        {/* แสดงกล่อง Status เฉพาะเมื่อเริ่มมีเนื้อหาแล้ว (เพื่อไม่ให้บัง Skeleton) */}
        {isLoading && content && (
          <div className="mb-8 flex w-full max-w-4xl flex-col gap-3 border border-blue-100 bg-white/95 p-5 text-blue-700 shadow-xl rounded-2xl backdrop-blur-md transition-all">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
              </span>
              <span className="text-sm font-bold italic tracking-wide">
                {status?.split('\n')[0] || "AI กำลังเขียนเนื้อหาเพิ่มเติม..."}
              </span>
            </div>
            {status && (status.includes('Thought:') || status.includes('\n\n')) && (
                <div className="mt-1 text-xs text-gray-600 font-medium flex flex-col gap-1.5 border-l-2 border-blue-200 pl-4 py-1">
                   {status.split('\n\n').slice(status.includes('\n\n') ? 1 : 0).join('\n\n').split('\n').filter(l => l.trim().length > 5).slice(0, 2).map((line, idx) => (
                     <div key={idx} className="leading-relaxed truncate">{line}</div>
                   ))}
                </div>
              )}
          </div>
        )}
      </div>
    )}

    {((content || '')
          .split(/(?:\(เนื้อหาสิ้นสุด\)|เนื้อหาจบลงตรงนี้|ขออภัยครับ)/)[0]
          .trim())
          .split(/\s*\[PAGE[\\_]*BREAK\]\s*|---page-break---/i)
          .map((pageContent, index, array) => {
            // Pre-process markdown to fix common table rendering issues
            let processedContent = pageContent
              .trim()
              // 1. Ensure blank line before tables (some parsers need it)
              .replace(/([^\n])\n\|/g, '$1\n\n|')
              // 2. Fix literal <br> tags anywhere - convert to spaces or actual newlines depending on context
              // Inside tables, <br> breaks standard markdown. Let's replace them with a space for integrity.
              .replace(/<br\s*\/?>/gi, ' ')
              // 3. Fix broken markdown links across lines [text](url1\nurl2)
              .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, (match, text, url) => {
                const cleanUrl = url.replace(/\s+/g, '');
                return `[${text}](${cleanUrl})`;
              });

            const lines = processedContent.split('\n');
            const finalLines = [];
            let inTable = false;

            for (let i = 0; i < lines.length; i++) {
              let line = lines[i];
              let trimmed = line.trim();

              if (trimmed.startsWith('|')) {
                inTable = true;
                
                // 3. Normalize table separator lines (extremely long dash lines)
                // If this is a separator line (contains only |, -, :, and spaces)
                if (/^[|:\-\s]+$/.test(trimmed)) {
                  line = line.replace(/-{4,}/g, '---');
                }
                
                // 4. Remove empty lines that might be breaking the table contiguous block
                finalLines.push(line);
                
                // Peek ahead to skip blank lines within a table
                while (i + 1 < lines.length && lines[i+1].trim() === '') {
                  // Check if there's more table after this blank line
                  let foundMoreTable = false;
                  for (let j = i + 2; j < lines.length; j++) {
                    const peek = lines[j].trim();
                    if (peek.startsWith('|')) { foundMoreTable = true; break; }
                    if (peek !== '') break;
                  }
                  if (foundMoreTable) i++; else break;
                }
              } else {
                inTable = false;
                // For regular text, collapse multiple spaces for Thai readability
                finalLines.push(line.replace(/ {2,}/g, ' '));
              }
            }

            const trimmedContent = finalLines.join('\n');
            if (!trimmedContent && index > 0) return null;

            return (
            <div 
              key={index} 
              className="w-full max-w-4xl bg-white shadow-[0_0_60px_-15px_rgba(0,0,0,0.15)] border border-gray-200 rounded-sm p-12 md:p-20 md:pb-32 mb-12 min-h-[1120px] relative transition-all hover:shadow-2xl flex flex-col"
            > 
              <div className="absolute bottom-10 left-0 right-0 text-center text-[10px] text-gray-400 font-bold select-none print:hidden uppercase tracking-[0.3em] border-t border-gray-50 pt-8 mx-20">
                PAGINATION • {index + 1} / {array.length}
              </div>

              <article className="prose prose-blue max-w-none flex-1 pb-10 wrap-break-word">
                <Markdown
                  options={{
                    overrides: {
                        h1: {
                          component: 'h1',
                          props: {
                            className: 'mb-12 wrap-break-word border-b-4 border-blue-600 pb-6 text-center text-3xl font-black leading-tight text-gray-900 tracking-tight md:text-5xl',
                          },
                        },
                        h2: {
                          component: 'h2',
                          props: {
                            className: 'mb-8 mt-16 wrap-break-word border-b border-gray-100 pb-2 text-xl font-bold leading-snug text-[#1A5F7A] md:text-3xl',
                          },
                        },
                        h3: {
                          component: 'h3',
                          props: {
                            className: 'mb-6 mt-12 wrap-break-word border-l-4 border-blue-200 pl-6 text-lg font-bold leading-snug text-blue-800 md:text-2xl',
                          },
                        },
                        p: {
                          component: 'p',
                          props: {
                            className: 'mb-8 wrap-break-word text-left text-base font-medium leading-[1.8] text-gray-700 md:text-xl whitespace-normal indent-10',
                          },
                        },
                        ul: {
                          component: 'ul',
                          props: {
                            className: 'mb-8 wrap-break-word space-y-5 pl-10 text-gray-700 list-disc',
                          },
                        },
                        ol: {
                          component: 'ol',
                          props: {
                            className: 'mb-8 wrap-break-word space-y-5 pl-10 text-gray-700 list-decimal',
                          },
                        },
                        li: {
                          component: 'li',
                          props: {
                            className: 'wrap-break-word pl-2 text-base leading-relaxed md:text-xl marker:font-bold marker:text-blue-600',
                          },
                        },
                      code: {
                        component: ({ children, className }: any) => {
                          const isChart = className?.includes('language-json:chart');
                          const isTable = className?.includes('language-json:table');
                          
                          if (isChart || isTable) {
                            try {
                              const content = Array.isArray(children) ? children.join('') : children;
                              const cleanJson = content
                                .replace(/\/\/.*$/gm, '')
                                .replace(/\/\*[\s\S]*?\*\//g, '')
                                .replace(/,(\s*[\]}])/g, '$1')
                                .trim();
                                
                              if (isChart) {
                                const chartData = JSON.parse(cleanJson);
                                return (
                                  <div className="my-14 p-8 bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden hover:shadow-blue-900/10 transition-shadow bg-linear-to-br from-white to-blue-50/30">
                                    <ChartRenderer chartData={chartData} />
                                  </div>
                                );
                              }
                              
                              if (isTable) {
                                const tableData = JSON.parse(cleanJson);
                                return (
                                  <div className="my-14 p-8 bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden hover:shadow-blue-900/10 transition-shadow bg-linear-to-br from-white to-blue-50/30">
                                    <TableRenderer tableData={tableData} />
                                  </div>
                                );
                              }
                            } catch (e) {
                              return <pre className="p-4 bg-red-50 text-red-500 rounded-lg break-all">{String(children)}</pre>;
                            }
                          }
                          return <code className="bg-gray-100 px-2 py-1 rounded text-blue-600 font-mono text-sm break-all">{children}</code>;
                        }
                      },
                      table: { 
                        component: ({ children, ...props }: any) => (
                          <div className="my-14 w-full overflow-x-auto wrap-break-word">
                            <table className="w-full border-collapse border-2 border-gray-900 shadow-xl rounded-lg table-auto" {...props}>
                              {children}
                            </table>
                          </div>
                        )
                      },
                        th: {
                          component: 'th',
                          props: {
                            className: 'bg-white wrap-break-word border border-gray-900 px-4 py-3 text-sm font-bold uppercase text-gray-900 tracking-wider md:text-base align-middle whitespace-normal text-center',
                          },
                        },
                        td: {
                          component: 'td',
                          props: {
                            className: 'bg-white wrap-break-word border border-gray-900 px-4 py-3 text-sm font-medium leading-relaxed text-gray-800 md:text-base align-middle whitespace-normal',
                          },
                        },
                        strong: {
                          component: 'strong',
                          props: {
                            className: 'wrap-break-word rounded bg-yellow-50/50 px-1 font-bold text-gray-900',
                          },
                        },
                        blockquote: {
                          component: 'blockquote',
                          props: {
                            className: 'mb-12 wrap-break-word rounded-r-2xl border-l-4 border-blue-500 bg-gray-50/60 py-6 pl-8 italic text-lg text-gray-600 md:text-xl font-serif',
                          },
                        },
                        a: {
                          component: ({ children, ...props }: any) => {
                            // Extract text from children (could be string, array, or object)
                            const getChildrenText = (node: any): string => {
                              if (!node) return '';
                              if (typeof node === 'string') return node;
                              if (Array.isArray(node)) return node.map(getChildrenText).join('');
                              if (node.props && node.props.children) return getChildrenText(node.props.children);
                              return String(node);
                            };

                            const rawText = getChildrenText(children);
                            let displayText = rawText.trim();
                            const href = (props.href || '').trim();

                            // Logic to shorten link display text
                            if (displayText.startsWith('http') || displayText.includes('localhost') || href.includes('localhost') || displayText.length > 40) {
                              try {
                                // 1. If it's a localhost link (internal file), try to get the 'name' parameter
                                if (href.includes('localhost') || href.includes('127.0.0.1')) {
                                  const url = new URL(href, 'http://localhost');
                                  const fileName = url.searchParams.get('name');
                                  if (fileName) {
                                    displayText = `📄 ${decodeURIComponent(fileName)}`;
                                  } else {
                                    displayText = '📄 view-document';
                                  }
                                } 
                                // 2. If it's an external link, show only the domain
                                else if (displayText.startsWith('http')) {
                                  const url = new URL(displayText);
                                  displayText = url.hostname.replace('www.', '');
                                }
                                // 3. Fallback: If href is http but label is not, and label is too long
                                else if (href.startsWith('http') && displayText.length > 40) {
                                  const url = new URL(href);
                                  displayText = `🔗 ${url.hostname.replace('www.', '')}`;
                                }
                              } catch (e) {
                                // If parsing fails, just truncate long text
                                if (displayText.length > 30) {
                                  displayText = displayText.substring(0, 27) + '...';
                                }
                              }
                            }
                            
                            // Prevent [object Object] by ensuring we don't accidentally pass an object as text
                            if (typeof displayText !== 'string') {
                              displayText = 'Link';
                            }

                            return (
                              <a 
                                {...props} 
                                className="inline-block text-blue-600 hover:text-blue-800 underline transition-all cursor-pointer text-[13px] mt-1 opacity-90 hover:opacity-100 font-medium break-all max-w-full"
                                title={rawText} // Show full URL/text on hover
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {displayText}
                              </a>
                            );
                          }
                        },
                    }
                  }}
                >
                  {trimmedContent}
                </Markdown>
              </article>
            </div>
          );
        })}

        {content && (
          <div className="mb-20 flex flex-col items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">
            <div className="w-12 h-px bg-gray-200"></div>
            END OF DOCUMENT
            <div className="w-12 h-px bg-gray-200"></div>
          </div>
        )}
      </div>
    </div>
  )
}