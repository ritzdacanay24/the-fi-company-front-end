import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
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

@Component({
  selector: 'app-unique-label-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule, AgGridModule],
  templateUrl: './unique-label-reports.component.html',
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
}
