/**
 * migrate-checklist-media-to-s3.mjs
 *
 * Migrates legacy checklist media from:
 *   checklist/legacy-migration/inspectionCheckList/<filename>
 * to the correct S3 folder per DB record:
 *   checklist/instance/<instance_id>/<filename>       (photo_submissions)
 *   checklist/manage/templates/<tpl_id>/items/<item_id>/<filename>  (checklist_items sample images)
 *
 * Then updates photo_metadata in the DB so resolveChecklistMediaReadUrl
 * can sign from the new location without any legacy fallback.
 *
 * Prerequisites:
 *   1. Run aws s3 cp on the server first:
 *      aws s3 cp /path/to/attachments/inspectionCheckList/ \
 *        s3://<bucket>/checklist/legacy-migration/inspectionCheckList/ --recursive
 *   2. npm install mysql2 @aws-sdk/client-s3 dotenv  (in backend/ or globally)
 *
 * Usage:
 *   node migrate-checklist-media-to-s3.mjs --dry-run          # preview only
 *   node migrate-checklist-media-to-s3.mjs --limit 10         # first 10 rows
 *   node migrate-checklist-media-to-s3.mjs                    # run all
 *   node migrate-checklist-media-to-s3.mjs --env .env.production
 */

import mysql from 'mysql2/promise';
import { S3Client, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, appendFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? Number(args[i + 1]) : null; })();
const ENV_FILE = (() => { const i = args.indexOf('--env'); return i !== -1 ? args[i + 1] : '.env.production'; })();

// Load env
const envPath = resolve(ROOT, ENV_FILE);
try {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
  console.log(`Loaded env from ${envPath}`);
} catch {
  console.error(`Could not load env file: ${envPath}`);
  process.exit(1);
}

const BUCKET = process.env.FILE_STORAGE_DEFAULT_BUCKET?.trim();
const LEGACY_PREFIX = 'checklist/legacy-migration/inspectionCheckList';

if (!BUCKET) { console.error('FILE_STORAGE_DEFAULT_BUCKET not set'); process.exit(1); }
if (!process.env.AWS_ACCESS_KEY_ID) { console.error('AWS_ACCESS_KEY_ID not set'); process.exit(1); }

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const LOG_FILE = resolve(__dirname, `migration-log-${Date.now()}.jsonl`);
writeFileSync(LOG_FILE, '');
const log = (obj) => {
  appendFileSync(LOG_FILE, JSON.stringify(obj) + '\n');
  const status = obj.error ? '❌' : obj.skipped ? '⏭ ' : '✅';
  console.log(`${status} [${obj.table}] id=${obj.id} ${obj.from || ''} → ${obj.to || obj.reason || ''}`);
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract just the filename from a legacy URL or path */
function extractFilename(rawUrl) {
  const base = rawUrl.split('?')[0].trim();
  const parts = base.split('/');
  return parts[parts.length - 1] || null;
}

/** Check if a key exists in S3 */
async function s3KeyExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Copy object within the same bucket */
async function s3Copy(fromKey, toKey) {
  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: `${BUCKET}/${fromKey}`,
    Key: toKey,
  }));
}

/** Build storage metadata matching what uploadMedia() stores */
function buildStorageMeta(key) {
  return {
    provider: 's3',
    bucket: BUCKET,
    key,
    url: `https://${BUCKET}.s3.${process.env.AWS_REGION || 'us-west-1'}.amazonaws.com/${key}`,
  };
}

// ---------------------------------------------------------------------------
// Migrate photo_submissions
// ---------------------------------------------------------------------------
async function migratePhotoSubmissions(db) {
  console.log('\n── photo_submissions ──');

  const [rows] = await db.query(
    `SELECT id, instance_id, item_id, file_url, file_name, photo_metadata
     FROM photo_submissions
     WHERE file_url LIKE '%dashboard.eye-fi.com/attachments/%'
        OR file_url LIKE '/attachments/%'
     ORDER BY id ASC
     ${LIMIT ? `LIMIT ${LIMIT}` : ''}`,
  );

  console.log(`Found ${rows.length} legacy rows`);
  let ok = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const id = row.id;
    const instanceId = row.instance_id;
    const filename = extractFilename(row.file_url);

    if (!filename) {
      log({ table: 'photo_submissions', id, skipped: true, reason: 'could not extract filename', from: row.file_url });
      skipped++;
      continue;
    }

    const fromKey = `${LEGACY_PREFIX}/${filename}`;
    const toKey = `checklist/instance/${instanceId}/${filename}`;

    // Check source exists in S3
    const exists = await s3KeyExists(fromKey);
    if (!exists) {
      log({ table: 'photo_submissions', id, skipped: true, reason: `source not in S3: ${fromKey}`, from: row.file_url });
      skipped++;
      continue;
    }

    const existingMeta = (() => { try { return JSON.parse(row.photo_metadata || '{}'); } catch { return {}; } })();
    const newMeta = {
      ...existingMeta,
      storage_location: 'aws',
      storage: buildStorageMeta(toKey),
    };

    if (DRY_RUN) {
      log({ table: 'photo_submissions', id, dry: true, from: fromKey, to: toKey });
      ok++;
      continue;
    }

    try {
      await s3Copy(fromKey, toKey);
      await db.execute(
        `UPDATE photo_submissions SET photo_metadata = ? WHERE id = ?`,
        [JSON.stringify(newMeta), id],
      );
      log({ table: 'photo_submissions', id, from: fromKey, to: toKey });
      ok++;
    } catch (err) {
      log({ table: 'photo_submissions', id, error: String(err), from: fromKey, to: toKey });
      errors++;
    }
  }

  console.log(`photo_submissions: ✅ ${ok}  ⏭  ${skipped}  ❌ ${errors}`);
}

// ---------------------------------------------------------------------------
// Migrate checklist_items sample_image_url + sample_images JSON
// ---------------------------------------------------------------------------
async function migrateChecklistItems(db) {
  console.log('\n── checklist_items (sample media) ──');

  const [rows] = await db.query(
    `SELECT ci.id, ci.template_id, ci.sample_image_url, ci.sample_images
     FROM checklist_items ci
     WHERE ci.sample_image_url LIKE '%dashboard.eye-fi.com/attachments/%'
        OR ci.sample_image_url LIKE '/attachments/%'
     ORDER BY ci.id ASC
     ${LIMIT ? `LIMIT ${LIMIT}` : ''}`,
  );

  console.log(`Found ${rows.length} legacy sample_image_url rows`);
  let ok = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    const id = row.id;
    const templateId = row.template_id;
    const filename = extractFilename(row.sample_image_url);

    if (!filename) {
      log({ table: 'checklist_items', id, skipped: true, reason: 'could not extract filename', from: row.sample_image_url });
      skipped++;
      continue;
    }

    const fromKey = `${LEGACY_PREFIX}/${filename}`;
    const toKey = `checklist/manage/templates/${templateId}/items/${id}/${filename}`;

    const exists = await s3KeyExists(fromKey);
    if (!exists) {
      log({ table: 'checklist_items', id, skipped: true, reason: `source not in S3: ${fromKey}`, from: row.sample_image_url });
      skipped++;
      continue;
    }

    // Build the new stored path matching buildStoredChecklistBucketPath(key)
    const newStoredPath = `/attachments/${toKey}`;

    // Patch sample_images JSON — update url field in primary entry
    let newSampleImages = row.sample_images;
    try {
      const imgs = JSON.parse(row.sample_images || '[]');
      const patched = imgs.map((img) => {
        if (img.is_primary) {
          return { ...img, url: undefined, storage: buildStorageMeta(toKey) };
        }
        // For reference images with a legacy url, derive their key too
        if (img.url && (img.url.includes('dashboard.eye-fi.com') || img.url.startsWith('/attachments/'))) {
          const refFilename = extractFilename(img.url);
          if (refFilename) {
            const refFromKey = `${LEGACY_PREFIX}/${refFilename}`;
            const refToKey = `checklist/manage/templates/${templateId}/items/${id}/${refFilename}`;
            return { ...img, url: undefined, storage: { ...buildStorageMeta(refToKey), _from: refFromKey } };
          }
        }
        return img;
      });
      newSampleImages = JSON.stringify(patched);
    } catch {
      // leave sample_images unchanged if parse fails
    }

    if (DRY_RUN) {
      log({ table: 'checklist_items', id, dry: true, from: fromKey, to: toKey });
      ok++;
      continue;
    }

    try {
      await s3Copy(fromKey, toKey);
      await db.execute(
        `UPDATE checklist_items SET sample_image_url = ?, sample_images = ? WHERE id = ?`,
        [newStoredPath, newSampleImages, id],
      );
      log({ table: 'checklist_items', id, from: fromKey, to: toKey });
      ok++;
    } catch (err) {
      log({ table: 'checklist_items', id, error: String(err), from: fromKey, to: toKey });
      errors++;
    }
  }

  console.log(`checklist_items: ✅ ${ok}  ⏭  ${skipped}  ❌ ${errors}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('='.repeat(60));
  console.log(`Checklist Media → S3 Migration`);
  console.log(`Bucket:   ${BUCKET}`);
  console.log(`From:     ${LEGACY_PREFIX}/`);
  console.log(`Env:      ${ENV_FILE}`);
  console.log(`Dry run:  ${DRY_RUN}`);
  console.log(`Limit:    ${LIMIT ?? 'all'}`);
  console.log(`Log:      ${LOG_FILE}`);
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no S3 copies or DB updates will be made\n');
  }

  const db = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'eyefidb',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8mb4',
  });

  try {
    await migratePhotoSubmissions(db);
    await migrateChecklistItems(db);
    console.log(`\nDone. Full log: ${LOG_FILE}`);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
