import { Injectable } from '@nestjs/common';
import { SerialAssignmentsRepository } from './serial-assignments.repository';
import { SgAssetService } from '../sg-asset/sg-asset.service';
import { AgsSerialService } from '../ags-serial/ags-serial.service';
import {
  AssignmentsFilterDto,
  VoidAssignmentDto,
  DeleteAssignmentDto,
  RestoreAssignmentDto,
  BulkVoidDto,
  ReassignAssignmentDto,
} from './dto';

@Injectable()
export class SerialAssignmentsService {
  constructor(
    private readonly repository: SerialAssignmentsRepository,
    private readonly sgAssetService: SgAssetService,
    private readonly agsSerialService: AgsSerialService,
  ) {}

  async getAssignments(filters: AssignmentsFilterDto) {
    const result = await this.repository.findAll(filters);
    return { success: true, ...result, count: result.data.length };
  }

  async bulkCreateOther(assignments: Array<Record<string, unknown>>, performedBy: string) {
    const result = await this.repository.bulkCreateOther(assignments, performedBy);
    return {
      success: true,
      message: `Created ${result.count} serial assignment${result.count === 1 ? '' : 's'}`,
      ...result,
    };
  }

  async bulkCreateWorkflowByCustomer(
    customerType: string,
    assignments: Array<Record<string, unknown>>,
    performedBy: string,
  ) {
    const normalized = String(customerType || '').trim().toLowerCase();

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return { success: false, message: 'assignments array is required', count: 0, data: [] };
    }

    if (normalized === 'sg') {
      return this.sgAssetService.bulkCreate({ assignments, user_full_name: performedBy || 'System' });
    }

    if (normalized === 'ags') {
      return this.agsSerialService.bulkCreate({ assignments, user_full_name: performedBy || 'System' });
    }

    if (normalized === 'igt') {
      const raw = await this.repository.bulkCreateIgtWorkflow(assignments, performedBy || 'System');
      return {
        success: true,
        message: 'Bulk IGT assignments processed',
        count: raw.count,
        data: raw.data,
        missingIgt: raw.missingIgt,
        raw,
      };
    }

    if (normalized === 'other') {
      return this.bulkCreateOther(assignments, performedBy || 'System');
    }

    return {
      success: false,
      message: `Unsupported customer_type '${customerType}'. Expected sg | ags | igt | other`,
      count: 0,
      data: [],
    };
  }

  async getAssignmentById(id: number) {
    const data = await this.repository.findById(id);
    if (!data) return { success: false, error: 'Assignment not found' };
    return { success: true, data };
  }

  async getAssignmentsByUlNumber(ulNumber: string) {
    const data = await this.repository.findByUlNumber(ulNumber);
    return { success: true, data, count: data.length };
  }

  async getAssignmentsByIgtSerialNumber(igtSerialNumber: string) {
    const data = await this.repository.findByIgtSerialNumber(igtSerialNumber);
    return { success: true, data, count: data.length };
  }

  async getStatistics() {
    const data = await this.repository.getStatistics();
    return { success: true, data };
  }

  async getAuditTrail(assignmentId?: number, limit = 100) {
    const data = await this.repository.getAuditTrail(assignmentId, limit);
    return { success: true, data, count: data.length };
  }

  async voidAssignment(id: number, dto: VoidAssignmentDto) {
    const result = await this.repository.voidOne(id, dto.reason, dto.performed_by);
    return {
      success: true,
      message: 'Assignment voided and serials freed for reuse',
      assignment_id: id,
      ...result,
    };
  }

  async deleteAssignment(id: number, dto: DeleteAssignmentDto) {
    throw new Error('Hard delete is disabled. Use void assignment instead.');
  }

  async restoreAssignment(id: number, dto: RestoreAssignmentDto) {
    await this.repository.restoreOne(id, dto.performed_by);
    return { success: true, message: 'Assignment restored and serial marked as consumed', assignment_id: id };
  }

  async reassignAssignment(id: number, dto: ReassignAssignmentDto) {
    const result = await this.repository.reassignOne(id, dto.new_wo_number, dto.reason, dto.performed_by, {
      wo_description: dto.wo_description,
      wo_part: dto.wo_part,
      wo_qty_ord: dto.wo_qty_ord,
      wo_due_date: dto.wo_due_date,
      wo_routing: dto.wo_routing,
      wo_line: dto.wo_line,
      cp_cust_part: dto.cp_cust_part,
      cp_cust: dto.cp_cust,
    });
    return {
      success: true,
      message: `Assignment reassigned to WO ${result.new_wo_number}`,
      assignment_id: id,
      ...result,
    };
  }

  async bulkVoid(dto: BulkVoidDto) {
    const result = await this.repository.bulkVoid(dto.ids, dto.reason, dto.performed_by);
    return { success: true, ...result };
  }

  async getDailyConsumptionTrend() {
    const data = await this.repository.getDailyConsumptionTrend();
    return { success: true, data };
  }

  async getUserConsumptionActivity() {
    const data = await this.repository.getUserConsumptionActivity();
    return { success: true, data };
  }

  async getWorkOrderSerials(workOrder?: string) {
    const data = await this.repository.getWorkOrderSerials(workOrder);
    return { success: true, data, count: data.length };
  }
}
