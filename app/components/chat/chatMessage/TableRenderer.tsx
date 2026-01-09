'use client';

import React from 'react';

interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

interface TableRendererProps {
  tableData: TableData;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TableRenderer: React.FC<TableRendererProps> = ({ tableData, size = 'md', className }) => {
  const sizeClass = size === 'sm' ? 'ai-table-sm' : size === 'lg' ? 'ai-table-lg' : '';
  return (
    <div
      className={`bg-white rounded-lg shadow-xl border border-gray-200 my-2 overflow-auto max-h-[60vh] ${
        className ?? ''
      }`}
    >
      <table
        className={`ai-table ${sizeClass} w-full table-auto min-w-[640px] divide-y divide-gray-200`}
        style={{ fontSize: '0.8rem' }}
      >
        <thead style={{ background: 'linear-gradient(to right, rgb(168 85 247), rgb(147 51 234))' }}>
          <tr>
            {tableData.headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-3 text-center font-semibold text-white tracking-wide"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tableData.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 whitespace-normal break-words text-gray-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
