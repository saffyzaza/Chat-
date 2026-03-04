'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react'; // เพิ่ม Suspense
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getAuthToken } from '@/app/utils/auth';
import { hasAdminAccess } from '@/app/utils/roleUtils';
import { HiOutlineArrowLeft, HiOutlinePencil, HiOutlinePlus, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi';

// --- TYPES ---
type ColumnInfo = {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimary: boolean;
};
type MessageState = { type: 'success' | 'error'; text: string } | null;
type ModalMode = 'add' | 'edit' | 'delete' | null;

// --- 1. ส่วนของ Logic เดิมของคุณ (เปลี่ยนชื่อเป็น DbTableContent) ---
function DbTableContent() {
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
  }, [isAdmin, table, page, pageSize, submittedSearch]);

  useEffect(() => {
    if (action === 'add') {
      openAdd();
    }
  }, [action, columns.length]);

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

  if (isAdmin === null) return <div className="p-6">Loading...</div>;
  if (!isAdmin) return <div className="p-6">สิทธิ์ไม่เพียงพอ</div>;
  if (!table) return <div className="p-6">ไม่พบชื่อตาราง</div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">ตาราง: {table}</h1>
              <p className="text-sm text-gray-500">จัดการข้อมูล</p>
            </div>
            <Link href="/admin/csv-import" className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-orange-50 transition-colors">
              <HiOutlineArrowLeft className="w-5 h-5" /> กลับ
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <HiOutlinePlus className="w-5 h-5" /> เพิ่มข้อมูล
            </button>
            <div className="flex gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSubmittedSearch(search.trim())} placeholder="ค้นหา..." className="border rounded px-3 py-2 text-sm" />
              <button onClick={() => setSubmittedSearch(search.trim())} className="px-3 py-2 border rounded hover:bg-gray-50">ค้นหา</button>
            </div>
          </div>

          {/* ... Table UI เดิมของคุณ (ข้ามเพื่อความกระชับ) ... */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">Actions</th>
                  {columns.map(col => <th key={col.name} className="text-left px-4 py-2">{col.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {!loading && rows.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">
                       <div className="flex gap-2">
                          <button onClick={() => openEdit(row)} className="text-orange-600"><HiOutlinePencil/></button>
                          <button onClick={() => openDelete(row)} className="text-red-600"><HiOutlineTrash/></button>
                       </div>
                    </td>
                    {columns.map(col => <td key={col.name} className="px-4 py-2">{String(row[col.name] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal logic เดิมของคุณ */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
             <h3 className="text-lg font-bold mb-4">{modal === 'add' ? 'เพิ่ม' : modal === 'edit' ? 'แก้ไข' : 'ลบ'}</h3>
             {modal !== 'delete' && columns.map(col => (
               <div key={col.name} className="mb-2">
                 <label className="block text-xs">{col.name}</label>
                 <input className="w-full border p-2" value={form[col.name] || ''} onChange={(e) => setForm({...form, [col.name]: e.target.value})} />
               </div>
             ))}
             <div className="flex justify-end gap-2">
               <button onClick={closeModal}>ยกเลิก</button>
               <button className="bg-blue-600 text-white p-2 rounded" onClick={modal === 'add' ? submitAdd : modal === 'edit' ? submitEdit : submitDelete}>ยืนยัน</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 2. ส่วน Main Export (หัวใจสำคัญที่ทำให้ Build ผ่าน) ---
export default function DbTablePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">กำลังเตรียมข้อมูลตาราง...</div>}>
      <DbTableContent />
    </Suspense>
  );
}