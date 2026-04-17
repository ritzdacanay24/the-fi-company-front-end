import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MysqlService } from '@/shared/database/mysql.service';
import { MaterialRequestRepository } from './material-request.repository';

type MaterialRequestPayload = {
  main?: Record<string, unknown>;
  details?: Array<Record<string, unknown>>;
  createdDate?: string;
  id?: number;
};

@Injectable()
export class MaterialRequestService {
  constructor(
    private readonly repository: MaterialRequestRepository,
    private readonly mysqlService: MysqlService,
  ) {}

  async getList(query: {
    selectedViewType?: string;
    dateFrom?: string;
    dateTo?: string;
    isAll?: string | boolean;
  }) {
    return this.repository.getList({
      selectedViewType: query.selectedViewType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      isAll: String(query.isAll) === 'true',
    });
  }

  async find(filters: Record<string, unknown>) {
    return this.repository.find(filters);
  }

  async getAll() {
    return this.repository.getAll();
  }

  async getById(id: number) {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_MRF_NOT_FOUND',
        message: `Material request with id ${id} not found`,
      });
    }
    return row;
  }

  async getHeader(id: number) {
    return this.getById(id);
  }

  async create(payload: MaterialRequestPayload, userId?: number) {
    const main = payload.main || payload;
    const details = Array.isArray(payload.details) ? payload.details : [];
    const createdDate = payload.createdDate || new Date().toISOString().slice(0, 19).replace('T', ' ');

    return this.mysqlService.withTransaction(async (connection) => {
      const headerPayload: Record<string, unknown> = {
        ...main,
        createdDate,
      };

      const insertId = await this.repository.createHeader(headerPayload);

      for (const row of details) {
        await connection.execute(
          `INSERT INTO mrf_det (
            mrf_id, partNumber, qty, createdDate, createdBy, reasonCode, qtyPicked,
            notes, availableQty, message, description, validationStatus
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            insertId,
            String(row.partNumber || ''),
            Number(row.qty || 0),
            createdDate,
            Number(row.createdBy || userId || 0),
            String(row.reasonCode || ''),
            Number(row.qtyPicked || 0),
            String(row.notes || ''),
            row.availableQty == null ? null : Number(row.availableQty),
            row.message == null ? null : String(row.message),
            row.description == null ? null : String(row.description),
            String(row.validationStatus || 'pending'),
          ],
        );
      }

      return { insertId };
    });
  }

  async updateById(id: number, payload: MaterialRequestPayload) {
    await this.getById(id);

    const main = payload.main || payload;
    const details = Array.isArray(payload.details) ? payload.details : [];

    return this.mysqlService.withTransaction(async (connection) => {
      const rowCount = await this.repository.updateHeader(id, {
        ...main,
        modifiedDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      for (const row of details) {
        if (row.id) {
          await connection.execute(
            `UPDATE mrf_det SET
              partNumber = ?, qty = ?, qtyPicked = ?, reasonCode = ?,
              notes = ?, availableQty = ?, message = ?, description = ?, modifiedDate = NOW()
            WHERE id = ?`,
            [
              String(row.partNumber || ''),
              Number(row.qty || 0),
              Number(row.qtyPicked || 0),
              String(row.reasonCode || ''),
              String(row.notes || ''),
              row.availableQty == null ? null : Number(row.availableQty),
              row.message == null ? null : String(row.message),
              row.description == null ? null : String(row.description),
              Number(row.id),
            ],
          );
        } else {
          await connection.execute(
            `INSERT INTO mrf_det (
              mrf_id, partNumber, qty, createdDate, createdBy, reasonCode, qtyPicked,
              notes, availableQty, message, description, validationStatus
            ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [
              id,
              String(row.partNumber || ''),
              Number(row.qty || 0),
              Number(row.createdBy || 0),
              String(row.reasonCode || ''),
              Number(row.qtyPicked || 0),
              String(row.notes || ''),
              row.availableQty == null ? null : Number(row.availableQty),
              row.message == null ? null : String(row.message),
              row.description == null ? null : String(row.description),
              String(row.validationStatus || 'pending'),
            ],
          );
        }
      }

      return { rowCount };
    });
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }

  async getValidation() {
    return this.repository.getValidation();
  }

  async getPicking() {
    return this.repository.getPicking();
  }

  async sendBackToValidation(id: number) {
    const mrf = await this.getById(id);
    if (!mrf.active) {
      throw new BadRequestException({ code: 'RC_MRF_NOT_ACTIVE', message: 'Material request is not active' });
    }
    if (mrf.pickedCompletedDate) {
      throw new BadRequestException({
        code: 'RC_MRF_ALREADY_COMPLETED',
        message: 'Material request already completed and cannot be sent back to validation',
      });
    }

    const rowCount = await this.repository.sendBackToValidation(id);
    return { rowCount };
  }

  async onPrint(details: Array<Record<string, unknown>>) {
    const rowCount = await this.repository.applyPrint(details);
    return { rowCount };
  }

  async clearPrint(details: Array<Record<string, unknown>>) {
    const rowCount = await this.repository.clearPrint(details);
    return { rowCount };
  }

  async completePicking(payload: {
    id: number;
    data: Array<Record<string, unknown>>;
    pickedCompletedDate: string;
  }) {
    const rowCount = await this.repository.completePicking(
      Number(payload.id),
      Array.isArray(payload.data) ? payload.data : [],
      payload.pickedCompletedDate,
    );
    return { rowCount };
  }

  async getAllWithStatus() {
    const data = await this.repository.getAllWithStatus();
    return {
      success: true,
      data,
      total: data.length,
      message: 'Material requests retrieved successfully',
    };
  }

  async updateStatus(id: number, status: string, updatedBy?: number) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_MRF_NOT_FOUND',
        message: `Material request with id ${id} not found`,
      });
    }

    const data = await this.repository.updateStatus(id, status, updatedBy);
    return {
      success: true,
      data,
      message: 'Status updated successfully',
    };
  }

  async deleteLineItem(id: number) {
    const rowCount = await this.repository.deleteLineItem(id);
    return { rowCount };
  }
}
