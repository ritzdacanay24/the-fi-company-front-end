import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

type CountRow = {
  pick_and_stage_open: number | string;
  production_routing_open: number | string;
  final_test_qc_open: number | string;
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
    await this.refreshRoutingBadgeCounts();
  }

  @Cron('*/2 * * * *', {
    name: 'refresh-routing-badge-cache',
    timeZone: 'America/Los_Angeles',
  })
  async refreshRoutingBadgeCountCron(): Promise<void> {
    await this.refreshRoutingBadgeCounts();
  }

  async refreshRoutingBadgeCounts(): Promise<void> {
    try {
      const { pickAndStageOpen, productionRoutingOpen, finalTestQcOpen } = await this.getRoutingOpenCounts();

      await this.mysqlService.execute(
        `
          INSERT INTO menu_badge_cache (menu_id, count)
          VALUES
            ('pick-and-stage-open', ?),
            ('production-routing-open', ?),
            ('final-test-qc-open', ?)
          ON DUPLICATE KEY UPDATE
            count = VALUES(count),
            updated_at = CURRENT_TIMESTAMP
        `,
        [pickAndStageOpen, productionRoutingOpen, finalTestQcOpen],
      );
    } catch (error) {
      this.logger.error('Failed to refresh routing badge cache', error as Error);
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
}
