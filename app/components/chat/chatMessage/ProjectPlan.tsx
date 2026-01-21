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
} from 'docx';
import { saveAs } from 'file-saver';
import { FiDownload, FiX } from 'react-icons/fi';
import { ChartRenderer } from './ChartRenderer';

interface ProjectPlanProps {
  content?: string;
  isLoading?: boolean;
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

export const ProjectPlan = ({ content, isLoading, onClose }: ProjectPlanProps) => {
  if (!content && !isLoading) return null;

  const handleDownload = async () => {
    if (!content) return;

    const lines = content.split('\n');
    const docChildren: any[] = [];

    const parseTextWithBold = (text: string): TextRun[] => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part) => {
        const isBold = part.startsWith('**') && part.endsWith('**');
        return new TextRun({
          text: isBold ? part.slice(2, -2) : part,
          bold: isBold,
          font: DOC_CONFIG.font,
          size: DOC_CONFIG.sizeMain,
        });
      });
    };

    const createStyledParagraph = (text: string, options: any = {}) => {
      const { isList = false, listIdx = 1, ...props } = options;
      const runs: TextRun[] = [];

      if (isList) {
        runs.push(
          new TextRun({
            text: `${listIdx}. `,
            bold: true,
            font: DOC_CONFIG.font,
            size: DOC_CONFIG.sizeMain,
          })
        );
      }

      runs.push(...parseTextWithBold(text));

      return new Paragraph({
        children: runs,
        ...props,
      });
    };

    let i = 0;
    let listCounter = 1;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed === '---page-break---' || trimmed === '[PAGE_BREAK]') {
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
                          children: [
                            new TextRun({
                              text: cell.trim(),
                              bold: isHeader,
                              color: isHeader ? 'FFFFFF' : '1E3A8A',
                              font: DOC_CONFIG.font,
                              size: isHeader ? 28 : 24,
                            }),
                          ],
                          alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                          spacing: { line: 240 },
                        }),
                      ],
                      shading: isHeader ? { fill: '1A5F7A' } : { fill: 'F0F9FF' },
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 4, color: isHeader ? '1A5F7A' : 'BFDBFE' },
                        bottom: { style: BorderStyle.SINGLE, size: 4, color: isHeader ? '1A5F7A' : 'BFDBFE' },
                        left: { style: BorderStyle.SINGLE, size: 4, color: isHeader ? '1A5F7A' : 'BFDBFE' },
                        right: { style: BorderStyle.SINGLE, size: 4, color: isHeader ? '1A5F7A' : 'BFDBFE' },
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

      if (trimmed.startsWith('# ')) {
        listCounter = 1;
        docChildren.push(
          createStyledParagraph(trimmed.substring(2), {
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            alignment: AlignmentType.CENTER,
            bold: true,
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
          })
        );
      } else if (trimmed.startsWith('### ')) {
        listCounter = 1;
        docChildren.push(
          createStyledParagraph(trimmed.substring(4), {
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
            bold: true,
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
    <div className="flex h-full flex-col overflow-hidden border-l border-gray-200 bg-transparent shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"></div>
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 [animation-delay:0.2s]"></div>
          </div>
          <span className="font-bold tracking-tight text-gray-800">Project Planning Canvas</span>
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

      <div className="flex-1 flex-col items-center overflow-y-auto bg-gray-50/50 p-8">
        {isLoading && (
          <div className="mb-6 flex w-full max-w-4xl items-center gap-3 border border-blue-100 bg-blue-50 p-4 text-blue-700 shadow-sm rounded-xl">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500"></span>
            </span>
            <span className="text-sm font-bold italic tracking-wide">
              AI กำลังวิเคราะห์และร่างแผนงานระดับมืออาชีพ...
            </span>
          </div>
        )}

        {((content || '')
          .split(/(?:\(เนื้อหาสิ้นสุด\)|เนื้อหาจบลงตรงนี้|ขออภัยครับ)/)[0]
          .trim())
          .split('[PAGE_BREAK]')
          .map((pageContent, index, array) => {
            const trimmedContent = pageContent.trim().replace(/ {2,}/g, ' ');
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
                          if (isChart) {
                            try {
                              const chartData = JSON.parse(children);
                              return (
                                <div className="my-14 p-8 bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden hover:shadow-blue-900/10 transition-shadow bg-linear-to-br from-white to-blue-50/30">
                                  <ChartRenderer chartData={chartData} />
                                </div>
                              );
                            } catch (e) {
                              return <pre className="p-4 bg-red-50 text-red-500 rounded-lg break-all">{children}</pre>;
                            }
                          }
                          return <code className="bg-gray-100 px-2 py-1 rounded text-blue-600 font-mono text-sm break-all">{children}</code>;
                        }
                      },
                      table: { 
                        component: ({ children, ...props }: any) => (
                          <div className="my-14 w-full overflow-hidden wrap-break-word">
                            <table className="w-full border-collapse border-2 border-[#1A5F7A] shadow-xl rounded-lg table-fixed" {...props}>
                              {children}
                            </table>
                          </div>
                        )
                      },
                        th: {
                          component: 'th',
                          props: {
                            className: 'bg-[#1A5F7A] wrap-break-word border border-white/20 px-2 py-2 text-sm font-bold uppercase text-white tracking-wider md:text-base align-middle whitespace-normal text-center',
                          },
                        },
                        td: {
                          component: 'td',
                          props: {
                            className: 'bg-[#F0F9FF] wrap-break-word border border-[#BFDBFE] px-2 py-2 text-sm font-medium leading-relaxed text-[#1E3A8A] md:text-base align-middle whitespace-normal',
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