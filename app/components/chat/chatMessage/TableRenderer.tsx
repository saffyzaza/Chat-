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
  if (!tableData) return null;
  
  const sizeClass = size === 'sm' ? 'ai-table-sm' : size === 'lg' ? 'ai-table-lg' : '';
  
  // พยายามหา Header จากหลายแหล่ง
  const rawHeaders = tableData.columns || tableData.headers || (tableData as any).header || [];
  
  // พยายามหา Rows จากหลายแหล่ง (rows, data, items)
  let rawRows = tableData.rows || (tableData as any).data || (tableData as any).items || [];
  
  // กรณีที่ tableData เองเป็น Array (AI อาจจะส่งมาเป็น Error หรือส่งมาแค่ Array ตรงๆ)
  if (Array.isArray(tableData)) {
    rawRows = tableData;
  }

  // ถ้าเป็น Array ของ Object ให้แปลงเป็น Array ของ Array
  let processedHeaders = [...rawHeaders];
  let processedRows = Array.isArray(rawRows) ? [...rawRows] : [];

  if (processedRows.length > 0 && typeof processedRows[0] === 'object' && !Array.isArray(processedRows[0])) {
    // ดึง Keys ทั้งหมดจาก object แรกมาเป็น Header หากยังไม่มี Header
    if (processedHeaders.length === 0) {
      processedHeaders = Object.keys(processedRows[0]);
    }
    
    // แปลงแต่ละ object เป็น array ตามลำดับของ headers
    processedRows = processedRows.map(rowObj => {
      if (typeof rowObj === 'object' && !Array.isArray(rowObj)) {
        return processedHeaders.map(h => rowObj[h] ?? rowObj[String(h)] ?? '');
      }
      return rowObj;
    });
  }

  const headers = processedHeaders;
  const rows = processedRows;

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
            {typeof tableData.title === 'object' ? JSON.stringify(tableData.title) : tableData.title}
          </h3>
        </div>
      )}
      <div className="overflow-auto max-h-[60vh]">
        <table
          className={`ai-table ${sizeClass} w-full table-auto min-w-[640px] divide-y divide-gray-200`}
        >
          <thead className="bg-[#fcfaff]">
            <tr>
              {Array.isArray(headers) && headers.map((header: any, index: number) => (
                <th
                  key={index}
                  className="px-6 py-4 text-left font-bold text-gray-700 border-b-2 border-purple-100 uppercase tracking-wider bg-purple-50/50"
                >
                  {typeof header === 'object' && header !== null 
                    ? (header.header || header.label || header.name || header.title || JSON.stringify(header)) 
                    : String(header || '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {Array.isArray(rows) && rows.map((row: any, rowIndex: number) => (
              <tr key={rowIndex} className="hover:bg-purple-50/30 transition-colors">
                {Array.isArray(row) ? row.map((cell: any, cellIndex: number) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-4 whitespace-normal break-words text-gray-600 leading-normal border-r border-gray-50 last:border-r-0"
                  >
                    {String(cell ?? '')}
                  </td>
                )) : (
                  <td colSpan={Array.isArray(headers) ? headers.length : 1} className="px-6 py-4 text-gray-600 italic">
                    {typeof row === 'object' ? JSON.stringify(row) : String(row)}
                  </td>
                )}
              </tr>
            ))}
            {(!Array.isArray(rows) || rows.length === 0) && (
              <tr>
                <td colSpan={Array.isArray(headers) ? headers.length : 1} className="px-6 py-10 text-center text-gray-400">
                  ไม่มีข้อมูลแสดงในตาราง
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
