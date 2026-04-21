import { Inject, Injectable } from '@nestjs/common';
import { PoolConnection } from 'mysql2/promise';
import { WorkOrderOwnerRepository } from './work-order-owner.repository';
import { UserTransactionsService } from '../user-transactions/user-transactions.service';

type GenericRow = Record<string, unknown>;

@Injectable()
export class WorkOrderOwnerService {
  constructor(
    @Inject(WorkOrderOwnerRepository) private readonly repository: WorkOrderOwnerRepository,
    @Inject(UserTransactionsService) private readonly userTransactionsService: UserTransactionsService,
  ) {}

  /**
   * Get workOrderOwner record by SO
   */
  async getBySo(so: string, connection: PoolConnection): Promise<GenericRow | null> {
    return this.repository.getBySo(so, connection);
  }

  /**
   * Get multiple workOrderOwner records by SO array
   */
  async getBySoArray(ids: string[]): Promise<GenericRow[]> {
    return this.repository.getBySoArray(ids);
  }

  /**
   * Update workOrderOwner with audit trail
   */
  async updateWithAudit(
    oldRow: GenericRow,
    payload: Record<string, unknown>,
    userId: number,
    connection: PoolConnection,
  ): Promise<void> {
    const fields = this.extractFields(payload);
    fields.lastModDate = this.nowDateTime();
    fields.lastModUser = userId;

    await this.repository.updateBySo(String(payload.so || ''), fields, connection);

    const transactions = this.userTransactionsService.buildTransactionRows(
      oldRow,
      fields,
      String(payload.so || ''),
      userId,
      'Sales Order Shipping',
    );
    if (transactions.length) {
      await this.userTransactionsService.insertTransactions(transactions, connection);
    }
  }

  /**
   * Create new workOrderOwner with audit trail
   */
  async createWithAudit(
    payload: Record<string, unknown>,
    userId: number,
    connection: PoolConnection,
  ): Promise<void> {
    const fields = this.extractFields(payload);
    const now = this.nowDateTime();

    const row: GenericRow = {
      ...fields,
      so: String(payload.so || ''),
      createdDate: now,
      createdBy: userId,
    };

    await this.repository.createWithConnection(row, connection);

    const transactions: Array<Record<string, unknown>> = [
      this.userTransactionsService.buildNewRecordTransaction(
        String(payload.so || ''),
        userId,
        'Sales Order Shipping',
      ),
    ];

    if (fields.userName) {
      transactions.push({
        field: 'Updated Owner',
        o: '',
        n: fields.userName,
        so: String(payload.so || ''),
        type: 'Sales Order Shipping',
        userId,
        comment: '',
        partNumber: '',
      });
    }

    await this.userTransactionsService.insertTransactions(transactions, connection);
  }

  /**
   * Extract valid workOrderOwner fields from payload
   */
  private extractFields(payload: Record<string, unknown>): GenericRow {
    const keys = [
      'userName',
      'fs_install',
      'fs_install_date',
      'arrivalDate',
      'shipViaAccount',
      'source_inspection_required',
      'source_inspection_completed',
      'source_inspection_waived',
      'pallet_count',
      'container',
      'container_due_date',
      'tj_po_number',
      'tj_due_date',
      'last_mod_info',
      'g2e_comments',
      'shortages_review',
      'recoveryDate',
      'lateReasonCode',
      'supplyReview',
      'lateReasonCodePerfDate',
      'shipping_db_status',
      'clear_to_build_status',
      'hot_order',
      'lateReasonCodeComment',
    ];

    const result: GenericRow = {};
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        result[key] = payload[key] ?? null;
      }
    }
    return result;
  }

  private nowDateTime(): string {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
}
