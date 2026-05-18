import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { SCHEDULED_JOB_DEFINITIONS } from '../scheduled-jobs/scheduled-jobs.definitions';

type CountRow = {
  pick_and_stage_open: number | string;
  production_routing_open: number | string;
  final_test_qc_open: number | string;
  shipping_schedule_due_now: number | string;
};

type SerialThresholds = {
  eyefi: number;
  ul_new: number;
  ul_used: number;
  igt: number;
};

const DEFAULT_SERIAL_THRESHOLDS: SerialThresholds = {
  eyefi: 300,
  ul_new: 150,
  ul_used: 100,
  igt: 200,
};

interface SerialThresholdRow extends RowDataPacket {
  setting_value?: string;
}

interface SerialAvailabilitySummaryRow extends RowDataPacket {
  eyefi_available: number | string;
  ul_new_available: number | string;
  ul_used_available: number | string;
  igt_available: number | string;
}

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
      const { lowStock, criticalStock } = await this.getSerialManagementStockBadgeCounts();

      await this.mysqlService.execute(
        `
          INSERT INTO menu_badge_cache (menu_id, count)
          VALUES
            ('pick-and-stage-open', ?),
            ('production-routing-open', ?),
            ('final-test-qc-open', ?),
            ('shipping-schedule-due-now', ?),
            ('serial-management-low-stock', ?),
            ('serial-management-critical-stock', ?)
          ON DUPLICATE KEY UPDATE
            count = VALUES(count),
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          pickAndStageOpen,
          productionRoutingOpen,
          finalTestQcOpen,
          shippingScheduleDueNow,
          lowStock,
          criticalStock,
        ],
      );
    } catch (error) {
      this.logger.error('Failed to refresh cached menu badge counts', error as Error);
    }
  }

  private async getSerialManagementStockBadgeCounts(): Promise<{ lowStock: number; criticalStock: number }> {
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
  }

  private async getSerialStockThresholds(): Promise<SerialThresholds> {
    const rows = await this.mysqlService.query<SerialThresholdRow[]>(
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
    const rows = await this.mysqlService.query<SerialAvailabilitySummaryRow[]>(`
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
