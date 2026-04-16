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
}
