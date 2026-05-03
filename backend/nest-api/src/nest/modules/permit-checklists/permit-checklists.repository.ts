import { Inject, Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface PermitTicketRow extends RowDataPacket {
  ticket_id: string;
  form_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  status: string;
  values_json: string;
  field_updated_at_json: string;
  process_notes_json: string;
  financials_json: string;
  attachments_json: string;
}

interface PermitTransactionRow extends RowDataPacket {
  id: string;
  ticket_id: string;
  type: string;
  event_timestamp: string;
  actor: string | null;
  details_json: string | null;
}

interface PermitDirectoryRow extends RowDataPacket {
  id: string;
  name: string;
}

interface PermitBillingDefaultRow extends RowDataPacket {
  form_type: string;
  fee_key: string;
  label: string;
  amount: number;
}

interface DeleteAuthUserRow extends RowDataPacket {
  isAdmin: string | number;
  employeeType: string | number;
}

@Injectable()
export class PermitChecklistsRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getTickets(): Promise<PermitTicketRow[]> {
    const sql = `SELECT * FROM quality_permit_checklist_tickets ORDER BY updated_at DESC`;
    return this.mysqlService.query<PermitTicketRow[]>(sql);
  }

  async getTransactions(): Promise<PermitTransactionRow[]> {
    const sql = `
      SELECT id, ticket_id, type, event_timestamp, actor, details_json
      FROM quality_permit_checklist_transactions
      ORDER BY event_timestamp DESC, created_at DESC
      LIMIT 5000
    `;

    return this.mysqlService.query<PermitTransactionRow[]>(sql);
  }

  async getCustomers(): Promise<PermitDirectoryRow[]> {
    const sql = `SELECT id, name FROM quality_permit_checklist_customers WHERE is_active = 1 ORDER BY name ASC`;
    return this.mysqlService.query<PermitDirectoryRow[]>(sql);
  }

  async getArchitects(): Promise<PermitDirectoryRow[]> {
    const sql = `SELECT id, name FROM quality_permit_checklist_architects WHERE is_active = 1 ORDER BY name ASC`;
    return this.mysqlService.query<PermitDirectoryRow[]>(sql);
  }

  async getBillingDefaults(): Promise<PermitBillingDefaultRow[]> {
    const sql = `
      SELECT form_type, fee_key, label, amount
      FROM quality_permit_checklist_billing_defaults
      WHERE is_active = 1
      ORDER BY form_type ASC, sort_order ASC, updated_at ASC
    `;

    return this.mysqlService.query<PermitBillingDefaultRow[]>(sql);
  }

  async upsertTicket(params: {
    ticketId: string;
    formType: string;
    status: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    finalizedAt: string | null;
    valuesJson: string;
    fieldUpdatedAtJson: string;
    processNotesJson: string;
    financialsJson: string;
    attachmentsJson: string;
  }): Promise<void> {
    const sql = `
      INSERT INTO quality_permit_checklist_tickets (
        ticket_id,
        form_type,
        status,
        created_by,
        created_at,
        updated_at,
        finalized_at,
        values_json,
        field_updated_at_json,
        process_notes_json,
        financials_json,
        attachments_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON)
      )
      ON DUPLICATE KEY UPDATE
        form_type = VALUES(form_type),
        status = VALUES(status),
        created_by = VALUES(created_by),
        created_at = VALUES(created_at),
        updated_at = VALUES(updated_at),
        finalized_at = VALUES(finalized_at),
        values_json = VALUES(values_json),
        field_updated_at_json = VALUES(field_updated_at_json),
        process_notes_json = VALUES(process_notes_json),
        financials_json = VALUES(financials_json),
        attachments_json = VALUES(attachments_json)
    `;

    await this.mysqlService.execute<ResultSetHeader>(sql, [
      params.ticketId,
      params.formType,
      params.status,
      params.createdBy,
      params.createdAt,
      params.updatedAt,
      params.finalizedAt,
      params.valuesJson,
      params.fieldUpdatedAtJson,
      params.processNotesJson,
      params.financialsJson,
      params.attachmentsJson,
    ]);
  }

  async getAttachmentsJson(ticketId: string): Promise<string | null> {
    const sql = `SELECT attachments_json FROM quality_permit_checklist_tickets WHERE ticket_id = ? LIMIT 1`;
    const rows = await this.mysqlService.query<(RowDataPacket & { attachments_json: string })[]>(sql, [ticketId]);
    return rows[0]?.attachments_json ?? null;
  }

  async setAttachmentsJson(ticketId: string, attachmentsJson: string, updatedAt: string): Promise<number> {
    const sql = `UPDATE quality_permit_checklist_tickets SET attachments_json = CAST(? AS JSON), updated_at = ? WHERE ticket_id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [attachmentsJson, updatedAt, ticketId]);
    return result.affectedRows;
  }

  async archiveTicket(ticketId: string, updatedAt: string): Promise<number> {
    const sql = `UPDATE quality_permit_checklist_tickets SET status = ?, updated_at = ? WHERE ticket_id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, ['archived', updatedAt, ticketId]);
    return result.affectedRows;
  }

  async hardDeleteTicket(ticketId: string): Promise<number> {
    const sql = `DELETE FROM quality_permit_checklist_tickets WHERE ticket_id = ?`;
    const result = await this.mysqlService.execute<ResultSetHeader>(sql, [ticketId]);
    return result.affectedRows;
  }

  async getDeleteAuthUserById(userId: string): Promise<DeleteAuthUserRow | null> {
    const sql = `SELECT admin AS isAdmin, employeeType FROM db.users WHERE id = ? LIMIT 1`;
    const rows = await this.mysqlService.query<DeleteAuthUserRow[]>(sql, [userId]);
    return rows[0] || null;
  }

  async upsertTransactions(transactions: Array<{
    id: string;
    ticketId: string;
    type: string;
    timestamp: string;
    actor: string | null;
    detailsJson: string | null;
  }>): Promise<number> {
    if (transactions.length === 0) {
      return 0;
    }

    const sql = `
      INSERT INTO quality_permit_checklist_transactions (
        id,
        ticket_id,
        type,
        event_timestamp,
        actor,
        details_json
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        ticket_id = VALUES(ticket_id),
        type = VALUES(type),
        event_timestamp = VALUES(event_timestamp),
        actor = VALUES(actor),
        details_json = VALUES(details_json)
    `;

    let synced = 0;
    for (const tx of transactions) {
      await this.mysqlService.execute<ResultSetHeader>(sql, [
        tx.id,
        tx.ticketId,
        tx.type,
        tx.timestamp,
        tx.actor,
        tx.detailsJson,
      ]);
      synced += 1;
    }

    return synced;
  }

  async syncDirectories(customers: Array<{ id: string; name: string }>, architects: Array<{ id: string; name: string }>): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      await this.syncDirectoryTable(connection, 'quality_permit_checklist_customers', customers);
      await this.syncDirectoryTable(connection, 'quality_permit_checklist_architects', architects);
    });
  }

  async syncBillingDefaults(customerBillingDefaultsByType: Record<string, Array<{ key: string; label: string; amount: number }>>): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      const deleteSql = `DELETE FROM quality_permit_checklist_billing_defaults WHERE form_type = ?`;
      const insertSql = `
        INSERT INTO quality_permit_checklist_billing_defaults (
          form_type,
          fee_key,
          label,
          amount,
          sort_order,
          is_active
        ) VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          label = VALUES(label),
          amount = VALUES(amount),
          sort_order = VALUES(sort_order),
          is_active = 1
      `;

      for (const formType of ['seismic', 'dca']) {
        const rows = Array.isArray(customerBillingDefaultsByType?.[formType])
          ? customerBillingDefaultsByType[formType]
          : [];

        await connection.execute<ResultSetHeader>(deleteSql, [formType]);

        let sortOrder = 0;
        for (const row of rows) {
          const feeKey = String(row?.key || '').trim();
          const label = String(row?.label || '').trim();
          if (!feeKey || !label) {
            continue;
          }

          await connection.execute<ResultSetHeader>(insertSql, [
            formType,
            this.truncate(feeKey, 120),
            this.truncate(label, 255),
            this.normalizeAmount(row?.amount),
            sortOrder,
          ]);

          sortOrder += 1;
        }
      }
    });
  }

  private async syncDirectoryTable(
    connection: PoolConnection,
    tableName: 'quality_permit_checklist_customers' | 'quality_permit_checklist_architects',
    rows: Array<{ id: string; name: string }>,
  ): Promise<void> {
    const upsertSql = `
      INSERT INTO ${tableName} (id, name, is_active)
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        is_active = 1
    `;

    const activeIds: string[] = [];
    for (const row of rows) {
      const id = this.truncate(String(row?.id || '').trim(), 80);
      const name = this.truncate(String(row?.name || '').trim(), 255);
      if (!id || !name) {
        continue;
      }

      await connection.execute<ResultSetHeader>(upsertSql, [id, name]);
      activeIds.push(id);
    }

    if (activeIds.length === 0) {
      await connection.execute<ResultSetHeader>(`UPDATE ${tableName} SET is_active = 0`);
      return;
    }

    const placeholders = activeIds.map(() => '?').join(',');
    const deactivateSql = `UPDATE ${tableName} SET is_active = 0 WHERE id NOT IN (${placeholders})`;
    await connection.execute<ResultSetHeader>(deactivateSql, activeIds);
  }

  private truncate(value: string, max: number): string {
    return value.length > max ? value.slice(0, max) : value;
  }

  private normalizeAmount(value: unknown): number {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n < 0) {
      return 0;
    }

    return Number(n.toFixed(2));
  }
}
