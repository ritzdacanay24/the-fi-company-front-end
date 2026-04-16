import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { ToastrService } from 'ngx-toastr';
import { UniqueLabelGeneratorApiService } from './unique-label-generator-api.service';

type SequenceUtilizationChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  grid: ApexGrid;
  markers: ApexMarkers;
  colors: string[];
};

type RemainingOverviewChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  colors: string[];
  stroke: ApexStroke;
  plotOptions: ApexPlotOptions;
};

@Component({
  selector: 'app-unique-label-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgApexchartsModule, AgGridModule],
  templateUrl: './unique-label-reports.component.html',
  styleUrls: ['./unique-label-reports.component.scss'],
})
export class UniqueLabelReportsComponent implements OnInit {
  private readonly api = inject(UniqueLabelGeneratorApiService);
  private readonly toastr = inject(ToastrService);

  days = 30;
  isLoading = false;
  totals: any = null;
  topParts: any[] = [];
  weekUsage: any[] = [];

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
  };

  readonly topPartsColumnDefs: ColDef[] = [
    { headerName: 'Part Number', field: 'part_number', minWidth: 180, flex: 1 },
    { headerName: 'Labels Generated', field: 'labels_generated', width: 160, filter: 'agNumberColumnFilter' },
  ];

  readonly weekUsageColumnDefs: ColDef[] = [
    { headerName: 'Year', field: 'year_num', width: 110, filter: 'agNumberColumnFilter' },
    { headerName: 'Week', field: 'week_num', width: 100, filter: 'agNumberColumnFilter' },
    { headerName: 'Used', field: 'last_sequence', width: 120, filter: 'agNumberColumnFilter' },
    { headerName: 'Remaining', field: 'remaining', width: 130, filter: 'agNumberColumnFilter' },
  ];
  sequenceUtilizationChart: SequenceUtilizationChartOptions = {
    series: [
      { name: 'Used %', data: [] },
      { name: 'Remaining %', data: [] },
      { name: 'Warning Threshold %', data: [] },
    ],
    chart: {
      type: 'line',
      height: 280,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#0ab39c', '#405189', '#f06548'],
    stroke: {
      curve: 'smooth',
      width: [3, 3, 2],
      dashArray: [0, 0, 6],
    },
    dataLabels: { enabled: false },
    markers: { size: [3, 3, 0] },
    grid: { strokeDashArray: 4 },
    xaxis: {
      categories: [],
      title: { text: 'Week' },
    },
    yaxis: {
      max: 100,
      min: 0,
      tickAmount: 5,
      title: { text: 'Sequence Utilization %' },
      labels: {
        formatter: (value: number) => `${Math.round(value)}%`,
      },
    },
    tooltip: {
      shared: true,
      y: {
        formatter: (value: number) => `${value.toFixed(1)}%`,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
    },
  };

  remainingOverviewChart: RemainingOverviewChartOptions = {
    series: [0, 0],
    chart: {
      type: 'donut',
      height: 320,
    },
    labels: ['Used', 'Remaining'],
    colors: ['#f06548', '#3b7ed4'],
    stroke: {
      width: 1,
      colors: ['#ffffff'],
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`,
    },
    legend: {
      position: 'bottom',
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${Math.round(value).toLocaleString()} IDs`,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: 'Capacity',
              formatter: () => {
                const total = this.remainingOverviewChart.series.reduce((sum, v) => sum + Number(v || 0), 0);
                return `${Math.round(total).toLocaleString()}`;
              },
            },
          },
        },
      },
    },
  };

  async ngOnInit(): Promise<void> {
    await this.loadReport();
  }

  async loadReport(): Promise<void> {
    this.isLoading = true;
    try {
      const response = await this.api.getReportSummary(this.days);
      if (!response.success || !response.data) {
        this.toastr.warning(response.message || 'No report data found.');
        return;
      }

      const data = response.data as any;
      this.totals = data.totals || null;
      this.topParts = data.top_parts || [];
      this.weekUsage = data.week_usage || [];
      this.updateSequenceUtilizationChart();
      this.updateRemainingOverviewChart();
    } catch (error) {
      this.toastr.error('Failed to load report summary.');
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  private updateSequenceUtilizationChart(): void {
    const labels: string[] = [];
    const usedPctSeries: number[] = [];
    const remainingPctSeries: number[] = [];

    for (const row of this.weekUsage) {
      const yearNum = Number(row.year_num || 0);
      const weekNum = Number(row.week_num || 0);
      const used = Number(row.last_sequence || 0);
      const remaining = Number(row.remaining || 0);
      const total = used + remaining;

      labels.push(`${yearNum}-W${String(weekNum).padStart(2, '0')}`);

      if (total <= 0) {
        usedPctSeries.push(0);
        remainingPctSeries.push(0);
        continue;
      }

      const usedPct = (used / total) * 100;
      const remainingPct = (remaining / total) * 100;

      usedPctSeries.push(Number(usedPct.toFixed(2)));
      remainingPctSeries.push(Number(remainingPct.toFixed(2)));
    }

    this.sequenceUtilizationChart = {
      ...this.sequenceUtilizationChart,
      xaxis: {
        ...this.sequenceUtilizationChart.xaxis,
        categories: labels,
      },
      series: [
        { name: 'Used %', data: usedPctSeries },
        { name: 'Remaining %', data: remainingPctSeries },
        { name: 'Warning Threshold %', data: labels.map(() => 85) },
      ],
    };
  }

  private updateRemainingOverviewChart(): void {
    const latest = this.getLatestWeekUsage();
    const used = Number(latest?.last_sequence || 0);
    const remaining = Number(latest?.remaining || 0);

    this.remainingOverviewChart = {
      ...this.remainingOverviewChart,
      series: [used, remaining],
    };
  }

  private getLatestWeekUsage(): any | null {
    if (!this.weekUsage.length) return null;

    return this.weekUsage.reduce((latest, row) => {
      if (!latest) return row;

      const latestYear = Number(latest.year_num || 0);
      const latestWeek = Number(latest.week_num || 0);
      const rowYear = Number(row.year_num || 0);
      const rowWeek = Number(row.week_num || 0);

      if (rowYear > latestYear) return row;
      if (rowYear === latestYear && rowWeek > latestWeek) return row;
      return latest;
    }, null as any | null);
  }

  woBatchPct(): number {
    const total = Number(this.totals?.total_batches ?? 0);
    const wo = Number(this.totals?.wo_batches ?? 0);
    if (total <= 0) return 0;
    return Math.round((wo / total) * 100);
  }

  manualBatchPct(): number {
    const total = Number(this.totals?.total_batches ?? 0);
    const manual = Number(this.totals?.manual_batches ?? 0);
    if (total <= 0) return 0;
    return Math.round((manual / total) * 100);
  }

  latestUsedCount(): number {
    const latest = this.getLatestWeekUsage();
    return Number(latest?.last_sequence ?? 0);
  }

  latestRemainingCount(): number {
    const latest = this.getLatestWeekUsage();
    return Number(latest?.remaining ?? 0);
  }

  capacityUsedPct(): number {
    const used = this.latestUsedCount();
    const remaining = this.latestRemainingCount();
    const total = used + remaining;
    if (total <= 0) return 0;
    return Math.round((used / total) * 100);
  }

  capacityRemainingPct(): number {
    const used = this.latestUsedCount();
    const remaining = this.latestRemainingCount();
    const total = used + remaining;
    if (total <= 0) return 0;
    return Math.round((remaining / total) * 100);
  }

  estimatedWeeksRemaining(): number | null {
    if (!this.weekUsage || this.weekUsage.length < 2) return null;

    const sorted = [...this.weekUsage].sort((a, b) => {
      const aYear = Number(a.year_num || 0);
      const bYear = Number(b.year_num || 0);
      if (aYear !== bYear) return aYear - bYear;
      return Number(a.week_num || 0) - Number(b.week_num || 0);
    });

    const weeklyDeltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prevUsed = Number(sorted[i - 1].last_sequence || 0);
      const currUsed = Number(sorted[i].last_sequence || 0);
      const delta = currUsed - prevUsed;
      if (delta > 0) weeklyDeltas.push(delta);
    }

    if (!weeklyDeltas.length) return null;

    const avgWeeklyUsed = weeklyDeltas.reduce((sum, val) => sum + val, 0) / weeklyDeltas.length;
    if (avgWeeklyUsed <= 0) return null;

    const remaining = this.latestRemainingCount();
    return Number((remaining / avgWeeklyUsed).toFixed(1));
  }

  estimatedWeeksRemainingLabel(): string {
    const weeks = this.estimatedWeeksRemaining();
    return weeks === null ? 'N/A' : `${weeks}`;
  }

  weeksRemainingGaugePct(): number {
    const weeks = this.estimatedWeeksRemaining();
    if (weeks === null) return 0;

    // Scale 0-12 weeks into a 0-100 visual gauge for compact display.
    const scaled = (weeks / 12) * 100;
    return Math.min(100, Math.max(0, Math.round(scaled)));
  }

  miniPieBackground(percent: number, color: string): string {
    const safePct = Math.min(100, Math.max(0, Number(percent) || 0));
    return `conic-gradient(${color} 0 ${safePct}%, #dfe6ee ${safePct}% 100%)`;
  }
}
