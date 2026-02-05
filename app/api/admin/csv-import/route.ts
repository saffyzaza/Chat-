import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { withAuth } from '@/app/utils/middleware';
import { parse } from 'csv-parse/sync';

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

const ALLOWED_TABLES = [
  'users',
  'chat_sessions',
  'chat_messages',
  'planning_history',
  'file_apa_metadata',
];

async function ensureAdmin(userId: number) {
  const res = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  const role = res.rows?.[0]?.role || 'user';
  if (role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
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

function normalizeValue(value: any, dataType?: string) {
  const normalizedType = dataType?.toLowerCase();
  if (value === undefined || value === null) return null;
  if (
    (normalizedType === 'timestamp' ||
      normalizedType === 'timestamptz' ||
      normalizedType === 'timestamp without time zone' ||
      normalizedType === 'timestamp with time zone' ||
      normalizedType === 'date') &&
    typeof value === 'number'
  ) {
    const serial = value;
    if (!Number.isNaN(serial)) {
      const iso = convertExcelSerial(serial);
      return normalizedType === 'date' ? iso.slice(0, 10) : iso.replace('T', ' ').slice(0, 19);
    }
    return null;
  }
  if (normalizedType === 'boolean' && typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (normalizedType === 'boolean' && typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null') return null;

    if (normalizedType === 'boolean') {
      const lower = trimmed.toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(lower)) return true;
      if (['false', '0', 'no', 'n'].includes(lower)) return false;
      return null;
    }

    if (normalizedType === 'integer' || normalizedType === 'bigint' || normalizedType === 'smallint') {
      if (!/^[-+]?\d+$/.test(trimmed)) return null;
      return parseInt(trimmed, 10);
    }

    if (normalizedType === 'double precision' || normalizedType === 'numeric' || normalizedType === 'real') {
      if (!/^[-+]?\d*(\.\d+)?$/.test(trimmed) || trimmed === '' || trimmed === '.' || trimmed === '-' || trimmed === '+') {
        return null;
      }
      return parseFloat(trimmed);
    }

    if (
      normalizedType === 'timestamp' ||
      normalizedType === 'timestamptz' ||
      normalizedType === 'timestamp without time zone' ||
      normalizedType === 'timestamp with time zone' ||
      normalizedType === 'date'
    ) {
      const time = Date.parse(trimmed);
      if (!Number.isNaN(time)) return trimmed;
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const serial = parseFloat(trimmed);
        if (!Number.isNaN(serial)) {
          const iso = convertExcelSerial(serial);
          return normalizedType === 'date' ? iso.slice(0, 10) : iso.replace('T', ' ').slice(0, 19);
        }
      }
      return null;
    }

    return trimmed;
  }
  return value;
}

function isValidIdentifier(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (trimmed.includes('\u0000')) return false;
  return true;
}

function quoteIdentifier(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

function convertExcelSerial(serial: number) {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const millis = excelEpoch + serial * 86400000;
  return new Date(millis).toISOString();
}

function looksLikeDate(value: string) {
  if (!value) return false;
  if (!/[\-\/]/.test(value)) return false;
  const time = Date.parse(value);
  return !Number.isNaN(time);
}

function inferColumnType(values: string[]) {
  const nonEmpty = values.map(v => v?.trim()).filter(v => v);
  if (nonEmpty.length === 0) return 'TEXT';

  let isInt = true;
  let isFloat = true;
  let isBool = true;
  let isDate = true;

  for (const val of nonEmpty) {
    const lower = val.toLowerCase();
    if (!(lower === 'true' || lower === 'false' || lower === '0' || lower === '1')) {
      isBool = false;
    }

    if (!/^[-+]?\d+$/.test(val)) {
      isInt = false;
    }

    if (!/^[-+]?\d*(\.\d+)?$/.test(val) || val === '' || val === '.' || val === '-' || val === '+') {
      isFloat = false;
    }

    if (!looksLikeDate(val)) {
      isDate = false;
    }
  }

  if (isBool) return 'BOOLEAN';
  if (isInt) return 'INTEGER';
  if (isFloat) return 'DOUBLE PRECISION';
  if (isDate) return 'TIMESTAMP';
  return 'TEXT';
}

function buildInsertQuery(
  table: string,
  columns: string[],
  rows: any[],
  conflictColumns: string[] | null,
  columnTypes?: Record<string, string>
) {
  const values: any[] = [];
  const placeholders: string[] = [];
  let idx = 1;

  for (const row of rows) {
    const rowPlaceholders: string[] = [];
    for (const col of columns) {
      values.push(normalizeValue(row[col], columnTypes?.[col]));
      rowPlaceholders.push(`$${idx++}`);
    }
    placeholders.push(`(${rowPlaceholders.join(', ')})`);
  }

  const conflict = conflictColumns && conflictColumns.length > 0
    ? ` ON CONFLICT (${conflictColumns.map(c => quoteIdentifier(c)).join(', ')}) DO NOTHING`
    : '';

  const query = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(c => quoteIdentifier(c)).join(', ')}) VALUES ${placeholders.join(', ')}${conflict}`;
  return { query, values };
}

export const GET = withAuth(async (_req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);

    const tablesRes = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    const tableInfo: Record<string, { columns: string[] }> = {};
    for (const row of tablesRes.rows) {
      const table = row.table_name as string;
      const cols = await getTableColumns(table);
      tableInfo[table] = { columns: cols.map(c => c.column_name) };
    }

    return NextResponse.json({ tables: tableInfo });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('CSV import GET error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    await ensureAdmin(user.id);

    const formData = await req.formData();
    const table = String(formData.get('table') || '').trim();
    const createTable = String(formData.get('createTable') || '') === 'true';
    const conflictRaw = String(formData.get('conflictColumns') || '').trim();
    const conflictColumns = conflictRaw
      ? conflictRaw.split(',').map(c => c.trim()).filter(Boolean)
      : null;

    const fileEntries = formData.getAll('file');
    const files = fileEntries.filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ message: 'กรุณาเลือกไฟล์ CSV' }, { status: 400 });
    }

    if (!table) {
      return NextResponse.json({ message: 'กรุณาระบุชื่อตาราง' }, { status: 400 });
    }

    if (!isValidIdentifier(table)) {
      return NextResponse.json({ message: 'ชื่อตารางไม่ถูกต้อง' }, { status: 400 });
    }

    if (!createTable && !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ message: 'ตารางไม่ถูกต้อง' }, { status: 400 });
    }

    let records: Record<string, any>[] = [];
    for (const file of files) {
      const content = await file.text();
      const parsed = parse(content, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, any>[];
      records = records.concat(parsed || []);
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ message: 'ไม่พบข้อมูลในไฟล์ CSV' }, { status: 400 });
    }

    const inputColumnsRaw = Object.keys(records[0] || {});
    if (inputColumnsRaw.length === 0) {
      return NextResponse.json({ message: 'ไม่พบหัวคอลัมน์ในไฟล์ CSV' }, { status: 400 });
    }

    const invalidColumns = inputColumnsRaw.filter(col => !isValidIdentifier(col));
    if (invalidColumns.length > 0) {
      return NextResponse.json({ message: `ชื่อคอลัมน์ไม่ถูกต้อง: ${invalidColumns.join(', ')}` }, { status: 400 });
    }

    let tableColSet = new Set<string>();
    let columnTypes: Record<string, string> = {};
    let inputColumns = inputColumnsRaw;

    let tableExisted = false;

    if (createTable) {
      const existsRes = await pool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (existsRes.rows.length > 0) {
        tableExisted = true;
      }

      if (!tableExisted) {
        const sampleSize = Math.min(records.length, 50);
        const typeMap: Record<string, string> = {};
        for (const col of inputColumnsRaw) {
          const values = records.slice(0, sampleSize).map(r => String(r[col] ?? '')).filter(v => v !== '');
          typeMap[col] = inferColumnType(values);
        }

        const columnDefs = inputColumnsRaw
          .map(col => `${quoteIdentifier(col)} ${typeMap[col]}`)
          .join(', ');
        await pool.query(`CREATE TABLE ${quoteIdentifier(table)} (${columnDefs})`);

        tableColSet = new Set(inputColumnsRaw);
        columnTypes = { ...typeMap };
      }
    }

    if (!createTable || tableExisted) {
      const tableCols = await getTableColumns(table);
      tableColSet = new Set(tableCols.map(c => c.column_name));
      columnTypes = tableCols.reduce((acc, col) => {
        acc[col.column_name] = col.data_type;
        return acc;
      }, {} as Record<string, string>);
      inputColumns = inputColumnsRaw.filter(col => tableColSet.has(col));
      if (inputColumns.length === 0) {
        return NextResponse.json({ message: 'ไม่พบคอลัมน์ที่ตรงกับตาราง' }, { status: 400 });
      }
    }

    let safeConflictColumns: string[] | null = null;
    if (conflictColumns && conflictColumns.length > 0) {
      safeConflictColumns = conflictColumns.filter(col => tableColSet.has(col));
      if (safeConflictColumns.length === 0) {
        safeConflictColumns = null;
      }
    }

    if (Object.keys(columnTypes).length > 0) {
      records = records.map((row) => {
        const next = { ...row } as Record<string, any>;
        for (const col of inputColumns) {
          const t = columnTypes[col]?.toLowerCase();
          if (!t) continue;
          if (
            t === 'timestamp' ||
            t === 'timestamptz' ||
            t === 'timestamp without time zone' ||
            t === 'timestamp with time zone' ||
            t === 'date'
          ) {
            const v = next[col];
            if (typeof v === 'number') {
              const iso = convertExcelSerial(v);
              next[col] = t === 'date' ? iso.slice(0, 10) : iso.replace('T', ' ').slice(0, 19);
            } else if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) {
              const iso = convertExcelSerial(parseFloat(v.trim()));
              next[col] = t === 'date' ? iso.slice(0, 10) : iso.replace('T', ' ').slice(0, 19);
            }
          }
        }
        return next;
      });
    }

    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      try {
        const { query, values } = buildInsertQuery(table, inputColumns, batch, safeConflictColumns, columnTypes);
        const res = await pool.query(query, values);
        inserted += res.rowCount || 0;
      } catch (e: any) {
        const msg = String(e?.message || '').toLowerCase();
        if (safeConflictColumns && msg.includes('no unique or exclusion constraint')) {
          const { query, values } = buildInsertQuery(table, inputColumns, batch, null, columnTypes);
          const res = await pool.query(query, values);
          inserted += res.rowCount || 0;
        } else {
          throw e;
        }
      }
    }

    return NextResponse.json({
      success: true,
      table,
      tableExisted,
      inserted,
      totalRows: records.length,
      usedColumns: inputColumns,
    });
  } catch (err: any) {
    if (err?.message === 'FORBIDDEN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('CSV import POST error:', err);
    return NextResponse.json({ message: err?.message || 'Server error', details: err?.message }, { status: 500 });
  }
});
