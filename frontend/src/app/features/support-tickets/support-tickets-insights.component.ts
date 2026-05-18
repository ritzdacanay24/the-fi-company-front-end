import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { SupportTicket, SupportTicketType, SUPPORT_TICKET_TYPE_LABELS } from '@app/shared/models/support-ticket.model';
import moment from 'moment';

@Component({
  selector: 'app-support-tickets-insights',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './support-tickets-insights.component.html',
  styleUrls: ['./support-tickets-insights.component.scss'],
})
export class SupportTicketsInsightsComponent {
  private readonly managerChartColors = ['#0d6efd', '#f7b84b', '#198754', '#6c757d'];
  private readonly errorTypeChartColors = ['#0d6efd', '#dc3545'];
  private readonly errorTypeKeys: SupportTicketType[] = ['bug', 'incident_outage'];
  private readonly weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  readonly timeBucketOptions = [1, 2, 3, 4, 6];

  private readonly ticketsData = signal<SupportTicket[]>([]);
  readonly timeBucketHours = signal<number>(3);

  @Input() set tickets(value: SupportTicket[] | null | undefined) {
    this.ticketsData.set(value ?? []);
  }

  readonly errorTickets = computed(() =>
    this.ticketsData().filter((ticket) => ticket.type === 'bug' || ticket.type === 'incident_outage'),
  );

  readonly errorTotal = computed(() => this.errorTickets().length);

  readonly errorOpenCount = computed(() =>
    this.errorTickets().filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress').length,
  );

  readonly errorTypeRows = computed<Array<{ key: SupportTicketType; label: string; count: number }>>(() =>
    this.errorTypeKeys.map((key) => ({
      key,
      label: SUPPORT_TICKET_TYPE_LABELS[key],
      count: this.errorTickets().filter((ticket) => ticket.type === key).length,
    })),
  );

  readonly timeBuckets = computed<string[]>(() => this.buildTimeBuckets(this.timeBucketHours()));

  readonly ownerErrorRows = computed<
    Array<{ owner: string; open: number; in_progress: number; resolved: number; closed: number; total: number }>
  >(() => {
    const rows = new Map<string, { open: number; in_progress: number; resolved: number; closed: number; total: number }>();

    for (const ticket of this.errorTickets()) {
      const owner = this.getOwnerLabel(ticket);
      const current = rows.get(owner) ?? { open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 };
      current[ticket.status] += 1;
      current.total += 1;
      rows.set(owner, current);
    }

    return Array.from(rows.entries())
      .map(([owner, counts]) => ({ owner, ...counts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  });

  readonly errorByOwnerChartOptions = computed<{
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    grid: ApexGrid;
    plotOptions: ApexPlotOptions;
    colors: string[];
    dataLabels: ApexDataLabels;
    legend: ApexLegend;
    stroke: ApexStroke;
    tooltip: ApexTooltip;
  }>(() => ({
    series: [
      { name: 'Open', data: this.ownerErrorRows().map((row) => row.open) },
      { name: 'In Progress', data: this.ownerErrorRows().map((row) => row.in_progress) },
      { name: 'Resolved', data: this.ownerErrorRows().map((row) => row.resolved) },
      { name: 'Closed', data: this.ownerErrorRows().map((row) => row.closed) },
    ],
    chart: { type: 'bar', stacked: true, height: 320, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, barHeight: '70%' } },
    xaxis: {
      categories: this.ownerErrorRows().map((row) => row.owner),
      title: { text: 'Total errors' },
    },
    yaxis: { min: 0, title: { text: undefined } },
    grid: { borderColor: '#dee2e6', strokeDashArray: 3 },
    colors: this.managerChartColors,
    dataLabels: { enabled: false },
    legend: { show: true, position: 'top' },
    stroke: { width: 1, colors: ['#fff'] },
    tooltip: {
      y: { formatter: (value: number) => `${value} ticket${value === 1 ? '' : 's'}` },
    },
  }));

  readonly errorByTimeHeatmapSeries = computed<Array<{ name: string; data: Array<{ x: string; y: number }> }>>(() => {
    const bucketHours = this.timeBucketHours();
    const buckets = this.timeBuckets();
    const matrix: number[][] = Array.from({ length: 7 }, () => Array.from({ length: buckets.length }, () => 0));

    for (const ticket of this.errorTickets()) {
      const created = moment(ticket.created_at);
      if (!created.isValid()) {
        continue;
      }

      const weekday = created.day();
      const hour = created.hour();
      const bucket = Math.floor(hour / bucketHours);
      matrix[weekday][bucket] += 1;
    }

    return this.weekdayNames.map((day, dayIndex) => ({
      name: day,
      data: buckets.map((bucket, bucketIndex) => ({ x: bucket, y: matrix[dayIndex][bucketIndex] })),
    }));
  });

  readonly errorByTimeChartOptions = computed<{
    series: Array<{ name: string; data: Array<{ x: string; y: number }> }>;
    chart: ApexChart;
    dataLabels: ApexDataLabels;
    xaxis: ApexXAxis;
    grid: ApexGrid;
    tooltip: ApexTooltip;
    plotOptions: ApexPlotOptions;
    legend: ApexLegend;
  }>(() => ({
    series: this.errorByTimeHeatmapSeries(),
    chart: { type: 'heatmap', height: 320, toolbar: { show: false } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: this.timeBuckets(),
      title: { text: `Time of day (${this.timeBucketHours()}h buckets)` },
    },
    grid: { borderColor: '#dee2e6', strokeDashArray: 2 },
    tooltip: {
      y: { formatter: (value: number) => `${value} error${value === 1 ? '' : 's'}` },
    },
    legend: { show: false },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            { from: 0, to: 0, name: 'None', color: '#f1f3f5' },
            { from: 1, to: 2, name: 'Low', color: '#b6d4fe' },
            { from: 3, to: 5, name: 'Medium', color: '#6ea8fe' },
            { from: 6, to: 9999, name: 'High', color: '#0d6efd' },
          ],
        },
      },
    },
  }));

  readonly errorByTypeChartOptions = computed<{
    series: ApexNonAxisChartSeries;
    chart: ApexChart;
    labels: string[];
    colors: string[];
    dataLabels: ApexDataLabels;
    legend: ApexLegend;
    tooltip: ApexTooltip;
    plotOptions: ApexPlotOptions;
    stroke: ApexStroke;
  }>(() => ({
    series: this.errorTypeRows().map((row) => row.count),
    chart: { type: 'donut', height: 320, toolbar: { show: false } },
    labels: this.errorTypeRows().map((row) => row.label),
    colors: this.errorTypeChartColors,
    dataLabels: { enabled: true },
    legend: { position: 'bottom', fontSize: '12px' },
    tooltip: {
      y: { formatter: (value: number) => `${value} error${value === 1 ? '' : 's'}` },
    },
    plotOptions: { pie: { donut: { size: '65%' } } },
    stroke: { width: 1, colors: ['#ffffff'] },
  }));

  onTimeBucketChange(value: string | number): void {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0 || 24 % parsed !== 0) {
      return;
    }

    this.timeBucketHours.set(parsed);
  }

  private getOwnerLabel(ticket: SupportTicket): string {
    if (ticket.user_email) {
      return ticket.user_email;
    }

    if (Number(ticket.user_id) > 0) {
      return `User #${ticket.user_id}`;
    }

    return 'Unassigned';
  }

  private buildTimeBuckets(hoursPerBucket: number): string[] {
    const labels: string[] = [];
    const bucketCount = 24 / hoursPerBucket;

    for (let i = 0; i < bucketCount; i += 1) {
      const startHour = i * hoursPerBucket;
      const endHour = (startHour + hoursPerBucket) % 24;
      labels.push(`${this.formatHourLabel(startHour)}-${this.formatHourLabel(endHour)}`);
    }

    return labels;
  }

  private formatHourLabel(hour24: number): string {
    const normalized = hour24 % 24;
    if (normalized === 0) {
      return '12a';
    }

    if (normalized < 12) {
      return `${normalized}a`;
    }

    if (normalized === 12) {
      return '12p';
    }

    return `${normalized - 12}p`;
  }
}
