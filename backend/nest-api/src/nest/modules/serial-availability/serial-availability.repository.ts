import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

@Injectable()
export class SerialAvailabilityRepository extends BaseRepository<RowDataPacket> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefi_serial_numbers', mysqlService);
  }

  async getAvailableEyefiSerials(limit = 10): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT id, serial_number, product_model, hardware_version, firmware_version, batch_number, status, created_at
       FROM eyefi_serial_numbers
       WHERE status = 'available' AND is_active = 1
       ORDER BY id ASC
       LIMIT ${Math.max(1, Math.floor(limit))}`,
    );
  }

  async getAvailableUlLabels(limit = 10): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT ul.id, ul.ul_number, ul.description, ul.category, ul.manufacturer, ul.part_number, ul.status, ul.created_at
       FROM ul_labels ul
       LEFT JOIN ul_label_usages ulu ON ul.id = ulu.ul_label_id
       WHERE ul.status = 'active' AND ulu.id IS NULL
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

  async getRecentlyUsedUlLabels(limit = 10): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT ulu.id, ulu.ul_number, ulu.eyefi_serial_number, ulu.wo_nbr AS work_order_number,
              ulu.date_used, ulu.user_name, ul.category, ul.status
       FROM ul_label_usages ulu
       LEFT JOIN ul_labels ul ON ulu.ul_label_id = ul.id
       ORDER BY ulu.date_used DESC, ulu.id DESC
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
          WHERE ul.status = 'active'
            AND NOT EXISTS (
              SELECT 1
              FROM serial_assignments sa
              WHERE sa.ul_label_id = ul.id
                AND COALESCE(sa.is_voided, 0) = 0
                AND COALESCE(sa.status, '') <> 'voided'
            )
            AND NOT EXISTS (
              SELECT 1
              FROM ul_label_usages ulu
              WHERE ulu.ul_label_id = ul.id
                AND COALESCE(ulu.is_voided, 0) = 0
            )
        ) AS ul_available,
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
          SELECT COUNT(DISTINCT ul.id)
          FROM ul_labels ul
          WHERE EXISTS (
            SELECT 1
            FROM serial_assignments sa
            WHERE sa.ul_label_id = ul.id
              AND COALESCE(sa.is_voided, 0) = 0
              AND COALESCE(sa.status, '') <> 'voided'
          )
          OR EXISTS (
            SELECT 1
            FROM ul_label_usages ulu
            WHERE ulu.ul_label_id = ul.id
              AND COALESCE(ulu.is_voided, 0) = 0
          )
        ) AS ul_recently_used,
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
          SELECT COUNT(DISTINCT ul.id)
          FROM ul_labels ul
          WHERE EXISTS (
            SELECT 1
            FROM serial_assignments sa
            WHERE sa.ul_label_id = ul.id
              AND COALESCE(sa.is_voided, 0) = 0
              AND COALESCE(sa.status, '') <> 'voided'
              AND sa.consumed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          )
          OR EXISTS (
            SELECT 1
            FROM ul_label_usages ulu
            WHERE ulu.ul_label_id = ul.id
              AND COALESCE(ulu.is_voided, 0) = 0
              AND COALESCE(ulu.date_used, DATE(ulu.created_at)) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          )
        ) AS ul_used_last_7_days,
        (
          SELECT COUNT(*)
          FROM igt_serial_numbers igt
          WHERE igt.is_active = 1
            AND igt.used_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ) AS igt_used_last_7_days`,
    );

    return rows[0] ?? {
      eyefi_available: 0,
      ul_available: 0,
      igt_available: 0,
      eyefi_recently_used: 0,
      ul_recently_used: 0,
      igt_recently_used: 0,
      eyefi_used_last_7_days: 0,
      ul_used_last_7_days: 0,
      igt_used_last_7_days: 0,
    };
  }
}
