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
  ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { FiDownload, FiX, FiImage, FiExternalLink, FiMapPin } from 'react-icons/fi';
import html2canvas from 'html2canvas';
import { ChartRenderer } from './ChartRenderer';
import { TableRenderer } from './TableRenderer';
import { MapRenderer } from './MapRenderer';

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

  const formatReferenceBlock = (text: string): string => {
    if (!text) return text;
    // 1. ลบ ** และ # ที่ล้อมหัวข้ออ้างอิง ก่อน replace เพื่อไม่ให้ค้างเป็น orphan
    const cleaned = text.replace(/[\*#\s]*(เอกสารอ้างอิง(?:เชิงวิชาการ)?)\s*:?[\*#\s]*/i, '\x00$1\x00');
    // 2. แยกที่ placeholder แล้วจัดรูปแบบ
    return cleaned.replace(/\x00(เอกสารอ้างอิง(?:เชิงวิชาการ)?)\x00([\s\S]*)/i, (_match, header, tail) => {
      const normalizedTail = String(tail || '')
        .replace(/\s*(\[\d+\])/g, '\n\n$1') // เว้นบรรทัดระหว่างรายการอ้างอิง
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return `\n\n[PAGE_BREAK]\n\n### ${header}\n\n${normalizedTail}`;
    });
  };

  const dataUrlToUint8Array = (dataUrl: string): Uint8Array | null => {
    try {
      const base64 = dataUrl.split(',')[1] || '';
      if (!base64) return null;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    } catch {
      return null;
    }
  };

  const normalizeChartPayload = (input: any): { type: 'bar' | 'line' | 'pie' | 'doughnut'; data: any; title?: string } | null => {
    if (!input || typeof input !== 'object') return null;

    const rawType = String(input.type || input.chartType || '').toLowerCase();
    const type = (['bar', 'line', 'pie', 'doughnut'].includes(rawType) ? rawType : 'bar') as 'bar' | 'line' | 'pie' | 'doughnut';

    const data = input?.data && typeof input.data === 'object'
      ? input.data
      : {
          labels: Array.isArray(input?.labels) ? input.labels : [],
          datasets: Array.isArray(input?.datasets) ? input.datasets : [],
        };

    if (!Array.isArray(data?.datasets) || data.datasets.length === 0) return null;

    return {
      type,
      data,
      title: input?.options?.plugins?.title?.text || input?.title || undefined,
    };
  };

  const createChartImageData = async (chartData: any): Promise<Uint8Array | null> => {
    try {
      if (typeof window === 'undefined') return null;
      const ChartLib = (window as any)?.Chart;
      if (!ChartLib) return null;

      const normalized = normalizeChartPayload(chartData);
      if (!normalized) return null;

      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;

      const context = canvas.getContext('2d');
      if (!context) return null;

      const chart = new ChartLib(context, {
        type: normalized.type,
        data: JSON.parse(JSON.stringify(normalized.data)),
        options: {
          responsive: false,
          animation: false,
          plugins: {
            legend: { display: true, position: 'top' },
            title: {
              display: !!normalized.title,
              text: normalized.title,
              font: { size: 18 },
            },
          },
          scales: normalized.type === 'pie' || normalized.type === 'doughnut'
            ? {}
            : {
                x: { ticks: { maxRotation: 0, autoSkip: true } },
                y: { beginAtZero: true },
              },
        },
      });

      chart.update();
      await new Promise((resolve) => setTimeout(resolve, 60));

      // วาดตัวเลขกำกับบนกราฟด้วยตนเอง (ไม่ต้องพึ่ง plugin datalabels)
      const isPieLike = normalized.type === 'pie' || normalized.type === 'doughnut';
      context.save();
      context.textBaseline = 'middle';
      context.textAlign = 'center';

      normalized.data.datasets.forEach((_ds: any, dsIdx: number) => {
        try {
          const meta = chart.getDatasetMeta(dsIdx);
          if (!meta || !meta.data) return;
          meta.data.forEach((element: any, dataIdx: number) => {
            const rawVal = normalized.data.datasets[dsIdx]?.data?.[dataIdx];
            if (rawVal === undefined || rawVal === null) return;
            const val = Number(rawVal);
            if (isNaN(val)) return;
            const label = val.toLocaleString();

            const { x, y } = element.tooltipPosition ? element.tooltipPosition() : element;

            if (isPieLike) {
              // สำหรับ pie/doughnut วาดตรงกลาง arc
              context.font = 'bold 16px sans-serif';
              context.fillStyle = '#ffffff';
              context.strokeStyle = 'rgba(0,0,0,0.4)';
              context.lineWidth = 3;
              context.strokeText(label, x, y);
              context.fillText(label, x, y);
            } else {
              // สำหรับ bar/line วางเลขเหนือแท่ง
              const barTop = element.y ?? y;
              context.font = 'bold 15px sans-serif';
              context.fillStyle = '#222222';
              context.fillText(label, x, barTop - 10);
            }
          });
        } catch {
          // ignore per-dataset errors
        }
      });
      context.restore();

      const png = canvas.toDataURL('image/png', 1);
      chart.destroy();

      return dataUrlToUint8Array(png);
    } catch {
      return null;
    }
  };

  const isDeepResearch = status?.toLowerCase().includes('deep research') || 
                         status?.toLowerCase().includes('deep search') ||
                         content?.toLowerCase().includes('deep research') ||
                         content?.toLowerCase().includes('deep search');

  // ดึงหัวข้อเอกสารจาก # แรกเพื่อแสดงใน header bar
  const docTitleMatch = content?.match(/^#\s+(.+)/m);
  const docTitle = docTitleMatch
    ? docTitleMatch[1].replace(/\*\*/g, '').trim()
    : null;

  const displayTitle = isDeepResearch
    ? 'Deep Research'
    : docTitle || 'Project Planning Canvas';

  const handleDownload = async () => {
    if (!content) return;

    const normalizedContent = formatReferenceBlock(content);
    const lines = normalizedContent.split('\n');
    const docChildren: any[] = [];

    const parseTextToWordElements = (text: string, options: { size?: number, color?: string, forceBold?: boolean } = {}): any[] => {
      const { size = DOC_CONFIG.sizeMain, color, forceBold = false } = options;
      
      // 1. Clean up technical artifacts and fix broken markdown links across lines
      const cleanedText = text
        .replace(/(^|\s)(https?:\/\/[^\s<)]+)(?=$|\s)/g, '$1[$2]($2)')
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
            language: { value: 'th-TH' },
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
            language: { value: 'th-TH' },
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
          language: { value: 'th-TH' },
        }));
      }

      return elements.length > 0 ? elements : [new TextRun({ text: cleanedText, font: DOC_CONFIG.font, size, color, bold: forceBold, language: { value: 'th-TH' } })];
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
    const plainTextBuffer: string[] = [];
    const flushPlainText = () => {
      if (plainTextBuffer.length === 0) return;
      const combined = plainTextBuffer.join(' ').replace(/\s+/g, ' ').trim();
      plainTextBuffer.length = 0;
      if (!combined) return;
      docChildren.push(
        createStyledParagraph(combined, {
          spacing: { before: 0, after: 0, line: 288, lineRule: 'auto' },
          alignment: AlignmentType.BOTH,
          wordWrap: true,
          indent: { firstLine: 440 }, // Thai standard first-line indent
        })
      );
    };
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Handle Page Breaks (Case-insensitive catch-all, handles backslashes like [PAGE\_BREAK])
      const isPageBreak = /\[PAGE[\\_]*BREAK\]/i.test(trimmed) || trimmed === '---page-break---';
      if (isPageBreak) {
        flushPlainText();
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
        flushPlainText();
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
            
            // ปรับความกว้างคอลัมน์ให้เหมาะสม (คอลัมน์แรกมักเป็นลำดับ)
            let cellWidths: number[] = [];
            if (cells.length === 1) cellWidths = [100];
            else if (cells.length === 2) cellWidths = [15, 85];
            else if (cells.length === 3) cellWidths = [10, 45, 45];
            else if (cells.length === 4) cellWidths = [8, 32, 25, 35];
            else if (cells.length === 5) cellWidths = [8, 25, 25, 22, 20];
            else if (cells.length === 6) cellWidths = [7, 20, 25, 18, 15, 15];
            else cellWidths = cells.map(() => 100 / cells.length);

            rows.push(
              new TableRow({
                children: cells.map(
                  (cell, cIdx) =>
                    new TableCell({
                      width: { size: cellWidths[cIdx] || (100 / cells.length), type: WidthType.PERCENTAGE },
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
              rows,
              margins: { bottom: 400 },
            })
          );
        }
        continue;
      }

      if (trimmed === '```json:chart' || trimmed === '```json:chart-ai') {
        flushPlainText();
        let chartContent = '';
        i++;
        while (i < lines.length && !lines[i].trim().includes('```')) {
          chartContent += lines[i] + '\n';
          i++;
        }
        try {
          // Remove comments safely (preserving URLs like http://)
          const cleanJson = chartContent
            .replace(/("([^"\\]*(\\.[^"\\]*)*)")|(\/\/.*$)|(\/\*[\s\S]*?\*\/)/gm, (m, p1) => p1 || '')
            .replace(/,(\s*[\]}])/g, '$1')
            .trim();
          const chartData = JSON.parse(cleanJson);
          const chartImageData = await createChartImageData(chartData);

          if (chartImageData) {
            docChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    type: 'png',
                    data: chartImageData,
                    transformation: {
                      width: 620,
                      height: 350,
                    },
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 180, after: 180 },
              })
            );
          } else {
            docChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[📊 กราฟแสดงผล: ${chartData.options?.plugins?.title?.text || chartData.title || chartData.type || 'ข้อมูลสถิติ'}]`,
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
          }
        } catch (e) {
          console.error('Chart parse error in word export', e);
        }
        i++;
        continue;
      }

      if (trimmed === '```json:table' || trimmed === '```json:table-ai') {
        flushPlainText();
        let tableJsonContent = '';
        i++;
        while (i < lines.length && !lines[i].trim().includes('```')) {
          tableJsonContent += lines[i] + '\n';
          i++;
        }
        try {
          // Remove comments safely (preserving URLs like http://)
          const cleanJson = tableJsonContent
            .replace(/("([^"\\]*(\\.[^"\\]*)*)")|(\/\/.*$)|(\/\*[\s\S]*?\*\/)/gm, (m, p1) => p1 || '')
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
            // ปรับความกว้างคอลัมน์อัตโนมัติสำหรับ JSON table
            const count = processedHeaders.length;
            const jsonWidths = count === 1 ? [100] :
                               count === 2 ? [15, 85] :
                               count === 3 ? [10, 45, 45] :
                               count === 4 ? [8, 32, 25, 35] :
                               count === 5 ? [8, 25, 25, 22, 20] :
                               processedHeaders.map(() => 100 / count);

            docTableRows.push(new TableRow({
              children: processedHeaders.map((h, hIdx) => new TableCell({
                width: { size: jsonWidths[hIdx], type: WidthType.PERCENTAGE },
                children: [new Paragraph({
                  children: parseTextToWordElements(String(h), { forceBold: true, size: 24 }),
                  alignment: AlignmentType.CENTER,
                })],
                shading: { fill: 'F2F2F2' },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4 },
                  bottom: { style: BorderStyle.SINGLE, size: 4 },
                  left: { style: BorderStyle.SINGLE, size: 4 },
                  right: { style: BorderStyle.SINGLE, size: 4 },
                },
                margins: { top: 120, bottom: 120, left: 120, right: 120 },
                verticalAlign: VerticalAlign.CENTER,
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
                  },
                  margins: { top: 120, bottom: 120, left: 120, right: 120 },
                  verticalAlign: VerticalAlign.CENTER,
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

      if (trimmed === '```json:map' || trimmed === '```json:map-ai') {
        flushPlainText();
        let mapJsonContent = '';
        i++;
        while (i < lines.length && !lines[i].trim().includes('```')) {
          mapJsonContent += lines[i] + '\n';
          i++;
        }
        try {
          const cleanJson = mapJsonContent
            .replace(/("([^"\\]*(\\.[^"\\]*)*)")|(\/\/.*$)|(\/\*[\s\S]*?\*\/)/gm, (m, p1) => p1 || '')
            .replace(/,(\s*[\]}])/g, '$1')
            .trim();
          const mapData = JSON.parse(cleanJson);
          const points = Array.isArray(mapData.points) ? mapData.points : [];

          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `📍 แผนที่แสดงผล: ${mapData.title || 'ข้อมูลพิกัดภูมิศาสตร์'}`,
                  bold: true,
                  color: 'C00000',
                  font: DOC_CONFIG.font,
                  size: 28,
                }),
              ],
              spacing: { before: 200, after: 100 },
            })
          );

          if (points.length > 0) {
            const mapWidths = [8, 32, 25, 35];
            const mapTableRows = [
              new TableRow({
                children: ['จุดที่', 'สถานที่/จุดเกิดเหตุ', 'พิกัด (Lat, Lon)', 'รายละเอียด'].map((h, hIdx) => new TableCell({
                  width: { size: mapWidths[hIdx], type: WidthType.PERCENTAGE },
                  children: [new Paragraph({
                    children: [new TextRun({ text: h, bold: true, size: 24 })],
                    alignment: AlignmentType.CENTER,
                  })],
                  shading: { fill: 'F2F2F2' },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4 },
                    bottom: { style: BorderStyle.SINGLE, size: 4 },
                    left: { style: BorderStyle.SINGLE, size: 4 },
                    right: { style: BorderStyle.SINGLE, size: 4 },
                  },
                  margins: { top: 120, bottom: 120, left: 120, right: 120 },
                  verticalAlign: VerticalAlign.CENTER,
                }))
              })
            ];

            points.forEach((p: any, idx: number) => {
              const lat = p.lat || p.latitude || '-';
              const lon = p.lon || p.lng || p.longitude || '-';
              const location = p.location || p.point || p.area || '-';
              const detail = [p.road, p.date, p.time, p.vehicleType].filter(Boolean).join(', ') || '-';

              mapTableRows.push(new TableRow({
                children: [
                  String(idx + 1),
                  location,
                  `${lat}, ${lon}`,
                  detail
                ].map((c, cIdx) => new TableCell({
                  width: { size: mapWidths[cIdx], type: WidthType.PERCENTAGE },
                  children: [new Paragraph({
                    children: [new TextRun({ text: c, size: 22 })],
                    alignment: cIdx === 0 || cIdx === 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
                  })],
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 2 },
                    bottom: { style: BorderStyle.SINGLE, size: 2 },
                    left: { style: BorderStyle.SINGLE, size: 2 },
                    right: { style: BorderStyle.SINGLE, size: 2 },
                  },
                  margins: { top: 80, bottom: 80, left: 80, right: 80 },
                  verticalAlign: VerticalAlign.CENTER,
                }))
              }));
            });

            docChildren.push(new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: mapTableRows,
              margins: { bottom: 400 },
            }));
          }
        } catch (e) {
          console.error('Map AI parse error in word export', e);
        }
        i++;
        continue;
      }

      if (trimmed.startsWith('# ')) {
        flushPlainText();
        listCounter = 1;
        docChildren.push(
          createStyledParagraph(trimmed.substring(2), {
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 0, after: 0 },
            alignment: AlignmentType.CENTER,
            bold: true,
            size: DOC_CONFIG.sizeTitle,
          })
        );
      } else if (trimmed.startsWith('## ')) {
        flushPlainText();
        listCounter = 1;
        docChildren.push(
          createStyledParagraph(trimmed.substring(3), {
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 0, after: 0 },
            bold: true,
            color: '1A5F7A',
            size: DOC_CONFIG.sizeHeader,
          })
        );
      } else if (trimmed.startsWith('### ')) {
        flushPlainText();
        listCounter = 1;
        docChildren.push(
          createStyledParagraph(trimmed.substring(4), {
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 0, after: 0 },
            bold: true,
            color: '000000',
            size: DOC_CONFIG.sizeMain + 4, // Slightly larger than main
            indent: { left: 360 },
          })
        );
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.match(/^\d+\. /)) {
        flushPlainText();
        const numMatch = trimmed.match(/^(\d+)\. /);
        let contentText: string;
        let itemIdx: number;
        if (numMatch) {
          // ใช้ตัวเลขจริงจาก markdown แทนการนับ counter เพื่อให้ถูกต้องเสมอ
          itemIdx = parseInt(numMatch[1], 10);
          contentText = trimmed.replace(/^\d+\. /, '');
          listCounter = itemIdx + 1;
        } else {
          contentText = trimmed.substring(2);
          itemIdx = listCounter++;
        }
        docChildren.push(
          createStyledParagraph(contentText, {
            isList: true,
            listIdx: itemIdx,
            spacing: { after: 0 },
            indent: { left: 720, hanging: 360 },
            alignment: AlignmentType.BOTH,
            wordWrap: true,
          })
        );
      } else if (trimmed !== '') {
        plainTextBuffer.push(trimmed);
      } else {
        flushPlainText();
        // ไม่ reset listCounter เมื่อเจอบรรทัดว่าง เพื่อให้รายการอ้างอิงที่มี \n\n คั่น
        // ยังคงนับต่อเนื่องแทนที่จะกลับไปเป็น 1 ทุกรายการ
      }
      i++;
    }
    flushPlainText(); // flush remaining buffer at end of section

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { size: DOC_CONFIG.sizeMain, font: DOC_CONFIG.font },
            paragraph: { spacing: { line: 288, lineRule: 'auto', before: 0, after: 0 } },
          },
        },
        paragraphStyles: [
          {
            id: 'Normal',
            name: 'Normal',
            run: { font: DOC_CONFIG.font, size: DOC_CONFIG.sizeMain },
            paragraph: { spacing: { before: 0, after: 0, line: 288, lineRule: 'auto' } },
          },
          {
            id: 'Heading1',
            name: 'heading 1',
            basedOn: 'Normal',
            run: { font: DOC_CONFIG.font, size: DOC_CONFIG.sizeTitle, bold: true, color: '000000' },
            paragraph: { spacing: { before: 0, after: 0, line: 288, lineRule: 'auto' } },
          },
          {
            id: 'Heading2',
            name: 'heading 2',
            basedOn: 'Normal',
            run: { font: DOC_CONFIG.font, size: DOC_CONFIG.sizeHeader, bold: true, color: '1A5F7A' },
            paragraph: { spacing: { before: 0, after: 0, line: 288, lineRule: 'auto' } },
          },
          {
            id: 'Heading3',
            name: 'heading 3',
            basedOn: 'Normal',
            run: { font: DOC_CONFIG.font, size: DOC_CONFIG.sizeMain + 4, bold: true, color: '000000' },
            paragraph: { spacing: { before: 0, after: 0, line: 288, lineRule: 'auto' } },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906,  // A4 กว้าง 210mm = 11906 twips
                height: 16838, // A4 สูง 297mm = 16838 twips
              },
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
              spacing: { before: 0, after: 0, line: 288, lineRule: 'auto' },
            }),
            ...docChildren,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);

    // ดึงหัวข้อเอกสาร (# หรือ ## แรกที่เจอ) เพื่อใช้เป็นชื่อไฟล์
    const titleMatch = content.match(/^#{1,2}\s+(.+)/m);
    const rawTitle = titleMatch ? titleMatch[1] : 'Project-Plan';
    const safeTitle = rawTitle
      .replace(/\*\*/g, '')           // ลบ bold markers
      .replace(/[\\/:*?"<>|]/g, '-')  // ลบอักขระต้องห้ามในชื่อไฟล์
      .replace(/\s+/g, '-')           // แทนที่ช่องว่างด้วย -
      .replace(/-{2,}/g, '-')         // ลด -- ซ้อนกัน
      .replace(/^-|-$/g, '')          // ตัด - หัวท้าย
      .substring(0, 80);              // จำกัดความยาว

    saveAs(blob, `${safeTitle}-${new Date().toISOString().split('T')[0]}.docx`);
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
              .replace(/(^|\s)(https?:\/\/[^\s<)]+)(?=$|\s)/g, '$1[$2]($2)')
              // 1. Remove <thought> tags that AI might generate
              .replace(/<thought[^>]*>[\s\S]*?<\/thought>/gi, '')
              .replace(/<\/?thought[^>]*>/gi, '')
              // 2. Ensure blank line before tables (some parsers need it)
              .replace(/([^\n])\n\|/g, '$1\n\n|')
              // 3. Fix literal <br> tags anywhere - convert to spaces or actual newlines depending on context
              // Inside tables, <br> breaks standard markdown. Let's replace them with a space for integrity.
              .replace(/<br\s*\/?>/gi, ' ')
              // 4. Fix broken markdown links across lines [text](url1\nurl2)
              .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, (match, text, url) => {
                const cleanUrl = url.replace(/\s+/g, '');
                return `[${text}](${cleanUrl})`;
              })
              .replace(/(\])\s*(?=\[\d+\])/g, '$1\n\n');

            processedContent = formatReferenceBlock(processedContent);

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
              className="w-full max-w-4xl bg-white shadow-[0_0_60px_-15px_rgba(0,0,0,0.15)] border border-gray-200 rounded-sm p-12 md:p-20 mb-12 h-auto relative transition-all hover:shadow-2xl flex flex-col"
            > 
              <article className="prose prose-blue max-w-none pb-20 break-words">
                <Markdown
                  options={{
                    overrides: {
                        h1: {
                          component: 'h1',
                          props: {
                            className: 'mb-12 break-words border-b-4 border-blue-600 pb-6 text-center text-3xl font-black leading-tight text-gray-900 tracking-tight md:text-5xl',
                          },
                        },
                        h2: {
                          component: 'h2',
                          props: {
                            className: 'mb-8 mt-16 break-words border-b border-gray-100 pb-2 text-xl font-bold leading-snug text-[#1A5F7A] md:text-3xl',
                          },
                        },
                        h3: {
                          component: 'h3',
                          props: {
                            className: 'mb-6 mt-12 break-words border-l-4 border-blue-200 pl-6 text-lg font-bold leading-snug text-blue-800 md:text-2xl',
                          },
                        },
                        p: {
                          component: ({ children, ...props }: any) => {
                            const childrenArray = React.Children.toArray(children);
                            const firstChild = childrenArray[0];
                            const isRef = typeof firstChild === 'string' && /^\[\s*\d+\s*\]/.test(firstChild.trim());
                            const isSectionHeader = typeof firstChild === 'string' && firstChild.includes('เอกสารอ้างอิง');
                            
                            return (
                              <p 
                                {...props} 
                                className={`mb-6 break-words text-left text-base leading-snug text-gray-700 md:text-xl whitespace-normal ${isRef || isSectionHeader ? 'indent-0 text-sm md:text-base opacity-80 border-l-2 border-gray-100 pl-4 py-2 bg-gray-50/20 rounded-r-lg' : 'indent-8 font-medium'}`}
                              >
                                {children}
                              </p>
                            );
                          }
                        },
                        ul: {
                          component: 'ul',
                          props: {
                            className: 'mb-8 break-words space-y-4 pl-10 text-gray-700 list-disc',
                          },
                        },
                        ol: {
                          component: 'ol',
                          props: {
                            className: 'mb-8 break-words space-y-4 pl-10 text-gray-700 list-decimal',
                          },
                        },
                        li: {
                          component: 'li',
                          props: {
                            className: 'break-words pl-2 text-base leading-relaxed md:text-xl marker:font-bold marker:text-blue-500',
                          },
                        },
                      code: {
                        component: ({ children, className }: any) => {
                          const isChart = className?.includes('language-json:chart');
                          const isTable = className?.includes('language-json:table');
                          const isMap = className?.includes('language-json:map');
                          
                          if (isChart || isTable || isMap) {
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
                                  <div className="my-10 p-4 md:p-8 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all bg-linear-to-br from-white to-blue-50/20">
                                    <ChartRenderer chartData={chartData} />
                                  </div>
                                );
                              }
                              
                              if (isTable) {
                                const tableData = JSON.parse(cleanJson);
                                return (
                                  <div className="my-10 p-4 md:p-8 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all bg-linear-to-br from-white to-blue-50/20">
                                    <TableRenderer tableData={tableData} />
                                  </div>
                                );
                              }

                              if (isMap) {
                                const mapData = JSON.parse(cleanJson);
                                return (
                                  <div className="my-10 p-4 md:p-8 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all bg-linear-to-br from-white to-blue-50/20">
                                    <MapRenderer mapData={mapData} />
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
                          <div className="my-10 w-full overflow-x-auto break-words">
                            <table className="w-full border-collapse border border-gray-200 shadow-md rounded-lg table-auto" {...props}>
                              {children}
                            </table>
                          </div>
                        )
                      },
                        th: {
                          component: 'th',
                          props: {
                            className: 'bg-gray-50/50 break-words border-b border-gray-200 px-4 py-3 text-sm font-bold uppercase text-gray-700 tracking-wider md:text-base align-middle whitespace-normal text-center',
                          },
                        },
                        td: {
                          component: 'td',
                          props: {
                            className: 'bg-white break-words border-b border-gray-100 px-4 py-3 text-sm font-normal leading-relaxed text-gray-700 md:text-base align-middle whitespace-normal',
                          },
                        },
                        strong: {
                          component: 'strong',
                          props: {
                            className: 'break-words font-bold text-gray-900 px-0.5',
                          },
                        },
                        blockquote: {
                          component: 'blockquote',
                          props: {
                            className: 'mb-10 break-words rounded-r-xl border-l-[6px] border-blue-400 bg-blue-50/30 py-4 pl-8 italic text-lg text-gray-600 md:text-xl font-serif',
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
                            // Only shorten when display text is itself a raw URL, or for localhost file links
                            if (displayText.startsWith('http') || displayText.includes('localhost') || href.includes('localhost')) {
                              try {
                                if (href.includes('localhost') || href.includes('127.0.0.1')) {
                                  const url = new URL(href, 'http://localhost');
                                  const fileName = url.searchParams.get('name');
                                  if (fileName) displayText = `📄 ${decodeURIComponent(fileName)}`;
                                  else displayText = '📄 document';
                                } 
                                else if (displayText.startsWith('http')) {
                                  // Display text is a raw URL — shorten to hostname
                                  const url = new URL(displayText);
                                  displayText = url.hostname.replace('www.', '');
                                }
                                // If display text is a meaningful title (not a URL), keep it as-is
                              } catch (e) {
                                if (displayText.startsWith('http')) displayText = displayText.substring(0, 30) + '...';
                              }
                            }
                            
                            if (typeof displayText !== 'string') displayText = 'Link';

                            return (
                              <a 
                                {...props} 
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-4 transition-all opacity-95 hover:opacity-100 font-medium break-all max-w-full"
                                title={rawText}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <FiExternalLink className="text-[10px] flex-shrink-0" />
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

              <div className="mt-auto pt-8 border-t border-gray-50 text-center text-[10px] text-gray-400 font-bold select-none print:hidden uppercase tracking-[0.3em] mx-10">
                PAGINATION • {index + 1} / {array.length}
              </div>
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
