import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { withAuth } from '@/app/utils/middleware';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'chat-aio',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function ensureAdmin(userId: number) {
  const res = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  const role = res.rows?.[0]?.role || 'user';
  if (role !== 'admin') throw new Error('FORBIDDEN');
}

async function getApprovalColumnsFlags() {
  const sql = `
    SELECT 
      EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'approved'
      ) AS has_approved,
      EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'disabled'
      ) AS has_disabled
  `;
  const res = await pool.query(sql);
  const row = res.rows[0] || { has_approved: false, has_disabled: false };
  return { hasApproved: !!row.has_approved, hasDisabled: !!row.has_disabled };
}

// PUT action: approve | disable | enable
export const PUT = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);
    const { hasApproved, hasDisabled } = await getApprovalColumnsFlags();
    const { pathname } = new URL(req.url);
    const idStr = pathname.split('/').filter(Boolean).pop();
    const userId = parseInt(idStr || '0');

    if (!userId) {
      return NextResponse.json({ message: 'Invalid user id' }, { status: 400 });
    }

    const body = await req.json();
    const action = (body?.action || '').toLowerCase();

    if (!hasApproved || !hasDisabled) {
      return NextResponse.json(
        { message: 'Approval columns missing. Please run migration_user_status.sql.' },
        { status: 400 }
      );
    }

    let query = '';
    if (action === 'approve') {
      query = 'UPDATE users SET approved = TRUE, disabled = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, approved, disabled';
    } else if (action === 'unapprove') {
      query = 'UPDATE users SET approved = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, approved, disabled';
    } else if (action === 'disable') {
      query = 'UPDATE users SET disabled = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, approved, disabled';
    } else if (action === 'enable') {
      query = 'UPDATE users SET disabled = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, approved, disabled';
    } else {
      return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
    }

    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin users PUT error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
});

// DELETE user
export const DELETE = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);
    const { pathname } = new URL(req.url);
    const idStr = pathname.split('/').filter(Boolean).pop();
    const userId = parseInt(idStr || '0');

    if (!userId) {
      return NextResponse.json({ message: 'Invalid user id' }, { status: 400 });
    }

    const res = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin users DELETE error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
});

// PATCH /api/admin/users/[id]  -> Update user profile fields (name, email, role, password, approved, disabled)
export const PATCH = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);
    const { pathname } = new URL(req.url);
    const idStr = pathname.split('/').filter(Boolean).pop();
    const userId = parseInt(idStr || '0');
    if (!userId) return NextResponse.json({ message: 'Invalid user id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { name, email, role, password, approved, disabled } = body || {};

    const { hasApproved, hasDisabled } = await getApprovalColumnsFlags();

    const sets: string[] = [];
    const vals: any[] = [];

    if (name !== undefined) { vals.push(name); sets.push(`name = $${vals.length}`); }
    if (email !== undefined) { vals.push(email); sets.push(`email = $${vals.length}`); }
    if (role !== undefined) { vals.push(role); sets.push(`role = $${vals.length}`); }
    if (password !== undefined && password !== '') { vals.push(password); sets.push(`password = $${vals.length}`); }
    if (hasApproved && approved !== undefined) { vals.push(!!approved); sets.push(`approved = $${vals.length}`); }
    if (hasDisabled && disabled !== undefined) { vals.push(!!disabled); sets.push(`disabled = $${vals.length}`); }

    if (sets.length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    vals.push(userId);
    const sql = `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length} RETURNING id, name, email, role${hasApproved ? ', approved' : ''}${hasDisabled ? ', disabled' : ''}, created_at, last_login`;
    const upd = await pool.query(sql, vals);
    if (upd.rows.length === 0) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    return NextResponse.json({ user: upd.rows[0] });
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 409 });
    }
    if (err?.message === 'FORBIDDEN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin users PATCH error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
});
