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
      }>;
    };
    options?: any;
  };
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // ทำลาย chart เดิมก่อน (ถ้ามี)
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // สร้าง chart ใหม่
    // @ts-ignore
    if (typeof window !== 'undefined' && window.Chart) {
      // @ts-ignore
      chartInstanceRef.current = new window.Chart(ctx, {
        type: chartData.type,
        data: chartData.data,
        options: chartData.options || {
          responsive: true,
          maintainAspectRatio: false,
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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 my-4 w-full" style={{ minHeight: '500px' }}>
      <canvas ref={canvasRef} style={{ maxHeight: '500px' }} />
    </div>
  );
};
