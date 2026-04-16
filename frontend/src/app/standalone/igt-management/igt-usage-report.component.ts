import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { firstValueFrom } from 'rxjs';

type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  tooltip?: ApexTooltip;
  legend?: ApexLegend;
  plotOptions?: ApexPlotOptions;
  labels?: string[];
  colors?: string[];
  responsive?: ApexResponsive[];
};

@Component({
  standalone: true,
  selector: 'app-igt-usage-report',
  imports: [CommonModule, FormsModule, RouterModule, AgGridAngular, NgApexchartsModule],
  templateUrl: './igt-usage-report.component.html',
  styleUrl: './igt-usage-report.component.scss',
})
export class IgtUsageReportComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly BASE = 'apiV2/igt-serial-numbers';

  allData: any[] = [];
  rowData: any[] = [];
  loading = false;
  error: string | null = null;
  private gridApi!: GridApi;

  inventoryInsights = {
    available: 0,
    used: 0,
    reserved: 0,
    inactive: 0,
    total: 0,
    totalRemaining: 0,
    availablePct: 0,
    usedPct: 0,
    remainingPct: 0,
    activePct: 0,
    lastUploadDateDisplay: 'N/A',
  };

  statusBarChart: Partial<ChartOptions> = {};
  statusDistributionChart: Partial<ChartOptions> = {};
  uploadTrendChart: Partial<ChartOptions> = {};

  columnDefs: ColDef[] = [
    {
      headerName: 'Serial Number', field: 'serial_number',
      sortable: true, filter: 'agTextColumnFilter', floatingFilter: true,
      pinned: 'left', width: 200,
      cellRenderer: (p: any) => `<strong class="text-primary">${p.value ?? ''}</strong>`,
    },
    { headerName: 'Category', field: 'category', width: 130, filter: 'agSetColumnFilter', floatingFilter: true },
    { headerName: 'Manufacturer', field: 'manufacturer', width: 160, filter: 'agTextColumnFilter', floatingFilter: true },
    { headerName: 'Model', field: 'model', width: 150, filter: 'agTextColumnFilter', floatingFilter: true },
    {
      headerName: 'Status', field: 'status', width: 120,
      filter: 'agSetColumnFilter', floatingFilter: true,
      cellRenderer: (p: any) => {
        const map: Record<string, string> = {
          available: 'success',
          used: 'danger',
          reserved: 'warning',
        };
        const cls = map[p.value] ?? 'secondary';
        return `<span class="badge bg-${cls}">${p.value ?? 'Unknown'}</span>`;
      },
    },
    { headerName: 'Used By', field: 'used_by', width: 150, filter: 'agTextColumnFilter', floatingFilter: true },
    { headerName: 'Used In Asset', field: 'used_in_asset_number', width: 160, filter: 'agTextColumnFilter', floatingFilter: true },
    {
      headerName: 'Used At', field: 'used_at', width: 140,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString() : '',
    },
    {
      headerName: 'Added', field: 'created_at', width: 140, sort: 'desc',
      filter: 'agDateColumnFilter', floatingFilter: true,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString() : '',
    },
    { headerName: 'Notes', field: 'notes', flex: 1, minWidth: 160, filter: 'agTextColumnFilter', floatingFilter: true },
  ];

  defaultColDef: ColDef = { resizable: true, sortable: true };

  ngOnInit(): void {
    this.getData();
  }

  getData(): void {
    this.loading = true;
    this.error = null;
    firstValueFrom(
      this.http.get<any>(`${this.BASE}?includeInactive=true&limit=99999`),
    ).then((res) => {
      this.allData = res.data ?? res ?? [];
      this.rowData = [...this.allData];
      this.updateDashboard();
    }).catch((err: any) => {
      this.error = err.message || 'Failed to load IGT serial data';
    }).finally(() => {
      this.loading = false;
    });
  }

  clearAllFilters(): void {
    this.gridApi?.setFilterModel(null);
  }

  miniPieBackground(percent: number, color: string): string {
    return `conic-gradient(${color} 0 ${percent}%, #e6edf5 ${percent}% 100%)`;
  }

  private toPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  private updateDashboard(): void {
    const all = this.allData;
    const available = all.filter((r) => r.status === 'available' && r.is_active !== 0).length;
    const used = all.filter((r) => r.status === 'used').length;
    const reserved = all.filter((r) => r.status === 'reserved' && r.is_active !== 0).length;
    const inactive = all.filter((r) => r.is_active === 0 || r.is_active === '0').length;
    const total = all.length;

    const dates = all
      .map((r) => r.created_at)
      .filter((v): v is string => !!v)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const lastDate = dates[0] ? new Date(dates[0]).toLocaleString() : 'N/A';

    this.inventoryInsights = {
      available,
      used,
      reserved,
      inactive,
      total,
      totalRemaining: available + reserved,
      availablePct: this.toPercentage(available, total),
      usedPct: this.toPercentage(used, total),
      remainingPct: this.toPercentage(available + reserved, total),
      activePct: this.toPercentage(all.filter((r) => r.is_active !== 0).length, total),
      lastUploadDateDisplay: lastDate,
    };

    this.statusBarChart = {
      series: [{ name: 'Serials', data: [available, used, reserved] }],
      chart: { type: 'bar', height: 240, toolbar: { show: false } },
      xaxis: { categories: ['Available', 'Used', 'Reserved'] },
      yaxis: { title: { text: 'Count' } },
      plotOptions: { bar: { horizontal: false, borderRadius: 6, columnWidth: '45%' } },
      colors: ['#0ab39c'],
      dataLabels: { enabled: true },
      tooltip: { enabled: true },
    };

    this.statusDistributionChart = {
      series: [available, used, reserved, inactive],
      chart: { type: 'donut', height: 240 },
      labels: ['Available', 'Used', 'Reserved', 'Inactive'],
      colors: ['#2e8b57', '#c43d3d', '#f7b84b', '#6c757d'],
      dataLabels: { enabled: false },
      legend: { position: 'bottom' },
      responsive: [{ breakpoint: 480, options: { chart: { height: 220 } } }],
    };

    const monthMap = new Map<string, number>();
    all.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    });
    // Build last 8 calendar months (fills missing months with 0)
    const now = new Date();
    const last8Months: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last8Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const monthly = last8Months.map((key) => [key, monthMap.get(key) ?? 0] as [string, number]);

    this.uploadTrendChart = {
      series: [{ name: 'Serials Uploaded', data: monthly.map(([, v]) => v) }],
      chart: { type: 'area', height: 240, toolbar: { show: false } },
      xaxis: {
        categories: monthly.map(([m]) => {
          const [y, mo] = m.split('-');
          return new Date(Number(y), Number(mo) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        }),
      },
      yaxis: { title: { text: 'Serials Uploaded' } },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      colors: ['#117a8b'],
      tooltip: { enabled: true },
    };
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }

  getStatusSummary() {
    return {
      inactive: this.inventoryInsights.inactive,
    };
  }

}
