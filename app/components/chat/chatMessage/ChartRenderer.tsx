'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FiDownload } from 'react-icons/fi';

interface ChartRendererProps {
  chartData: any;
}

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

type NormalizedChart = {
  type: ChartType;
  title?: string;
  data: {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: Array<number | null>;
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      hoverBackgroundColor?: string | string[];
      [key: string]: any;
    }>;
  };
  options?: any;
};

function toNumeric(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').replace(/%/g, '').trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeChartData(input: any): NormalizedChart | null {
  if (!input || typeof input !== 'object') return null;

  const normalizedType = String(input.type || '').toLowerCase();
  const fallbackType = String(input.chartType || '').toLowerCase();
  const type = (normalizedType === 'chart' ? fallbackType : normalizedType) as ChartType;
  if (!['bar', 'line', 'pie', 'doughnut'].includes(type)) return null;

  const nestedData = input.data && typeof input.data === 'object' ? input.data : null;
  const rawLabels = Array.isArray(nestedData?.labels)
    ? nestedData.labels
    : Array.isArray(input.labels)
      ? input.labels
      : [];

  const rawDatasets = Array.isArray(nestedData?.datasets)
    ? nestedData.datasets
    : Array.isArray(input.datasets)
      ? input.datasets
      : [];

  let datasets: any[] = [];
  let labels = rawLabels.map((label: any) => String(label));

  if (Array.isArray(rawDatasets) && rawDatasets.length > 0) {
    datasets = rawDatasets.map((dataset: any) => ({
      ...dataset,
      label: typeof dataset?.label === 'string' ? dataset.label : 'ข้อมูล',
      data: Array.isArray(dataset?.data)
        ? dataset.data.map((value: any) => toNumeric(value))
        : [],
    }));
  } else if (Array.isArray(input.data)) {
    const rawItems = input.data;

    if (rawItems.length > 0 && typeof rawItems[0] === 'object' && !Array.isArray(rawItems[0])) {
      const inferredLabels: string[] = [];
      const inferredValues: Array<number | null> = [];

      for (const row of rawItems) {
        const entries = Object.entries(row || {});
        const labelEntry = entries.find(([, value]) => typeof value === 'string' && value.trim() !== '');
        const valueEntry = entries.find(([, value]) => toNumeric(value) !== null);

        inferredLabels.push(String(labelEntry?.[1] ?? `รายการ ${inferredLabels.length + 1}`));
        inferredValues.push(valueEntry ? toNumeric(valueEntry[1]) : null);
      }

      labels = inferredLabels;
      datasets = [{
        label: typeof input.title === 'string' && input.title.trim() ? input.title : 'ข้อมูล',
        data: inferredValues,
      }];
    } else {
      labels = rawItems.map((_: any, index: number) => String(index + 1));
      datasets = [{
        label: typeof input.title === 'string' && input.title.trim() ? input.title : 'ข้อมูล',
        data: rawItems.map((value: any) => toNumeric(value)),
      }];
    }
  }

  if (!Array.isArray(datasets) || datasets.length === 0) return null;

  if (labels.length === 0) {
    const maxLen = datasets.reduce((acc: number, ds: any) => Math.max(acc, Array.isArray(ds.data) ? ds.data.length : 0), 0);
    labels = Array.from({ length: maxLen }, (_, index) => String(index + 1));
  }

  return {
    type,
    title: typeof input.title === 'string' ? input.title : undefined,
    data: {
      labels,
      datasets,
    },
    options: input.options,
  };
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const normalizedChart = normalizeChartData(chartData);

  // ฟังก์ชันสำหรับ export รูปกราฟ
  const handleExportImage = async () => {
    if (!canvasRef.current || !chartInstanceRef.current) return;
    
    setIsExporting(true);
    try {
      // รอให้กราฟเรนเดอร์เสร็จสมบูรณ์
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // แปลง canvas เป็น blob
      const canvas = canvasRef.current;
      canvas.toBlob((blob) => {
        if (blob) {
          const title = normalizedChart?.title || normalizedChart?.options?.plugins?.title?.text || 'chart';
          const filename = `${title.replace(/[^a-zA-Z0-9ก-๙\s]/g, '_')}_${Date.now()}.png`;
          
          // ดาวน์โหลดไฟล์
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
        setIsExporting(false);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error exporting chart:', error);
      setIsExporting(false);
    }
  };

  // สร้าง gradient สีอ่อนสำหรับเติมใต้เส้นกราฟ
  const createLineGradient = (ctx: CanvasRenderingContext2D, baseColor: string) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    // พยายามแปลงเป็น rgba ที่โปร่งใสเล็กน้อย
    const hexToRgba = (hex: string, alpha: number) => {
      const m = hex.replace('#', '');
      const bigint = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const start = baseColor.startsWith('#') ? hexToRgba(baseColor, 0.25) : baseColor;
    const end = baseColor.startsWith('#') ? hexToRgba(baseColor, 0.02) : baseColor;
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    return gradient;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // ทำลาย chart เดิมก่อน (ถ้ามี)
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // สร้าง chart ใหม่ พร้อมค่าเริ่มต้นที่เป็นมิตรกับ mobile/flex
    // @ts-ignore
    if (typeof window !== 'undefined' && window.Chart) {
      const Chart = (window as any).Chart;
      const ChartDataLabels = (window as any).ChartDataLabels;

      if (!normalizedChart?.data || !normalizedChart?.type) {
        console.warn('ChartRenderer: chartData or required properties are missing', chartData);
        return;
      }

      const clonedData = JSON.parse(JSON.stringify(normalizedChart.data));
      
      // ตรวจสอบความถูกต้องของโครงสร้างสถิติ
      if (clonedData && clonedData.datasets) {
        clonedData.datasets = clonedData.datasets.map((ds: any) => {
          // แปลงข้อมูลเป็นตัวเลข (ป้องกันกรณี AI ส่งเป็นสตริง)
          const numericData = Array.isArray(ds.data) 
            ? ds.data.map((v: any) => v === null || v === undefined ? null : Number(v))
            : [];
            
          const baseDs = {
            ...ds,
            data: numericData,
          };

          // ปรับแต่งเพิ่มเติมสำหรับ Line Chart
          if (normalizedChart.type === 'line') {
            const defaultColor = '#3b82f6';
            const borderColor = (Array.isArray(ds.borderColor) ? ds.borderColor[0] : ds.borderColor) || defaultColor;
            return {
              ...baseDs,
              borderColor: ds.borderColor || borderColor,
              borderWidth: ds.borderWidth ?? 3,
              tension: ds.tension !== undefined ? ds.tension : 0.4,
              pointRadius: ds.pointRadius ?? 4,
              pointHoverRadius: ds.pointHoverRadius ?? 6,
              pointBackgroundColor: ds.pointBackgroundColor ?? '#ffffff',
              pointBorderColor: ds.pointBorderColor ?? borderColor,
              fill: ds.fill ?? 'start',
              backgroundColor: ds.backgroundColor || createLineGradient(ctx, borderColor),
            };
          }
          return baseDs;
        });
      }

      // 1. เตรียม Plugin Defaults
      const defaultDatalabels = {
        color: (context: any) => {
          if (normalizedChart.type === 'pie' || normalizedChart.type === 'doughnut') return '#fff';
          return '#444'; 
        },
        display: (context: any) => {
          if (normalizedChart.type === 'pie' || normalizedChart.type === 'doughnut') {
            const dataset = context.chart.data.datasets[0];
            const total = dataset.data.reduce((acc: number, val: number) => acc + (val || 0), 0);
            const value = dataset.data[context.dataIndex];
            return total > 0 && (value / total) > 0.05; 
          }
          return true;
        },
        font: {
          weight: 'bold',
          size: 11,
        },
        formatter: (value: any, context: any) => {
          if (value === null || value === undefined) return '';
          if (normalizedChart.type === 'pie' || normalizedChart.type === 'doughnut') {
            const label = context.chart.data.labels?.[context.dataIndex] || '';
            const dataset = context.chart.data.datasets[0];
            const total = dataset.data.reduce((acc: number, val: number) => acc + (val || 0), 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "0%";
            return `${label}\n${percentage}`; 
          }
          return value;
        },
        textAlign: 'center' as const,
        anchor: (context: any) => (normalizedChart.type === 'bar' || normalizedChart.type === 'line') ? 'end' : 'center',
        align: (context: any) => (normalizedChart.type === 'bar' || normalizedChart.type === 'line') ? 'top' : 'center',
        offset: 4,
      };

      const defaultPlugins = {
        datalabels: defaultDatalabels,
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            padding: 20,
            font: { size: 12 }
          }
        },
        title: {
          display: !!(normalizedChart.options?.plugins?.title?.text || normalizedChart.title),
          text: normalizedChart.options?.plugins?.title?.text || normalizedChart.title,
          font: { size: 16, weight: 'bold' },
          padding: { bottom: 20 }
        },
        tooltip: {
          padding: 12,
          titleFont: { size: 14 },
          bodyFont: { size: 14 },
        },
      };

      // 2. สร้าง Chart
      // @ts-ignore
      chartInstanceRef.current = new Chart(ctx, {
        type: normalizedChart.type,
        data: clonedData,
        plugins: ChartDataLabels ? [ChartDataLabels] : [],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 30,
              bottom: 10,
              left: 10,
              right: 25
            }
          },
          scales: (normalizedChart.type === 'pie' || normalizedChart.type === 'doughnut') 
            ? {} 
            : {
              x: {
                ticks: {
                  font: { size: 11 },
                },
                grid: { display: false },
              },
              y: {
                beginAtZero: true,
                ticks: {
                  font: { size: 11 },
                },
                grid: { color: 'rgba(0,0,0,0.05)' },
              },
            },
          ...(normalizedChart.options || {}),
          plugins: {
            ...defaultPlugins,
            ...((normalizedChart.options?.plugins) || {}),
            datalabels: {
              ...defaultDatalabels,
              ...((normalizedChart.options?.plugins?.datalabels) || {}),
            }
          }
        } as any,
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartData, normalizedChart]);

  return (
    <div className="chart-container bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 my-4 w-full flex flex-col">
      {/* ปุ่ม Export */}
      <div className="flex justify-end mb-3">
        <button
          onClick={handleExportImage}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          title="ดาวน์โหลดกราฟเป็นรูปภาพ"
        >
          <FiDownload className="w-4 h-4" />
          {isExporting ? 'กำลังส่งออก...' : 'ส่งออกรูปภาพ'}
        </button>
      </div>
      
      <div className="relative w-full h-80 md:h-96 lg:h-[450px]">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};
