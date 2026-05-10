import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { SCHEDULED_JOB_DEFINITIONS } from '../scheduled-jobs/scheduled-jobs.definitions';

type CountRow = {
  pick_and_stage_open: number | string;
  production_routing_open: number | string;
  final_test_qc_open: number | string;
  shipping_schedule_due_now: number | string;
};

@Injectable()
export class MenuBadgeCacheRefreshService implements OnModuleInit {
  private readonly logger = new Logger(MenuBadgeCacheRefreshService.name);

  constructor(
    private readonly mysqlService: MysqlService,
    private readonly qadOdbcService: QadOdbcService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Prime cache once at startup so first badge read does not wait for the cron window.
    await this.refreshCachedBadgeCounts();
  }

  @Cron('0 0 * * * *', {
    name: 'refresh-cached-menu-badge-counts',
    timeZone: 'America/Los_Angeles',
  })
  async refreshCachedBadgeCountsCron(): Promise<void> {
    const jobDef = SCHEDULED_JOB_DEFINITIONS.find((j) => j.id === 'menu-badge-cache-refresh');
    if (jobDef && !jobDef.active) {
      return;
    }
    await this.refreshCachedBadgeCounts();
  }

  async refreshCachedBadgeCounts(): Promise<void> {
    try {
      const { pickAndStageOpen, productionRoutingOpen, finalTestQcOpen } = await this.getRoutingOpenCounts();
      const shippingScheduleDueNow = await this.getShippingScheduleDueNowCount();

      await this.mysqlService.execute(
        `
          INSERT INTO menu_badge_cache (menu_id, count)
          VALUES
            ('pick-and-stage-open', ?),
            ('production-routing-open', ?),
            ('final-test-qc-open', ?),
            ('shipping-schedule-due-now', ?)
          ON DUPLICATE KEY UPDATE
            count = VALUES(count),
            updated_at = CURRENT_TIMESTAMP
        `,
        [pickAndStageOpen, productionRoutingOpen, finalTestQcOpen, shippingScheduleDueNow],
      );
    } catch (error) {
      this.logger.error('Failed to refresh cached menu badge counts', error as Error);
    }
  }

  private async getRoutingOpenCounts(): Promise<{
    pickAndStageOpen: number;
    productionRoutingOpen: number;
    finalTestQcOpen: number;
  }> {
    // Single query to reduce QAD connection pressure and avoid parallel ODBC connects.
    const rows = await this.qadOdbcService.query<CountRow[]>(
      `
        SELECT
          SUM(CASE
            WHEN wr_op = 10
              AND wr_qty_ord != wr_qty_comp
              AND (
                CASE
                  WHEN COALESCE(wo.wo_so_job, '') = 'dropin' THEN wr_due
                  ELSE CASE
                    WHEN DAYOFWEEK(wr_due) IN (1, 2, 3) THEN wr_due - 4
                    WHEN DAYOFWEEK(wr_due) IN (4, 5, 6) THEN wr_due - 2
                    WHEN DAYOFWEEK(wr_due) IN (7) THEN wr_due - 3
                    ELSE wr_due - 2
                  END
                END
              ) <= CURDATE()
            THEN 1
            ELSE 0
          END) pick_and_stage_open,
          SUM(CASE
            WHEN wr_op = 20
              AND wr_qty_inque > 0
              AND wr_qty_ord != wr_qty_comp
            THEN 1
            ELSE 0
          END) production_routing_open,
          SUM(CASE
            WHEN wr_op = 30
              AND wr_qty_inque > 0
              AND wr_qty_ord != wr_qty_comp
            THEN 1
            ELSE 0
          END) final_test_qc_open
        FROM wr_route
        LEFT JOIN wo_mstr wo ON wo.wo_nbr = wr_route.wr_nbr
          AND wo.wo_domain = 'EYE'
        WHERE wr_domain = 'EYE'
          AND wr_status != 'c'
          AND wr_op IN (10, 20, 30)
      `,
      { keyCase: 'lower' },
    );

    return {
      pickAndStageOpen: Number(rows[0]?.pick_and_stage_open || 0),
      productionRoutingOpen: Number(rows[0]?.production_routing_open || 0),
      finalTestQcOpen: Number(rows[0]?.final_test_qc_open || 0),
    };
  }

  private async getShippingScheduleDueNowCount(): Promise<number> {
    const rows = await this.qadOdbcService.query<CountRow[]>(
      `
        SELECT COUNT(*) shipping_schedule_due_now
        FROM sod_det a
        JOIN so_mstr c ON c.so_nbr = a.sod_nbr
        WHERE a.sod_domain = 'EYE'
          AND c.so_domain = 'EYE'
          AND a.sod_qty_ord != a.sod_qty_ship
          AND c.so_compl_date IS NULL
          AND a.sod_project = ''
          AND a.sod_per_date IS NOT NULL
          AND a.sod_per_date <= CURDATE()
      `,
      { keyCase: 'lower' },
    );

    return Number(rows[0]?.shipping_schedule_due_now || 0);
  }
}
