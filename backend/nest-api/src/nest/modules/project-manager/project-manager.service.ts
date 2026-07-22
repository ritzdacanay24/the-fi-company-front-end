import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectManagerRepository } from './project-manager.repository';
import { toMysqlDate, toMysqlDatetime } from '@/shared/utils/date.util';
import { PmActivityLogService } from '../pm-activity-log/pm-activity-log.service';

export interface UpsertProjectDto {
  id: string;
  productName: string;
  customer: string;
  projectCategory: string;
  strategyType: string;
  roughRevenuePotential?: string;
  estimatedRevenue?: string;
  initialRfpDate?: string;
  targetProductionDate?: string;
  readinessScore: number;
  readinessStatus: string;
  activeGate: number;
  isDraft: boolean;
  owner: string;
  gateCompletion: {
    gate1: number;
    gate2: number;
    gate3: number;
    gate4: number;
    gate5: number;
    gate6: number;
  };
  gateCompletedAt: {
    gate1: string | null;
    gate2: string | null;
    gate3: string | null;
    gate4: string | null;
    gate5: string | null;
    gate6: string | null;
  };
}

export interface UpsertIntakeDto {
  formValue: Record<string, unknown>;
  activeInputSystem: string;
  activeGate: number;
  gateCompletedAt: Record<string, string | null>;
}

export interface UpsertCustomerOptionsDto {
  customers: string[];
}

export interface UpsertVolumeEstimateOptionsDto {
  options: Array<{ key: 'Low' | 'Medium' | 'High'; label: string }>;
}

export interface CreateGateCommentDto {
  commentText: string;
  createdBy?: string;
}

@Injectable()
export class ProjectManagerService {
  constructor(
    private readonly repository: ProjectManagerRepository,
    private readonly activityLog: PmActivityLogService,
  ) {}

  async getAll() {
    const rows = await this.repository.find();

    for (const row of rows) {
      const intake = await this.repository.getIntake(row.id);
      const intakeActiveGate = this.normalizeActiveGateNumber(intake?.active_gate);
      const intakeFormValue = this.parseFormValue(intake?.form_value || null);
      const intakeProductName = this.extractProductNameFromFormObject(intakeFormValue);
      const intakeCustomer = this.extractCustomerFromFormObject(intakeFormValue);

      const shouldSyncName = String(row.product_name || '').trim() === 'Draft Project' && !!intakeProductName;
      const shouldSyncCustomer = String(row.customer || '').trim() === 'TBD' && !!intakeCustomer;
      const shouldSyncGate = !!intakeActiveGate && Number(row.active_gate || 1) !== intakeActiveGate;
      if (!shouldSyncName && !shouldSyncCustomer && !shouldSyncGate) {
        continue;
      }

      const nextProductName = shouldSyncName && intakeProductName ? intakeProductName : String(row.product_name || '').trim();
      const nextCustomer = shouldSyncCustomer && intakeCustomer ? intakeCustomer : String(row.customer || '').trim();
      const nextActiveGate = shouldSyncGate && intakeActiveGate ? intakeActiveGate : Number(row.active_gate || 1);

      if (!nextProductName || !nextCustomer) {
        continue;
      }

      if (
        nextProductName === String(row.product_name || '').trim() &&
        nextCustomer === String(row.customer || '').trim() &&
        nextActiveGate === Number(row.active_gate || 1)
      ) {
        continue;
      }

      row.product_name = nextProductName;
      row.customer = nextCustomer;
      row.active_gate = nextActiveGate;
      await this.repository.updateProjectIdentityAndGate(row.id, nextProductName, nextCustomer, nextActiveGate);
    }

    return rows.map(row => this.toApiShape(row));
  }

  async upsert(dto: UpsertProjectDto, userId?: number, userName?: string) {
    if (!dto.id || !dto.productName) {
      throw new BadRequestException('id and productName are required');
    }

    const existing = await this.repository.findOne({ id: dto.id });
    const isNew = !existing;

    await this.repository.upsertProject({
      id: dto.id,
      product_name: dto.productName,
      customer: dto.customer,
      project_category: dto.projectCategory,
      strategy_type: dto.strategyType,
      rough_revenue_potential: dto.roughRevenuePotential || '',
      estimated_revenue: dto.estimatedRevenue || '',
      initial_rfp_date: toMysqlDate(dto.initialRfpDate),
      target_production_date: toMysqlDate(dto.targetProductionDate),
      readiness_score: dto.readinessScore,
      readiness_status: dto.readinessStatus,
      active_gate: dto.activeGate,
      is_draft: dto.isDraft ? 1 : 0,
      owner: dto.owner,
      gate1_completion: dto.gateCompletion.gate1,
      gate2_completion: dto.gateCompletion.gate2,
      gate3_completion: dto.gateCompletion.gate3,
      gate4_completion: dto.gateCompletion.gate4,
      gate5_completion: dto.gateCompletion.gate5,
      gate6_completion: dto.gateCompletion.gate6,
      gate1_completed_at: toMysqlDatetime(dto.gateCompletedAt.gate1),
      gate2_completed_at: toMysqlDatetime(dto.gateCompletedAt.gate2),
      gate3_completed_at: toMysqlDatetime(dto.gateCompletedAt.gate3),
      gate4_completed_at: toMysqlDatetime(dto.gateCompletedAt.gate4),
      gate5_completed_at: toMysqlDatetime(dto.gateCompletedAt.gate5),
      gate6_completed_at: toMysqlDatetime(dto.gateCompletedAt.gate6),
    });

    const row = await this.repository.findOne({ id: dto.id });
    if (!row) {
      throw new NotFoundException(`Project ${dto.id} not found after upsert`);
    }

    if (isNew) {
      void this.activityLog.log({
        projectId: dto.id,
        entityType: 'project',
        action: 'created',
        newValue: dto.productName,
        userId,
        userName,
      });
    } else {
      const before: Record<string, unknown> = {
        productName: existing?.product_name,
        customer: existing?.customer,
        projectCategory: existing?.project_category,
        strategyType: existing?.strategy_type,
      };
      const after: Record<string, unknown> = {
        productName: dto.productName,
        customer: dto.customer,
        projectCategory: dto.projectCategory,
        strategyType: dto.strategyType,
      };
      void this.activityLog.logFieldChanges({ projectId: dto.id, entityType: 'project', before, after, userId, userName });
    }

    return this.toApiShape(row);
  }

  async delete(projectId: string) {
    const row = await this.repository.findOne({ id: projectId });
    if (!row) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    await this.repository.deleteById(projectId);
    return { success: true };
  }

  async getIntake(projectId: string) {
    const row = await this.repository.getIntake(projectId);
    if (!row) {
      return null;
    }
    return {
      formValue: row.form_value ? JSON.parse(row.form_value) : null,
      activeInputSystem: row.active_input_system,
      activeGate: row.active_gate,
      gateCompletedAt: row.gate_completed_at ? JSON.parse(row.gate_completed_at) : {},
    };
  }

  async upsertIntake(projectId: string, dto: UpsertIntakeDto, userId?: number, userName?: string) {
    const project = await this.repository.findOne({ id: projectId });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const existingIntake = await this.repository.getIntake(projectId);
    const existingFormValue = this.parseFormValue(existingIntake?.form_value || null) as Record<string, unknown>;

    await this.repository.upsertIntake(
      projectId,
      JSON.stringify(dto.formValue),
      dto.activeInputSystem,
      dto.activeGate,
      JSON.stringify(dto.gateCompletedAt),
    );

    const syncedName = this.extractProductNameFromFormObject(dto.formValue);
    const syncedCustomer = this.extractCustomerFromFormObject(dto.formValue);
    const syncedGate = this.normalizeActiveGateNumber(dto.activeGate) || this.normalizeActiveGateNumber(project.active_gate) || 1;

    if (syncedName && syncedCustomer) {
      await this.repository.updateProjectIdentityAndGate(projectId, syncedName, syncedCustomer, syncedGate);
    } else if (syncedName) {
      await this.repository.updateProjectName(projectId, syncedName);
      if (syncedGate !== Number(project.active_gate || 1)) {
        await this.repository.updateProjectIdentityAndGate(
          projectId,
          String(project.product_name || '').trim() || syncedName,
          String(project.customer || '').trim(),
          syncedGate,
        );
      }
    }

    void this.activityLog.logFieldChanges({
      projectId,
      entityType: 'gate',
      entityId: dto.activeInputSystem,
      before: existingFormValue,
      after: dto.formValue as Record<string, unknown>,
      userId,
      userName,
      skipFields: ['stakeholderSignoffs'],
    });

    return { success: true };
  }

  async getCustomerOptions() {
    const rows = await this.repository.getCustomerOptions();
    return rows.map(row => String(row.customer_name || '').trim()).filter(Boolean);
  }

  async upsertCustomerOptions(dto: UpsertCustomerOptionsDto) {
    const sanitized = Array.from(new Set((dto.customers || [])
      .map(value => String(value || '').trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .map(value => value.slice(0, 120))
    ));

    if (!sanitized.length) {
      throw new BadRequestException('At least one customer is required');
    }

    await this.repository.replaceCustomerOptions(sanitized);
    return this.getCustomerOptions();
  }

  async getVolumeEstimateOptions() {
    const rows = await this.repository.getVolumeEstimateOptions();
    const normalized = rows
      .map((row) => ({
        key: String(row.option_key || '').trim() as 'Low' | 'Medium' | 'High',
        label: String(row.option_label || '').trim(),
        displayOrder: Number(row.display_order || 0),
      }))
      .filter((row) => ['Low', 'Medium', 'High'].includes(row.key) && !!row.label)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    if (!normalized.length) {
      return [
        { key: 'Low', label: 'Low > 50' },
        { key: 'Medium', label: 'Medium 50-150' },
        { key: 'High', label: 'High 150+' },
      ];
    }

    return normalized.map((item) => ({ key: item.key, label: item.label }));
  }

  async upsertVolumeEstimateOptions(dto: UpsertVolumeEstimateOptionsDto) {
    const base: Record<'Low' | 'Medium' | 'High', string> = {
      Low: 'Low > 50',
      Medium: 'Medium 50-150',
      High: 'High 150+'
    };

    for (const item of (dto.options || [])) {
      const key = item?.key;
      const label = String(item?.label || '').trim().replace(/\s+/g, ' ').slice(0, 120);
      if (!key || !['Low', 'Medium', 'High'].includes(key)) {
        continue;
      }

      if (label) {
        base[key] = label;
      }
    }

    const normalized = [
      { key: 'Low' as const, label: base.Low, displayOrder: 1 },
      { key: 'Medium' as const, label: base.Medium, displayOrder: 2 },
      { key: 'High' as const, label: base.High, displayOrder: 3 },
    ];

    if (normalized.some(item => !item.label)) {
      throw new BadRequestException('All volume estimate labels are required');
    }

    await this.repository.replaceVolumeEstimateOptions(normalized);
    return this.getVolumeEstimateOptions();
  }

  async getGateComments(projectId: string, gateNumber: number) {
    this.validateGateNumber(gateNumber);

    const rows = await this.repository.getGateComments(projectId, gateNumber);
    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      gateNumber: row.gate_number,
      commentText: String(row.comment_text || ''),
      createdBy: String(row.created_by || ''),
      createdById: Number(row.created_by_id || 0),
      createdAt: row.created_at,
    }));
  }

  async createGateComment(projectId: string, gateNumber: number, dto: CreateGateCommentDto, currentUserId: number) {
    this.validateGateNumber(gateNumber);

    const project = await this.repository.findOne({ id: projectId });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    if (!currentUserId || Number.isNaN(currentUserId)) {
      throw new BadRequestException('Authenticated user context is required');
    }

    const commentText = String(dto?.commentText || '').trim().replace(/\s+/g, ' ').slice(0, 2000);
    if (!commentText) {
      throw new BadRequestException('commentText is required');
    }

    const createdBy = String(dto?.createdBy || '').trim().slice(0, 120) || 'Unknown';
    const created = await this.repository.addGateComment(projectId, gateNumber, commentText, createdBy, currentUserId);

    return {
      id: created.id,
      projectId: created.project_id,
      gateNumber: created.gate_number,
      commentText: String(created.comment_text || ''),
      createdBy: String(created.created_by || ''),
      createdById: Number(created.created_by_id || 0),
      createdAt: created.created_at,
    };
  }

  async deleteGateComment(projectId: string, gateNumber: number, commentId: number, currentUserId: number) {
    this.validateGateNumber(gateNumber);

    if (!Number.isInteger(commentId) || commentId <= 0) {
      throw new BadRequestException('commentId must be a positive integer');
    }

    if (!currentUserId || Number.isNaN(currentUserId)) {
      throw new BadRequestException('Authenticated user context is required');
    }

    const comment = await this.repository.getGateCommentById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.project_id !== projectId || Number(comment.gate_number) !== gateNumber) {
      throw new NotFoundException('Comment not found for this project gate');
    }

    if (Number(comment.created_by_id || 0) !== Number(currentUserId)) {
      throw new ForbiddenException('You can only delete your own comment');
    }

    await this.repository.deleteGateCommentById(commentId);
    return { success: true, id: commentId };
  }

  private validateGateNumber(gateNumber: number): void {
    if (!Number.isInteger(gateNumber) || gateNumber < 1 || gateNumber > 6) {
      throw new BadRequestException('gate must be an integer from 1 to 6');
    }
  }

  private extractProductNameFromFormObject(formValue: Record<string, unknown> | null | undefined): string {
    const normalized = String(formValue?.['productName'] || '').trim();
    return normalized.slice(0, 255);
  }

  private extractProductNameFromFormValue(formValue: string | null): string {
    return this.extractProductNameFromFormObject(this.parseFormValue(formValue));
  }

  private extractCustomerFromFormObject(formValue: Record<string, unknown> | null | undefined): string {
    const normalized = String(formValue?.['customer'] || '').trim();
    return normalized.slice(0, 255);
  }

  private parseFormValue(formValue: string | null): Record<string, unknown> | null {
    if (!formValue) {
      return null;
    }

    try {
      return JSON.parse(formValue) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private normalizeActiveGateNumber(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 6) {
      return null;
    }

    return parsed;
  }

  private toApiShape(row: any) {
    return {
      id: row.id,
      productName: row.product_name,
      customer: row.customer,
      projectCategory: row.project_category,
      strategyType: row.strategy_type,
      roughRevenuePotential: row.rough_revenue_potential,
      estimatedRevenue: row.estimated_revenue,
      initialRfpDate: row.initial_rfp_date,
      targetProductionDate: row.target_production_date,
      readinessScore: row.readiness_score,
      readinessStatus: row.readiness_status,
      activeGate: row.active_gate,
      isDraft: !!row.is_draft,
      owner: row.owner,
      gateCompletion: {
        gate1: row.gate1_completion,
        gate2: row.gate2_completion,
        gate3: row.gate3_completion,
        gate4: row.gate4_completion,
        gate5: row.gate5_completion,
        gate6: row.gate6_completion,
      },
      gateCompletedAt: {
        gate1: row.gate1_completed_at,
        gate2: row.gate2_completed_at,
        gate3: row.gate3_completed_at,
        gate4: row.gate4_completed_at,
        gate5: row.gate5_completed_at,
        gate6: row.gate6_completed_at,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
