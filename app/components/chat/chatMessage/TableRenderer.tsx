'use client';

import React from 'react';

interface TableData {
  title?: string;
  headers?: string[];
  columns?: string[];
  rows: (string | number)[][];
}

interface TableRendererProps {
  tableData: TableData;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TableRenderer: React.FC<TableRendererProps> = ({ tableData, size = 'md', className }) => {
  const sizeClass = size === 'sm' ? 'ai-table-sm' : size === 'lg' ? 'ai-table-lg' : '';
  const headers = tableData.columns || tableData.headers || [];

  return (
    <div
      className={`bg-white rounded-lg shadow-xl border border-gray-200 my-4 overflow-hidden ${
        className ?? ''
      }`}
    >
      {tableData.title && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
            {tableData.title}
          </h3>
        </div>
      )}
      <div className="overflow-auto max-h-[60vh]">
        <table
          className={`ai-table ${sizeClass} w-full table-auto min-w-[640px] divide-y divide-gray-200`}
          style={{ fontSize: '0.85rem' }}
        >
          <thead className="bg-[#fcfaff]">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-4 text-left font-bold text-gray-700 border-b-2 border-purple-100 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {tableData.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-purple-50/30 transition-colors">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-4 whitespace-normal break-words text-gray-600 leading-relaxed"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
