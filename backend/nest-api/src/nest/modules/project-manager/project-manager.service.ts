import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectManagerRepository } from './project-manager.repository';

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

@Injectable()
export class ProjectManagerService {
  constructor(private readonly repository: ProjectManagerRepository) {}

  async getAll() {
    const rows = await this.repository.find();
    return rows.map(row => this.toApiShape(row));
  }

  async upsert(dto: UpsertProjectDto) {
    if (!dto.id || !dto.productName) {
      throw new BadRequestException('id and productName are required');
    }

    await this.repository.upsertProject({
      id: dto.id,
      product_name: dto.productName,
      customer: dto.customer,
      project_category: dto.projectCategory,
      strategy_type: dto.strategyType,
      rough_revenue_potential: dto.roughRevenuePotential || '',
      estimated_revenue: dto.estimatedRevenue || '',
      initial_rfp_date: dto.initialRfpDate || null,
      target_production_date: dto.targetProductionDate || null,
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
      gate1_completed_at: dto.gateCompletedAt.gate1 || null,
      gate2_completed_at: dto.gateCompletedAt.gate2 || null,
      gate3_completed_at: dto.gateCompletedAt.gate3 || null,
      gate4_completed_at: dto.gateCompletedAt.gate4 || null,
      gate5_completed_at: dto.gateCompletedAt.gate5 || null,
      gate6_completed_at: dto.gateCompletedAt.gate6 || null,
    });

    const row = await this.repository.findOne({ id: dto.id });
    if (!row) {
      throw new NotFoundException(`Project ${dto.id} not found after upsert`);
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

  async upsertIntake(projectId: string, dto: UpsertIntakeDto) {
    const project = await this.repository.findOne({ id: projectId });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    await this.repository.upsertIntake(
      projectId,
      JSON.stringify(dto.formValue),
      dto.activeInputSystem,
      dto.activeGate,
      JSON.stringify(dto.gateCompletedAt),
    );

    return { success: true };
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
