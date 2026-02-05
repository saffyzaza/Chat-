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

function quoteIdentifier(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

function normalizeValue(value: any, dataType?: string) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null') return null;

    if (dataType === 'boolean') {
      const lower = trimmed.toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(lower)) return true;
      if (['false', '0', 'no', 'n'].includes(lower)) return false;
      return null;
    }

    if (dataType === 'integer' || dataType === 'bigint' || dataType === 'smallint') {
      if (!/^[-+]?\d+$/.test(trimmed)) return null;
      return parseInt(trimmed, 10);
    }

    if (dataType === 'double precision' || dataType === 'numeric' || dataType === 'real') {
      if (!/^[-+]?\d*(\.\d+)?$/.test(trimmed) || trimmed === '' || trimmed === '.' || trimmed === '-' || trimmed === '+') {
        return null;
      }
      return parseFloat(trimmed);
    }

    if (dataType === 'timestamp without time zone' || dataType === 'timestamp with time zone' || dataType === 'date') {
      const time = Date.parse(trimmed);
      if (Number.isNaN(time)) return null;
      return trimmed;
    }

    return trimmed;
  }
  return value;
}

async function tableExists(table: string) {
  const res = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return res.rows.length > 0;
}

async function getTableColumns(table: string) {
  const res = await pool.query(
    `SELECT column_name, is_nullable, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );
  return res.rows as { column_name: string; is_nullable: 'YES' | 'NO'; data_type: string }[];
}

async function getPrimaryKeyColumns(table: string) {
  const res = await pool.query(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = 'public'
       AND tc.table_name = $1
       AND tc.constraint_type = 'PRIMARY KEY'
     ORDER BY kcu.ordinal_position`,
    [table]
  );
  return res.rows.map(r => r.column_name as string);
}

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);

    const { searchParams } = new URL(req.url);
    const table = String(searchParams.get('table') || '').trim();
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20'), 1), 200);
    const offset = (page - 1) * pageSize;
    const search = String(searchParams.get('search') || '').trim();

    if (!table) {
      return NextResponse.json({ message: 'กรุณาระบุชื่อตาราง' }, { status: 400 });
    }

    if (!(await tableExists(table))) {
      return NextResponse.json({ message: 'ไม่พบตารางนี้ในฐานข้อมูล' }, { status: 404 });
    }

    const columns = await getTableColumns(table);
    const primaryKeys = await getPrimaryKeyColumns(table);

    const orderBy = primaryKeys.length
      ? primaryKeys.map(col => `${quoteIdentifier(col)} ASC`).join(', ')
      : `${quoteIdentifier(columns[0].column_name)} ASC`;

    let whereClause = '';
    const params: any[] = [];
    if (search) {
      const like = `%${search}%`;
      const searchParts = columns.map(col => `CAST(${quoteIdentifier(col.column_name)} AS TEXT) ILIKE $1`);
      whereClause = ` WHERE (${searchParts.join(' OR ')})`;
      params.push(like);
    }

    const totalRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM ${quoteIdentifier(table)}${whereClause}`,
      params
    );
    const total = totalRes.rows?.[0]?.count || 0;

    const rowsRes = await pool.query(
      `SELECT * FROM ${quoteIdentifier(table)}${whereClause} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      table,
      columns: columns.map(c => ({
        name: c.column_name,
        dataType: c.data_type,
        isNullable: c.is_nullable === 'YES',
        isPrimary: primaryKeys.includes(c.column_name),
      })),
      primaryKeys,
      rows: rowsRes.rows,
      total,
      page,
      pageSize,
    });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    console.error('DB table GET error:', err);
    return NextResponse.json({ message: err?.message || 'Server error' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);
    const body = await req.json().catch(() => ({}));
    const table = String(body?.table || '').trim();
    const data = body?.data || {};

    if (!table) return NextResponse.json({ message: 'กรุณาระบุชื่อตาราง' }, { status: 400 });
    if (!(await tableExists(table))) return NextResponse.json({ message: 'ไม่พบตารางนี้ในฐานข้อมูล' }, { status: 404 });

    const columns = await getTableColumns(table);
    const columnTypes = columns.reduce((acc, col) => {
      acc[col.column_name] = col.data_type;
      return acc;
    }, {} as Record<string, string>);

    const inputColumns = Object.keys(data).filter(col => columnTypes[col] !== undefined);
    if (inputColumns.length === 0) {
      return NextResponse.json({ message: 'ไม่มีคอลัมน์ที่ตรงกับตาราง' }, { status: 400 });
    }

    const values: any[] = [];
    const placeholders: string[] = [];
    inputColumns.forEach((col, idx) => {
      values.push(normalizeValue(data[col], columnTypes[col]));
      placeholders.push(`$${idx + 1}`);
    });

    const sql = `INSERT INTO ${quoteIdentifier(table)} (${inputColumns.map(quoteIdentifier).join(', ')}) VALUES (${placeholders.join(', ')})`;
    await pool.query(sql, values);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    console.error('DB table POST error:', err);
    return NextResponse.json({ message: err?.message || 'Server error' }, { status: 500 });
  }
});

export const PATCH = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);
    const body = await req.json().catch(() => ({}));
    const table = String(body?.table || '').trim();
    const data = body?.data || {};
    const key = body?.key || {};

    if (!table) return NextResponse.json({ message: 'กรุณาระบุชื่อตาราง' }, { status: 400 });
    if (!(await tableExists(table))) return NextResponse.json({ message: 'ไม่พบตารางนี้ในฐานข้อมูล' }, { status: 404 });

    const columns = await getTableColumns(table);
    const primaryKeys = await getPrimaryKeyColumns(table);
    if (primaryKeys.length === 0) {
      return NextResponse.json({ message: 'ตารางนี้ไม่มี Primary Key' }, { status: 400 });
    }

    const columnTypes = columns.reduce((acc, col) => {
      acc[col.column_name] = col.data_type;
      return acc;
    }, {} as Record<string, string>);

    const setColumns = Object.keys(data).filter(col => columnTypes[col] !== undefined && !primaryKeys.includes(col));
    if (setColumns.length === 0) {
      return NextResponse.json({ message: 'ไม่มีคอลัมน์สำหรับแก้ไข' }, { status: 400 });
    }

    const missingKey = primaryKeys.find(pk => key[pk] === undefined || key[pk] === null || key[pk] === '');
    if (missingKey) {
      return NextResponse.json({ message: `ต้องระบุค่า Primary Key: ${missingKey}` }, { status: 400 });
    }

    const values: any[] = [];
    const sets = setColumns.map(col => {
      values.push(normalizeValue(data[col], columnTypes[col]));
      return `${quoteIdentifier(col)} = $${values.length}`;
    });

    const where = primaryKeys.map(pk => {
      values.push(normalizeValue(key[pk], columnTypes[pk]));
      return `${quoteIdentifier(pk)} = $${values.length}`;
    });

    const sql = `UPDATE ${quoteIdentifier(table)} SET ${sets.join(', ')} WHERE ${where.join(' AND ')}`;
    await pool.query(sql, values);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    console.error('DB table PATCH error:', err);
    return NextResponse.json({ message: err?.message || 'Server error' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);
    const body = await req.json().catch(() => ({}));
    const table = String(body?.table || '').trim();
    const action = String(body?.action || '').trim();
    const key = body?.key || {};

    if (!table) return NextResponse.json({ message: 'กรุณาระบุชื่อตาราง' }, { status: 400 });
    if (!(await tableExists(table))) return NextResponse.json({ message: 'ไม่พบตารางนี้ในฐานข้อมูล' }, { status: 404 });

    if (action === 'drop') {
      await pool.query(`DROP TABLE ${quoteIdentifier(table)}`);
      return NextResponse.json({ success: true, dropped: true });
    }

    const columns = await getTableColumns(table);
    const primaryKeys = await getPrimaryKeyColumns(table);
    if (primaryKeys.length === 0) {
      return NextResponse.json({ message: 'ตารางนี้ไม่มี Primary Key' }, { status: 400 });
    }

    const columnTypes = columns.reduce((acc, col) => {
      acc[col.column_name] = col.data_type;
      return acc;
    }, {} as Record<string, string>);

    const missingKey = primaryKeys.find(pk => key[pk] === undefined || key[pk] === null || key[pk] === '');
    if (missingKey) {
      return NextResponse.json({ message: `ต้องระบุค่า Primary Key: ${missingKey}` }, { status: 400 });
    }

    const values: any[] = [];
    const where = primaryKeys.map(pk => {
      values.push(normalizeValue(key[pk], columnTypes[pk]));
      return `${quoteIdentifier(pk)} = $${values.length}`;
    });

    const sql = `DELETE FROM ${quoteIdentifier(table)} WHERE ${where.join(' AND ')}`;
    await pool.query(sql, values);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    console.error('DB table DELETE error:', err);
    return NextResponse.json({ message: err?.message || 'Server error' }, { status: 500 });
  }
});
