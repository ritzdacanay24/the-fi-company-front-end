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
  vehicleExpiringSoon: number;
  shortagesOpen: number;
  safetyIncidentOpen: number;
  qualityIssuesOpen: number;
  correctiveActionsOpen: number;
  returnsRmaOpen: number;
  permitChecklistOpen: number;
  shippingRequestOpen: number;
  graphicsProductionOpen: number;
  fieldsServiceRequestsOpen: number;
  trainingLiveSessionsOpen: number;
  inspectionChecklistExecutionInProgress: number;
}

@Injectable()
export class MenuBadgeRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getSidebarBadgeCounts(): Promise<SidebarMenuBadgeCounts> {
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
        AND m.queue_status NOT IN ('complete', 'cancelled')
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

      SELECT 'vehicleExpiringSoon' AS menu_id, COUNT(*) AS count
      FROM vehicleInformation v
      WHERE v.active = 1
        AND NULLIF(v.exp, '') IS NOT NULL
        AND DATEDIFF(STR_TO_DATE(v.exp, '%Y-%m-%d'), CURDATE()) BETWEEN 0 AND 30

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
      WHERE si.status IN ('In Process', 'Open')

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

      SELECT 'trainingLiveSessionsOpen' AS menu_id, COUNT(*) AS count
      FROM training_sessions ts
      WHERE ts.status IN ('scheduled', 'in-progress')

      UNION ALL

      SELECT 'inspectionChecklistExecutionInProgress' AS menu_id, COUNT(*) AS count
      FROM checklist_instances ci
      WHERE ci.status IN ('draft', 'in_progress', 'review')
    `);

    const defaults: SidebarMenuBadgeCounts = {
      validationQueue: 0,
      pickingQueue: 0,
      pickAndStageOpen: 0,
      productionRoutingOpen: 0,
      finalTestQcOpen: 0,
      vehicleExpiringSoon: 0,
      shortagesOpen: 0,
      safetyIncidentOpen: 0,
      qualityIssuesOpen: 0,
      correctiveActionsOpen: 0,
      returnsRmaOpen: 0,
      permitChecklistOpen: 0,
      shippingRequestOpen: 0,
      graphicsProductionOpen: 0,
      fieldsServiceRequestsOpen: 0,
      trainingLiveSessionsOpen: 0,
      inspectionChecklistExecutionInProgress: 0,
    };

    for (const row of rows) {
      const key = row.menu_id as keyof SidebarMenuBadgeCounts;
      if (!(key in defaults)) {
        continue;
      }
      defaults[key] = Number(row.count || 0);
    }

    return defaults;
  }
}
