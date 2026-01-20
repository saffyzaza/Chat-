"use client";
import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/app/utils/auth';
import { hasAdminAccess } from '@/app/utils/roleUtils';

type ApprovalFilter = 'all' | 'approved' | 'pending';

interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  approved: boolean;
  disabled: boolean;
  activationStatus: 'Active' | 'Inactive';
  registeredAt: string;
  lastLoginAt: string | null;
  freelancerType: string | null;
  agencyName: string | null;
}

interface ListResponse {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export default function ApprovePage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ApprovalFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<ListResponse>({ users: [], total: 0, page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // ตรวจสอบสิทธิ์หลัง mount เพื่อหลีกเลี่ยง hydration mismatch
  useEffect(() => {
    setIsAdmin(hasAdminAccess());
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ approval: filter, search, page: String(page), pageSize: String(pageSize) });
      const res = await fetchWithAuth(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ message: 'Fetch failed' }));
        throw new Error(msg?.message || 'Fetch failed');
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin !== true) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, filter, page, pageSize]);

  const onSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const totalPages = Math.max(Math.ceil(data.total / data.pageSize), 1);

  const handleAction = async (row: AdminUserRow, action: 'approve' | 'unapprove' | 'disable' | 'enable' | 'delete') => {
    try {
      setLoading(true);
      setError(null);
      const method = action === 'delete' ? 'DELETE' : 'PUT';
      const res = await fetchWithAuth(`/api/admin/users/${row.id}`, {
        method,
        body: action === 'delete' ? undefined : JSON.stringify({ action }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ message: 'Action failed' }));
        throw new Error(msg?.message || 'Action failed');
      }
      await fetchUsers();
    } catch (e: any) {
      setError(e?.message || 'ดำเนินการไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // --- Add/Edit Modal State ---
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<{ id?: number; name: string; email: string; role: 'admin' | 'user'; password?: string; approved?: boolean; disabled?: boolean }>({ name: '', email: '', role: 'user', password: '' });

  const openAdd = () => {
    setEditMode('add');
    setForm({ name: '', email: '', role: 'user', password: '', approved: false, disabled: false });
    setModalOpen(true);
  };

  const openEdit = (u: AdminUserRow) => {
    setEditMode('edit');
    setForm({ id: u.id, name: u.name, email: u.email, role: u.role, password: '', approved: u.approved, disabled: u.disabled });
    setModalOpen(true);
  };

  const submitForm = async () => {
    try {
      setLoading(true);
      setError(null);
      if (editMode === 'add') {
        const res = await fetchWithAuth('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role, approved: form.approved, disabled: form.disabled })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.message || 'Create failed');
      } else {
        const res = await fetchWithAuth(`/api/admin/users/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: form.name, email: form.email, role: form.role, password: form.password || undefined, approved: form.approved, disabled: form.disabled })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.message || 'Update failed');
      }
      setModalOpen(false);
      await fetchUsers();
    } catch (e: any) {
      setError(e?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Activation status', 'Registered At', 'Last Login At'];
    const rows = data.users.map(u => [u.name, u.email, u.role, u.activationStatus, u.registeredAt, u.lastLoginAt || '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isAdmin === null) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Users</h1>
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
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            className="appearance-none bg-gray-100 px-3 py-2 rounded border text-sm"
            value={filter}
            onChange={e => { setFilter(e.target.value as ApprovalFilter); setPage(1); }}
            aria-label="Admin approval filter"
          >
            <option value="all">Admin approval: All</option>
            <option value="approved">Admin approval: Approved</option>
            <option value="pending">Admin approval: Pending</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <input
            type="text"
            placeholder="Search username and email"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
            className="flex-1 bg-white px-3 py-2 rounded border text-sm"
          />
          <button
            onClick={onSearch}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm"
          >
            SEARCH
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSearch(''); setFilter('all'); setPage(1); fetchUsers(); }}
            className="bg-black text-white px-4 py-2 rounded text-sm"
          >
            VIEW ALL
          </button>
            <button
              onClick={openAdd}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm"
            >
              ADD USER
            </button>
          <button
            onClick={exportCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            EXPORT TO CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Activation status</th>
              <th className="text-left px-4 py-2">Registered At</th>
              <th className="text-left px-4 py-2">Last Login At</th>
              <th className="text-left px-4 py-2">Freelancer Type</th>
              <th className="text-left px-4 py-2">Agency Name</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
            )}
            {!loading && data.users.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-500">No users found</td></tr>
            )}
            {!loading && data.users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block rounded px-2 py-1 text-xs ${u.role === 'admin' ? 'bg-orange-500 text-white' : 'bg-gray-500 text-white'}`}>{u.role}</span>
                </td>
                <td className="px-4 py-2">{u.activationStatus}</td>
                <td className="px-4 py-2">{new Date(u.registeredAt).toLocaleString()}</td>
                <td className="px-4 py-2">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '-'}</td>
                <td className="px-4 py-2">{u.freelancerType || '-'}</td>
                <td className="px-4 py-2">{u.agencyName || '-'}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      className="border px-3 py-1 rounded text-sm"
                      onClick={() => alert(`User #${u.id}\n${u.name} <${u.email}>`)}
                    >
                      View
                    </button>
                    <button
                      className="border px-3 py-1 rounded text-sm"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </button>
                    {u.approved ? (
                      <button
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-sm"
                        onClick={() => handleAction(u, 'unapprove')}
                      >
                        Unapprove
                      </button>
                    ) : (
                      <button
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                        onClick={() => handleAction(u, 'approve')}
                      >
                        Approve
                      </button>
                    )}
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      onClick={() => {
                        if (confirm(`Delete user ${u.name}?`)) handleAction(u, 'delete');
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Rows per page:
          <select
            className="ml-2 border rounded px-2 py-1"
            value={pageSize}
            onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1); }}
          >
            {[10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">{data.users.length > 0 ? `${(page-1)*pageSize+1} - ${Math.min(page*pageSize, data.total)} of ${data.total}` : `0 of ${data.total}`}</span>
          <button
            className="border px-2 py-1 rounded disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage(1)}
            aria-label="First page"
          >
            «
          </button>
          <button
            className="border px-2 py-1 rounded disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p-1))}
            aria-label="Prev page"
          >
            ‹
          </button>
          <button
            className="border px-2 py-1 rounded disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p+1))}
            aria-label="Next page"
          >
            ›
          </button>
          <button
            className="border px-2 py-1 rounded disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
            aria-label="Last page"
          >
            »
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editMode === 'add' ? 'Add User' : 'Edit User'}</h2>
              <button className="text-gray-500" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input className="w-full border rounded px-3 py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input className="w-full border rounded px-3 py-2 text-sm" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">Role</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'admin' | 'user' })}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">{editMode === 'add' ? 'Password' : 'New Password (optional)'}</label>
                <input className="w-full border rounded px-3 py-2 text-sm" type="password" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.approved} onChange={e => setForm({ ...form, approved: e.target.checked })} /> Approved</label>
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.disabled} onChange={e => setForm({ ...form, disabled: e.target.checked })} /> Disabled</label>
              </div>
            </div>
            <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
              <button className="px-4 py-2 border rounded text-sm" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 bg-orange-600 text-white rounded text-sm" onClick={submitForm} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
