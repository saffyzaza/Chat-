"use client";

import React from 'react'
import Markdown from 'markdown-to-jsx'
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
  Footer
} from 'docx'
import { saveAs } from 'file-saver'
import { FiDownload, FiX } from 'react-icons/fi'
import { ChartRenderer } from './ChartRenderer'

interface ProjectPlanProps {
  content?: string;
  isLoading?: boolean;
  onClose?: () => void;
}

// Configuration constants for document styling (Thai Government Standard)
const DOC_CONFIG = {
  font: "TH Sarabun New", // หรือ TH Sarabun PSK
  sizeMain: 32, // 16pt
  sizeHeader: 40, // 20pt
  sizeTitle: 56, // 28pt
  margins: {
    top: 1440,    // 1 inch (approx 2.54 cm)
    right: 1134,  // 2 cm
    bottom: 1134, // 2 cm
    left: 1700,   // 3 cm (Standard Thai Government Left Margin)
  }
};

export const ProjectPlan = ({ content, isLoading, onClose }: ProjectPlanProps) => {
  if (!content && !isLoading) return null;

  const handleDownload = async () => {
    if (!content) return;

    const lines = content.split('\n');
    const docChildren: any[] = [];

    // Helper function to parse bold text
    const parseTextWithBold = (text: string): TextRun[] => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map(part => {
        const isBold = part.startsWith('**') && part.endsWith('**');
        return new TextRun({
          text: isBold ? part.slice(2, -2) : part,
          bold: isBold,
          font: DOC_CONFIG.font,
          size: DOC_CONFIG.sizeMain,
        });
      });
    };

    // Helper function to create styled paragraphs with optional numbering
    const createStyledParagraph = (text: string, options: any = {}) => {
      const { isList = false, listIdx = 1, ...props } = options;
      const runs: TextRun[] = [];
      
      if (isList) {
        runs.push(new TextRun({ 
          text: `${listIdx}. `, 
          bold: true, 
          font: DOC_CONFIG.font, 
          size: DOC_CONFIG.sizeMain 
        }));
      }
      
      runs.push(...parseTextWithBold(text));
      
      return new Paragraph({
        children: runs,
        ...props
      });
    };

    let i = 0;
    let listCounter = 1;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Handle Manual Page Breaks
      if (trimmed === '---page-break---' || trimmed === '[PAGE_BREAK]') {
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
        i++;
        continue;
      }

      // Handle tables
      if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('|---')) {
        listCounter = 1;
        const rows: TableRow[] = [];
        const tableLines: string[] = [];
        
        // Collect all table lines first to identify the last row
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          if (!lines[i].includes('|---')) {
            tableLines.push(lines[i]);
          }
          i++;
        }

        tableLines.forEach((tLine, rowIdx) => {
          const cells = tLine.trim().split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          if (cells.length > 0) {
            const isHeader = rowIdx === 0;
            const isLastRow = rowIdx === tableLines.length - 1;

            rows.push(new TableRow({
              children: cells.map(cell => new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ 
                    text: cell.trim(), 
                    bold: isHeader, 
                    color: isHeader ? "FFFFFF" : "1E3A8A",
                    font: DOC_CONFIG.font,
                    size: isHeader ? 28 : 24
                  })],
                  alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                  spacing: { line: 240 }
                })],
                shading: isHeader ? { fill: "1A5F7A" } : { fill: "F0F9FF" },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: isHeader ? "1A5F7A" : "BFDBFE" },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: isHeader ? "1A5F7A" : "BFDBFE" },
                  left: { style: BorderStyle.SINGLE, size: 4, color: isHeader ? "1A5F7A" : "BFDBFE" },
                  right: { style: BorderStyle.SINGLE, size: 4, color: isHeader ? "1A5F7A" : "BFDBFE" },
                },
                margins: { top: 120, bottom: 120, left: 120, right: 120 },
                verticalAlign: VerticalAlign.CENTER
              }))
            }));
          }
        });

        if (rows.length > 0) {
          docChildren.push(new Table({ 
            width: { size: 100, type: WidthType.PERCENTAGE }, 
            alignment: AlignmentType.CENTER,
            rows, 
            margins: { bottom: 400 } 
          }));
        }
        continue;
      }

      // Handle charts in Word (skip logic for now to avoid corrupted data, just add label)
      if (trimmed === '```json:chart') {
        let chartContent = '';
        i++;
        while (i < lines.length && !lines[i].trim().includes('```')) {
          chartContent += lines[i];
          i++;
        }
        try {
          const chartData = JSON.parse(chartContent);
          docChildren.push(new Paragraph({
            children: [new TextRun({ 
              text: `[📊 กราฟแสดงผล: ${chartData.options?.plugins?.title?.text || chartData.type || 'ข้อมูลสถิติ'}]`, 
              bold: true, 
              color: "1A5F7A",
              font: DOC_CONFIG.font,
              size: 24 
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 }
          }));
        } catch (e) {
          console.error("Chart parse error in word export", e);
        }
        i++;
        continue;
      }

      // Handle headings and content (Thai Government Style)
      if (trimmed.startsWith('# ')) {
        listCounter = 1;
        docChildren.push(createStyledParagraph(trimmed.substring(2), {
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          alignment: AlignmentType.CENTER,
          bold: true
        }));
      } else if (trimmed.startsWith('## ')) {
        listCounter = 1;
        docChildren.push(createStyledParagraph(trimmed.substring(3), {
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          bold: true,
          color: "1A5F7A"
        }));
      } else if (trimmed.startsWith('### ')) {
        listCounter = 1;
        docChildren.push(createStyledParagraph(trimmed.substring(4), {
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
          bold: true,
          indent: { left: 360 } // Level 3 indentation
        }));
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.match(/^\d+\. /)) {
        const contentText = trimmed.startsWith('* ') || trimmed.startsWith('- ') ? trimmed.substring(2) : trimmed.replace(/^\d+\. /, '');
        docChildren.push(createStyledParagraph(contentText, {
          isList: true,
          listIdx: listCounter++,
          spacing: { after: 100 },
          indent: { left: 720, hanging: 360 }
        }));
      } else if (trimmed !== '') {
        listCounter = 1;
        docChildren.push(createStyledParagraph(trimmed, { 
          spacing: { after: 150 }, 
          lineSpacing: { line: 240 },
          alignment: AlignmentType.JUSTIFIED
        }));
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
            paragraph: { spacing: { line: 240 } }
          } 
        } 
      },
      sections: [{
        properties: {
          page: {
            margin: DOC_CONFIG.margins,
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "เอกสารนี้สร้างโดยระบบ AI - สสส.", font: DOC_CONFIG.font, size: 20, color: "888888" })],
                alignment: AlignmentType.RIGHT,
              })
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                   new TextRun({ text: "หน้า ", font: DOC_CONFIG.font }),
                   new TextRun({ children: ["PAGE_NUMBER"], font: DOC_CONFIG.font }),
                   new TextRun({ text: " / ", font: DOC_CONFIG.font }),
                   new TextRun({ children: ["NUM_PAGES"], font: DOC_CONFIG.font }),
                ],
                alignment: AlignmentType.CENTER,
              })
            ],
          }),
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "รายงานสรุปข้อมูลเชิงวิชาการและการดำเนินงาน", bold: true, size: DOC_CONFIG.sizeTitle, font: DOC_CONFIG.font })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
          }),
          ...docChildren
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Project-Plan-${new Date().toISOString().split('T')[0]}.docx`);
  };

  return (
    <div className="bg-transparent flex flex-col h-full overflow-hidden border-l border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
          </div>
          <span className="font-bold text-gray-800 tracking-tight">Project Planning Canvas</span>
        </div>
        
        <div className="flex items-center gap-2">
          {content && !isLoading && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              <FiDownload className="w-4 h-4" />
              ส่งออกเป็น Word
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100">
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center bg-gray-50/50">
        {isLoading && (
          <div className="w-full max-w-4xl mb-6 flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="text-sm font-bold italic tracking-wide">AI กำลังวิเคราะห์และร่างแผนงานระดับมืออาชีพ...</span>
          </div>
        )}

        {/* Paper Container(s) - Split by [PAGE_BREAK] */}
        {((content || '').split(/(?:\(เนื้อหาสิ้นสุด\)|เนื้อหาจบลงตรงนี้|ขออภัยครับ)/)[0].trim()).split('[PAGE_BREAK]').map((pageContent, index, array) => {
          const trimmedContent = pageContent.trim();
          if (!trimmedContent && index > 0) return null; 

          return (
            <div 
              key={index} 
              className="w-full max-w-4xl bg-white shadow-[0_0_60px_-15px_rgba(0,0,0,0.15)] border border-gray-200 rounded-sm p-12 md:p-20 md:pb-32 mb-12 min-h-[1120px] relative transition-all hover:shadow-2xl flex flex-col"
            > 
              {/* Page Number Indicator (Internal UI) */}
              <div className="absolute bottom-10 left-0 right-0 text-center text-[10px] text-gray-400 font-bold select-none print:hidden uppercase tracking-[0.3em] border-t border-gray-50 pt-8 mx-20">
                PAGINATION • {index + 1} / {array.length}
              </div>

              <article className="prose prose-blue max-w-none flex-1 pb-10">
                <Markdown
                  options={{
                    overrides: {
                      h1: { component: 'h1', props: { className: 'text-3xl md:text-5xl font-black text-gray-900 mb-12 pb-6 border-b-4 border-blue-600 tracking-tight text-center leading-tight' } },
                      h2: { component: 'h2', props: { className: 'text-xl md:text-3xl font-bold text-[#1A5F7A] mb-8 mt-16 pb-2 border-b border-gray-100 leading-snug' } },
                      h3: { component: 'h3', props: { className: 'text-lg md:text-2xl font-bold text-blue-800 mb-6 mt-12 pl-6 border-l-4 border-blue-200 leading-snug' } },
                      p: { component: 'p', props: { className: 'text-gray-700 mb-8 leading-[2.2] text-base md:text-xl text-justify break-words font-medium' } },
                      ul: { component: 'ul', props: { className: 'list-disc pl-10 mb-8 space-y-5 text-gray-700' } },
                      ol: { component: 'ol', props: { className: 'list-decimal pl-10 mb-8 space-y-5 text-gray-700' } },
                      li: { component: 'li', props: { className: 'pl-2 marker:text-blue-600 marker:font-bold leading-relaxed text-base md:text-xl' } },
                      code: {
                        component: ({ children, className }: any) => {
                          const isChart = className?.includes('language-json:chart');
                          if (isChart) {
                            try {
                              const chartData = JSON.parse(children);
                              return (
                                <div className="my-14 p-8 bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden hover:shadow-blue-900/10 transition-shadow bg-gradient-to-br from-white to-blue-50/30">
                                  <ChartRenderer chartData={chartData} />
                                </div>
                              );
                            } catch (e) {
                              return <pre className="p-4 bg-red-50 text-red-500 rounded-lg">{children}</pre>;
                            }
                          }
                          return <code className="bg-gray-100 px-2 py-1 rounded text-blue-600 font-mono text-sm">{children}</code>;
                        }
                      },
                      table: { 
                        component: ({ children, ...props }: any) => (
                          <div className="my-14 w-full flex justify-center overflow-x-auto">
                            <table className="min-w-[95%] max-w-full border-collapse border-2 border-[#1A5F7A] shadow-xl rounded-lg overflow-hidden" {...props}>
                              {children}
                            </table>
                          </div>
                        )
                      },
                      th: { component: 'th', props: { className: 'bg-[#1A5F7A] text-white border border-white/20 px-8 py-5 font-bold text-center uppercase tracking-wider text-sm md:text-lg' } },
                      td: { component: 'td', props: { className: 'bg-[#F0F9FF] text-[#1E3A8A] border border-[#BFDBFE] px-8 py-5 text-sm md:text-lg leading-relaxed font-medium' } },
                      strong: { component: 'strong', props: { className: 'font-bold text-gray-900 bg-yellow-50/50 px-1 rounded' } },
                      blockquote: { component: 'blockquote', props: { className: 'border-l-4 border-blue-500 pl-8 py-6 mb-12 italic bg-gray-50/60 rounded-r-2xl text-gray-600 text-lg md:text-xl quote font-serif' } },
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
