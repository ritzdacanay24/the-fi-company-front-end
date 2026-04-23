import { Injectable } from '@nestjs/common';
import { toJsonSafe } from '@/shared/utils/json-safe.util';
import { DailyReportRepository } from './daily-report.repository';

@Injectable()
export class DailyReportService {
  constructor(private readonly repository: DailyReportRepository) {}

  private getLegacyNow(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getDailyReport(): Promise<unknown> {
    const today = this.getLegacyNow();
    const todayString = this.formatDate(today);
    const startOfMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfMonth = this.formatDate(startOfMonthDate);
    const endOfMonth = this.formatDate(endOfMonthDate);
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const fridayOffset = day === 0 ? -2 : 5 - day;
    const startCurrentWeek = new Date(today);
    startCurrentWeek.setDate(today.getDate() + mondayOffset);
    const endCurrentWeek = new Date(today);
    endCurrentWeek.setDate(today.getDate() + fridayOffset);
    const nextMonthStartDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextThreeMonthEndDate = new Date(today.getFullYear(), today.getMonth() + 4, 0);
    const nextMonthStart = this.formatDate(nextMonthStartDate);
    const nextThreeMonthEnd = this.formatDate(nextThreeMonthEndDate);

    const [summary, onTime, productionRouting, totalInventory, wip, transit, intgrtd, reject, inventoryTurns, ss, threeMonthsRevenue, scheduledJobs, openBalanceCurrentMonthDetails, openLinesForCurrentWeek, futureOpenRevenue, todaySoLines, ops10Routing] = await Promise.all([
      this.repository.getDailyReportSummary(),
      this.repository.getDailyReportOnTime(),
      this.repository.getDailyReportProductionRouting(20),
      this.repository.getDailyReportTotalInventory(),
      this.repository.getDailyReportWip(),
      this.repository.getDailyReportLocationExtCost('TRANSIT'),
      this.repository.getDailyReportLocationExtCost('INTGRTD'),
      this.repository.getDailyReportLocationExtCost('REJECT'),
      this.repository.getDailyReportInventoryTurnsCombined(),
      this.repository.getDailyReportSafetyStockTotal(),
      this.repository.getDailyReportThreeMonthsRevenue(nextMonthStart, nextThreeMonthEnd),
      this.repository.getDailyReportScheduledJobs(),
      this.repository.getDailyReportOpenBalanceCurrentMonthDetails(startOfMonth, endOfMonth),
      this.repository.getDailyReportOpenLinesForCurrentWeek(this.formatDate(startCurrentWeek), this.formatDate(endCurrentWeek)),
      this.repository.getDailyReportFutureOpenRevenue(startOfMonth, endOfMonth),
      this.repository.getDailyReportSoLinesForDate(todayString),
      this.repository.getDailyReportOpsCompleted(todayString, todayString, 10),
    ]);

    const openBalanceSoLines = [...new Set(openBalanceCurrentMonthDetails.map((row) => String(row['so_line'] ?? '')).filter(Boolean))];
    const [openBalanceOwners, lateReasonCodes] = await Promise.all([
      this.repository.getDailyReportOwnersBySoLines(openBalanceSoLines),
      this.repository.getDailyReportLateReasonCodesBySoLines(todaySoLines),
    ]);

    const eye01 = {
      lessthanone: inventoryTurns['rmlv_lessthanone'] ?? 0,
      greaterthanorequaltoone: inventoryTurns['rmlv_greaterthanorequaltoone'] ?? 0,
      total: inventoryTurns['rmlv_total'] ?? 0,
    };
    const jx01 = {
      lessthanone: inventoryTurns['jx01_lessthanone'] ?? 0,
      greaterthanorequaltoone: inventoryTurns['jx01_greaterthanorequaltoone'] ?? 0,
      total: inventoryTurns['jx01_total'] ?? 0,
    };
    const all = {
      lessthanone: inventoryTurns['all_lessthanone'] ?? 0,
      greaterthanorequaltoone: inventoryTurns['all_greaterthanorequaltoone'] ?? 0,
      total: inventoryTurns['all_total'] ?? 0,
    };
    const fgLV = {
      lessthanone: inventoryTurns['fglv_lessthanone'] ?? 0,
      greaterthanorequaltoone: inventoryTurns['fglv_greaterthanorequaltoone'] ?? 0,
      total: inventoryTurns['fglv_total'] ?? 0,
    };

    const ownerSet = new Set(openBalanceOwners.map((row) => String(row['so'] ?? '')));
    const openBalanceCurrentMonth = openBalanceCurrentMonthDetails.reduce((total, row) => {
      const soLine = String(row['so_line'] ?? '');
      if (!ownerSet.has(soLine)) {
        return total;
      }
      return total + this.toNumber(row['value']);
    }, 0);

    const normalizedOnTime = onTime.map((row) => ({
      so_cust: row['so_cust'],
      shipped_before_or_on_due_date: this.toNumber(row['shipped_before_or_on_due_date']),
      shipped_after_due_date: this.toNumber(row['shipped_after_due_date']),
      total_shipped_today: this.toNumber(row['total_shipped_today']),
      total_value_shipped_today: this.toNumber(row['total_value_shipped_today']),
      total_lines_today: this.toNumber(row['toal_lines_today'] ?? row['total_lines_today'] ?? row['total_shipped_today']),
      toal_lines_today: this.toNumber(row['toal_lines_today'] ?? row['total_lines_today'] ?? row['total_shipped_today']),
    }));

    const totalShippedToday = normalizedOnTime.reduce((total, row) => total + this.toNumber(row.total_shipped_today), 0);
    const totalValueShippedToday = normalizedOnTime.reduce((total, row) => total + this.toNumber(row.total_value_shipped_today), 0);
    const shippedBeforeOrOnDueDate = normalizedOnTime.reduce((total, row) => total + this.toNumber(row.shipped_before_or_on_due_date), 0);

    const parsedScheduledJobs = scheduledJobs.map((row) => ({
      ...row,
      data: typeof row['data'] === 'string' ? JSON.parse(String(row['data'])) : row['data'],
    }));

    return toJsonSafe({
      status: 'Live Report',
      last_refreshed: `${todayString} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`,
      wip: this.toNumber(wip['wo_wip_tot']),
      inventory_value: this.toNumber(totalInventory['sum_count']),
      shipping_open_overdue_and_due_today_lines: this.toNumber(summary['open_total_lines']),
      shipping_open_overdue_and_due_today_value: this.toNumber(summary['total_lines_overdue_value']),
      shipping_total_shipped_value: totalValueShippedToday,
      total_shipped_today_lines: totalShippedToday,
      percent_plan_overall_completed: this.toNumber(summary['percent_plan_overall_completed']),
      total_open: this.toNumber(summary['total_open']),
      value_percentage_today_completed: this.toNumber(summary['value_percentage_today_completed']),
      total_open_value_today: this.toNumber(summary['total_open_value_today']),
      on_time_delivery_today: shippedBeforeOrOnDueDate,
      on_time_delivery_today_percent: totalShippedToday > 0 ? (shippedBeforeOrOnDueDate / totalShippedToday) * 100 : 0,
      total_lines_due_today: totalShippedToday,
      total_open_value: this.toNumber(summary['total_open_value']),
      transit_total_ext_cost: this.toNumber(transit['total_ext_cost']),
      intgrtd_total_ext_cost: this.toNumber(intgrtd['total_ext_cost']),
      reject_total_ext_cost: this.toNumber(reject['total_ext_cost']),
      onTime: normalizedOnTime,
      eye01,
      jx01,
      all,
      fgLV,
      ss,
      getThreeMonthsRevenue: { value: this.toNumber(threeMonthsRevenue['value']) },
      production: {
        production_routing_20: {
          due: {
            due_open: this.toNumber(productionRouting['due_today_not_completed']),
            due_completed_today: this.toNumber(productionRouting['completed_before_or_on_due_date']),
            due_total: this.toNumber(productionRouting['today_count']),
            total_overdue_orders: this.toNumber(productionRouting['total_overdue_orders']),
            due_percent: this.toNumber(productionRouting['today_count']) > 0
              ? (this.toNumber(productionRouting['completed_before_or_on_due_date']) / this.toNumber(productionRouting['today_count'])) * 100
              : 0,
          },
        },
      },
      scheduledJobs: parsedScheduledJobs,
      openBalanceCurrentMonth,
      openLinesForCurrentWeek: this.toNumber(openLinesForCurrentWeek['value']),
      lateReasonCodes: lateReasonCodes.map((row) => ({ lateReasonCode: row['latereasoncode'], value: this.toNumber(row['value']) })),
      ops10RoutingCompleted: this.toNumber(ops10Routing['value']),
      openLinesToday: todaySoLines.length,
      futuerOpenRevenueCurrentMonth: {
        dateFrom: startOfMonth,
        dateTo: endOfMonth,
        value: this.toNumber(futureOpenRevenue['value']),
      },
    });
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }
}
