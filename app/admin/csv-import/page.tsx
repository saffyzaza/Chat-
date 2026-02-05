'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAuthToken } from '@/app/utils/auth';
import { hasAdminAccess } from '@/app/utils/roleUtils';
import { HiOutlineArrowLeft, HiOutlineUpload, HiOutlineTable } from 'react-icons/hi';

type TableInfo = Record<string, { columns: string[] }>;

type MessageState = {
  type: 'success' | 'error';
  text: string;
} | null;

export default function CsvImportPage() {
  const [tables, setTables] = useState<TableInfo | null>(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [createTable, setCreateTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [conflictColumns, setConflictColumns] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'assistant'; text: string; time: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    setIsAdmin(hasAdminAccess());
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchTables = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch('/api/admin/csv-import', {
          headers: token ? { Authorization: token } : {},
        });
        if (!res.ok) {
          const msg = await res.json().catch(() => ({}));
          throw new Error(msg?.message || 'โหลดข้อมูลตารางไม่สำเร็จ');
        }
        const data = await res.json();
        const tableInfo: TableInfo = data.tables || {};
        setTables(tableInfo);
        const firstTable = Object.keys(tableInfo)[0] || '';
        setSelectedTable(firstTable);
      } catch (err: any) {
        setMessage({ type: 'error', text: err?.message || 'โหลดข้อมูลตารางไม่สำเร็จ' });
      }
    };

    fetchTables();
  }, [isAdmin]);

  const selectedColumns = useMemo(() => {
    if (!tables || !selectedTable) return [];
    return tables[selectedTable]?.columns || [];
  }, [tables, selectedTable]);

  const handleDownloadTemplate = () => {
    if (!selectedColumns.length || createTable) return;
    const csv = `${selectedColumns.join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    setMessage(null);
    if (!files.length) {
      setMessage({ type: 'error', text: 'กรุณาเลือกไฟล์ CSV' });
      return;
    }
    const tableName = createTable ? newTableName.trim() : selectedTable;
    if (!tableName) {
      setMessage({ type: 'error', text: createTable ? 'กรุณากรอกชื่อตารางใหม่' : 'กรุณาเลือกตาราง' });
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      const formData = new FormData();
      files.forEach((f) => formData.append('file', f));
      formData.append('table', tableName);
      formData.append('createTable', String(createTable));
      if (conflictColumns.trim()) {
        formData.append('conflictColumns', conflictColumns.trim());
      }

      const res = await fetch('/api/admin/csv-import', {
        method: 'POST',
        headers: token ? { Authorization: token } : {},
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'อัปโหลดไม่สำเร็จ');
      }

      setMessage({
        type: 'success',
        text: `นำเข้า ${data.inserted}/${data.totalRows} แถว สำเร็จ (ตาราง: ${data.table})`,
      });
      setFiles([]);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'อัปโหลดไม่สำเร็จ' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMessage = { id: `${Date.now()}-${Math.random()}`, role: 'user' as const, text, time: new Date().toLocaleTimeString() };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    try {
      setChatLoading(true);
      const token = getAuthToken();
      const res = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'เรียก AI ไม่สำเร็จ');
      }
      const replyText = String(data?.reply || '').trim() || 'ไม่มีคำตอบจาก AI';
      setChatMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, role: 'assistant', text: replyText, time: new Date().toLocaleTimeString() },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, role: 'assistant', text: err?.message || 'เกิดข้อผิดพลาดในการเรียก AI', time: new Date().toLocaleTimeString() },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (isAdmin === null) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">นำเข้า CSV</h1>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">สิทธิ์ไม่เพียงพอ</h1>
        <p className="text-sm text-gray-500">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
                <HiOutlineTable className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">นำเข้าไฟล์ CSV</h1>
                <p className="text-sm text-gray-500 font-medium">อัปโหลดข้อมูลเข้า PostgreSQL</p>
              </div>
            </div>
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-orange-600 font-medium transition-colors border border-gray-200 rounded-lg hover:bg-orange-50"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
              <span>กลับสู่เมนูผู้ดูแล</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">ตั้งค่าการนำเข้า</h2>
              <p className="text-sm text-gray-500">รองรับไฟล์ CSV ที่มีหัวคอลัมน์ตรงกับชื่อคอลัมน์ในตาราง</p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 text-sm bg-orange-50 text-orange-700 rounded-lg border border-orange-200 hover:bg-orange-100"
              disabled={!selectedColumns.length || createTable}
            >
              ดาวน์โหลดเทมเพลต
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">เลือกตาราง</label>
              <div className="flex items-center gap-2 mb-3">
                <input
                  id="create-table"
                  type="checkbox"
                  checked={createTable}
                  onChange={(e) => setCreateTable(e.target.checked)}
                />
                <label htmlFor="create-table" className="text-sm text-gray-600">สร้างตารางใหม่จากไฟล์</label>
              </div>

              {createTable ? (
                <input
                  type="text"
                  placeholder="ชื่อ table ใหม่ เช่น disease_reports"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              ) : (
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  disabled={!tables}
                >
                  {tables ? (
                    Object.keys(tables).map((table) => (
                      <option key={table} value={table}>
                        {table}
                      </option>
                    ))
                  ) : (
                    <option>กำลังโหลด...</option>
                  )}
                </select>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">คอลัมน์ในตาราง</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 max-h-40 overflow-auto">
                  {createTable
                    ? 'ระบบจะสร้างคอลัมน์ตามหัวข้อในไฟล์ CSV'
                    : (selectedColumns.length ? selectedColumns.join(', ') : 'ไม่มีข้อมูลคอลัมน์')}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">อัปโหลดไฟล์ CSV</label>
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              />
              {files.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  เลือกไฟล์: <span className="font-medium text-gray-700">{files.length}</span> ไฟล์
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">คอลัมน์กันซ้ำ (ตัวเลือก)</label>
                <input
                  type="text"
                  placeholder="เช่น email หรือ email,role"
                  value={conflictColumns}
                  onChange={(e) => setConflictColumns(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">หากระบุ จะใช้ ON CONFLICT ... DO NOTHING</p>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`mt-6 rounded-lg px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-60"
            >
              <HiOutlineUpload className="w-5 h-5" />
              {loading ? 'กำลังนำเข้า...' : 'นำเข้า CSV'}
            </button>
            <div className="text-xs text-gray-500">รองรับ UTF-8 และมีหัวคอลัมน์</div>
          </div>
        </div>

        <div className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">ช่องแชท</h3>
          <div className="border border-gray-200 rounded-lg p-4 h-64 overflow-auto bg-gray-50">
            {chatMessages.length === 0 ? (
              <div className="text-sm text-gray-500">ยังไม่มีข้อความ</div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`border rounded-lg p-3 ${msg.role === 'user' ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="text-xs text-gray-400 mb-1">
                      {msg.role === 'user' ? 'คุณ' : 'AI'} · {msg.time}
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">{msg.text}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-gray-600">AI กำลังตอบ...</div>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-col md:flex-row gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder="พิมพ์ข้อความ..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px]"
              disabled={chatLoading}
            />
            <button
              onClick={handleSendChat}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              disabled={chatLoading}
            >
              {chatLoading ? 'กำลังส่ง...' : 'ส่งข้อความ'}
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">รายการตารางในฐานข้อมูล</h3>
          {!tables ? (
            <p className="text-sm text-gray-500">กำลังโหลด...</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(tables).map(([tableName, info]) => (
                <div key={tableName} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="font-medium text-gray-800">{tableName}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Link
                        href={`/admin/db-table?table=${encodeURIComponent(tableName)}`}
                        className="px-3 py-1.5 rounded border text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        ดูข้อมูล
                      </Link>
                      <Link
                        href={`/admin/db-table?table=${encodeURIComponent(tableName)}&action=add`}
                        className="px-3 py-1.5 rounded border text-green-600 border-green-200 hover:bg-green-50"
                      >
                        เพิ่ม
                      </Link>
                      <Link
                        href={`/admin/db-table?table=${encodeURIComponent(tableName)}`}
                        className="px-3 py-1.5 rounded border text-orange-600 border-orange-200 hover:bg-orange-50"
                      >
                        แก้ไข
                      </Link>
                      <Link
                        href={`/admin/db-table?table=${encodeURIComponent(tableName)}`}
                        className="px-3 py-1.5 rounded border text-red-600 border-red-200 hover:bg-red-50"
                      >
                        ลบ
                      </Link>
                      <button
                        onClick={async () => {
                          if (!confirm(`ลบทั้งตาราง ${tableName} ?`)) return;
                          try {
                            const token = getAuthToken();
                            const res = await fetch('/api/admin/db-table', {
                              method: 'DELETE',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: token } : {}),
                              },
                              body: JSON.stringify({ table: tableName, action: 'drop' }),
                            });
                            if (!res.ok) {
                              const msg = await res.json().catch(() => ({}));
                              throw new Error(msg?.message || 'ลบตารางไม่สำเร็จ');
                            }
                            setTables(prev => {
                              if (!prev) return prev;
                              const next = { ...prev };
                              delete next[tableName];
                              return next;
                            });
                          } catch (err: any) {
                            setMessage({ type: 'error', text: err?.message || 'ลบตารางไม่สำเร็จ' });
                          }
                        }}
                        className="px-3 py-1.5 rounded border text-red-700 border-red-300 hover:bg-red-50"
                      >
                        ลบทั้งตาราง
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded p-2 break-words">
                    {info.columns.join(', ')}
                  </div>
                </div>
              ))}
              {Object.keys(tables).length === 0 && (
                <p className="text-sm text-gray-500">ไม่พบตารางในฐานข้อมูล</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
