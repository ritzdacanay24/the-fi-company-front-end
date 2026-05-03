import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { ScheduledJobHandler, ScheduledJobRunResultDto } from './scheduled-job.handler';

interface BadgeCount extends RowDataPacket {
  badge_key: string;
  count: number;
}

@Injectable()
export class MenuBadgeCacheRefreshHandler implements ScheduledJobHandler {
  private readonly logger = new Logger(MenuBadgeCacheRefreshHandler.name);

  constructor(private readonly mysqlService: MysqlService) {}

  async handle(trigger: 'manual' | 'cron'): Promise<ScheduledJobRunResultDto> {
    const startedAtMs = Date.now();

    try {
      // Get pending approvals count
      const pendingApprovals = await this.mysqlService.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM approvals WHERE status = 'pending'
      `);

      // Get pending field service requests count
      const pendingFSRequests = await this.mysqlService.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM fs_request WHERE active = 1 AND status = 'pending'
      `);

      // Get open material requests count
      const openMaterialRequests = await this.mysqlService.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM material_request WHERE status = 'open'
      `);

      // Get unread notifications count
      const unreadNotifications = await this.mysqlService.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count FROM notification WHERE read_date IS NULL
      `);

      const badges = {
        approvals: pendingApprovals[0]?.count ?? 0,
        field_service_requests: pendingFSRequests[0]?.count ?? 0,
        material_requests: openMaterialRequests[0]?.count ?? 0,
        notifications: unreadNotifications[0]?.count ?? 0,
      };

      // Update cache table or store in application cache
      await this.mysqlService.query(`
        INSERT INTO cache (key, value, expires_at)
        VALUES 
          ('menu_badge_approvals', ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE)),
          ('menu_badge_fs_requests', ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE)),
          ('menu_badge_material_requests', ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE)),
          ('menu_badge_notifications', ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))
        ON DUPLICATE KEY UPDATE 
          value = VALUES(value),
          expires_at = VALUES(expires_at)
      `, [
        badges.approvals,
        badges.field_service_requests,
        badges.material_requests,
        badges.notifications,
      ]);

      const durationMs = Date.now() - startedAtMs;
      const summary = `Approvals: ${badges.approvals}, FS Requests: ${badges.field_service_requests}, Material Requests: ${badges.material_requests}, Notifications: ${badges.notifications}`;
      this.logger.log(`[${trigger}] menu-badge-cache-refresh -> ${summary} in ${durationMs}ms`);

      return {
        id: 'menu-badge-cache-refresh',
        name: 'Menu Badge Cache Refresh',
        trigger,
        ok: true,
        statusCode: 200,
        durationMs,
        message: `Badge cache updated: ${summary}`,
        lastRun: {
          startedAt: new Date(startedAtMs).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
          status: 'success',
          triggerType: trigger,
          errorMessage: null,
        },
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startedAtMs;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${trigger}] menu-badge-cache-refresh failed in ${durationMs}ms: ${message}`);

      return {
        id: 'menu-badge-cache-refresh',
        name: 'Menu Badge Cache Refresh',
        trigger,
        ok: false,
        statusCode: 500,
        durationMs,
        message,
        lastRun: {
          startedAt: new Date(startedAtMs).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
          status: 'failure',
          triggerType: trigger,
          errorMessage: message,
        },
      };
    }
  }
}
