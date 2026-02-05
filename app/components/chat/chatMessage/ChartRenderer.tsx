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
      const Chart = (window as any).Chart;
      const ChartDataLabels = (window as any).ChartDataLabels;

      // ตรวจสอบความพร้อมของข้อมูล
      if (!chartData?.data || !chartData?.type) {
        console.warn('ChartRenderer: chartData or required properties are missing', chartData);
        return;
      }

      // สร้าง Deep Copy ของข้อมูลเพื่อป้องกันการ mutation prop โดยตรง
      const clonedData = JSON.parse(JSON.stringify(chartData.data));
      
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
          if (chartData.type === 'line') {
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
          if (chartData.type === 'pie' || chartData.type === 'doughnut') return '#fff';
          return '#444'; 
        },
        display: (context: any) => {
          if (chartData.type === 'pie' || chartData.type === 'doughnut') {
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
          if (chartData.type === 'pie' || chartData.type === 'doughnut') {
            const label = context.chart.data.labels?.[context.dataIndex] || '';
            const dataset = context.chart.data.datasets[0];
            const total = dataset.data.reduce((acc: number, val: number) => acc + (val || 0), 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "0%";
            return `${label}\n${percentage}`; 
          }
          return value;
        },
        textAlign: 'center' as const,
        anchor: (context: any) => (chartData.type === 'bar' || chartData.type === 'line') ? 'end' : 'center',
        align: (context: any) => (chartData.type === 'bar' || chartData.type === 'line') ? 'top' : 'center',
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
          display: !!chartData.options?.plugins?.title?.text,
          text: chartData.options?.plugins?.title?.text,
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
        type: chartData.type,
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
          scales: (chartData.type === 'pie' || chartData.type === 'doughnut') 
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
          ...(chartData.options || {}), // อนุญาตให้ override top-level keys
          plugins: {
            ...defaultPlugins,
            ...((chartData.options?.plugins) || {}),
            datalabels: {
              ...defaultDatalabels,
              ...((chartData.options?.plugins?.datalabels) || {}),
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
  }, [chartData]);

  return (
    <div className="chart-container bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 my-4 w-full flex flex-col">
      <div className="relative w-full h-80 md:h-96 lg:h-[450px]">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};
