import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

@Injectable()
export class DailyReportRepository extends BaseRepository<RowDataPacket> {
  constructor(
    @Inject(MysqlService) mysqlService: MysqlService,
    @Inject(QadOdbcService) private readonly qad: QadOdbcService,
  ) {
    super('eyefidb.fs_labor_view', mysqlService);
  }

  private getLegacyTodayString(): string {
    const pacificNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    return this.formatDate(pacificNow);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getDailyReportSummary(): Promise<Record<string, unknown>> {
    const today = this.getLegacyTodayString();
    const sql = `
      SELECT overdue_open + due_open AS open_total_lines,
             overdue_open_val + due_open_val AS total_lines_overdue_value,
             overdue_shipped_val + due_shipped_val + future_shipped_val AS total_shipped_today_value,
             overdue_shipped + due_shipped + future_shipped AS total_shipped_today_lines,
             on_time_delivery_today,
             CASE WHEN total_lines_due_today > 0
                  THEN (on_time_delivery_today / total_lines_due_today) * 100 ELSE 0 END AS on_time_delivery_today_percent,
             total_open,
             CASE WHEN total_open > 0
                  THEN (shipped_today_total / total_open) * 100 ELSE 0 END AS percent_plan_overall_completed,
             CASE WHEN (due_open_val + due_shipped_val) > 0
                  THEN (due_shipped_val / (due_shipped_val + due_open_val)) * 100 ELSE 0 END AS value_percentage_today_completed,
             due_shipped_val + due_open_val AS total_open_value_today,
             total_lines_due_today,
             overdue_open_val + due_open_val + future_open_val AS total_open_value,
             min_date,
             max_date
      FROM (
        SELECT SUM(CASE WHEN a.sod_per_date < '${today}' AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) AS overdue_open,
               SUM(CASE WHEN a.sod_per_date = '${today}' AND sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) AS due_open,
               SUM(CASE WHEN a.sod_per_date < '${today}' AND c.so_compl_date IS NULL THEN sod_list_pr * (sod_qty_ord - sod_qty_ship) ELSE 0 END) AS overdue_open_val,
               SUM(CASE WHEN a.sod_per_date = '${today}' AND c.so_compl_date IS NULL THEN sod_list_pr * (sod_qty_ord - sod_qty_ship) ELSE 0 END) AS due_open_val,
               SUM(CASE WHEN a.sod_per_date > '${today}' AND c.so_compl_date IS NULL THEN sod_list_pr * (sod_qty_ord - sod_qty_ship) ELSE 0 END) AS future_open_val,
               SUM(CASE WHEN g.abs_shp_date = '${today}' AND a.sod_per_date < g.abs_shp_date THEN 1 ELSE 0 END) AS overdue_shipped,
               SUM(CASE WHEN g.abs_shp_date = '${today}' AND g.abs_shp_date = a.sod_per_date AND sod_qty_ord = sod_qty_ship THEN 1 ELSE 0 END) AS due_shipped,
               SUM(CASE WHEN g.abs_shp_date = '${today}' AND a.sod_per_date > g.abs_shp_date THEN 1 ELSE 0 END) AS future_shipped,
               SUM(CASE WHEN g.abs_shp_date = '${today}' AND a.sod_per_date < '${today}' THEN sod_list_pr * g.abs_ship_qty ELSE 0 END) AS overdue_shipped_val,
               SUM(CASE WHEN g.abs_shp_date = '${today}' AND a.sod_per_date = '${today}' THEN sod_list_pr * g.abs_ship_qty ELSE 0 END) AS due_shipped_val,
               SUM(CASE WHEN g.abs_shp_date = '${today}' AND a.sod_per_date > '${today}' THEN sod_list_pr * g.abs_ship_qty ELSE 0 END) AS future_shipped_val,
               SUM(CASE WHEN a.sod_per_date = '${today}' THEN 1 ELSE 0 END) AS due_total,
               SUM(CASE WHEN sod_qty_ord - sod_qty_ship = 0 AND g.abs_ship_qty = sod_qty_ship AND a.sod_per_date = '${today}' AND g.abs_shp_date <= '${today}' THEN 1 ELSE 0 END) AS on_time_delivery_today,
               SUM(CASE WHEN sod_qty_ord != sod_qty_ship AND c.so_compl_date IS NULL THEN 1 ELSE 0 END) AS total_open,
               SUM(CASE WHEN g.abs_shp_date = '${today}' THEN 1 ELSE 0 END) AS shipped_today_total,
               SUM(CASE WHEN a.sod_per_date = '${today}' THEN 1 ELSE 0 END) AS total_lines_due_today_,
               SUM(CASE WHEN a.sod_per_date = '${today}' AND g.abs_shp_date IS NOT NULL THEN 1 ELSE 0 END) AS total_lines_due_today,
               MIN(a.sod_per_date) AS min_date,
               MAX(a.sod_per_date) AS max_date
        FROM sod_det a
        LEFT JOIN (
          SELECT so_nbr, so_compl_date
          FROM so_mstr
          WHERE so_domain = 'EYE'
        ) c ON c.so_nbr = a.sod_nbr
        LEFT JOIN (
          SELECT abs_line, SUM(abs_ship_qty) AS abs_ship_qty, abs_order, MAX(abs_shp_date) AS abs_shp_date
          FROM abs_mstr
          WHERE abs_domain = 'EYE'
            AND abs_ship_qty > 0
          GROUP BY abs_line, abs_order
        ) g ON g.abs_order = a.sod_nbr AND g.abs_line = a.sod_line
        WHERE sod_domain = 'EYE'
          AND sod_project = ''
          AND sod_part != 'DISCOUNT'
      ) a
    `;

    const rows = await this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportOnTime(): Promise<Record<string, unknown>[]> {
    const today = this.getLegacyTodayString();
    const sql = `
      SELECT SUM(CASE WHEN f.abs_shp_date <= a.sod_per_date THEN 1 ELSE 0 END) AS shipped_before_or_on_due_date,
             SUM(CASE WHEN f.abs_shp_date > a.sod_per_date THEN 1 ELSE 0 END) AS shipped_after_due_date,
             COUNT(f.abs_shp_date) AS total_shipped_today,
             SUM(sod_list_pr * f.abs_ship_qty) AS total_value_shipped_today,
             COUNT(a.sod_nbr) AS total_lines_today,
             CASE WHEN c.so_cust IN ('AMEGAM','BALTEC','ATI','INTGAM')
                  THEN c.so_cust ELSE 'Other' END AS so_cust
      FROM sod_det a
      LEFT JOIN (
        SELECT so_nbr, so_cust, so_ord_date, so_ship, so_bol, so_cmtindx
        FROM so_mstr
        WHERE so_domain = 'EYE'
      ) c ON c.so_nbr = a.sod_nbr
      LEFT JOIN (
        SELECT a.abs_order,
               a.abs_line,
               MAX(a.abs_shp_date) AS abs_shp_date,
               SUM(a.abs_ship_qty) AS abs_ship_qty
        FROM abs_mstr a
        WHERE a.abs_domain = 'EYE'
          AND a.abs_shp_date = '${today}'
          AND a.abs_ship_qty > 0
        GROUP BY a.abs_order, a.abs_line
      ) f ON f.abs_order = a.sod_nbr AND f.abs_line = a.sod_line
      WHERE sod_domain = 'EYE'
        AND f.abs_shp_date = '${today}'
        AND sod_project = ''
        AND sod_part != 'DISCOUNT'
      GROUP BY CASE WHEN c.so_cust IN ('AMEGAM','BALTEC','ATI','INTGAM') THEN c.so_cust ELSE 'Other' END
      ORDER BY CASE WHEN c.so_cust IN ('AMEGAM','BALTEC','ATI','INTGAM') THEN c.so_cust ELSE 'Other' END
    `;

    return this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
  }

  async getDailyReportProductionRouting(operation: number): Promise<Record<string, unknown>> {
    const combined = await this.getDailyReportProductionRoutingCombined([operation]);
    return combined[String(Math.trunc(operation))] ?? {};
  }

  async getDailyReportProductionRoutingCombined(operations: number[]): Promise<Record<string, Record<string, unknown>>> {
    const today = this.getLegacyTodayString();
    const sanitizedOps = [...new Set(operations.map((op) => Math.trunc(op)).filter((op) => Number.isFinite(op)))];
    if (!sanitizedOps.length) {
      return {};
    }

    const operationList = sanitizedOps.join(',');
    const sql = `
      SELECT wr_op,
             SUM(CASE WHEN dueBy = '${today}' THEN 1 ELSE 0 END) AS today_count,
             SUM(CASE WHEN dueBy = '${today}' AND complete_status = 1 THEN 1 ELSE 0 END) AS completed_before_or_on_due_date,
             SUM(CASE WHEN dueBy = '${today}' AND complete_status = 0 THEN 1 ELSE 0 END) AS due_today_not_completed,
             SUM(CASE WHEN dueBy < '${today}' AND complete_status = 0 THEN 1 ELSE 0 END) AS total_overdue_orders
      FROM (
        SELECT wr_op,
               dueBy,
               CASE WHEN wo_status = 'C' OR a.wr_qty_ord - a.wr_qty_comp = 0 THEN 1 ELSE 0 END AS complete_status
        FROM (
          SELECT a.wr_op,
                 a.wr_qty_ord,
                 a.wr_qty_comp,
                 a.wr_due,
                 CASE
                   WHEN b.wo_so_job = 'dropin' THEN wr_due
                   ELSE CASE
                     WHEN a.wr_op = 10 THEN CASE
                       WHEN DAYOFWEEK(wr_due) IN (1, 2, 3) THEN wr_due - 4
                       WHEN DAYOFWEEK(wr_due) IN (4, 5, 6) THEN wr_due - 2
                       WHEN DAYOFWEEK(wr_due) IN (7) THEN wr_due - 3
                       ELSE wr_due - 2
                     END
                     WHEN a.wr_op = 20 THEN CASE
                       WHEN DAYOFWEEK(wr_due) IN (1, 2) THEN wr_due - 3
                       WHEN DAYOFWEEK(wr_due) IN (3, 4, 5, 6) THEN wr_due - 1
                       WHEN DAYOFWEEK(wr_due) IN (7) THEN wr_due - 2
                       ELSE wr_due - 1
                     END
                     WHEN a.wr_op = 30 THEN CASE
                       WHEN DAYOFWEEK(wr_due) IN (1) THEN wr_due - 2
                       WHEN DAYOFWEEK(wr_due) IN (2, 3, 4) THEN wr_due - 0
                       ELSE wr_due - 0
                     END
                     ELSE wo_due_date
                   END
                 END AS dueBy,
                 wo_status
          FROM wr_route a
          LEFT JOIN (
            SELECT wo_nbr, wo_so_job, wo_status, wo_due_date
            FROM wo_mstr
            WHERE wo_domain = 'EYE'
          ) b ON b.wo_nbr = a.wr_nbr
          WHERE a.wr_domain = 'EYE'
            AND a.wr_op IN (${operationList})
        ) a
      ) b
      GROUP BY wr_op
    `;

    const rows = await this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
    return rows.reduce<Record<string, Record<string, unknown>>>((acc, row) => {
      const opKey = String(row['wr_op'] ?? '');
      if (!opKey) {
        return acc;
      }

      acc[opKey] = {
        today_count: row['today_count'] ?? 0,
        completed_before_or_on_due_date: row['completed_before_or_on_due_date'] ?? 0,
        due_today_not_completed: row['due_today_not_completed'] ?? 0,
        total_overdue_orders: row['total_overdue_orders'] ?? 0,
      };
      return acc;
    }, {});
  }

  async getDailyReportRoutingMetricsCombined(
    dateFrom: string,
    dateTo: string,
    productionOperation: number,
    completedOperation: number,
  ): Promise<Record<string, unknown>> {
    const safeDateFrom = String(dateFrom).replace(/'/g, "''");
    const safeDateTo = String(dateTo).replace(/'/g, "''");
    const prodOp = Math.trunc(productionOperation);
    const completedOp = Math.trunc(completedOperation);
    const sql = `
      SELECT SUM(CASE WHEN dueBy = '${safeDateFrom}' THEN 1 ELSE 0 END) AS today_count,
             SUM(CASE WHEN dueBy = '${safeDateFrom}' AND complete_status = 1 THEN 1 ELSE 0 END) AS completed_before_or_on_due_date,
             SUM(CASE WHEN dueBy = '${safeDateFrom}' AND complete_status = 0 THEN 1 ELSE 0 END) AS due_today_not_completed,
             SUM(CASE WHEN dueBy < '${safeDateFrom}' AND complete_status = 0 THEN 1 ELSE 0 END) AS total_overdue_orders,
             (
               SELECT COUNT(op_wo_nbr)
               FROM op_hist
               LEFT JOIN wo_mstr c ON c.wo_nbr = op_hist.op_wo_nbr AND c.wo_domain = 'EYE'
               WHERE op_tran_date BETWEEN '${safeDateFrom}' AND '${safeDateTo}'
                 AND op_wo_op = ${completedOp}
                 AND op_domain = 'EYE'
                 AND op_type = 'BACKFLSH'
             ) AS ops_completed_value
      FROM (
        SELECT wr_nbr,
               a.wr_qty_ord - a.wr_qty_comp AS openQty,
               dueBy,
               a.wr_part,
               a.wr_qty_ord,
               a.wr_qty_comp,
               op_qty_comp,
               op_tran_date,
               op_qty_comp_backflush,
               wo_status,
               CASE WHEN wo_status = 'C' OR a.wr_qty_ord - a.wr_qty_comp = 0 THEN 1 ELSE 0 END AS complete_status
        FROM (
          SELECT a.wr_nbr,
                 a.wr_op,
                 a.wr_qty_ord,
                 a.wr_qty_wip,
                 a.wr_qty_comp,
                 a.wr_status,
                 a.wr_due,
                 a.wr_part,
                 a.wr_queue,
                 a.wr_qty_inque,
                 CASE
                   WHEN b.wo_so_job = 'dropin' THEN wr_due
                   ELSE CASE
                     WHEN a.wr_op = 10 THEN CASE
                       WHEN DAYOFWEEK(wr_due) IN (1, 2, 3) THEN wr_due - 4
                       WHEN DAYOFWEEK(wr_due) IN (4, 5, 6) THEN wr_due - 2
                       WHEN DAYOFWEEK(wr_due) IN (7) THEN wr_due - 3
                       ELSE wr_due - 2
                     END
                     WHEN a.wr_op = 20 THEN CASE
                       WHEN DAYOFWEEK(wr_due) IN (1, 2) THEN wr_due - 3
                       WHEN DAYOFWEEK(wr_due) IN (3, 4, 5, 6) THEN wr_due - 1
                       WHEN DAYOFWEEK(wr_due) IN (7) THEN wr_due - 2
                       ELSE wr_due - 1
                     END
                     WHEN a.wr_op = 30 THEN CASE
                       WHEN DAYOFWEEK(wr_due) IN (1) THEN wr_due - 2
                       WHEN DAYOFWEEK(wr_due) IN (2, 3, 4) THEN wr_due - 0
                       ELSE wr_due - 0
                     END
                     ELSE wo_due_date
                   END
                 END AS dueBy,
                 d.op_qty_comp,
                 d.op_tran_date,
                 d.op_qty_comp AS op_qty_comp_backflush,
                 wo_status
          FROM wr_route a
          LEFT JOIN (
            SELECT wo_nbr, wo_so_job, wo_status, wo_due_date
            FROM wo_mstr
            WHERE wo_domain = 'EYE'
          ) b ON b.wo_nbr = a.wr_nbr
          LEFT JOIN (
            SELECT op_wo_nbr, SUM(op_qty_comp) AS op_qty_comp, MAX(op_tran_date) AS op_tran_date
            FROM op_hist
            WHERE op_wo_op = ${prodOp}
              AND op_domain = 'EYE'
              AND op_type = 'BACKFLSH'
            GROUP BY op_wo_nbr
          ) d ON d.op_wo_nbr = a.wr_nbr
          WHERE a.wr_domain = 'EYE'
            AND a.wr_op = ${prodOp}
        ) a
      ) b
    `;

    const rows = await this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportTotalInventory(): Promise<Record<string, unknown>> {
    const sql = `
      SELECT CAST(SUM(a.ld_qty_oh * c.sct_cst_tot) AS NUMERIC(36,2)) AS sum_count,
             SUM(CASE WHEN loc.loc_type = 'FG' THEN a.ld_qty_oh * c.sct_cst_tot ELSE 0 END) AS fg_sum
      FROM ld_det a
      LEFT JOIN pt_mstr b ON a.ld_part = b.pt_part AND b.pt_domain = 'EYE'
      LEFT JOIN loc_mstr loc ON loc.loc_loc = a.ld_loc AND loc.loc_domain = 'EYE'
      LEFT JOIN (
        SELECT sct_part, MAX(sct_cst_tot) AS sct_cst_tot
        FROM sct_det
        WHERE sct_sim = 'Standard'
          AND sct_domain = 'EYE'
          AND sct_site = 'EYE01'
        GROUP BY sct_part
      ) c ON b.pt_part = c.sct_part
      WHERE ld_domain = 'EYE'
        AND a.ld_qty_oh > 0
        AND RIGHT(b.pt_part, 1) NOT IN ('U', 'R', 'N')
    `;

    const rows = await this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportWip(): Promise<Record<string, unknown>> {
    const sql = `
      SELECT SUM(wo_wip_tot) AS wo_wip_tot
      FROM wo_mstr
      WHERE wo_domain = 'EYE'
        AND wo_wip_tot > 0
    `;

    const rows = await this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportLocationExtCost(location: string): Promise<Record<string, unknown>> {
    const safeLocation = location.replace(/'/g, "''");
    const sql = `
      SELECT SUM(a.ld_qty_oh * d.sct_cst_tot) AS total_ext_cost
      FROM ld_det a
      LEFT JOIN (
        SELECT sct_part, MAX(sct_cst_tot) AS sct_cst_tot
        FROM sct_det
        WHERE sct_sim = 'Standard'
          AND sct_domain = 'EYE'
          AND sct_site = 'EYE01'
        GROUP BY sct_part
      ) d ON a.ld_part = d.sct_part
      WHERE a.ld_loc = '${safeLocation}'
        AND ld_domain = 'EYE'
    `;

    const rows = await this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportInventoryTurnsCombined(): Promise<Record<string, unknown>> {
    const sql = `
      SELECT
        SUM(CASE WHEN is_coi <> 'COI' AND rmlv_turns < 1.0 THEN rmlv_total ELSE 0 END) AS rmlv_lessthanone,
        SUM(CASE WHEN is_coi <> 'COI' AND rmlv_turns >= 1.0 THEN rmlv_total ELSE 0 END) AS rmlv_greaterthanorequaltoone,
        SUM(CASE WHEN is_coi <> 'COI' THEN rmlv_total ELSE 0 END) AS rmlv_total,
        SUM(CASE WHEN is_coi <> 'COI' AND jx01_turns < 1.0 THEN jx01_total ELSE 0 END) AS jx01_lessthanone,
        SUM(CASE WHEN is_coi <> 'COI' AND jx01_turns >= 1.0 THEN jx01_total ELSE 0 END) AS jx01_greaterthanorequaltoone,
        SUM(CASE WHEN is_coi <> 'COI' THEN jx01_total ELSE 0 END) AS jx01_total,
        SUM(CASE WHEN is_coi <> 'COI' AND all_turns < 1.0 THEN all_total ELSE 0 END) AS all_lessthanone,
        SUM(CASE WHEN is_coi <> 'COI' AND all_turns >= 1.0 THEN all_total ELSE 0 END) AS all_greaterthanorequaltoone,
        SUM(CASE WHEN is_coi <> 'COI' THEN all_total ELSE 0 END) AS all_total,
        SUM(CASE WHEN is_coi <> 'COI' AND fglv_turns < 1.0 THEN fglv_total ELSE 0 END) AS fglv_lessthanone,
        SUM(CASE WHEN is_coi <> 'COI' AND fglv_turns >= 1.0 THEN fglv_total ELSE 0 END) AS fglv_greaterthanorequaltoone,
        SUM(CASE WHEN is_coi <> 'COI' THEN fglv_total ELSE 0 END) AS fglv_total
      FROM (
        SELECT
          CASE WHEN RIGHT(pt.pt_part, 1) NOT IN ('U', 'R', 'N') THEN '-' ELSE 'COI' END AS is_coi,
          (inv.qty_rmlv * cst.sct_cst_tot) AS rmlv_total,
          CASE WHEN (inv.qty_rmlv * cst.sct_cst_tot) > 0
            THEN ((in_eye.in_avg_iss * cst.sct_cst_tot) / (inv.qty_rmlv * cst.sct_cst_tot)) * 365
            ELSE 0 END AS rmlv_turns,
          (inv.qty_jx01 * cst.sct_cst_tot) AS jx01_total,
          CASE WHEN (inv.qty_jx01 * cst.sct_cst_tot) > 0
            THEN ((in_jx.in_avg_iss * cst.sct_cst_tot) / (inv.qty_jx01 * cst.sct_cst_tot)) * 365
            ELSE 0 END AS jx01_turns,
          (inv.qty_all * cst.sct_cst_tot) AS all_total,
          CASE WHEN (inv.qty_all * cst.sct_cst_tot) > 0
            THEN ((in_eye.in_avg_iss * cst.sct_cst_tot) / (inv.qty_all * cst.sct_cst_tot)) * 365
            ELSE 0 END AS all_turns,
          (inv.qty_fglv * cst.sct_cst_tot) AS fglv_total,
          CASE WHEN (inv.qty_fglv * cst.sct_cst_tot) > 0
            THEN ((in_eye.in_avg_iss * cst.sct_cst_tot) / (inv.qty_fglv * cst.sct_cst_tot)) * 365
            ELSE 0 END AS fglv_turns
        FROM pt_mstr pt
        LEFT JOIN (
          SELECT in_part, MAX(in_avg_iss) AS in_avg_iss
          FROM in_mstr
          WHERE in_domain = 'EYE' AND in_site = 'EYE01'
          GROUP BY in_part
        ) in_eye ON in_eye.in_part = pt.pt_part
        LEFT JOIN (
          SELECT in_part, MAX(in_avg_iss) AS in_avg_iss
          FROM in_mstr
          WHERE in_domain = 'EYE' AND in_site = 'JX'
          GROUP BY in_part
        ) in_jx ON in_jx.in_part = pt.pt_part
        LEFT JOIN (
          SELECT sct_part, MAX(sct_cst_tot) AS sct_cst_tot
          FROM sct_det
          WHERE sct_sim = 'Standard' AND sct_domain = 'EYE' AND sct_site = 'EYE01'
          GROUP BY sct_part
        ) cst ON cst.sct_part = CAST(pt.pt_part AS CHAR(25))
        LEFT JOIN (
          SELECT a.ld_part,
                 SUM(CASE WHEN a.ld_qty_oh > 0 AND a.ld_site = 'EYE01' THEN a.ld_qty_oh ELSE 0 END) AS qty_all,
                 SUM(CASE WHEN a.ld_qty_oh > 0 AND a.ld_loc = 'JX01' THEN a.ld_qty_oh ELSE 0 END) AS qty_jx01,
                 SUM(CASE WHEN a.ld_qty_oh > 0 AND loc.loc_type = 'FG' THEN a.ld_qty_oh ELSE 0 END) AS qty_fglv,
                 SUM(CASE WHEN a.ld_qty_oh > 0 AND a.ld_site = 'EYE01' AND loc.loc_type NOT IN ('FG', 'SS') THEN a.ld_qty_oh ELSE 0 END) AS qty_rmlv
          FROM ld_det a
          LEFT JOIN loc_mstr loc ON loc.loc_loc = a.ld_loc AND loc.loc_domain = 'EYE'
          WHERE a.ld_domain = 'EYE'
          GROUP BY a.ld_part
        ) inv ON inv.ld_part = pt.pt_part
        WHERE pt.pt_domain = 'EYE'
      ) x
    `;

    const rows = await this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportInventoryTurns(scope: 'rmlv' | 'jx01' | 'all' | 'fglv'): Promise<Record<string, unknown>> {
    const combined = await this.getDailyReportInventoryTurnsCombined();
    if (scope === 'rmlv') {
      return {
        lessthanone: combined['rmlv_lessthanone'] ?? 0,
        greaterthanorequaltoone: combined['rmlv_greaterthanorequaltoone'] ?? 0,
        total: combined['rmlv_total'] ?? 0,
      };
    }
    if (scope === 'jx01') {
      return {
        lessthanone: combined['jx01_lessthanone'] ?? 0,
        greaterthanorequaltoone: combined['jx01_greaterthanorequaltoone'] ?? 0,
        total: combined['jx01_total'] ?? 0,
      };
    }
    if (scope === 'all') {
      return {
        lessthanone: combined['all_lessthanone'] ?? 0,
        greaterthanorequaltoone: combined['all_greaterthanorequaltoone'] ?? 0,
        total: combined['all_total'] ?? 0,
      };
    }

    return {
      lessthanone: combined['fglv_lessthanone'] ?? 0,
      greaterthanorequaltoone: combined['fglv_greaterthanorequaltoone'] ?? 0,
      total: combined['fglv_total'] ?? 0,
    };
  }

  async getDailyReportSafetyStockTotal(): Promise<Record<string, unknown>> {
    const sql = `
      SELECT SUM(CAST(total AS DECIMAL(16,2))) AS total
      FROM (
        SELECT onHandQty * sct_cst_tot AS total,
               CASE WHEN RIGHT(a.pt_part, 1) NOT IN ('U', 'R', 'N') THEN '-' ELSE 'COI' END AS is_coi
        FROM pt_mstr a
        LEFT JOIN (
          SELECT sct_part, MAX(sct_cst_tot) AS sct_cst_tot
          FROM sct_det
          WHERE sct_sim = 'Standard'
            AND sct_domain = 'EYE'
            AND sct_site = 'EYE01'
          GROUP BY sct_part
        ) d ON CAST(a.pt_part AS CHAR(25)) = d.sct_part
        JOIN (
          SELECT a.ld_part, SUM(ld_qty_oh) AS onHandQty
          FROM ld_det a
          JOIN (
            SELECT loc_loc
            FROM loc_mstr
            WHERE loc_domain = 'EYE' AND loc_type = 'SS'
            GROUP BY loc_loc
          ) cc ON cc.loc_loc = a.ld_loc
          WHERE a.ld_domain = 'EYE'
            AND a.ld_qty_oh > 0
          GROUP BY a.ld_part
        ) c ON c.ld_part = a.pt_part
        WHERE pt_domain = 'EYE'
      ) a
      WHERE is_coi <> 'COI'
    `;

    const rows = await this.qad.query<Record<string, unknown>[]>(sql, { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportThreeMonthsRevenue(beginning: string, last: string): Promise<Record<string, unknown>> {
    const sql = `
      SELECT SUM(a.sod_price * (a.sod_qty_ord - a.sod_qty_ship)) AS value
      FROM sod_det a
      JOIN (
        SELECT so_nbr
        FROM so_mstr
        WHERE so_domain = 'EYE'
          AND so_compl_date IS NULL
      ) c ON c.so_nbr = a.sod_nbr
      WHERE sod_domain = 'EYE'
        AND sod_project = ''
        AND sod_qty_ord != sod_qty_ship
        AND sod_part != 'DISCOUNT'
        AND a.sod_per_date BETWEEN ? AND ?
    `;

    const rows = await this.qad.queryWithParams<Record<string, unknown>[]>(sql, [beginning, last], { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportScheduledJobs(): Promise<Record<string, unknown>[]> {
    return this.rawQuery<RowDataPacket>(
      `SELECT * FROM eyefidb.dailyReport ORDER BY createdDate DESC LIMIT 1`,
      [],
    );
  }

  async getDailyReportOpenBalanceCurrentMonthDetails(dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> {
    const sql = `
      SELECT SUM(a.sod_price * (a.sod_qty_ord - a.sod_qty_ship)) AS value,
             a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line))) AS so_line
      FROM sod_det a
      WHERE a.sod_per_date BETWEEN ? AND ?
        AND sod_domain = 'EYE'
        AND a.sod_qty_ord - a.sod_qty_ship <> 0
        AND sod_project = ''
      GROUP BY a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line)))
    `;

    return this.qad.queryWithParams<Record<string, unknown>[]>(sql, [dateFrom, dateTo], { keyCase: 'lower' });
  }

  async getDailyReportOwnersBySoLines(soLines: string[]): Promise<any[]> {
    if (!soLines.length) {
      return [];
    }

    const placeholders = soLines.map(() => '?').join(',');
    const sql = `
      SELECT userName AS username, a.so AS so
      FROM eyefidb.workOrderOwner a
      WHERE a.so IN (${placeholders})
        AND userName IN ('SHIPPING', 'PACKING')
    `;

    return this.mysqlService.query(sql, soLines);
  }

  async getDailyReportOpenLinesForCurrentWeek(startCurrentWeek: string, endCurrentWeek: string): Promise<Record<string, unknown>> {
    const sql = `
      SELECT COUNT(*) AS value
      FROM sod_det a
      WHERE a.sod_per_date BETWEEN ? AND ?
        AND sod_domain = 'EYE'
        AND a.sod_qty_ord - a.sod_qty_ship <> 0
        AND sod_project = ''
    `;

    const rows = await this.qad.queryWithParams<Record<string, unknown>[]>(sql, [startCurrentWeek, endCurrentWeek], { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportLateReasonCodesBySoLines(soLines: string[]): Promise<any[]> {
    if (!soLines.length) {
      return [];
    }

    const placeholders = soLines.map(() => '?').join(',');
    const sql = `
      SELECT lateReasonCode AS latereasoncode, COUNT(lateReasonCode) AS value
      FROM eyefidb.workOrderOwner a
      WHERE a.so IN (${placeholders})
        AND lateReasonCode <> ''
      GROUP BY lateReasonCode
    `;

    return this.mysqlService.query(sql, soLines);
  }

  async getDailyReportSoLinesForDate(date: string): Promise<string[]> {
    const sql = `
      SELECT DISTINCT a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line))) AS so_line
      FROM sod_det a
      WHERE a.sod_per_date = ?
        AND sod_domain = 'EYE'
        AND a.sod_qty_ord - a.sod_qty_ship <> 0
        AND sod_project = ''
    `;

    const rows = await this.qad.queryWithParams<Record<string, unknown>[]>(sql, [date], { keyCase: 'lower' });
    return rows.map((row) => String(row['so_line'] ?? '')).filter(Boolean);
  }

  async getDailyReportOpsCompleted(dateFrom: string, dateTo: string, operation: number): Promise<Record<string, unknown>> {
    const sql = `
      SELECT COUNT(op_wo_nbr) AS value
      FROM op_hist
      WHERE op_tran_date BETWEEN ? AND ?
        AND op_wo_op = ?
        AND op_domain = 'EYE'
        AND op_type = 'BACKFLSH'
    `;

    const rows = await this.qad.queryWithParams<Record<string, unknown>[]>(sql, [dateFrom, dateTo, operation], { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportOpenLinesToday(today: string): Promise<Record<string, unknown>> {
    const sql = `
      SELECT COUNT(*) AS value
      FROM sod_det a
      WHERE a.sod_per_date = ?
        AND sod_domain = 'EYE'
        AND a.sod_qty_ord - a.sod_qty_ship <> 0
        AND sod_project = ''
    `;

    const rows = await this.qad.queryWithParams<Record<string, unknown>[]>(sql, [today], { keyCase: 'lower' });
    return rows[0] ?? {};
  }

  async getDailyReportFutureOpenRevenue(dateFrom: string, dateTo: string): Promise<Record<string, unknown>> {
    const sql = `
      SELECT SUM((sod_qty_ord - sod_qty_ship) * sod_price) AS value
      FROM sod_det a
      WHERE sod_domain = 'EYE'
        AND sod_qty_ord != sod_qty_ship
        AND a.sod_per_date BETWEEN ? AND ?
        AND sod_project = ''
    `;

    const rows = await this.qad.queryWithParams<Record<string, unknown>[]>(sql, [dateFrom, dateTo], { keyCase: 'lower' });
    return rows[0] ?? {};
  }
}
