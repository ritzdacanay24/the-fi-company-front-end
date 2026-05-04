import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';

export interface PmProjectRow extends RowDataPacket {
  id: string;
  product_name: string;
  customer: string;
  project_category: string;
  strategy_type: string;
  rough_revenue_potential: string;
  estimated_revenue: string;
  initial_rfp_date: string | null;
  target_production_date: string | null;
  readiness_score: number;
  readiness_status: string;
  active_gate: number;
  is_draft: number;
  owner: string;
  gate1_completion: number;
  gate2_completion: number;
  gate3_completion: number;
  gate4_completion: number;
  gate5_completion: number;
  gate6_completion: number;
  gate1_completed_at: string | null;
  gate2_completed_at: string | null;
  gate3_completed_at: string | null;
  gate4_completed_at: string | null;
  gate5_completed_at: string | null;
  gate6_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PmProjectIntakeRow extends RowDataPacket {
  id: number;
  project_id: string;
  form_value: string | null;
  active_input_system: string;
  active_gate: number;
  gate_completed_at: string | null;
  updated_at: string;
}

@Injectable()
export class ProjectManagerRepository extends BaseRepository<PmProjectRow> {
  constructor(@Inject(MysqlService) mysqlService: MysqlService) {
    super('eyefidb.pm_projects', mysqlService, 'id');
  }

  async upsertProject(row: Omit<PmProjectRow, 'created_at' | 'updated_at'>): Promise<void> {
    const sql = `
      INSERT INTO eyefidb.pm_projects (
        id, product_name, customer, project_category, strategy_type,
        rough_revenue_potential, estimated_revenue, initial_rfp_date,
        target_production_date, readiness_score, readiness_status,
        active_gate, is_draft, owner,
        gate1_completion, gate2_completion, gate3_completion,
        gate4_completion, gate5_completion, gate6_completion,
        gate1_completed_at, gate2_completed_at, gate3_completed_at,
        gate4_completed_at, gate5_completed_at, gate6_completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        product_name           = VALUES(product_name),
        customer               = VALUES(customer),
        project_category       = VALUES(project_category),
        strategy_type          = VALUES(strategy_type),
        rough_revenue_potential = VALUES(rough_revenue_potential),
        estimated_revenue      = VALUES(estimated_revenue),
        initial_rfp_date       = VALUES(initial_rfp_date),
        target_production_date = VALUES(target_production_date),
        readiness_score        = VALUES(readiness_score),
        readiness_status       = VALUES(readiness_status),
        active_gate            = VALUES(active_gate),
        is_draft               = VALUES(is_draft),
        owner                  = VALUES(owner),
        gate1_completion       = VALUES(gate1_completion),
        gate2_completion       = VALUES(gate2_completion),
        gate3_completion       = VALUES(gate3_completion),
        gate4_completion       = VALUES(gate4_completion),
        gate5_completion       = VALUES(gate5_completion),
        gate6_completion       = VALUES(gate6_completion),
        gate1_completed_at     = VALUES(gate1_completed_at),
        gate2_completed_at     = VALUES(gate2_completed_at),
        gate3_completed_at     = VALUES(gate3_completed_at),
        gate4_completed_at     = VALUES(gate4_completed_at),
        gate5_completed_at     = VALUES(gate5_completed_at),
        gate6_completed_at     = VALUES(gate6_completed_at)
    `;

    await this.rawQuery(sql, [
      row.id,
      row.product_name,
      row.customer,
      row.project_category,
      row.strategy_type,
      row.rough_revenue_potential,
      row.estimated_revenue,
      row.initial_rfp_date || null,
      row.target_production_date || null,
      row.readiness_score,
      row.readiness_status,
      row.active_gate,
      row.is_draft,
      row.owner,
      row.gate1_completion,
      row.gate2_completion,
      row.gate3_completion,
      row.gate4_completion,
      row.gate5_completion,
      row.gate6_completion,
      row.gate1_completed_at || null,
      row.gate2_completed_at || null,
      row.gate3_completed_at || null,
      row.gate4_completed_at || null,
      row.gate5_completed_at || null,
      row.gate6_completed_at || null,
    ]);
  }

  async upsertIntake(projectId: string, formValue: string, activeInputSystem: string, activeGate: number, gateCompletedAt: string): Promise<void> {
    const sql = `
      INSERT INTO eyefidb.pm_project_intake (project_id, form_value, active_input_system, active_gate, gate_completed_at)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        form_value          = VALUES(form_value),
        active_input_system = VALUES(active_input_system),
        active_gate         = VALUES(active_gate),
        gate_completed_at   = VALUES(gate_completed_at)
    `;

    await this.rawQuery(sql, [projectId, formValue, activeInputSystem, activeGate, gateCompletedAt]);
  }

  async getIntake(projectId: string): Promise<PmProjectIntakeRow | null> {
    const rows = await this.rawQuery<PmProjectIntakeRow>(
      `SELECT * FROM eyefidb.pm_project_intake WHERE project_id = ? LIMIT 1`,
      [projectId],
    );
    return rows[0] || null;
  }

  async deleteIntakeByProjectId(projectId: string): Promise<void> {
    await this.rawQuery(`DELETE FROM eyefidb.pm_project_intake WHERE project_id = ?`, [projectId]);
  }
}
