import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';

type CountRow = {
  total_count: number | string;
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
    await this.refreshProductionRoutingBadgeCount();
  }

  @Cron('*/2 * * * *', {
    name: 'refresh-production-routing-badge-cache',
    timeZone: 'America/Los_Angeles',
  })
  async refreshProductionRoutingBadgeCountCron(): Promise<void> {
    await this.refreshProductionRoutingBadgeCount();
  }

  async refreshProductionRoutingBadgeCount(): Promise<void> {
    try {
      const count = await this.getProductionRoutingOpenCount();

      await this.mysqlService.execute(
        `
          INSERT INTO menu_badge_cache (menu_id, count)
          VALUES ('production-routing-open', ?)
          ON DUPLICATE KEY UPDATE
            count = VALUES(count),
            updated_at = CURRENT_TIMESTAMP
        `,
        [count],
      );
    } catch (error) {
      this.logger.error('Failed to refresh production routing badge cache', error as Error);
    }
  }

  private async getProductionRoutingOpenCount(): Promise<number> {
    // Keep this query minimal and index-friendly: only the fields needed for routing 20 badge count.
    const rows = await this.qadOdbcService.query<CountRow[]>(
      `
        SELECT COUNT(*) total_count
        FROM wr_route
        WHERE wr_domain = 'EYE'
          AND wr_status != 'c'
          AND wr_op = 20
          AND wr_qty_inque > 0
          AND wr_qty_ord != wr_qty_comp
      `,
      { keyCase: 'lower' },
    );

    return Number(rows[0]?.total_count || 0);
  }
}
