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
  selector: 'app-sn-usage-report',
  imports: [CommonModule, FormsModule, RouterModule, AgGridAngular, NgApexchartsModule],
  templateUrl: './sn-usage-report.component.html',
  styleUrl: './sn-usage-report.component.scss',
})
export class SnUsageReportComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly BASE = 'apiV2/eyefi-serial-numbers';

  allData: any[] = [];
  rowData: any[] = [];
  loading = false;
  error: string | null = null;
  private gridApi!: GridApi;

  inventoryInsights = {
    available: 0,
    assigned: 0,
    shipped: 0,
    returned: 0,
    defective: 0,
    total: 0,
    availablePct: 0,
    assignedPct: 0,
    shippedPct: 0,
    activePct: 0,
    lastAddedDisplay: 'N/A',
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
    { headerName: 'Product Model', field: 'product_model', width: 160, filter: 'agTextColumnFilter', floatingFilter: true },
    { headerName: 'Batch #', field: 'batch_number', width: 130, filter: 'agTextColumnFilter', floatingFilter: true },
    {
      headerName: 'Status', field: 'status', width: 120,
      filter: 'agSetColumnFilter', floatingFilter: true,
      cellRenderer: (p: any) => {
        const map: Record<string, string> = {
          available: 'success',
          assigned: 'primary',
          shipped: 'info',
          returned: 'warning',
          defective: 'danger',
        };
        const cls = map[p.value] ?? 'secondary';
        return `<span class="badge bg-${cls}">${p.value ?? 'Unknown'}</span>`;
      },
    },
    { headerName: 'Assigned To', field: 'assigned_to_table', width: 150, filter: 'agTextColumnFilter', floatingFilter: true },
    { headerName: 'Assigned By', field: 'assigned_by', width: 150, filter: 'agTextColumnFilter', floatingFilter: true },
    {
      headerName: 'Assigned At', field: 'assigned_at', width: 140,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString() : '',
    },
    {
      headerName: 'Added', field: 'created_at', width: 140, sort: 'desc',
      filter: 'agDateColumnFilter', floatingFilter: true,
      valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString() : '',
    },
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    cellRenderer: (params: any) => {
      if (params.valueFormatted) return params.valueFormatted;
      return (params.value !== null && params.value !== undefined && params.value !== '') ? params.value : '-';
    },
  };

  ngOnInit(): void {
    this.getData();
  }

  getData(): void {
    this.loading = true;
    this.error = null;
    firstValueFrom(
      this.http.get<any>(`${this.BASE}?limit=99999`),
    ).then((res) => {
      this.allData = res.data ?? res ?? [];
      this.rowData = [...this.allData];
      this.updateDashboard();
    }).catch((err: any) => {
      this.error = err.message || 'Failed to load EyeFi serial data';
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
    const available = all.filter((r) => r.status === 'available').length;
    const assigned = all.filter((r) => r.status === 'assigned').length;
    const shipped = all.filter((r) => r.status === 'shipped').length;
    const returned = all.filter((r) => r.status === 'returned').length;
    const defective = all.filter((r) => r.status === 'defective').length;
    const total = all.length;
    const active = available + assigned + shipped;

    const dates = all
      .map((r) => r.created_at)
      .filter((v): v is string => !!v)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const lastDate = dates[0] ? new Date(dates[0]).toLocaleString() : 'N/A';

    this.inventoryInsights = {
      available,
      assigned,
      shipped,
      returned,
      defective,
      total,
      availablePct: this.toPercentage(available, total),
      assignedPct: this.toPercentage(assigned, total),
      shippedPct: this.toPercentage(shipped, total),
      activePct: this.toPercentage(active, total),
      lastAddedDisplay: lastDate,
    };

    this.statusBarChart = {
      series: [{ name: 'Serials', data: [available, assigned, shipped, returned, defective] }],
      chart: { type: 'bar', height: 240, toolbar: { show: false }, foreColor: 'var(--bs-body-color)' },
      xaxis: {
        categories: ['Available', 'Assigned', 'Shipped', 'Returned', 'Defective'],
        labels: {
          style: {
            colors: ['var(--bs-body-color)'],
          },
        },
      },
      yaxis: {
        title: { text: 'Count', style: { color: 'var(--bs-body-color)' } },
        labels: {
          style: {
            colors: ['var(--bs-body-color)'],
          },
        },
      },
      plotOptions: { bar: { horizontal: false, borderRadius: 6, columnWidth: '45%' } },
      colors: ['#0ab39c'],
      dataLabels: { enabled: true },
      tooltip: { enabled: true },
    };

    this.statusDistributionChart = {
      series: [available, assigned, shipped, returned, defective],
      chart: { type: 'donut', height: 240, foreColor: 'var(--bs-body-color)' },
      labels: ['Available', 'Assigned', 'Shipped', 'Returned', 'Defective'],
      colors: ['#2e8b57', '#3b7ed4', '#17a2b8', '#f7b84b', '#c43d3d'],
      dataLabels: { enabled: false },
      legend: {
        position: 'bottom',
        labels: {
          colors: 'var(--bs-body-color)',
        },
      },
      responsive: [{ breakpoint: 480, options: { chart: { height: 220 } } }],
    };

    const monthMap = new Map<string, number>();
    all.forEach((r) => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    });

    const now = new Date();
    const last8Months: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last8Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const monthly = last8Months.map((key) => [key, monthMap.get(key) ?? 0] as [string, number]);

    this.uploadTrendChart = {
      series: [{ name: 'Serials Added', data: monthly.map(([, v]) => v) }],
      chart: { type: 'area', height: 240, toolbar: { show: false }, foreColor: 'var(--bs-body-color)' },
      xaxis: {
        categories: monthly.map(([m]) => {
          const [y, mo] = m.split('-');
          return new Date(Number(y), Number(mo) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        }),
        labels: {
          style: {
            colors: ['var(--bs-body-color)'],
          },
        },
      },
      yaxis: {
        title: { text: 'Serials Added', style: { color: 'var(--bs-body-color)' } },
        labels: {
          style: {
            colors: ['var(--bs-body-color)'],
          },
        },
      },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      colors: ['#3b7ed4'],
      tooltip: { enabled: true },
    };
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }
}
