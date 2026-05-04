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
  fieldsServiceRequestsOpen: number;
  partsOrderOpen: number;
  trainingLiveSessionsOpen: number;
  inspectionChecklistExecutionInProgress: number;
  pmProjectsOpen: number;
  pmTasksOpen: number;
}

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
        AND q.status IN ('Open', 'In Process')

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
      WHERE LOWER(COALESCE(p.status, 'open')) NOT IN ('closed', 'completed', 'cancelled')

      UNION ALL

      SELECT 'shippingRequestOpen' AS menu_id, COUNT(*) AS count
      FROM forms.shipping_request sr
      WHERE sr.active = 1
        AND sr.completedDate IS NULL

      UNION ALL

      SELECT 'graphicsProductionOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.graphicsSchedule gp
      WHERE gp.active = 1
        AND gp.qty - gp.qtyShipped <> 0

      UNION ALL

      SELECT 'fieldsServiceRequestsOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.fs_request fr
      LEFT JOIN eyefidb.fs_scheduler fs ON fs.request_id = fr.id
      WHERE fr.active = 1
        AND fs.id IS NULL

      UNION ALL

      SELECT 'partsOrderOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.fs_parts_order po
      WHERE po.tracking_number IS NULL
         OR TRIM(po.tracking_number) = ''

      UNION ALL

      SELECT 'trainingLiveSessionsOpen' AS menu_id, COUNT(*) AS count
      FROM training_sessions ts
      WHERE ts.status IN ('scheduled', 'in-progress')

      UNION ALL

      SELECT 'inspectionChecklistExecutionInProgress' AS menu_id, COUNT(*) AS count
      FROM checklist_instances ci
      WHERE ci.status IN ('draft', 'in_progress', 'review')

      UNION ALL

      SELECT 'pmProjectsOpen' AS menu_id, COUNT(*) AS count
      FROM eyefidb.pm_projects pp
    `);

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
      fieldsServiceRequestsOpen: 0,
      partsOrderOpen: 0,
      trainingLiveSessionsOpen: 0,
      inspectionChecklistExecutionInProgress: 0,
      pmProjectsOpen: 0,
      pmTasksOpen: 0,
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
}
