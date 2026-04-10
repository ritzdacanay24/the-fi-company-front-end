import express, { Request, Response } from 'express';
import cors from 'cors';
import odbc from 'odbc';
import mysql from 'mysql2/promise';

const app = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT || 3000);

const qad = {
  dsn: process.env.QAD_DSN || 'DEV',
  user: process.env.QAD_USER || 'change_me',
  password: process.env.QAD_PASSWORD || 'change_me',
};

const mysqlCfg = {
  host: process.env.DB_HOST || 'mysql',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'change_me',
  password: process.env.DB_PASSWORD || 'change_me',
  database: process.env.DB_NAME || 'eyefidb',
};

const mysqlBaseCfg = {
  host: process.env.DB_HOST || 'mysql',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'change_me',
  password: process.env.DB_PASSWORD || 'change_me',
};

function qadConnStr(): string {
  return `DSN=${qad.dsn};UID=${qad.user};PWD=${qad.password}`;
}

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return obj[key];
    }
  }
  const lower = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(lower, key.toLowerCase())) {
      return lower[key.toLowerCase()];
    }
  }
  return null;
}

function sqlIdentifier(name: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `\`${name}\``;
}

async function resolveTrainingSchema(db: any): Promise<string | null> {
  const candidates = [
    process.env.TRAINING_DB_SCHEMA,
    process.env.DB_NAME,
    'eyefidb',
    'igt_database',
    'db',
  ].filter((v): v is string => Boolean(v));

  if (candidates.length) {
    const placeholders = candidates.map(() => '?').join(',');
    const [rows] = await db.query(
      `
        SELECT
          table_schema,
          COUNT(DISTINCT table_name) AS matched_tables
        FROM information_schema.tables
        WHERE table_name IN ('training_sessions', 'training_categories', 'training_attendees', 'training_attendance')
        AND table_schema IN (${placeholders})
        GROUP BY table_schema
        ORDER BY matched_tables DESC
        LIMIT 1
      `,
      candidates
    );

    const typedRows = rows as Array<{ table_schema: string; matched_tables: number | string }>;
    if (typedRows.length) {
      return typedRows[0].table_schema;
    }
  }

  // Fallback: scan all schemas visible to the user and pick the best match.
  const [allRows] = await db.query(`
    SELECT
      table_schema,
      COUNT(DISTINCT table_name) AS matched_tables
    FROM information_schema.tables
    WHERE table_name IN ('training_sessions', 'training_categories', 'training_attendees', 'training_attendance')
    GROUP BY table_schema
    ORDER BY matched_tables DESC
    LIMIT 1
  `);

  const typedAllRows = allRows as Array<{ table_schema: string; matched_tables: number | string }>;
  if (!typedAllRows.length) {
    return null;
  }

  return typedAllRows[0].table_schema;
}

app.get('/health', async (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'qad-api', qadDsn: qad.dsn });
});

app.get('/qad/test', async (req: Request, res: Response) => {
  const sql = (req.query.sql || 'select top 1 * from sod_det').toString().trim();
  let conn: any = null;

  try {
    conn = await odbc.connect(qadConnStr());
    const rows = (await conn.query(sql)) as Record<string, unknown>[];
    res.json({ ok: true, qadDsn: qad.dsn, sql, count: rows.length, rows: rows.slice(0, 5) });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, qadDsn: qad.dsn, sql, error });
  } finally {
    if (conn) {
      await conn.close();
    }
  }
});

const handleWipReport = async (req: Request, res: Response) => {
  const limitRaw = Number(req.query.limit || 0);
  const limit = Number.isFinite(limitRaw) ? Math.max(0, Math.min(limitRaw, 500)) : 0;

  const sql = `
    select wo_nbr id
    , wo_nbr
    , wo_wip_tot wo_wip_tot
    , wo_so_job
    , wo_routing
    , wo_rel_date
    , wo_qty_ord
    , wo_qty_comp
    , wo_need_date
    , wo_line
    , wo_due_date
    , wo_part
    , wo_status
    from wo_mstr
    left join (
      select
        sum(wod_qty_req - wod_qty_iss) open_qty,
        sum((wod_qty_req) * wod_bom_amt) total_amount,
        sum(((wod_qty_req-wod_qty_iss) * wod_bom_amt)-wod_mvrte_accr) total_open_amount,
        wod_nbr,
        sum(wod_qty_iss) wod_qty_iss
      from wod_det
      where wod_domain = 'EYE'
      group by wod_nbr
    ) a ON a.wod_nbr = wo_mstr.wo_nbr
    where wo_domain = 'EYE'
    and wo_wip_tot > 0
    order by wo_due_date DESC
  `;

  let conn: any = null;
  try {
    conn = await odbc.connect(qadConnStr());
    const rows = (await conn.query(sql)) as Record<string, unknown>[];
    const normalized = rows.map((row) => ({
      ...row,
      id: pick(row, 'wo_nbr', 'WO_NBR') ?? pick(row, 'id', 'ID'),
    }));

    const result = limit > 0 ? normalized.slice(0, limit) : normalized;
    res.json(result);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, endpoint: '/api/WipReport/index', error });
  } finally {
    if (conn) {
      await conn.close();
    }
  }
};

app.get('/api/WipReport/index', handleWipReport);
app.get('/server/ApiV2/WipReport/index', handleWipReport);

const handleTrainingSessions = async (_req: Request, res: Response) => {
  let db: any = null;
  try {
    db = await mysql.createConnection(mysqlBaseCfg);

    const schema = await resolveTrainingSchema(db);
    if (!schema) {
      res.status(500).json({
        ok: false,
        endpoint: '/api/training/index',
        error: 'Could not find training tables in candidate schemas. Set TRAINING_DB_SCHEMA explicitly.',
      });
      return;
    }

    const schemaId = sqlIdentifier(schema);
    const sql = `
      SELECT
        ts.*,
        tc.name AS category_name,
        tc.color_code AS category_color,
        COUNT(DISTINCT ta.employee_id) AS expected_count,
        COUNT(DISTINCT att.employee_id) AS completed_count
      FROM ${schemaId}.training_sessions ts
      LEFT JOIN ${schemaId}.training_categories tc ON ts.category_id = tc.id
      LEFT JOIN ${schemaId}.training_attendees ta ON ts.id = ta.session_id
      LEFT JOIN ${schemaId}.training_attendance att ON ts.id = att.session_id
      GROUP BY ts.id
      ORDER BY ts.date DESC, ts.start_time DESC
    `;

    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, endpoint: '/api/training/index', error });
  } finally {
    if (db) {
      await db.end();
    }
  }
};

app.get('/api/training/index', handleTrainingSessions);
app.get('/server/ApiV2/training/index', handleTrainingSessions);

app.post('/sync/sod-det', async (req: Request, res: Response) => {
  const limitRaw = Number(req.query.limit || 20);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 200)) : 20;
  const sql = `select top ${limit} sod_nbr, sod_line, sod_part, sod_due_date from sod_det`;

  let qadConn: any = null;
  let db: any = null;

  try {
    qadConn = await odbc.connect(qadConnStr());
    const rows = (await qadConn.query(sql)) as Record<string, unknown>[];

    db = await mysql.createConnection(mysqlCfg);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS qad_sod_det_cache (
        sod_nbr VARCHAR(50) NOT NULL,
        sod_line VARCHAR(50) NOT NULL,
        sod_part VARCHAR(100) NULL,
        sod_due_date DATETIME NULL,
        synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (sod_nbr, sod_line)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    let upserted = 0;
    for (const row of rows) {
      const sodNbr = String(pick(row, 'sod_nbr', 'SOD_NBR') ?? '');
      const sodLine = String(pick(row, 'sod_line', 'SOD_LINE') ?? '');
      const sodPart = pick(row, 'sod_part', 'SOD_PART') as string | null;
      const sodDueDate = pick(row, 'sod_due_date', 'SOD_DUE_DATE') as string | null;

      if (!sodNbr || !sodLine) {
        continue;
      }

      await db.execute(
        `INSERT INTO qad_sod_det_cache (sod_nbr, sod_line, sod_part, sod_due_date)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE sod_part = VALUES(sod_part), sod_due_date = VALUES(sod_due_date)`,
        [sodNbr, sodLine, sodPart, sodDueDate]
      );
      upserted += 1;
    }

    res.json({ ok: true, qadDsn: qad.dsn, pulled: rows.length, upserted, table: 'qad_sod_det_cache' });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error });
  } finally {
    if (qadConn) {
      await qadConn.close();
    }
    if (db) {
      await db.end();
    }
  }
});

app.listen(port, () => {
  console.log(`qad-api listening on port ${port}`);
});
