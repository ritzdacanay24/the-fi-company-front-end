import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { GraphicsScheduleRepository } from './graphics-schedule.repository';

@Injectable()
export class GraphicsScheduleService {
  constructor(private readonly repository: GraphicsScheduleRepository) {}

  async getList(): Promise<RowDataPacket[]> {
    return this.repository.getList();
  }

  async getById(id: number): Promise<RowDataPacket> {
    const row = await this.repository.getById(id);
    if (!row) {
      throw new NotFoundException({
        code: 'RC_GRAPHICS_SCHEDULE_NOT_FOUND',
        message: `Graphics schedule with id ${id} not found`,
      });
    }
    return row;
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }
}
