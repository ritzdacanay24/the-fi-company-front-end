import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { BaseRepository } from '@/shared/repositories/base.repository';

export interface SafetyIncidentRecord extends RowDataPacket {
  id: number;
  [key: string]: unknown;
}

interface SafetyIncidentNotificationRecipientRow extends RowDataPacket {
  email: string | null;
}

@Injectable()
export class SafetyIncidentRepository extends BaseRepository<SafetyIncidentRecord> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('safety_incident', mysqlService);
  }

  private readonly allowedColumns = new Set([
    'id',
    'first_name',
    'last_name',
    'type_of_incident',
    'location_of_incident',
    'created_date',
    'location_of_incident_other',
    'description_of_incident',
    'created_by',
    'corrective_action_owner',
    'type_of_incident_other',
    'proposed_corrective_action',
    'proposed_corrective_action_completion_date',
    'comments',
    'confirmed_corrective_action_completion_date',
    'date_of_incident',
    'time_of_incident',
    'location_of_incident_other_other',
    'status',
    'corrective_action_owner_user_id',
    'corrective_action_owner_user_email',
    'details_of_any_damage_or_personal_injury',
  ]);

  private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) => this.allowedColumns.has(key) && value !== undefined,
      ),
    );
  }

  async getList(params: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: boolean;
  }): Promise<SafetyIncidentRecord[]> {
    const { selectedViewType, dateFrom, dateTo, isAll } = params;

    let sql = 'SELECT * FROM safety_incident a WHERE 1=1';
    const sqlParams: Array<string> = [];

    if (!isAll && dateFrom && dateTo) {
      sql += ' AND DATE(a.created_date) BETWEEN ? AND ?';
      sqlParams.push(dateFrom, dateTo);
    }

    if (selectedViewType === 'Open' || selectedViewType === 'In Process') {
      sql += " AND a.status IN ('In Process', 'Open')";
    } else if (selectedViewType === 'Closed') {
      sql += " AND a.status = 'Closed'";
    }

    sql += ' ORDER BY a.created_date DESC';

    return this.rawQuery<SafetyIncidentRecord>(sql, sqlParams);
  }

  async getById(id: number): Promise<SafetyIncidentRecord | null> {
    return this.findOne({ id });
  }

  async getAll(): Promise<SafetyIncidentRecord[]> {
    return this.rawQuery<SafetyIncidentRecord>(
      'SELECT * FROM safety_incident ORDER BY created_date DESC',
    );
  }

  async findMany(filters: Record<string, unknown>): Promise<SafetyIncidentRecord[]> {
    return this.find(this.sanitizePayload(filters));
  }

  async findSingle(filters: Record<string, unknown>): Promise<SafetyIncidentRecord | null> {
    return this.findOne(this.sanitizePayload(filters));
  }

  async createIncident(payload: Record<string, unknown>): Promise<number> {
    const sanitized = this.sanitizePayload(payload);
    return this.create(sanitized);
  }

  async getCreateNotificationRecipients(): Promise<string[]> {
    const rows = await this.rawQuery<SafetyIncidentNotificationRecipientRow>(
      `SELECT IFNULL(b.email, a.notification_emails) AS email
       FROM safety_incident_config a
       LEFT JOIN db.users b ON b.id = a.user_id
       WHERE a.location = 'safety_incident'`,
    );

    return rows
      .flatMap((row) =>
        String(row.email || '')
          .split(/[;,]/)
          .map((email) => email.trim())
          .filter(Boolean),
      )
      .filter((email, index, list) => list.indexOf(email) === index);
  }

  async updateIncidentById(id: number, payload: Record<string, unknown>): Promise<number> {
    const sanitized = this.sanitizePayload(payload);
    delete sanitized.id;
    if (Object.keys(sanitized).length === 0) {
      return 0;
    }
    return this.updateById(id, sanitized);
  }

  async deleteIncidentById(id: number): Promise<number> {
    return this.deleteById(id);
  }
}
