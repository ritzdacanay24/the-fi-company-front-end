import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

@Injectable()
export class ReceivingService {
  private static readonly MUTABLE_FIELDS = [
    'start_date',
    'end_date',
    'start_time',
    'po_number',
    'comments',
    'created_by',
    'created_date',
    'title',
    'status',
    'inbound_or_pickup',
    'background_color',
    'text_color',
  ] as const;

  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getById(id: string): Promise<Record<string, unknown> | null> {
    const sql = `
      SELECT *
        , CASE
            WHEN inbound_or_pickup = 'Outbound' THEN '#FF8C00'
            WHEN inbound_or_pickup = 'Inbound' THEN '#4B6F44'
            WHEN inbound_or_pickup = 'Pick up' THEN '#6CB4EE'
            WHEN inbound_or_pickup = 'PTO' THEN '#AA0000'
            ELSE '#8fbc8f'
          END backgroundColor
        , CASE
            WHEN inbound_or_pickup = 'Outbound' THEN '#FF8C00'
            WHEN inbound_or_pickup = 'Inbound' THEN '#4B6F44'
            WHEN inbound_or_pickup = 'Pick up' THEN '#6CB4EE'
            WHEN inbound_or_pickup = 'PTO' THEN '#AA0000'
            ELSE '#8fbc8f'
          END borderColor
        , CASE
            WHEN inbound_or_pickup = 'Outbound' THEN 'bg-warning'
            WHEN inbound_or_pickup = 'Inbound' THEN 'bg-success'
            WHEN inbound_or_pickup = 'Pick up' THEN 'bg-info'
            WHEN inbound_or_pickup = 'PTO' THEN 'bg-danger'
            ELSE 'bg-success bg-opacity-50'
          END backgroundColorClass
        , CASE
            WHEN inbound_or_pickup = 'Outbound' THEN 'bg-warning rounded'
            WHEN inbound_or_pickup = 'Inbound' THEN 'bg-success rounded'
            WHEN inbound_or_pickup = 'Pick up' THEN 'bg-info rounded'
            WHEN inbound_or_pickup = 'PTO' THEN 'bg-danger rounded'
            ELSE 'bg-success bg-opacity-50 rounded'
          END borderColorClass
        , CASE WHEN status = 'Open' THEN '#fff ' ELSE '#fff' END textColor
        , CONCAT(start_date, ' ', start_time) start
        , CONCAT(end_date, ' ', start_time) end
      FROM receiving
      WHERE id = ?
      LIMIT 1
    `;

    const rows = await this.mysqlService.query<RowDataPacket[]>(sql, [id]);
    return rows[0] || null;
  }

  async getOpenPo(start: string, end: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT 'logistics' type_of
        , id
        , comments
        , inbound_or_pickup
        , po_number
        , status
        , title
        , background_color
        , text_color
        , start_date
        , CASE
            WHEN inbound_or_pickup = 'Outbound' THEN '#FF8C00'
            WHEN inbound_or_pickup = 'Inbound' THEN '#4B6F44'
            WHEN inbound_or_pickup = 'Pick up' THEN '#6CB4EE'
            WHEN inbound_or_pickup = 'PTO' THEN '#AA0000'
            ELSE '#8fbc8f'
          END backgroundColor
        , CASE
            WHEN inbound_or_pickup = 'Outbound' THEN '#FF8C00'
            WHEN inbound_or_pickup = 'Inbound' THEN '#4B6F44'
            WHEN inbound_or_pickup = 'Pick up' THEN '#6CB4EE'
            WHEN inbound_or_pickup = 'PTO' THEN '#AA0000'
            ELSE '#8fbc8f'
          END borderColor
        , CASE
            WHEN inbound_or_pickup = 'Outbound' THEN 'bg-warning'
            WHEN inbound_or_pickup = 'Inbound' THEN 'bg-success'
            WHEN inbound_or_pickup = 'Pick up' THEN 'bg-info'
            WHEN inbound_or_pickup = 'PTO' THEN 'bg-danger'
            ELSE 'bg-success bg-opacity-50'
          END backgroundColorClass
        , CASE
            WHEN inbound_or_pickup = 'Outbound' THEN 'bg-warning rounded'
            WHEN inbound_or_pickup = 'Inbound' THEN 'bg-success rounded'
            WHEN inbound_or_pickup = 'Pick up' THEN 'bg-info rounded'
            WHEN inbound_or_pickup = 'PTO' THEN 'bg-danger rounded'
            ELSE 'bg-success bg-opacity-50 rounded'
          END borderColorClass
        , CASE WHEN status = 'Open' THEN '#fff ' ELSE '#fff' END textColor
        , CONCAT(start_date, ' ', start_time) start
        , CONCAT(end_date, ' ', start_time) end
        , '' property
        , '' customer
        , '' platform
        , '' sign_type
        , '' fs_scheduler_id
      FROM receiving
      WHERE start_date BETWEEN ? AND ?
         OR end_date BETWEEN ? AND ?

      UNION ALL

      SELECT 'fs_scheduler' type_of
        , NULL id
        , 'Info pulled from field service' comments
        , '' inbound_or_pickup
        , '' po_number
        , status
        , title
        , request_date start_date
        , '' background_color
        , '' text_color
        , 'yellow' backgroundColor
        , 'yellow' borderColor
        , 'bg-warning' backgroundColorClass
        , 'bg-warning' borderColorClass
        , 'black' textColor
        , CONCAT(full_request_date) start
        , CONCAT(full_request_date) end
        , a.property
        , customer
        , platform
        , sign_type
        , fs_scheduler_id
      FROM fs_scheduler_view a
      WHERE a.service_type = 'Removal'
        AND LOWER(a.state) = 'nv'
        AND request_date BETWEEN ? AND ?
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [start, end, start, end, start, end]);
  }

  async create(payload: Record<string, unknown>): Promise<number> {
    const safePayload = this.getSafePayload(payload);
    const fields = Object.keys(safePayload);
    const values = Object.values(safePayload);

    if (!fields.length) {
      return 0;
    }

    const placeholders = fields.map(() => '?').join(', ');
    const sql = `
      INSERT INTO receiving (${fields.join(', ')})
      VALUES (${placeholders})
    `;

    const result = await this.mysqlService.execute<ResultSetHeader>(sql, values);
    return result.insertId;
  }

  async update(id: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const safePayload = this.getSafePayload(payload);
    const fields = Object.keys(safePayload);

    if (!fields.length) {
      return payload;
    }

    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = [...Object.values(safePayload), id];

    const sql = `
      UPDATE receiving
      SET ${setClause}
      WHERE id = ?
    `;

    await this.mysqlService.execute<ResultSetHeader>(sql, values);
    return payload;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const sql = `
      DELETE FROM receiving
      WHERE id = ?
    `;

    await this.mysqlService.execute<ResultSetHeader>(sql, [id]);
    return { success: true };
  }

  async getAttachment(uniqueId: string): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT *
      FROM attachments
      WHERE uniqueId = ?
        AND field = 'LOGISTICS_CALENDAR'
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [uniqueId]);
  }

  async deleteAttachment(id: string): Promise<{ success: boolean }> {
    const sql = `
      DELETE FROM attachments
      WHERE id = ?
        AND field = 'LOGISTICS_CALENDAR'
    `;

    await this.mysqlService.execute<ResultSetHeader>(sql, [id]);
    return { success: true };
  }

  private getSafePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const allowed = new Set<string>(ReceivingService.MUTABLE_FIELDS as readonly string[]);
    return Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.has(key)));
  }
}
