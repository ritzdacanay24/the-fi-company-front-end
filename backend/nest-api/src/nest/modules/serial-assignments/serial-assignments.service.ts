import { Injectable } from '@nestjs/common';
import { SerialAssignmentsRepository } from './serial-assignments.repository';
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
  constructor(private readonly repository: SerialAssignmentsRepository) {}

  async getAssignments(filters: AssignmentsFilterDto) {
    const result = await this.repository.findAll(filters);
    return { success: true, ...result, count: result.data.length };
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
    const result = await this.repository.reassignOne(id, dto.new_wo_number, dto.reason, dto.performed_by);
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
