const express = require('express');
const cors = require('cors');
const odbc = require('odbc');
const mysql = require('mysql2/promise');

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

function qadConnStr() {
  return `DSN=${qad.dsn};UID=${qad.user};PWD=${qad.password}`;
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      return obj[k];
    }
  }
  const lower = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(lower, k.toLowerCase())) {
      return lower[k.toLowerCase()];
    }
  }
  return null;
}

app.get('/health', async (_req, res) => {
  res.json({ ok: true, service: 'qad-api', qadDsn: qad.dsn });
});

app.get('/qad/test', async (req, res) => {
  const sql = (req.query.sql || 'select top 1 * from sod_det').toString().trim();
  let conn;
  try {
    conn = await odbc.connect(qadConnStr());
    const rows = await conn.query(sql);
    res.json({ ok: true, qadDsn: qad.dsn, sql, count: rows.length, rows: rows.slice(0, 5) });
  } catch (err) {
    res.status(500).json({ ok: false, qadDsn: qad.dsn, sql, error: err.message || String(err) });
  } finally {
    if (conn) await conn.close();
  }
});

app.post('/sync/sod-det', async (req, res) => {
  const limitRaw = Number(req.query.limit || 20);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 200)) : 20;
  const sql = `select top ${limit} sod_nbr, sod_line, sod_part, sod_due_date from sod_det`;

  let qadConn;
  let db;
  try {
    qadConn = await odbc.connect(qadConnStr());
    const rows = await qadConn.query(sql);

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
      const sodPart = pick(row, 'sod_part', 'SOD_PART');
      const sodDueDate = pick(row, 'sod_due_date', 'SOD_DUE_DATE');

      if (!sodNbr || !sodLine) {
        continue;
      }

      await db.execute(
        `INSERT INTO qad_sod_det_cache (sod_nbr, sod_line, sod_part, sod_due_date)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE sod_part = VALUES(sod_part), sod_due_date = VALUES(sod_due_date)`,
        [sodNbr, sodLine, sodPart, sodDueDate || null]
      );
      upserted += 1;
    }

    res.json({ ok: true, qadDsn: qad.dsn, pulled: rows.length, upserted, table: 'qad_sod_det_cache' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  } finally {
    if (qadConn) await qadConn.close();
    if (db) await db.end();
  }
});

app.listen(port, () => {
  console.log(`qad-api listening on port ${port}`);
});
