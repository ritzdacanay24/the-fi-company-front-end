import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EyeFiSerialRepository } from './eyefi-serial.repository';
import { UpdateEyeFiSerialStatusDto } from './dto/update-eyefi-serial-status.dto';
import { BulkCreateEyeFiSerialDto } from './dto/bulk-create-eyefi-serial.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class EyeFiSerialService {
  constructor(private readonly eyeFiSerialRepository: EyeFiSerialRepository) {}

  async search(params: {
    search?: string;
    status?: string;
    product_model?: string;
    batch_number?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
    order?: string;
    limit?: number;
    offset?: number;
  }) {
    const results = await this.eyeFiSerialRepository.search(params);
    return {
      success: true,
      data: results,
      count: results.length,
    };
  }

  async getBySerialNumber(serialNumber: string) {
    const record = await this.eyeFiSerialRepository.getBySerialNumber(serialNumber);
    if (!record) {
      throw new NotFoundException({
        code: 'RC_EYEFI_SERIAL_NOT_FOUND',
        message: `EyeFi serial '${serialNumber}' not found`,
      });
    }
    return record;
  }

  async getById(id: number) {
    const record = await this.eyeFiSerialRepository.getById(id);
    if (!record) {
      throw new NotFoundException({
        code: 'RC_EYEFI_SERIAL_NOT_FOUND',
        message: `EyeFi serial with id ${id} not found`,
      });
    }
    return record;
  }

  async updateStatus(serialNumber: string, dto: UpdateEyeFiSerialStatusDto) {
    const existing = await this.eyeFiSerialRepository.getBySerialNumber(serialNumber);
    if (!existing) {
      throw new NotFoundException({
        code: 'RC_EYEFI_SERIAL_NOT_FOUND',
        message: `EyeFi serial '${serialNumber}' not found`,
      });
    }

    const affected = await this.eyeFiSerialRepository.updateStatus(
      serialNumber,
      dto.status,
      dto.reason,
    );

    if (affected === 0) {
      throw new BadRequestException({
        code: 'RC_EYEFI_SERIAL_UPDATE_FAILED',
        message: 'Status update had no effect',
      });
    }

    return { success: true, serial_number: serialNumber, status: dto.status };
  }

  async getStatistics() {
    return this.eyeFiSerialRepository.getStatistics();
  }

  async bulkCreate(dto: BulkCreateEyeFiSerialDto) {
    const result = await this.eyeFiSerialRepository.bulkCreate(dto.serialNumbers);
    return {
      success: true,
      message: `Created ${result.inserted} serial numbers (${result.duplicates} duplicates skipped)`,
      ...result,
    };
  }

  async getProductModels() {
    const models = await this.eyeFiSerialRepository.getProductModels();
    return { success: true, data: models };
  }

  async exportCsv(serialNumbers?: string[]): Promise<string> {
    const records = await this.eyeFiSerialRepository.getExportData(serialNumbers);
    const header = 'Serial Number,Product Model,Status,Hardware Version,Firmware Version,Manufacture Date,Batch Number,Notes,Created At\n';
    const rows = records
      .map(
        (r) =>
          `"${r.serial_number}","${r.product_model}","${r.status}","${r.hardware_version ?? ''}","${r.firmware_version ?? ''}","${r.manufacture_date ?? ''}","${r.batch_number ?? ''}","${r.notes ?? ''}","${r.created_at ?? ''}"`,
      )
      .join('\n');
    return header + rows;
  }

  async createAssignment(dto: CreateAssignmentDto) {
    const serial = await this.eyeFiSerialRepository.getBySerialNumber(dto.serial_number);
    if (!serial) {
      throw new NotFoundException({ code: 'RC_EYEFI_SERIAL_NOT_FOUND', message: `Serial '${dto.serial_number}' not found` });
    }
    const id = await this.eyeFiSerialRepository.createAssignment(dto);
    return { success: true, id };
  }

  async getAssignments(filters: { serial_number?: string; customer_name?: string; work_order_number?: string; limit?: number }) {
    const data = await this.eyeFiSerialRepository.getAssignments(filters);
    return { success: true, data, count: data.length };
  }

  async getAssignmentById(id: number) {
    const record = await this.eyeFiSerialRepository.getAssignmentById(id);
    if (!record) {
      throw new NotFoundException({ code: 'RC_ASSIGNMENT_NOT_FOUND', message: `Assignment ${id} not found` });
    }
    return record;
  }

  async updateAssignment(id: number, dto: UpdateAssignmentDto) {
    await this.getAssignmentById(id); // throws 404 if not found
    const affected = await this.eyeFiSerialRepository.updateAssignment(id, dto);
    if (affected === 0) {
      throw new BadRequestException({ code: 'RC_ASSIGNMENT_UPDATE_FAILED', message: 'Update had no effect' });
    }
    return { success: true, id };
  }
}
