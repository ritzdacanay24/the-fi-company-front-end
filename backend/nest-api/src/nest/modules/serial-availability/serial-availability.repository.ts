import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export type SerialStockThresholdKey = 'eyefi' | 'ul_new' | 'ul_used' | 'igt';

export type SerialStockThresholds = Record<SerialStockThresholdKey, number>;

export const DEFAULT_SERIAL_STOCK_THRESHOLDS: SerialStockThresholds = {
  eyefi: 300,
  ul_new: 150,
  ul_used: 100,
  igt: 200,
};

const SERIAL_STOCK_THRESHOLDS_SETTING_KEY = 'serial_stock_thresholds';

@Injectable()
export class SerialAvailabilityRepository extends BaseRepository<RowDataPacket> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefi_serial_numbers', mysqlService);
  }

  async getAvailableEyefiSerials(limit = 10): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT esn.id,
              esn.serial_number,
              esn.product_model,
              esn.hardware_version,
              esn.firmware_version,
              esn.batch_number,
              esn.status,
              esn.is_consumed,
              esn.created_at
       FROM eyefi_serial_numbers esn
       LEFT JOIN serial_assignments sa
         ON sa.eyefi_serial_id = esn.id
        AND COALESCE(sa.is_voided, 0) = 0
        AND COALESCE(sa.status, '') <> 'voided'
       LEFT JOIN ul_label_usages ulu
         ON BINARY ulu.eyefi_serial_number = BINARY esn.serial_number
        AND COALESCE(ulu.is_voided, 0) = 0
       LEFT JOIN agsSerialGenerator ags
         ON BINARY ags.serialNumber = BINARY esn.serial_number
        AND COALESCE(ags.active, 1) = 1
       LEFT JOIN sgAssetGenerator sg
         ON BINARY sg.serialNumber = BINARY esn.serial_number
        AND COALESCE(sg.active, 1) = 1
       WHERE esn.status = 'available'
         AND esn.is_active = 1
         AND COALESCE(esn.is_consumed, 0) = 0
         AND sa.id IS NULL
         AND ulu.id IS NULL
         AND ags.id IS NULL
         AND sg.id IS NULL
       ORDER BY esn.id ASC
       LIMIT ${Math.max(1, Math.floor(limit))}`,
    );
  }

  async getAvailableUlLabels(limit = 10): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT ul.id, ul.ul_number, ul.description, ul.category, ul.manufacturer, ul.part_number, ul.status, ul.is_consumed, ul.created_at
       FROM ul_labels ul
       LEFT JOIN ul_label_usages ulu
         ON ul.id = ulu.ul_label_id
        AND COALESCE(ulu.is_voided, 0) = 0
       LEFT JOIN serial_assignments sa
         ON ul.id = sa.ul_label_id
        AND COALESCE(sa.is_voided, 0) = 0
        AND COALESCE(sa.status, '') <> 'voided'
       WHERE ul.status = 'active'
         AND COALESCE(ul.is_consumed, 0) = 0
         AND ulu.id IS NULL
         AND sa.id IS NULL
       ORDER BY ul.ul_number ASC
       LIMIT ${Math.max(1, Math.floor(limit))}`,
    );
  }

  async getAvailableIgtSerials(limit = 10): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT id, serial_number, category, status, manufacturer, model, notes, created_at
       FROM igt_serial_numbers
       WHERE status = 'available' AND is_active = 1
       ORDER BY id ASC
       LIMIT ${Math.max(1, Math.floor(limit))}`,
    );
  }

  async getRecentlyUsedEyefiSerials(limit = 10): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT esn.id, esn.serial_number, esn.product_model, esn.status, esn.consumed_at, esn.consumed_by
       FROM eyefi_serial_numbers esn
       WHERE esn.is_consumed = 1
       ORDER BY esn.consumed_at DESC, esn.id DESC
       LIMIT ${Math.max(1, Math.floor(limit))}`,
    );
  }

  async getRecentlyUsedIgtSerials(limit = 10): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT id, serial_number, category, status, used_at, used_by, used_in_asset_number
       FROM igt_serial_numbers
       WHERE used_at IS NOT NULL AND is_active = 1
       ORDER BY used_at DESC, id DESC
       LIMIT ${Math.max(1, Math.floor(limit))}`,
    );
  }

  async getAvailabilitySummary(): Promise<RowDataPacket> {
    const rows = await this.rawQuery<RowDataPacket>(
      `SELECT
        (
          SELECT COUNT(*)
          FROM eyefi_serial_numbers esn
          WHERE esn.is_active = 1
            AND esn.status = 'available'
            AND NOT EXISTS (
              SELECT 1
              FROM serial_assignments sa
              WHERE sa.eyefi_serial_id = esn.id
                AND COALESCE(sa.is_voided, 0) = 0
                AND COALESCE(sa.status, '') <> 'voided'
            )
            AND NOT EXISTS (
              SELECT 1
              FROM ul_label_usages ulu
              WHERE BINARY ulu.eyefi_serial_number = BINARY esn.serial_number
                AND COALESCE(ulu.is_voided, 0) = 0
            )
            AND NOT EXISTS (
              SELECT 1
              FROM agsSerialGenerator ags
              WHERE BINARY ags.serialNumber = BINARY esn.serial_number
                AND COALESCE(ags.active, 1) = 1
            )
            AND NOT EXISTS (
              SELECT 1
              FROM sgAssetGenerator sg
              WHERE BINARY sg.serialNumber = BINARY esn.serial_number
                AND COALESCE(sg.active, 1) = 1
            )
        ) AS eyefi_available,
        (
          SELECT COUNT(*)
          FROM ul_labels ul
          WHERE LOWER(COALESCE(ul.category, '')) = 'new'
            AND COALESCE(ul.is_consumed, 0) = 0
        ) AS ul_new_available,
        (
          SELECT COUNT(*)
          FROM ul_labels ul
          WHERE LOWER(COALESCE(ul.category, '')) = 'used'
            AND COALESCE(ul.is_consumed, 0) = 0
        ) AS ul_used_available,
        (
          SELECT COUNT(*)
          FROM igt_serial_numbers igt
          WHERE igt.is_active = 1
            AND igt.status = 'available'
        ) AS igt_available,
        (
          SELECT COUNT(DISTINCT esn.id)
          FROM eyefi_serial_numbers esn
          WHERE esn.is_active = 1
            AND (
              EXISTS (
                SELECT 1
                FROM serial_assignments sa
                WHERE sa.eyefi_serial_id = esn.id
                  AND COALESCE(sa.is_voided, 0) = 0
                  AND COALESCE(sa.status, '') <> 'voided'
              )
              OR EXISTS (
                SELECT 1
                FROM ul_label_usages ulu
                WHERE BINARY ulu.eyefi_serial_number = BINARY esn.serial_number
                  AND COALESCE(ulu.is_voided, 0) = 0
              )
              OR EXISTS (
                SELECT 1
                FROM agsSerialGenerator ags
                WHERE BINARY ags.serialNumber = BINARY esn.serial_number
                  AND COALESCE(ags.active, 1) = 1
              )
              OR EXISTS (
                SELECT 1
                FROM sgAssetGenerator sg
                WHERE BINARY sg.serialNumber = BINARY esn.serial_number
                  AND COALESCE(sg.active, 1) = 1
              )
            )
        ) AS eyefi_recently_used,
        (
          SELECT COUNT(*)
          FROM ul_labels ul
          WHERE LOWER(COALESCE(ul.category, '')) = 'new'
            AND COALESCE(ul.is_consumed, 0) = 1
        ) AS ul_new_recently_used,
        (
          SELECT COUNT(*)
          FROM ul_labels ul
          WHERE LOWER(COALESCE(ul.category, '')) = 'used'
            AND COALESCE(ul.is_consumed, 0) = 1
        ) AS ul_used_recently_used,
        (
          SELECT COUNT(*)
          FROM igt_serial_numbers igt
          WHERE igt.is_active = 1
            AND (igt.used_at IS NOT NULL OR igt.status = 'used')
        ) AS igt_recently_used,
        (
          SELECT COUNT(DISTINCT esn.id)
          FROM eyefi_serial_numbers esn
          WHERE esn.is_active = 1
            AND (
              EXISTS (
                SELECT 1
                FROM serial_assignments sa
                WHERE sa.eyefi_serial_id = esn.id
                  AND COALESCE(sa.is_voided, 0) = 0
                  AND COALESCE(sa.status, '') <> 'voided'
                  AND sa.consumed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
              )
              OR EXISTS (
                SELECT 1
                FROM ul_label_usages ulu
                WHERE BINARY ulu.eyefi_serial_number = BINARY esn.serial_number
                  AND COALESCE(ulu.is_voided, 0) = 0
                  AND COALESCE(ulu.date_used, DATE(ulu.created_at)) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
              )
              OR EXISTS (
                SELECT 1
                FROM agsSerialGenerator ags
                WHERE BINARY ags.serialNumber = BINARY esn.serial_number
                  AND COALESCE(ags.active, 1) = 1
                  AND ags.timeStamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
              )
              OR EXISTS (
                SELECT 1
                FROM sgAssetGenerator sg
                WHERE BINARY sg.serialNumber = BINARY esn.serial_number
                  AND COALESCE(sg.active, 1) = 1
                  AND sg.timeStamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
              )
            )
        ) AS eyefi_used_last_7_days,
        (
          SELECT COUNT(*)
          FROM ul_labels ul
          WHERE LOWER(COALESCE(ul.category, '')) = 'new'
            AND COALESCE(ul.is_consumed, 0) = 1
            AND ul.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ) AS ul_new_used_last_7_days,
        (
          SELECT COUNT(*)
          FROM ul_labels ul
          WHERE LOWER(COALESCE(ul.category, '')) = 'used'
            AND COALESCE(ul.is_consumed, 0) = 1
            AND ul.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ) AS ul_used_used_last_7_days,
        (
          SELECT COUNT(*)
          FROM igt_serial_numbers igt
          WHERE igt.is_active = 1
            AND igt.used_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ) AS igt_used_last_7_days`,
    );

    return rows[0] ?? {
      eyefi_available: 0,
      ul_new_available: 0,
      ul_used_available: 0,
      igt_available: 0,
      eyefi_recently_used: 0,
      ul_new_recently_used: 0,
      ul_used_recently_used: 0,
      igt_recently_used: 0,
      eyefi_used_last_7_days: 0,
      ul_new_used_last_7_days: 0,
      ul_used_used_last_7_days: 0,
      igt_used_last_7_days: 0,
    };
  }

  async getSerialStockThresholds(): Promise<SerialStockThresholds> {
    const sql = `
      SELECT setting_value
      FROM eyefidb.system_settings
      WHERE setting_key = ?
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [SERIAL_STOCK_THRESHOLDS_SETTING_KEY]);
    if (!rows.length || !rows[0].setting_value) {
      return { ...DEFAULT_SERIAL_STOCK_THRESHOLDS };
    }

    try {
      const parsed = JSON.parse(String(rows[0].setting_value)) as Partial<SerialStockThresholds>;
      return {
        eyefi: this.sanitizeThreshold(parsed.eyefi, DEFAULT_SERIAL_STOCK_THRESHOLDS.eyefi),
        ul_new: this.sanitizeThreshold(parsed.ul_new, DEFAULT_SERIAL_STOCK_THRESHOLDS.ul_new),
        ul_used: this.sanitizeThreshold(parsed.ul_used, DEFAULT_SERIAL_STOCK_THRESHOLDS.ul_used),
        igt: this.sanitizeThreshold(parsed.igt, DEFAULT_SERIAL_STOCK_THRESHOLDS.igt),
      };
    } catch {
      return { ...DEFAULT_SERIAL_STOCK_THRESHOLDS };
    }
  }

  async saveSerialStockThresholds(thresholds: SerialStockThresholds, updatedBy = 'system'): Promise<void> {
    const value = JSON.stringify({
      eyefi: this.sanitizeThreshold(thresholds.eyefi, DEFAULT_SERIAL_STOCK_THRESHOLDS.eyefi),
      ul_new: this.sanitizeThreshold(thresholds.ul_new, DEFAULT_SERIAL_STOCK_THRESHOLDS.ul_new),
      ul_used: this.sanitizeThreshold(thresholds.ul_used, DEFAULT_SERIAL_STOCK_THRESHOLDS.ul_used),
      igt: this.sanitizeThreshold(thresholds.igt, DEFAULT_SERIAL_STOCK_THRESHOLDS.igt),
    });

    const sql = `
      INSERT INTO eyefidb.system_settings (setting_key, setting_value, description, updated_by, updated_at)
      VALUES (?, ?, 'Serial stock alert thresholds', ?, NOW())
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        description = VALUES(description),
        updated_by = VALUES(updated_by),
        updated_at = NOW()
    `;

    await this.mysqlService.query<RowDataPacket[]>(sql, [SERIAL_STOCK_THRESHOLDS_SETTING_KEY, value, updatedBy]);
  }

  private sanitizeThreshold(value: unknown, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return fallback;
    }

    return Math.max(1, Math.round(numeric));
  }
}
