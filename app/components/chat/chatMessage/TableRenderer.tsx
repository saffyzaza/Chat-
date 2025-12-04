'use client';

import React from 'react';

interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

interface TableRendererProps {
  tableData: TableData;
}

export const TableRenderer: React.FC<TableRendererProps> = ({ tableData }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 my-2 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead style={{ background: 'linear-gradient(to right, rgb(168 85 247), rgb(147 51 234))' }}>
          <tr>
            {tableData.headers.map((header, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-sm font-semibold text-white tracking-wider"
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
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
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
