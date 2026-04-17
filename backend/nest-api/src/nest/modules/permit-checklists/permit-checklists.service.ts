import { Injectable } from '@nestjs/common';
import { PermitChecklistsRepository } from './permit-checklists.repository';

type TicketStatus = 'draft' | 'saved' | 'submitted' | 'finalized' | 'archived';

@Injectable()
export class PermitChecklistsService {
  constructor(private readonly repository: PermitChecklistsRepository) {}

  async bootstrap() {
    const [ticketRows, txRows, customerRows, architectRows, defaultRows] = await Promise.all([
      this.repository.getTickets(),
      this.repository.getTransactions(),
      this.repository.getCustomers(),
      this.repository.getArchitects(),
      this.repository.getBillingDefaults(),
    ]);

    const tickets = ticketRows.map((row) => ({
      ticketId: String(row.ticket_id),
      formType: String(row.form_type),
      createdBy: String(row.created_by),
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
      finalizedAt: row.finalized_at ? this.toIso(row.finalized_at) : null,
      status: String(row.status),
      values: this.decodeJsonObject(row.values_json),
      fieldUpdatedAt: this.decodeJsonObject(row.field_updated_at_json),
      processNoteRecords: this.decodeJsonArray(row.process_notes_json),
      financials: this.decodeJsonObject(row.financials_json),
      attachments: this.decodeJsonArray(row.attachments_json),
    }));

    const transactions = txRows.map((row) => ({
      id: String(row.id),
      ticketId: String(row.ticket_id),
      type: String(row.type),
      timestamp: this.toIso(row.event_timestamp),
      actor: row.actor ? String(row.actor) : null,
      details: this.decodeJsonObjectNullable(row.details_json),
    }));

    const customerBillingDefaultsByType: Record<string, Array<Record<string, unknown>>> = {
      seismic: [],
      dca: [],
    };

    for (const row of defaultRows) {
      const formType = String(row.form_type);
      if (!customerBillingDefaultsByType[formType]) {
        continue;
      }

      customerBillingDefaultsByType[formType].push({
        key: String(row.fee_key),
        label: String(row.label),
        amount: Number(Number(row.amount || 0).toFixed(2)),
        isApprovedAmount: false,
      });
    }

    return {
      success: true,
      data: {
        tickets,
        transactions,
        customers: customerRows.map((row) => ({ id: String(row.id), name: String(row.name) })),
        architects: architectRows.map((row) => ({ id: String(row.id), name: String(row.name) })),
        customerBillingDefaultsByType,
      },
    };
  }

  async upsertTicket(ticketInput: Record<string, unknown> | undefined) {
    if (!ticketInput || typeof ticketInput !== 'object') {
      return { success: false, error: 'ticket is required' };
    }

    const ticketId = String(ticketInput.ticketId || '').trim();
    const formType = String(ticketInput.formType || '').trim().toLowerCase();
    const status = String(ticketInput.status || 'draft').trim().toLowerCase() as TicketStatus;

    if (!ticketId) {
      return { success: false, error: 'ticket.ticketId is required' };
    }

    if (formType !== 'seismic' && formType !== 'dca') {
      return { success: false, error: 'ticket.formType must be seismic or dca' };
    }

    if (!['draft', 'saved', 'submitted', 'finalized', 'archived'].includes(status)) {
      return { success: false, error: 'ticket.status is invalid' };
    }

    await this.repository.upsertTicket({
      ticketId,
      formType,
      status,
      createdBy: this.truncate(String(ticketInput.createdBy || 'Unknown User'), 255),
      createdAt: this.toDbDateTime(ticketInput.createdAt),
      updatedAt: this.toDbDateTime(ticketInput.updatedAt),
      finalizedAt: this.nullableDbDateTime(ticketInput.finalizedAt),
      valuesJson: this.encodeJsonSafe(ticketInput.values || {}),
      fieldUpdatedAtJson: this.encodeJsonSafe(ticketInput.fieldUpdatedAt || {}),
      processNotesJson: this.encodeJsonSafe(ticketInput.processNoteRecords || []),
      financialsJson: this.encodeJsonSafe(ticketInput.financials || {}),
      attachmentsJson: this.encodeJsonSafe(ticketInput.attachments || []),
    });

    return { success: true, ticketId };
  }

  async deleteTicket(ticketIdInput: string | undefined) {
    const ticketId = String(ticketIdInput || '').trim();
    if (!ticketId) {
      return { success: false, error: 'ticketId is required' };
    }

    const archivedRows = await this.repository.archiveTicket(ticketId, this.toDbDateTime(new Date().toISOString()));
    return { success: true, ticketId, archivedRows };
  }

  async hardDeleteTicket(ticketIdInput: string | undefined, currentUserIdInput: string | undefined) {
    const ticketId = String(ticketIdInput || '').trim();
    if (!ticketId) {
      return { success: false, error: 'ticketId is required' };
    }

    const currentUserId = String(currentUserIdInput || '').trim();
    if (!currentUserId) {
      return { success: false, error: 'Admin authorization required' };
    }

    const user = await this.repository.getDeleteAuthUserById(currentUserId);
    if (!user) {
      return { success: false, error: 'Admin authorization required' };
    }

    const isAdmin = String(user.isAdmin || '0') === '1';
    const employeeType = Number(user.employeeType || 0);
    if (!isAdmin && employeeType === 0) {
      return { success: false, error: 'Admin authorization required' };
    }

    const deletedRows = await this.repository.hardDeleteTicket(ticketId);
    return { success: true, ticketId, deletedRows };
  }

  async syncTransactions(transactionsInput: Array<Record<string, unknown>> | undefined) {
    const transactions = Array.isArray(transactionsInput) ? transactionsInput : [];

    const mapped = transactions
      .map((tx) => ({
        id: this.truncate(String(tx.id || '').trim(), 80),
        ticketId: this.truncate(String(tx.ticketId || '').trim(), 64),
        type: this.truncate(String(tx.type || '').trim(), 50),
        timestamp: this.toDbDateTime(tx.timestamp),
        actor: this.nullableTruncate(tx.actor, 255),
        detailsJson: tx.details === undefined ? null : this.encodeJsonSafe(tx.details),
      }))
      .filter((tx) => tx.id && tx.ticketId && tx.type);

    const synced = await this.repository.upsertTransactions(mapped);
    return { success: true, synced };
  }

  async syncDirectories(
    customersInput: Array<Record<string, unknown>> | undefined,
    architectsInput: Array<Record<string, unknown>> | undefined,
  ) {
    const customers = (Array.isArray(customersInput) ? customersInput : []).map((row) => ({
      id: this.truncate(String(row?.id || '').trim(), 80),
      name: this.truncate(String(row?.name || '').trim(), 255),
    }));

    const architects = (Array.isArray(architectsInput) ? architectsInput : []).map((row) => ({
      id: this.truncate(String(row?.id || '').trim(), 80),
      name: this.truncate(String(row?.name || '').trim(), 255),
    }));

    await this.repository.syncDirectories(customers, architects);
    return { success: true };
  }

  async syncBillingDefaults(customerBillingDefaultsByTypeInput: Record<string, unknown> | undefined) {
    if (!customerBillingDefaultsByTypeInput || typeof customerBillingDefaultsByTypeInput !== 'object') {
      return { success: false, error: 'customerBillingDefaultsByType must be an object' };
    }

    const customerBillingDefaultsByType: Record<string, Array<{ key: string; label: string; amount: number }>> = {
      seismic: [],
      dca: [],
    };

    for (const formType of ['seismic', 'dca']) {
      const rows = Array.isArray(customerBillingDefaultsByTypeInput[formType])
        ? (customerBillingDefaultsByTypeInput[formType] as Array<Record<string, unknown>>)
        : [];

      customerBillingDefaultsByType[formType] = rows.map((row) => ({
        key: this.truncate(String(row?.key || '').trim(), 120),
        label: this.truncate(String(row?.label || '').trim(), 255),
        amount: this.normalizeAmount(row?.amount),
      }));
    }

    await this.repository.syncBillingDefaults(customerBillingDefaultsByType);
    return { success: true };
  }

  private decodeJsonObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value !== 'string' || !value.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private decodeJsonObjectNullable(value: unknown): Record<string, unknown> | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private decodeJsonArray(value: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(value)) {
      return value as Array<Record<string, unknown>>;
    }

    if (typeof value !== 'string' || !value.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
    } catch {
      return [];
    }
  }

  private encodeJsonSafe(value: unknown): string {
    const encoded = JSON.stringify(value ?? {});
    if (encoded === undefined) {
      throw new Error('Unable to encode JSON payload');
    }
    return encoded;
  }

  private toDbDateTime(input: unknown): string {
    if (!input) {
      return this.formatDateTime(new Date());
    }

    const date = new Date(String(input));
    if (Number.isNaN(date.getTime())) {
      return this.formatDateTime(new Date());
    }

    return this.formatDateTime(date);
  }

  private nullableDbDateTime(input: unknown): string | null {
    if (!input) {
      return null;
    }

    const date = new Date(String(input));
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return this.formatDateTime(date);
  }

  private toIso(value: unknown): string {
    const date = new Date(String(value || ''));
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString();
    }

    return date.toISOString();
  }

  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  private truncate(value: string, max: number): string {
    return value.length > max ? value.slice(0, max) : value;
  }

  private nullableTruncate(value: unknown, max: number): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return this.truncate(String(value), max);
  }

  private normalizeAmount(value: unknown): number {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n < 0) {
      return 0;
    }

    return Number(n.toFixed(2));
  }
}
