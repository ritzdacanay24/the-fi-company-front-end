import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class SerialAssignmentLinkService {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async hasActiveAssignmentByCustomerAsset(customerTypeId: number, customerAssetId: number): Promise<boolean> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT 1
       FROM serial_assignments
       WHERE customer_type_id = ?
         AND customer_asset_id = ?
         AND (is_voided = 0 OR is_voided IS NULL)
       LIMIT 1`,
      [customerTypeId, customerAssetId],
    );

    return rows.length > 0;
  }

  async hasActiveAssignmentByEyefiSerial(eyefiSerialNumber: string): Promise<boolean> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT 1
       FROM serial_assignments
       WHERE eyefi_serial_number = ?
         AND (is_voided = 0 OR is_voided IS NULL)
       LIMIT 1`,
      [eyefiSerialNumber],
    );

    return rows.length > 0;
  }

  async hasActiveAssignmentByUlNumber(ulNumber: string): Promise<boolean> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT 1
       FROM serial_assignments
       WHERE ul_number = ?
         AND (is_voided = 0 OR is_voided IS NULL)
       LIMIT 1`,
      [ulNumber],
    );

    return rows.length > 0;
  }
}
