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

// Helper: ตรวจสอบว่าเป็น admin
async function ensureAdmin(userId: number) {
  const res = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  const role = res.rows?.[0]?.role || 'user';
  if (role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
}

// ตรวจสอบว่ามีคอลัมน์ approved/disabled หรือไม่ (รองรับฐานข้อมูลที่ยังไม่ได้ migrate)
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

// GET /api/admin/users?approval=all|approved|pending&search=&page=&pageSize=
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);

    const { searchParams } = new URL(req.url);
    const approval = (searchParams.get('approval') || 'all').toLowerCase();
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '10'), 1), 100);
    const offset = (page - 1) * pageSize;

    const whereParts: string[] = [];
    const values: any[] = [];

    const { hasApproved, hasDisabled } = await getApprovalColumnsFlags();
    if (approval === 'approved' && hasApproved) {
      whereParts.push('approved = TRUE');
    } else if (approval === 'pending' && hasApproved) {
      whereParts.push('approved = FALSE');
    }

    if (search) {
      values.push(`%${search}%`);
      values.push(`%${search}%`);
      const nameIdx = values.length - 1;
      const emailIdx = values.length;
      whereParts.push(`(name ILIKE $${nameIdx} OR email ILIKE $${emailIdx})`);
    }

    const whereSQL = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '';

    // Count total
    const countRes = await pool.query(`SELECT COUNT(*)::INT AS total FROM users ${whereSQL}`, values);
    const total: number = countRes.rows[0]?.total || 0;

    // Fetch page
    const pageValues = [...values, pageSize, offset];
    const selectCols = [
      'id', 'name', 'email', 'role',
      // ถ้าไม่มีคอลัมน์ ให้คืนค่า FALSE เป็น alias
      hasApproved ? 'approved' : 'FALSE AS approved',
      hasDisabled ? 'disabled' : 'FALSE AS disabled',
      'created_at', 'last_login'
    ].join(', ');
    const listSQL = `
      SELECT ${selectCols}
      FROM users
      ${whereSQL}
      ORDER BY created_at DESC
      LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}
    `;
    const listRes = await pool.query(listSQL, pageValues);

    // Map activation status: active = approved && !disabled
    const users = listRes.rows.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      approved: !!u.approved,
      disabled: !!u.disabled,
      activationStatus: !!u.approved && !u.disabled ? 'Active' : 'Inactive',
      registeredAt: u.created_at,
      lastLoginAt: u.last_login,
      freelancerType: null,
      agencyName: null,
    }));

    return NextResponse.json({ users, total, page, pageSize });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin users GET error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
});

// POST /api/admin/users  -> Create a new user (admin only)
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);

    const body = await req.json().catch(() => ({}));
    const { name, email, password, role = 'user', approved = false, disabled = false } = body || {};

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'กรุณากรอกชื่อ อีเมล และรหัสผ่าน' }, { status: 400 });
    }

    const { hasApproved, hasDisabled } = await getApprovalColumnsFlags();

    // Build dynamic INSERT depending on available columns
    const cols: string[] = ['name', 'email', 'password', 'role'];
    const vals: any[] = [name, email, password, role];
    if (hasApproved) { cols.push('approved'); vals.push(!!approved); }
    if (hasDisabled) { cols.push('disabled'); vals.push(!!disabled); }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id, name, email, role${hasApproved ? ', approved' : ''}${hasDisabled ? ', disabled' : ''}, created_at, last_login`;

    const ins = await pool.query(sql, vals);
    return NextResponse.json({ user: ins.rows[0] }, { status: 201 });
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 409 });
    }
    if (err?.message === 'FORBIDDEN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('Admin users POST error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
});
