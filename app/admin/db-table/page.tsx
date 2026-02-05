'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getAuthToken } from '@/app/utils/auth';
import { hasAdminAccess } from '@/app/utils/roleUtils';
import { HiOutlineArrowLeft, HiOutlinePencil, HiOutlinePlus, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi';

type ColumnInfo = {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimary: boolean;
};

type MessageState = { type: 'success' | 'error'; text: string } | null;

type ModalMode = 'add' | 'edit' | 'delete' | null;

export default function DbTablePage() {
  const searchParams = useSearchParams();
  const table = searchParams.get('table') || '';
  const action = searchParams.get('action') || '';

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [selectedRow, setSelectedRow] = useState<Record<string, any> | null>(null);

  const primaryKeys = useMemo(() => columns.filter(c => c.isPrimary).map(c => c.name), [columns]);
  const hasPrimaryKey = primaryKeys.length > 0;

  useEffect(() => {
    setIsAdmin(hasAdminAccess());
  }, []);

  const fetchTable = async () => {
    if (!table) return;
    try {
      setLoading(true);
      setMessage(null);
      const token = getAuthToken();
      const trimmedSearch = (submittedSearch ?? '').trim();
      if (!trimmedSearch) {
        setRows([]);
        setTotal(0);
        return;
      }
      const params = new URLSearchParams({ table, page: String(page), pageSize: String(pageSize) });
      if (trimmedSearch) params.set('search', trimmedSearch);
      const res = await fetch(`/api/admin/db-table?${params.toString()}`, {
        headers: token ? { Authorization: token } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'โหลดข้อมูลไม่สำเร็จ');
      setColumns(data.columns || []);
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'โหลดข้อมูลไม่สำเร็จ' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin || !table) return;
    fetchTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, table, page, pageSize, submittedSearch]);

  useEffect(() => {
    if (action === 'add') {
      openAdd();
    }
  }, [action]);

  const openAdd = () => {
    const init: Record<string, any> = {};
    columns.forEach(col => {
      init[col.name] = '';
    });
    setForm(init);
    setModal('add');
  };

  const openEdit = (row: Record<string, any>) => {
    const init: Record<string, any> = {};
    columns.forEach(col => {
      init[col.name] = row[col.name] ?? '';
    });
    setForm(init);
    setSelectedRow(row);
    setModal('edit');
  };

  const openDelete = (row: Record<string, any>) => {
    setSelectedRow(row);
    setModal('delete');
  };

  const closeModal = () => {
    setModal(null);
    setForm({});
    setSelectedRow(null);
  };

  const submitAdd = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const token = getAuthToken();
      const res = await fetch('/api/admin/db-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify({ table, data: form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'เพิ่มข้อมูลไม่สำเร็จ');
      setMessage({ type: 'success', text: 'เพิ่มข้อมูลสำเร็จ' });
      closeModal();
      fetchTable();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'เพิ่มข้อมูลไม่สำเร็จ' });
    } finally {
      setLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedRow) return;
    try {
      setLoading(true);
      setMessage(null);
      const token = getAuthToken();
      const key: Record<string, any> = {};
      primaryKeys.forEach(pk => {
        key[pk] = selectedRow[pk];
      });
      const res = await fetch('/api/admin/db-table', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify({ table, data: form, key }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'แก้ไขข้อมูลไม่สำเร็จ');
      setMessage({ type: 'success', text: 'แก้ไขข้อมูลสำเร็จ' });
      closeModal();
      fetchTable();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'แก้ไขข้อมูลไม่สำเร็จ' });
    } finally {
      setLoading(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedRow) return;
    try {
      setLoading(true);
      setMessage(null);
      const token = getAuthToken();
      const key: Record<string, any> = {};
      primaryKeys.forEach(pk => {
        key[pk] = selectedRow[pk];
      });
      const res = await fetch('/api/admin/db-table', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify({ table, key }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'ลบข้อมูลไม่สำเร็จ');
      setMessage({ type: 'success', text: 'ลบข้อมูลสำเร็จ' });
      closeModal();
      fetchTable();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'ลบข้อมูลไม่สำเร็จ' });
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin === null) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">จัดการตาราง</h1>
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

  if (!table) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">ไม่พบชื่อตาราง</h1>
        <Link href="/admin/csv-import" className="text-sm text-orange-600 hover:underline">
          กลับหน้า CSV Import
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">ตาราง: {table}</h1>
              <p className="text-sm text-gray-500">ดูข้อมูล เพิ่ม แก้ไข และลบ</p>
            </div>
            <Link
              href="/admin/csv-import"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-orange-600 font-medium transition-colors border border-gray-200 rounded-lg hover:bg-orange-50"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
              <span>กลับ</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <HiOutlinePlus className="w-5 h-5" /> เพิ่มข้อมูล
              </button>
              {!hasPrimaryKey && (
                <span className="text-xs text-red-600">ตารางนี้ไม่มี Primary Key จึงแก้ไข/ลบไม่ได้</span>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setSubmittedSearch(search.trim()); } }}
                placeholder="ค้นหา..."
                className="border rounded px-3 py-2 text-sm"
              />
              <button
                onClick={() => { setPage(1); setSubmittedSearch(search.trim()); }}
                className="px-3 py-2 border rounded text-gray-600 hover:bg-gray-50"
              >
                ค้นหา
              </button>
              <button
                onClick={() => { setSearch(''); setSubmittedSearch(null); setPage(1); }}
                className="px-3 py-2 border rounded text-gray-600 hover:bg-gray-50"
              >
                ล้าง
              </button>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">แถวต่อหน้า</span>
                <select
                  className="border rounded px-2 py-1"
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                >
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>

          {message && (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">Actions</th>
                  {columns.map(col => (
                    <th key={col.name} className="text-left px-4 py-2">{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && !submittedSearch && (
                  <tr><td colSpan={columns.length + 1} className="px-4 py-6 text-center text-gray-500">กรุณาพิมพ์คำค้นหาแล้วกดค้นหาเพื่อแสดงข้อมูล</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={columns.length + 1} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
                )}
                {!loading && submittedSearch && rows.length === 0 && (
                  <tr><td colSpan={columns.length + 1} className="px-4 py-6 text-center text-gray-500">ไม่พบข้อมูล</td></tr>
                )}
                {!loading && submittedSearch && rows.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="ดูข้อมูล"
                          onClick={() => openEdit(row)}
                        >
                          <HiOutlineEye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded disabled:opacity-40"
                          title="แก้ไข"
                          disabled={!hasPrimaryKey}
                          onClick={() => openEdit(row)}
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
                          title="ลบ"
                          disabled={!hasPrimaryKey}
                          onClick={() => openDelete(row)}
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    {columns.map(col => (
                      <td key={col.name} className="px-4 py-2 whitespace-nowrap">
                        {String(row[col.name] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span>{total ? `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, total)} of ${total}` : '0 of 0'}</span>
            <div className="flex items-center gap-2">
              <button className="border px-2 py-1 rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(1)}>«</button>
              <button className="border px-2 py-1 rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
              <button className="border px-2 py-1 rounded disabled:opacity-50" disabled={page * pageSize >= total} onClick={() => setPage(p => p + 1)}>›</button>
              <button className="border px-2 py-1 rounded disabled:opacity-50" disabled={page * pageSize >= total} onClick={() => setPage(Math.max(1, Math.ceil(total / pageSize)))}>»</button>
            </div>
          </div>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {modal === 'add' && 'เพิ่มข้อมูล'}
                {modal === 'edit' && 'แก้ไขข้อมูล'}
                {modal === 'delete' && 'ลบข้อมูล'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="p-6">
              {modal === 'delete' ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">ยืนยันการลบข้อมูลนี้หรือไม่?</p>
                  <div className="flex justify-end gap-2">
                    <button onClick={closeModal} className="px-4 py-2 border rounded">ยกเลิก</button>
                    <button onClick={submitDelete} className="px-4 py-2 bg-red-600 text-white rounded">ลบ</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {columns.map(col => (
                    <div key={col.name}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {col.name} {col.isPrimary ? '(PK)' : ''}
                      </label>
                      <input
                        type="text"
                        value={form[col.name] ?? ''}
                        onChange={(e) => setForm(prev => ({ ...prev, [col.name]: e.target.value }))}
                        className="w-full border rounded px-3 py-2 text-sm"
                        readOnly={modal === 'edit' && col.isPrimary}
                      />
                    </div>
                  ))}
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={closeModal} className="px-4 py-2 border rounded">ยกเลิก</button>
                    {modal === 'add' && (
                      <button onClick={submitAdd} className="px-4 py-2 bg-green-600 text-white rounded">บันทึก</button>
                    )}
                    {modal === 'edit' && (
                      <button onClick={submitEdit} className="px-4 py-2 bg-orange-600 text-white rounded">บันทึก</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
