import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories';

@Injectable()
export class GraphicsBomRepository extends BaseRepository<RowDataPacket> {
  private static readonly ALLOWED_COLUMNS = [
    'id',
    'ID_Product',
    'Product',
    'Account_Vendor',
    'Image_Data',
    'Manufacturer',
    'SKU_Number',
    'Date_Purchased',
    'Age_In_Years',
    'Serial_Number',
    'Purchased_From',
    'Category',
    'DI_Product_SQL',
    'Catalog_Item',
    'Taxable',
    'Keywords',
    'Location',
    'Amount_in_Stock',
    'Cost',
    'Reorder_Level',
    'Price',
    'Unit_Weight',
    'margin',
    'Status',
    'Unit_Dimensions',
    'DD1_1',
    'DD1_2',
    'DD1_3',
    'DD1_4',
    'DD1_5',
    'DD1_6',
    'DD1_7',
    'DD2_1',
    'DD2_2',
    'DD2_3',
    'DD2_4',
    'DD2_5',
    'DD2_6',
    'DD2_7',
    'DD2_8',
    'DD2_9',
    'DD3_1',
    'DD3_2',
    'DD3_3',
    'DD3_4',
    'DD3_5',
    'DD3_6',
    'DD3_7',
    'DD3_8',
    'DD3_9',
    'Date_Created',
    'Date_Modified',
    'UserName_Created',
    'UserName_Modified',
  ] as const;

  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('graphicsInventory', mysqlService);
  }

  async getList(): Promise<RowDataPacket[]> {
    const sql = 'SELECT * FROM graphicsInventory a ORDER BY a.id DESC';
    return this.rawQuery<RowDataPacket>(sql);
  }

  async find(filters: Record<string, unknown>): Promise<RowDataPacket[]> {
    const safeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key]) =>
        (GraphicsBomRepository.ALLOWED_COLUMNS as readonly string[]).includes(key),
      ),
    );
    return super.find(safeFilters);
  }

  async getAll(): Promise<RowDataPacket[]> {
    return this.rawQuery<RowDataPacket>('SELECT * FROM graphicsInventory ORDER BY id DESC');
  }

  async getById(id: number): Promise<RowDataPacket | null> {
    return super.findOne({ id });
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    return super.create(safePayload);
  }

  async updateById(id: number, payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    if (Object.keys(safePayload).length === 0) {
      return 0;
    }
    return super.updateById(id, safePayload);
  }

  async deleteById(id: number): Promise<number> {
    return super.deleteById(id);
  }

  private getSafePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          (GraphicsBomRepository.ALLOWED_COLUMNS as readonly string[]).includes(key) && key !== 'id',
      ),
    );
  }
}
