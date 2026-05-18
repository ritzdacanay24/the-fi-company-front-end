import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface MenuBadgeCountRow extends RowDataPacket {
  menu_id: string;
  count: number | string;
}

export interface SidebarMenuBadgeCounts {
  validationQueue: number;
  pickingQueue: number;
  pickAndStageOpen: number;
  productionRoutingOpen: number;
  finalTestQcOpen: number;
  shippingScheduleDueNow: number;
  vehicleExpiringSoon: number;
  vehicleInspectionPendingResolutions: number;
  shortagesOpen: number;
  safetyIncidentOpen: number;
  qualityIssuesOpen: number;
  correctiveActionsOpen: number;
  returnsRmaOpen: number;
  permitChecklistOpen: number;
  shippingRequestOpen: number;
  graphicsProductionOpen: number;
  fieldServiceJobsOpen: number;
  fieldsServiceRequestsOpen: number;
  partsOrderOpen: number;
  trainingLiveSessionsOpen: number;
  inspectionChecklistExecutionInProgress: number;
  inspectionChecklistTemplatesDraft: number;
  pmProjectsOpen: number;
  pmTasksOpen: number;
  supportTicketsOpen: number;
  supportMyTicketsOpen: number;
  scheduledJobsFailed: number;
  serialManagementLowStock: number;
  serialManagementCriticalStock: number;
}

interface SerialThresholds {
  eyefi: number;
  ul_new: number;
  ul_used: number;
  igt: number;
}

const DEFAULT_SERIAL_THRESHOLDS: SerialThresholds = {
  eyefi: 300,
  ul_new: 150,
  ul_used: 100,
  igt: 200,
};

@Injectable()
export class MenuBadgeRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getSidebarBadgeCounts(userId?: number): Promise<SidebarMenuBadgeCounts> {
    const rows = await this.mysqlService.query<MenuBadgeCountRow[]>(`
      SELECT 'validationQueue' AS menu_id, COUNT(DISTINCT m.id) AS count
      FROM mrf m
      INNER JOIN mrf_det d ON d.mrf_id = m.id
      WHERE m.active = 1
        AND m.queue_status NOT IN ('complete', 'cancelled')
        AND d.validationStatus = 'pending'

      UNION ALL

      SELECT 'pickingQueue' AS menu_id, COUNT(*) AS count
      FROM mrf m
      WHERE m.active = 1
        AND m.validated IS NOT NULL
        AND m.pickedCompletedDate IS NULL

      UNION ALL

      SELECT 'pickAndStageOpen' AS menu_id,
             COALESCE((
               SELECT mbc.count
               FROM menu_badge_cache mbc
               WHERE mbc.menu_id = 'pick-and-stage-open'
               LIMIT 1
             ), 0) AS count

      UNION ALL

      SELECT 'productionRoutingOpen' AS menu_id,
             COALESCE((
               SELECT mbc.count
               FROM menu_badge_cache mbc
               WHERE mbc.menu_id = 'production-routing-open'
               LIMIT 1
             ), 0) AS count

      UNION ALL

      SELECT 'finalTestQcOpen' AS menu_id,
             COALESCE((
               SELECT mbc.count
               FROM menu_badge_cache mbc
               WHERE mbc.menu_id = 'final-test-qc-open'
               LIMIT 1
             ), 0) AS count

      UNION ALL

      SELECT 'shippingScheduleDueNow' AS menu_id,
             COALESCE((
               SELECT mbc.count
               FROM menu_badge_cache mbc
               WHERE mbc.menu_id = 'shipping-schedule-due-now'
               LIMIT 1
             ), 0) AS count

      UNION ALL

      SELECT 'vehicleExpiringSoon' AS menu_id, COUNT(*) AS count
      FROM vehicleInformation v
      WHERE v.active = 1
        AND NULLIF(v.exp, '') IS NOT NULL
        AND DATEDIFF(STR_TO_DATE(v.exp, '%Y-%m-%d'), CURDATE()) BETWEEN 0 AND 30

      UNION ALL

      SELECT 'vehicleInspectionPendingResolutions' AS menu_id,
             COUNT(DISTINCT d.forklift_checklist_id) AS count
      FROM forms.vehicle_inspection_details d
      WHERE d.status = 0
        AND d.resolved_confirmed_date IS NULL

      UNION ALL

      SELECT 'shortagesOpen' AS menu_id, COUNT(*) AS count
      FROM shortageRequest s
      WHERE s.active = 1
        AND (
          s.supplyCompleted IS NULL
          OR s.deliveredCompleted IS NULL
          OR s.receivingCompleted IS NULL
          OR s.productionIssuedDate IS NULL
        )

      UNION ALL

      SELECT 'safetyIncidentOpen' AS menu_id, COUNT(*) AS count
      FROM safety_incident si
      WHERE si.archived_at IS NULL
        AND si.status IN ('In Process', 'Open')

      UNION ALL

      SELECT 'qualityIssuesOpen' AS menu_id, COUNT(*) AS count
      FROM qa_capaRequest q
      WHERE q.active = 1
        AND q.status IN ('Open', 'In Process', 'Awaiting Verification')

      UNION ALL

      SELECT 'correctiveActionsOpen' AS menu_id, COUNT(*) AS count
      FROM ncr n
      WHERE n.active = 1
        AND n.ca_action_req = 'Yes'
        AND (n.ca_submitted_date IS NULL OR TRIM(n.ca_submitted_date) = '')
        AND (n.submitted_date IS NULL OR TRIM(n.submitted_date) = '')

      UNION ALL

      SELECT 'returnsRmaOpen' AS menu_id, COUNT(*) AS count
      FROM rma r
      WHERE r.active = 1
        AND r.status = 'Open'

      UNION ALL

      SELECT 'permitChecklistOpen' AS menu_id, COUNT(*) AS count
      FROM quality_permit_checklist_tickets p
      WHERE LOWER(TRIM(COALESCE(p.status, 'draft'))) IN ('draft', 'saved', 'submitted')

      UNION ALL

      SELECT 'shippingRequestOpen' AS menu_id, COUNT(*) AS count
      FROM forms.shipping_request sr
      WHERE LOWER(TRIM(COALESCE(sr.status, 'open'))) IN ('open', 'pending', 'in transit')

      UNION ALL

      SELECT 'graphicsProductionOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.graphicsSchedule gp
      WHERE gp.active = 1
        AND gp.qty - gp.qtyShipped <> 0
        AND gp.status <> 900

      UNION ALL

      SELECT 'fieldServiceJobsOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.fs_scheduler fsj
      WHERE fsj.active = 1
        AND fsj.status IN ('Pending', 'Confirmed')

      UNION ALL

      SELECT 'fieldsServiceRequestsOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.fs_request fr
      LEFT JOIN eyefidb.fs_scheduler fs ON fs.request_id = fr.id
      WHERE fr.active = 1
        AND fs.id IS NULL

      UNION ALL

      SELECT 'partsOrderOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.fs_parts_order po
      WHERE po.active = 1
        AND (
          CASE
            WHEN TRIM(COALESCE(po.status, '')) <> '' THEN LOWER(TRIM(po.status))
            WHEN TRIM(COALESCE(po.tracking_number, '')) <> '' THEN 'shipped'
            ELSE 'open'
          END
        ) IN ('open', 'ordered')

      UNION ALL

      SELECT 'trainingLiveSessionsOpen' AS menu_id, COUNT(*) AS count
      FROM training_sessions ts
      WHERE ts.status IN ('scheduled', 'in-progress')

      UNION ALL

      SELECT 'inspectionChecklistExecutionInProgress' AS menu_id, COUNT(*) AS count
      FROM checklist_instances ci
      WHERE ci.status IN ('draft', 'in_progress', 'review')

      UNION ALL

      SELECT 'inspectionChecklistTemplatesDraft' AS menu_id, COUNT(*) AS count
      FROM checklist_templates ct
      WHERE ct.is_active = 1
        AND ct.is_draft = 1

      UNION ALL

      SELECT 'pmProjectsOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.pm_projects pp

      UNION ALL

      SELECT 'supportTicketsOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.support_tickets st
      WHERE LOWER(COALESCE(st.status, 'open')) IN ('open', 'in_progress')

      UNION ALL

      SELECT 'supportMyTicketsOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.support_tickets st
      WHERE LOWER(COALESCE(st.status, 'open')) IN ('open', 'in_progress')
        AND (? IS NOT NULL AND st.user_id = ?)

      UNION ALL

      SELECT 'scheduledJobsFailed' AS menu_id, COUNT(*) AS count
      FROM scheduled_job_run r
      INNER JOIN (
        SELECT job_name, MAX(id) AS max_id
        FROM scheduled_job_run
        GROUP BY job_name
      ) latest ON latest.job_name = r.job_name AND latest.max_id = r.id
      WHERE r.status = 'failure'
    `, [userId ?? null, userId ?? null]);

    const defaults: SidebarMenuBadgeCounts = {
      validationQueue: 0,
      pickingQueue: 0,
      pickAndStageOpen: 0,
      productionRoutingOpen: 0,
      finalTestQcOpen: 0,
      shippingScheduleDueNow: 0,
      vehicleExpiringSoon: 0,
      vehicleInspectionPendingResolutions: 0,
      shortagesOpen: 0,
      safetyIncidentOpen: 0,
      qualityIssuesOpen: 0,
      correctiveActionsOpen: 0,
      returnsRmaOpen: 0,
      permitChecklistOpen: 0,
      shippingRequestOpen: 0,
      graphicsProductionOpen: 0,
      fieldServiceJobsOpen: 0,
      fieldsServiceRequestsOpen: 0,
      partsOrderOpen: 0,
      trainingLiveSessionsOpen: 0,
      inspectionChecklistExecutionInProgress: 0,
      inspectionChecklistTemplatesDraft: 0,
      pmProjectsOpen: 0,
      pmTasksOpen: 0,
      supportTicketsOpen: 0,
      supportMyTicketsOpen: 0,
      scheduledJobsFailed: 0,
      serialManagementLowStock: 0,
      serialManagementCriticalStock: 0,
    };

    for (const row of rows) {
      const key = row.menu_id as keyof SidebarMenuBadgeCounts;
      if (!(key in defaults)) {
        continue;
      }
      defaults[key] = Number(row.count || 0);
    }

    // Per-user pm tasks open count (requires separate query after we know user name)
    defaults.pmTasksOpen = await this.getPmTasksOpenCount(userId);
    const serialStockBadgeCounts = await this.getSerialManagementStockBadgeCounts();
    defaults.serialManagementLowStock = serialStockBadgeCounts.lowStock;
    defaults.serialManagementCriticalStock = serialStockBadgeCounts.criticalStock;

    return defaults;
  }

  async getPmTasksOpenCount(userId?: number): Promise<number> {
    if (!userId) {
      // Global count — all open tasks
      const rows = await this.mysqlService.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt FROM eyefidb.pm_tasks WHERE status NOT IN ('Completed', 'Locked')`,
      );
      return Number((rows[0] as any)?.cnt || 0);
    }

    // Look up user full name from db.users
    const userRows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT CONCAT(TRIM(first), ' ', TRIM(last)) AS full_name FROM db.users WHERE id = ? AND active = 1 LIMIT 1`,
      [userId],
    );
    const fullName = ((userRows[0] as any)?.full_name || '').trim();
    if (!fullName) return 0;

    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM eyefidb.pm_tasks
       WHERE status NOT IN ('Completed', 'Locked')
         AND JSON_CONTAINS(assigned_to, ?, '$')`,
      [JSON.stringify(fullName)],
    );
    return Number((rows[0] as any)?.cnt || 0);
  }

  private async getSerialManagementStockBadgeCounts(): Promise<{ lowStock: number; criticalStock: number }> {
    try {
      const [thresholds, summary] = await Promise.all([
        this.getSerialStockThresholds(),
        this.getSerialAvailabilitySummaryForBadge(),
      ]);

      const pools = [
        { available: summary.eyefi_available, threshold: thresholds.eyefi },
        { available: summary.ul_new_available, threshold: thresholds.ul_new },
        { available: summary.ul_used_available, threshold: thresholds.ul_used },
        { available: summary.igt_available, threshold: thresholds.igt },
      ];

      return {
        lowStock: pools.filter((pool) => pool.available <= pool.threshold).length,
        criticalStock: pools.filter((pool) => pool.available <= Math.floor(pool.threshold * 0.3)).length,
      };
    } catch {
      return { lowStock: 0, criticalStock: 0 };
    }
  }

  private async getSerialStockThresholds(): Promise<SerialThresholds> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT setting_value FROM eyefidb.system_settings WHERE setting_key = 'serial_stock_thresholds' LIMIT 1`,
    );

    if (!rows.length || !rows[0].setting_value) {
      return { ...DEFAULT_SERIAL_THRESHOLDS };
    }

    try {
      const parsed = JSON.parse(String(rows[0].setting_value)) as Partial<SerialThresholds>;
      return {
        eyefi: this.sanitizeThreshold(parsed.eyefi, DEFAULT_SERIAL_THRESHOLDS.eyefi),
        ul_new: this.sanitizeThreshold(parsed.ul_new, DEFAULT_SERIAL_THRESHOLDS.ul_new),
        ul_used: this.sanitizeThreshold(parsed.ul_used, DEFAULT_SERIAL_THRESHOLDS.ul_used),
        igt: this.sanitizeThreshold(parsed.igt, DEFAULT_SERIAL_THRESHOLDS.igt),
      };
    } catch {
      return { ...DEFAULT_SERIAL_THRESHOLDS };
    }
  }

  private async getSerialAvailabilitySummaryForBadge(): Promise<Record<'eyefi_available' | 'ul_new_available' | 'ul_used_available' | 'igt_available', number>> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(`
      SELECT
        (
          SELECT COUNT(*)
          FROM eyefi_serial_numbers esn
          WHERE esn.is_active = 1
            AND esn.status = 'available'
            AND NOT EXISTS (
              SELECT 1
              FROM serial_assignments sa
              WHERE sa.eyefi_serial_id = esn.id
                AND COALESCE(sa.is_voided, 0) = 0
                AND COALESCE(sa.status, '') <> 'voided'
            )
            AND NOT EXISTS (
              SELECT 1
              FROM ul_label_usages ulu
              WHERE BINARY ulu.eyefi_serial_number = BINARY esn.serial_number
                AND COALESCE(ulu.is_voided, 0) = 0
            )
            AND NOT EXISTS (
              SELECT 1
              FROM agsSerialGenerator ags
              WHERE BINARY ags.serialNumber = BINARY esn.serial_number
                AND COALESCE(ags.active, 1) = 1
            )
            AND NOT EXISTS (
              SELECT 1
              FROM sgAssetGenerator sg
              WHERE BINARY sg.serialNumber = BINARY esn.serial_number
                AND COALESCE(sg.active, 1) = 1
            )
        ) AS eyefi_available,
        (
          SELECT COUNT(*)
          FROM ul_labels ul
          WHERE LOWER(COALESCE(ul.category, '')) = 'new'
            AND COALESCE(ul.is_consumed, 0) = 0
        ) AS ul_new_available,
        (
          SELECT COUNT(*)
          FROM ul_labels ul
          WHERE LOWER(COALESCE(ul.category, '')) = 'used'
            AND COALESCE(ul.is_consumed, 0) = 0
        ) AS ul_used_available,
        (
          SELECT COUNT(*)
          FROM igt_serial_numbers igt
          WHERE igt.is_active = 1
            AND igt.status = 'available'
        ) AS igt_available
    `);

    return {
      eyefi_available: Number(rows[0]?.eyefi_available || 0),
      ul_new_available: Number(rows[0]?.ul_new_available || 0),
      ul_used_available: Number(rows[0]?.ul_used_available || 0),
      igt_available: Number(rows[0]?.igt_available || 0),
    };
  }

  private sanitizeThreshold(value: unknown, fallback: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return fallback;
    }
    return Math.max(1, Math.round(numeric));
  }
}
