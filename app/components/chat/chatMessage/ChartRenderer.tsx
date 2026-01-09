'use client';

import React, { useEffect, useRef } from 'react';

interface ChartRendererProps {
  chartData: {
    type: 'bar' | 'line' | 'pie' | 'doughnut';
    data: {
      labels: string[];
      datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        hoverBackgroundColor?: string | string[];
      }>;
    };
    options?: any;
  };
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

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
      // ถ้าเป็น line chart เติมค่าดีฟอลต์ให้ดูสวยขึ้น
      if (chartData.type === 'line') {
        const defaultColor = '#3b82f6';
        chartData.data.datasets = chartData.data.datasets.map((ds) => {
          const borderColor = (Array.isArray(ds.borderColor) ? ds.borderColor[0] : ds.borderColor) || defaultColor;
          return {
            ...ds,
            borderColor: ds.borderColor || borderColor,
            borderWidth: (ds as any).borderWidth ?? 3,
            tension: (ds as any).tension !== undefined ? (ds as any).tension : 0.35,
            pointRadius: (ds as any).pointRadius ?? 4,
            pointHoverRadius: (ds as any).pointHoverRadius ?? 6,
            pointBackgroundColor: (ds as any).pointBackgroundColor ?? '#ffffff',
            pointBorderColor: (ds as any).pointBorderColor ?? borderColor,
            fill: (ds as any).fill ?? 'start',
            backgroundColor: ds.backgroundColor || createLineGradient(ctx, borderColor || defaultColor),
          } as any;
        });
      }

      // @ts-ignore
      chartInstanceRef.current = new window.Chart(ctx, {
        type: chartData.type,
        data: chartData.data,
        options: {
          responsive: true,
          maintainAspectRatio: false, // ให้ canvas ยืดสูงตาม container
          layout: {
            padding: 8,
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: {
                  size: 20,
                },
              },
            },
            title: {
              display: !!chartData.options?.plugins?.title?.text,
              text: chartData.options?.plugins?.title?.text,
              font: { size: 20 },
            },
            tooltip: {
              titleFont: { size: 16 },
              bodyFont: { size: 16 },
              footerFont: { size: 16 },
            },
          },
          interaction: {
            intersect: false,
            mode: 'index',
          },
          scales: {
            x: {
              ticks: {
                maxRotation: 40,
                minRotation: 0,
                font: { size: 16 },
              },
              grid: { color: '#eee' },
            },
            y: {
              ticks: {
                font: { size: 16 },
              },
              grid: { color: '#eee' },
              beginAtZero: true,
            },
          },
          elements: chartData.type === 'line' ? { line: { borderCapStyle: 'round', borderJoinStyle: 'round' } } : undefined,
          ...(chartData.options || {}), // อนุญาตให้ override จาก JSON
        },
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartData]);

  return (
    <div className="chart-container bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 my-4 w-full flex flex-col">
      <div className="relative w-full h-100 md:h-64 lg:h-80">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};
