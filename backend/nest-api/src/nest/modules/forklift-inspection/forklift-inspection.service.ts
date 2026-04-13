import { Injectable, NotFoundException } from '@nestjs/common';
import { ForkliftInspectionRepository } from './forklift-inspection.repository';

interface ForkliftChecklistDetailGroup {
  name: string;
  details: Array<{ name: string; status: number | string }>;
}

@Injectable()
export class ForkliftInspectionService {
  constructor(private readonly repository: ForkliftInspectionRepository) {}

  async getList() {
    return this.repository.getList();
  }

  async getById(id: number) {
    const main = await this.repository.getHeaderById(id);
    if (!main) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_NOT_FOUND',
        message: `Forklift inspection with id ${id} not found`,
      });
    }

    const rows = await this.repository.getDetailsByChecklistId(id);
    const grouped = this.groupDetails(rows);

    return {
      main,
      details: grouped,
    };
  }

  async create(payload: Record<string, any>) {
    const insertId = await this.repository.createHeader({
      date_created: payload.date_created,
      department: payload.department,
      operator: payload.operator,
      model_number: payload.model_number,
      shift: payload.shift,
      comments: payload.comments || '',
    });

    let failedCount = 0;
    const detailGroups = Array.isArray(payload.details) ? payload.details : [];

    for (const group of detailGroups) {
      const groupName = group?.name || '';
      const details = Array.isArray(group?.details) ? group.details : [];

      for (const item of details) {
        const status = item?.status ?? '';
        if (String(status) === '0') {
          failedCount++;
        }

        await this.repository.insertDetail({
          group_name: groupName,
          checklist_name: item?.name || '',
          status,
          forklift_checklist_id: insertId,
        });
      }
    }

    return {
      insertId,
      status: 1,
      countMain: failedCount,
      message: `Successfully submitted. Your submitted id# is ${insertId}`,
    };
  }

  async updateById(id: number, payload: Record<string, any>) {
    const header = await this.repository.getHeaderById(id);
    if (!header) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_NOT_FOUND',
        message: `Forklift inspection with id ${id} not found`,
      });
    }

    await this.repository.updateHeaderById(id, payload);

    if (Array.isArray(payload.details)) {
      await this.repository.deleteDetailsByChecklistId(id);
      for (const group of payload.details) {
        const details = Array.isArray(group?.details) ? group.details : [];
        for (const item of details) {
          await this.repository.insertDetail({
            group_name: group?.name || '',
            checklist_name: item?.name || '',
            status: item?.status ?? '',
            forklift_checklist_id: id,
          });
        }
      }
    }

    return { rowCount: 1 };
  }

  async deleteById(id: number) {
    const header = await this.repository.getHeaderById(id);
    if (!header) {
      throw new NotFoundException({
        code: 'RC_FORKLIFT_INSPECTION_NOT_FOUND',
        message: `Forklift inspection with id ${id} not found`,
      });
    }

    await this.repository.deleteDetailsByChecklistId(id);
    await this.repository.deleteHeaderById(id);
    return { rowCount: 1 };
  }

  private groupDetails(rows: Array<Record<string, any>>): ForkliftChecklistDetailGroup[] {
    const map = new Map<string, ForkliftChecklistDetailGroup>();

    for (const row of rows) {
      const groupName = row.group_name || '';
      if (!map.has(groupName)) {
        map.set(groupName, { name: groupName, details: [] });
      }

      map.get(groupName)?.details.push({
        name: row.checklist_name,
        status: row.status,
      });
    }

    return Array.from(map.values());
  }
}
