import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { first } from 'rxjs/operators';
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
import { AuthenticationService } from '@app/core/services/auth.service';
import { ChecklistInstance, PhotoChecklistConfigService } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';

type ScopeFilter = 'all' | 'active' | 'mine';

type AxisChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  colors: string[];
};

type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  colors: string[];
};

@Component({
  standalone: true,
  selector: 'app-checklist-reports',
  imports: [CommonModule, FormsModule, RouterModule, NgApexchartsModule],
  templateUrl: './checklist-reports.component.html',
  styleUrls: ['./checklist-reports.component.scss'],
})
export class ChecklistReportsComponent implements OnInit {
  loading = false;
  instances: ChecklistInstance[] = [];
  filteredInstances: ChecklistInstance[] = [];
  private chartReflowQueued = false;

  quickSearch = '';
  dateFrom = '';
  dateTo = '';
  scope: ScopeFilter = 'all';

  readonly statusPalette: Record<string, string> = {
    draft: '#6c757d',
    in_progress: '#f7b84b',
    review: '#299cdb',
    completed: '#0ab39c',
    submitted: '#405189',
  };

  readonly statusLabels: Record<string, string> = {
    draft: 'Draft',
    in_progress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
    submitted: 'Submitted',
  };

  statusDonutChart: DonutChartOptions = {
    series: [],
    chart: {
      type: 'donut',
      height: 300,
      toolbar: { show: false },
    },
    labels: [],
    dataLabels: { enabled: true },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} inspections`,
      },
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '66%',
        },
      },
    },
    colors: [],
  };

  progressBucketChart: AxisChartOptions = {
    series: [{ name: 'Inspections', data: [] }],
    chart: {
      type: 'bar',
      height: 300,
      toolbar: { show: false },
    },
    xaxis: {
      categories: [],
      title: { text: 'Completion Bucket' },
    },
    yaxis: {
      title: { text: 'Count' },
    },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4 },
    stroke: { width: 0 },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} inspections`,
      },
    },
    legend: { show: false },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '48%',
        borderRadius: 4,
      },
    },
    colors: ['#0ab39c'],
  };

  trendChart: AxisChartOptions = {
    series: [
      { name: 'Created', data: [] },
      { name: 'Completed', data: [] },
      { name: 'Submitted', data: [] },
    ],
    chart: {
      type: 'line',
      height: 320,
      toolbar: { show: false },
    },
    xaxis: {
      categories: [],
      title: { text: 'Day' },
    },
    yaxis: {
      title: { text: 'Inspections' },
      min: 0,
      forceNiceScale: true,
    },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4 },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    tooltip: {
      shared: true,
      intersect: false,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
    },
    plotOptions: {},
    colors: ['#405189', '#0ab39c', '#299cdb'],
  };

  operatorChart: AxisChartOptions = {
    series: [{ name: 'Assigned', data: [] }],
    chart: {
      type: 'bar',
      height: 320,
      toolbar: { show: false },
    },
    xaxis: {
      categories: [],
      title: { text: 'Inspections' },
    },
    yaxis: {
      title: { text: '' },
    },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4 },
    stroke: { width: 0 },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} assigned`,
      },
    },
    legend: { show: false },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        borderRadius: 4,
      },
    },
    colors: ['#f7b84b'],
  };

  templatePerformanceChart: AxisChartOptions = {
    series: [{ name: 'Avg Progress %', data: [] }],
    chart: {
      type: 'bar',
      height: 320,
      toolbar: { show: false },
    },
    xaxis: {
      categories: [],
      title: { text: 'Template' },
      labels: {
        rotate: -20,
        trim: true,
      },
    },
    yaxis: {
      title: { text: 'Average Progress %' },
      min: 0,
      max: 100,
    },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4 },
    stroke: { width: 0 },
    tooltip: {
      y: {
        formatter: (value: number) => `${value.toFixed(1)}%`,
      },
    },
    legend: { show: false },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '42%',
        borderRadius: 4,
      },
    },
    colors: ['#299cdb'],
  };

  templateUsageChart: AxisChartOptions = {
    series: [{ name: 'Inspections', data: [] }],
    chart: {
      type: 'bar',
      height: 320,
      toolbar: { show: false },
    },
    xaxis: {
      categories: [],
      title: { text: 'Inspections' },
    },
    yaxis: {
      title: { text: '' },
    },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4 },
    stroke: { width: 0 },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} inspections`,
      },
    },
    legend: { show: false },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '62%',
        borderRadius: 4,
      },
    },
    colors: ['#7a6fbe'],
  };

  templateAvgTimeChart: AxisChartOptions = {
    series: [{ name: 'Avg Hours', data: [] }],
    chart: {
      type: 'bar',
      height: 320,
      toolbar: { show: false },
    },
    xaxis: {
      categories: [],
      title: { text: 'Template' },
      labels: {
        rotate: -20,
        trim: true,
      },
    },
    yaxis: {
      title: { text: 'Average Completion Time (hours)' },
      min: 0,
    },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4 },
    stroke: { width: 0 },
    tooltip: {
      y: {
        formatter: (value: number) => `${value.toFixed(2)} hrs`,
      },
    },
    legend: { show: false },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '42%',
        borderRadius: 4,
      },
    },
    colors: ['#405189'],
  };

  constructor(
    private readonly photoChecklistConfigService: PhotoChecklistConfigService,
    private readonly authService: AuthenticationService
  ) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.dateFrom = this.toDateInputValue(thirtyDaysAgo);
    this.dateTo = this.toDateInputValue(today);
  }

  ngOnInit(): void {
    this.loadInstances();
  }

  loadInstances(): void {
    this.loading = true;
    this.photoChecklistConfigService
      .getInstances()
      .pipe(first())
      .subscribe({
        next: (instances) => {
          this.instances = instances || [];
          this.applyFilters();
          this.loading = false;
        },
        error: () => {
          this.instances = [];
          this.applyFilters();
          this.loading = false;
        },
      });
  }

  applyFilters(): void {
    const from = this.dateFrom ? new Date(`${this.dateFrom}T00:00:00`) : null;
    const to = this.dateTo ? new Date(`${this.dateTo}T23:59:59`) : null;
    const search = this.quickSearch.trim().toLowerCase();

    const currentUser = this.authService.currentUser();
    const currentUserIdCandidates = this.getCurrentUserIdCandidates(currentUser);
    const currentUserName = this.getCurrentUserName(currentUser);

    this.filteredInstances = (this.instances || []).filter((instance) => {
      const createdAt = this.parseDate(instance.created_at);
      if (from && (!createdAt || createdAt < from)) return false;
      if (to && (!createdAt || createdAt > to)) return false;

      if (this.scope === 'active' && !this.isActiveStatus(instance.status)) {
        return false;
      }

      if (this.scope === 'mine') {
        const operatorId = String(instance.operator_id ?? '').trim();
        const operatorName = this.normalizeText(instance.operator_name || '');
        const idMatch = currentUserIdCandidates.includes(operatorId);
        const nameMatch = !!currentUserName && currentUserName === operatorName;
        if (!idMatch && !nameMatch) {
          return false;
        }
      }

      if (!search) {
        return true;
      }

      const haystack = [
        instance.work_order_number,
        instance.serial_number,
        instance.part_number,
        instance.template_name,
        instance.operator_name,
        instance.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });

    this.updateCharts();
  }

  onScopeChange(scope: ScopeFilter): void {
    this.scope = scope;
    this.applyFilters();
  }

  get totalInspections(): number {
    return this.filteredInstances.length;
  }

  get activeInspections(): number {
    return this.filteredInstances.filter((item) => this.isActiveStatus(item.status)).length;
  }

  get completedOrSubmitted(): number {
    return this.filteredInstances.filter((item) => ['completed', 'submitted'].includes(String(item.status))).length;
  }

  get avgProgress(): number {
    if (!this.filteredInstances.length) return 0;
    const total = this.filteredInstances.reduce((sum, item) => sum + this.toNumber(item.progress_percentage), 0);
    return total / this.filteredInstances.length;
  }

  get evidenceCoverage(): number {
    if (!this.filteredInstances.length) return 0;
    const withPhotos = this.filteredInstances.filter((item) => this.toNumber(item.photo_count) > 0).length;
    return (withPhotos / this.filteredInstances.length) * 100;
  }

  get completionRate(): number {
    if (!this.filteredInstances.length) return 0;
    return (this.completedOrSubmitted / this.filteredInstances.length) * 100;
  }

  getScopeCount(scope: ScopeFilter): number {
    if (scope === 'all') return (this.instances || []).length;
    if (scope === 'active') return (this.instances || []).filter((item) => this.isActiveStatus(item.status)).length;

    const currentUser = this.authService.currentUser();
    const currentUserIdCandidates = this.getCurrentUserIdCandidates(currentUser);
    const currentUserName = this.getCurrentUserName(currentUser);

    return (this.instances || []).filter((instance) => {
      const operatorId = String(instance.operator_id ?? '').trim();
      const operatorName = this.normalizeText(instance.operator_name || '');
      return currentUserIdCandidates.includes(operatorId) || (!!currentUserName && currentUserName === operatorName);
    }).length;
  }

  private updateCharts(): void {
    this.updateStatusChart();
    this.updateProgressBucketChart();
    this.updateTrendChart();
    this.updateOperatorChart();
    this.updateTemplateUsageChart();
    this.updateTemplatePerformanceChart();
    this.updateTemplateAverageTimeChart();
    this.queueChartReflow();
  }

  private queueChartReflow(): void {
    if (this.chartReflowQueued) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    this.chartReflowQueued = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        this.chartReflowQueued = false;
      });
    });
  }

  private updateTemplateUsageChart(): void {
    const byTemplate = new Map<string, number>();

    this.filteredInstances.forEach((instance) => {
      const name = (instance.template_name || 'Unknown Template').trim() || 'Unknown Template';
      byTemplate.set(name, (byTemplate.get(name) || 0) + 1);
    });

    const topTemplates = Array.from(byTemplate.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    this.templateUsageChart = {
      ...this.templateUsageChart,
      xaxis: {
        ...this.templateUsageChart.xaxis,
        categories: topTemplates.map(([name]) => this.truncateLabel(name, 28)),
      },
      series: [{ name: 'Inspections', data: topTemplates.map(([, count]) => count) }],
    };
  }

  private updateStatusChart(): void {
    const order = ['draft', 'in_progress', 'review', 'completed', 'submitted'];
    const countsByStatus = new Map<string, number>();

    for (const status of order) {
      countsByStatus.set(status, 0);
    }

    this.filteredInstances.forEach((instance) => {
      const status = String(instance.status || 'draft');
      countsByStatus.set(status, (countsByStatus.get(status) || 0) + 1);
    });

    const labels = order.map((status) => this.statusLabels[status] || status);
    const series = order.map((status) => countsByStatus.get(status) || 0);
    const colors = order.map((status) => this.statusPalette[status] || '#6c757d');

    this.statusDonutChart = {
      ...this.statusDonutChart,
      labels,
      series,
      colors,
    };
  }

  private updateProgressBucketChart(): void {
    const buckets = [
      { label: '0-24%', min: 0, max: 24 },
      { label: '25-49%', min: 25, max: 49 },
      { label: '50-74%', min: 50, max: 74 },
      { label: '75-99%', min: 75, max: 99 },
      { label: '100%', min: 100, max: 100 },
    ];

    const values = buckets.map((bucket) => {
      return this.filteredInstances.filter((instance) => {
        const progress = Math.round(this.toNumber(instance.progress_percentage));
        return progress >= bucket.min && progress <= bucket.max;
      }).length;
    });

    this.progressBucketChart = {
      ...this.progressBucketChart,
      xaxis: {
        ...this.progressBucketChart.xaxis,
        categories: buckets.map((bucket) => bucket.label),
      },
      series: [{ name: 'Inspections', data: values }],
    };
  }

  private updateTrendChart(): void {
    const days = this.buildDaySeries(14);
    const createdMap = new Map<string, number>();
    const completedMap = new Map<string, number>();
    const submittedMap = new Map<string, number>();

    days.forEach((day) => {
      createdMap.set(day.key, 0);
      completedMap.set(day.key, 0);
      submittedMap.set(day.key, 0);
    });

    this.filteredInstances.forEach((instance) => {
      const createdKey = this.toDayKey(this.parseDate(instance.created_at));
      const completedKey = this.toDayKey(this.parseDate(instance.completed_at));
      const submittedKey = this.toDayKey(this.parseDate(instance.submitted_at));

      if (createdKey && createdMap.has(createdKey)) {
        createdMap.set(createdKey, (createdMap.get(createdKey) || 0) + 1);
      }
      if (completedKey && completedMap.has(completedKey)) {
        completedMap.set(completedKey, (completedMap.get(completedKey) || 0) + 1);
      }
      if (submittedKey && submittedMap.has(submittedKey)) {
        submittedMap.set(submittedKey, (submittedMap.get(submittedKey) || 0) + 1);
      }
    });

    this.trendChart = {
      ...this.trendChart,
      xaxis: {
        ...this.trendChart.xaxis,
        categories: days.map((day) => day.label),
      },
      series: [
        { name: 'Created', data: days.map((day) => createdMap.get(day.key) || 0) },
        { name: 'Completed', data: days.map((day) => completedMap.get(day.key) || 0) },
        { name: 'Submitted', data: days.map((day) => submittedMap.get(day.key) || 0) },
      ],
    };
  }

  private updateOperatorChart(): void {
    const byOperator = new Map<string, number>();

    this.filteredInstances.forEach((instance) => {
      const name = (instance.operator_name || 'Unassigned').trim() || 'Unassigned';
      byOperator.set(name, (byOperator.get(name) || 0) + 1);
    });

    const top = Array.from(byOperator.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    this.operatorChart = {
      ...this.operatorChart,
      xaxis: {
        ...this.operatorChart.xaxis,
        categories: top.map(([name]) => name),
      },
      series: [{ name: 'Assigned', data: top.map(([, count]) => count) }],
    };
  }

  private updateTemplatePerformanceChart(): void {
    const byTemplate = new Map<string, { count: number; progressTotal: number }>();

    this.filteredInstances.forEach((instance) => {
      const key = (instance.template_name || 'Unknown Template').trim() || 'Unknown Template';
      const current = byTemplate.get(key) || { count: 0, progressTotal: 0 };
      current.count += 1;
      current.progressTotal += this.toNumber(instance.progress_percentage);
      byTemplate.set(key, current);
    });

    const topTemplates = Array.from(byTemplate.entries())
      .map(([name, metrics]) => ({
        name,
        avgProgress: metrics.count ? metrics.progressTotal / metrics.count : 0,
        count: metrics.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    this.templatePerformanceChart = {
      ...this.templatePerformanceChart,
      xaxis: {
        ...this.templatePerformanceChart.xaxis,
        categories: topTemplates.map((item) => this.truncateLabel(item.name, 22)),
      },
      tooltip: {
        ...this.templatePerformanceChart.tooltip,
        y: {
          formatter: (value: number, opts?: any) => {
            const idx = Number(opts?.dataPointIndex ?? -1);
            const template = idx >= 0 ? topTemplates[idx] : null;
            if (template) {
              return `${value.toFixed(1)}% avg (${template.count} inspections)`;
            }
            return `${value.toFixed(1)}%`;
          },
        },
      },
      series: [{ name: 'Avg Progress %', data: topTemplates.map((item) => Number(item.avgProgress.toFixed(1))) }],
    };
  }

  private updateTemplateAverageTimeChart(): void {
    const byTemplate = new Map<string, { totalHours: number; count: number }>();

    this.filteredInstances.forEach((instance) => {
      const endDate = this.parseDate(instance.submitted_at || instance.completed_at || undefined);
      const startDate = this.parseDate(instance.started_at || instance.created_at || undefined);
      if (!startDate || !endDate || endDate < startDate) {
        return;
      }

      const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      const templateName = (instance.template_name || 'Unknown Template').trim() || 'Unknown Template';
      const current = byTemplate.get(templateName) || { totalHours: 0, count: 0 };
      current.totalHours += hours;
      current.count += 1;
      byTemplate.set(templateName, current);
    });

    const topTemplates = Array.from(byTemplate.entries())
      .map(([name, metrics]) => ({
        name,
        avgHours: metrics.count ? metrics.totalHours / metrics.count : 0,
        count: metrics.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    this.templateAvgTimeChart = {
      ...this.templateAvgTimeChart,
      xaxis: {
        ...this.templateAvgTimeChart.xaxis,
        categories: topTemplates.map((item) => this.truncateLabel(item.name, 22)),
      },
      tooltip: {
        ...this.templateAvgTimeChart.tooltip,
        y: {
          formatter: (value: number, opts?: any) => {
            const idx = Number(opts?.dataPointIndex ?? -1);
            const template = idx >= 0 ? topTemplates[idx] : null;
            if (template) {
              return `${value.toFixed(2)} hrs avg (${template.count} completed)`;
            }
            return `${value.toFixed(2)} hrs`;
          },
        },
      },
      series: [{ name: 'Avg Hours', data: topTemplates.map((item) => Number(item.avgHours.toFixed(2))) }],
    };
  }

  private isActiveStatus(status: unknown): boolean {
    return ['draft', 'in_progress', 'review'].includes(String(status || '').toLowerCase());
  }

  private toNumber(value: unknown): number {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num : 0;
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private toDayKey(date: Date | null): string | null {
    if (!date) return null;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildDaySeries(days: number): Array<{ key: string; label: string }> {
    const out: Array<{ key: string; label: string }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      out.push({
        key: this.toDayKey(d) || '',
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    }

    return out;
  }

  private truncateLabel(value: string, maxLength: number): string {
    const normalized = (value || '').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
  }

  private normalizeText(value: unknown): string {
    return (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private getCurrentUserName(currentUser: any): string {
    const first = currentUser?.firstName || currentUser?.first_name || '';
    const last = currentUser?.lastName || currentUser?.last_name || '';
    return this.normalizeText(`${first} ${last}`);
  }

  private getCurrentUserIdCandidates(currentUser: any): string[] {
    const candidates = [
      currentUser?.id,
      currentUser?.user_id,
      currentUser?.userId,
      currentUser?.operator_id,
      currentUser?.operatorId,
      currentUser?.employee_id,
      currentUser?.employeeId,
    ]
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map((value) => value.toString());

    return Array.from(new Set(candidates));
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
