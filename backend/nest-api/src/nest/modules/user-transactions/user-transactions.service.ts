import { Inject, Injectable } from '@nestjs/common';
import { PoolConnection } from 'mysql2/promise';
import { UserTransactionsRepository } from './user-transactions.repository';

type GenericRow = Record<string, unknown>;

@Injectable()
export class UserTransactionsService {
  constructor(
    @Inject(UserTransactionsRepository) private readonly repository: UserTransactionsRepository,
  ) {}

  /**
   * Insert user transaction records (audit trail)
   */
  async insertTransactions(
    rows: Array<Record<string, unknown>>,
    connection: PoolConnection,
  ): Promise<void> {
    return this.repository.insertTransactions(rows, connection);
  }

  /**
   * Get transaction records for a given SO and optional field filter
   */
  async getByField(so: string, field?: string): Promise<GenericRow[]> {
    return this.repository.getByField(so, field);
  }

  /**
   * Get transaction counts for today by SO
   */
  async getChangesToday(type: string, excludeField?: string): Promise<GenericRow[]> {
    return this.repository.getChangesToday(type, excludeField);
  }

  /**
   * Get transaction count for a specific field change
   */
  async getChangeCount(so: string, field: string): Promise<number> {
    return this.repository.getChangeCount(so, field);
  }

  /**
   * Build transaction records for field changes
   */
  buildTransactionRows(
    oldRow: GenericRow,
    newRow: GenericRow,
    so: string,
    userId: number,
    type: string = 'Sales Order',
  ): Array<Record<string, unknown>> {
    const tracked: Array<{ key: string; label: string }> = [
      { key: 'userName', label: 'Updated Owner' },
      { key: 'fs_install', label: 'Updated FS Install' },
      { key: 'fs_install_date', label: 'Updated FS Install Date' },
      { key: 'arrivalDate', label: 'Updated Arrival Date' },
      { key: 'shipViaAccount', label: 'Updated Ship Via Account' },
      { key: 'source_inspection_required', label: 'Updated Source Inspection' },
      { key: 'source_inspection_completed', label: 'Updated Source Inspection Completed' },
      { key: 'source_inspection_waived', label: 'Updated Source Inspection Waived' },
      { key: 'pallet_count', label: 'Pallet count changed' },
      { key: 'recoveryDate', label: 'Recovery date changed' },
      { key: 'lateReasonCode', label: 'Late Reason Code changed' },
      { key: 'supplyReview', label: 'Supply Review changed' },
      { key: 'lateReasonCodePerfDate', label: 'Late Reason Code Perf date changed' },
      { key: 'clear_to_build_status', label: 'Clear To Build Status changed' },
    ];

    return tracked
      .filter(({ key }) => Object.prototype.hasOwnProperty.call(newRow, key))
      .filter(({ key }) => String(oldRow[key] ?? '') !== String(newRow[key] ?? ''))
      .map(({ key, label }) => ({
        field: label,
        o: String(oldRow[key] ?? ''),
        n: String(newRow[key] ?? ''),
        so,
        type,
        userId,
        comment: '',
        partNumber: '',
      }));
  }

  /**
   * Record new record transaction
   */
  buildNewRecordTransaction(
    so: string,
    userId: number,
    type: string = 'Sales Order',
  ): Record<string, unknown> {
    return {
      field: 'New Sales Order Usr Input',
      o: '',
      n: 1,
      so,
      type,
      userId,
      comment: '',
      partNumber: '',
    };
  }
}
