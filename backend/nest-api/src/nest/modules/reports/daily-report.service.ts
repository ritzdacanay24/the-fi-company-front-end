import { Injectable } from '@nestjs/common';
import { toJsonSafe } from '@/shared/utils/json-safe.util';
import { DailyReportRepository } from './daily-report.repository';

@Injectable()
export class DailyReportService {
  constructor(private readonly repository: DailyReportRepository) {}

  async getDailyReport(): Promise<unknown> {
    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const fridayOffset = day === 0 ? -2 : 5 - day;
    const startCurrentWeek = new Date(today);
    startCurrentWeek.setDate(today.getDate() + mondayOffset);
    const endCurrentWeek = new Date(today);
    endCurrentWeek.setDate(today.getDate() + fridayOffset);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10);
    const nextThreeMonthEnd = new Date(today.getFullYear(), today.getMonth() + 4, 0).toISOString().slice(0, 10);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [summary, onTime, production, totalInventory, wip, transit, intgrtd, reject, eye01, jx01, all, fgLV, ss, threeMonthsRevenue, scheduledJobs, openBalanceCurrentMonthDetails, openLinesForCurrentWeek, ops10RoutingCompleted, openLinesToday, futureOpenRevenue, todaySoLines] = await Promise.all([
      this.repository.getDailyReportSummary(),
      this.repository.getDailyReportOnTime(),
      this.repository.getDailyReportProductionRouting(20),
      this.repository.getDailyReportTotalInventory(),
      this.repository.getDailyReportWip(),
      this.repository.getDailyReportLocationExtCost('TRANSIT'),
      this.repository.getDailyReportLocationExtCost('INTGRTD'),
      this.repository.getDailyReportLocationExtCost('REJECT'),
      this.repository.getDailyReportInventoryTurns('rmlv'),
      this.repository.getDailyReportInventoryTurns('jx01'),
      this.repository.getDailyReportInventoryTurns('all'),
      this.repository.getDailyReportInventoryTurns('fglv'),
      this.repository.getDailyReportSafetyStockTotal(),
      this.repository.getDailyReportThreeMonthsRevenue(nextMonthStart, nextThreeMonthEnd),
      this.repository.getDailyReportScheduledJobs(),
      this.repository.getDailyReportOpenBalanceCurrentMonthDetails(startOfMonth, endOfMonth),
      this.repository.getDailyReportOpenLinesForCurrentWeek(startCurrentWeek.toISOString().slice(0, 10), endCurrentWeek.toISOString().slice(0, 10)),
      this.repository.getDailyReportOpsCompleted(todayString, todayString, 10),
      this.repository.getDailyReportOpenLinesToday(todayString),
      this.repository.getDailyReportFutureOpenRevenue(tomorrow.toISOString().slice(0, 10), endOfMonth),
      this.repository.getDailyReportSoLinesForDate(todayString),
    ]);

    const openBalanceSoLines = [...new Set(openBalanceCurrentMonthDetails.map((row) => String(row['so_line'] ?? '')).filter(Boolean))];
    const [openBalanceOwners, lateReasonCodes] = await Promise.all([
      this.repository.getDailyReportOwnersBySoLines(openBalanceSoLines),
      this.repository.getDailyReportLateReasonCodesBySoLines(todaySoLines),
    ]);

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
            due_open: this.toNumber(production['due_today_not_completed']),
            due_completed_today: this.toNumber(production['completed_before_or_on_due_date']),
            due_total: this.toNumber(production['today_count']),
            total_overdue_orders: this.toNumber(production['total_overdue_orders']),
            due_percent: this.toNumber(production['today_count']) > 0
              ? (this.toNumber(production['completed_before_or_on_due_date']) / this.toNumber(production['today_count'])) * 100
              : 0,
          },
        },
      },
      scheduledJobs: parsedScheduledJobs,
      openBalanceCurrentMonth,
      openLinesForCurrentWeek: this.toNumber(openLinesForCurrentWeek['value']),
      lateReasonCodes: lateReasonCodes.map((row) => ({ lateReasonCode: row['latereasoncode'], value: this.toNumber(row['value']) })),
      ops10RoutingCompleted: this.toNumber(ops10RoutingCompleted['value']),
      openLinesToday: this.toNumber(openLinesToday['value']),
      futuerOpenRevenueCurrentMonth: {
        dateFrom: tomorrow.toISOString().slice(0, 10),
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
