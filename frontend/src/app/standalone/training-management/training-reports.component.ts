import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
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
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { ToastrService } from 'ngx-toastr';
import { TrainingAdminReportSummary, TrainingService } from '../../pages/training/services/training.service';

type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  legend: ApexLegend;
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
  colors: string[];
};

@Component({
  selector: 'app-training-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgApexchartsModule, AgGridModule],
  templateUrl: './training-reports.component.html',
})
export class TrainingReportsComponent implements OnInit, AfterViewInit {
  private readonly trainingService = inject(TrainingService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);

  dateFrom = '';
  dateTo = '';
  isLoading = false;
  data: TrainingAdminReportSummary | null = null;

  constructor() {
    const today = new Date();
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setFullYear(today.getFullYear() - 1);

    this.dateFrom = this.toDateInputValue(twelveMonthsAgo);
    this.dateTo = this.toDateInputValue(today);
  }

  weeklyAttendanceChart: BarChartOptions = {
    series: [
      { name: 'Expected', data: [] },
      { name: 'Actual', data: [] },
    ],
    chart: {
      type: 'bar',
      height: 280,
      stacked: false,
      toolbar: { show: false },
    },
    colors: ['#405189', '#0ab39c'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '46%',
      },
    },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4 },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: {
      shared: true,
      intersect: false,
    },
    xaxis: {
      categories: [],
      title: { text: 'Week' },
    },
    yaxis: {
      title: { text: 'Attendees' },
    },
  };

  facilitatorChart: BarChartOptions = {
    series: [{ name: 'Attendance %', data: [] }],
    chart: {
      type: 'bar',
      height: 300,
      toolbar: { show: false },
    },
    colors: ['#f7b84b'],
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '55%',
      },
    },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4 },
    legend: { show: false },
    tooltip: {
      intersect: false,
      y: {
        formatter: (value: number) => `${value.toFixed(1)}%`,
      },
    },
    xaxis: {
      categories: [],
      max: 100,
      title: { text: 'Attendance Rate %' },
    },
    yaxis: {
      title: { text: '' },
    },
  };

  departmentChart: BarChartOptions = {
    series: [{ name: 'Attendance %', data: [] }],
    chart: {
      type: 'bar',
      height: 300,
      toolbar: { show: false },
    },
    colors: ['#299cdb'],
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '55%',
      },
    },
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4 },
    legend: { show: false },
    tooltip: {
      intersect: false,
      y: {
        formatter: (value: number) => `${value.toFixed(1)}%`,
      },
    },
    xaxis: {
      categories: [],
      max: 100,
      title: { text: 'Attendance Rate %' },
    },
    yaxis: {
      title: { text: '' },
    },
  };

  readonly statusDefaultColDef: ColDef = {
    sortable: false,
    filter: false,
    resizable: true,
  };

  readonly statusColumnDefs: ColDef[] = [
    { headerName: 'Metric', field: 'metric', minWidth: 220, flex: 1 },
    { headerName: 'Value', field: 'value', width: 140, cellClass: 'text-end' },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadReport();
  }

  ngAfterViewInit(): void {
    this.triggerChartReflow();
  }

  async loadReport(): Promise<void> {
    this.isLoading = true;
    try {
      const response = await this.trainingService
        .getAdminReport({
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
        })
        .toPromise();
      if (!response) {
        this.toastr.warning('No report data found.');
        return;
      }

      this.data = response;
      this.updateCharts();
      this.triggerChartReflow();
    } catch (error) {
      console.error(error);
      this.toastr.error('Failed to load training admin report.');
    } finally {
      this.isLoading = false;
    }
  }

  private updateCharts(): void {
    if (!this.data) {
      return;
    }

    const weeks = this.data.weekly_trend || [];
    const weekLabels = weeks.map((row) => `${row.year_num}-W${String(row.week_num).padStart(2, '0')}`);
    const expected = weeks.map((row) => Number(row.expected_attendees || 0));
    const actual = weeks.map((row) => Number(row.actual_attendees || 0));

    this.weeklyAttendanceChart = {
      ...this.weeklyAttendanceChart,
      xaxis: { ...this.weeklyAttendanceChart.xaxis, categories: weekLabels },
      series: [
        { name: 'Expected', data: expected },
        { name: 'Actual', data: actual },
      ],
    };

    const facilitators = (this.data.facilitator_performance || []).slice(0, 8);
    this.facilitatorChart = {
      ...this.facilitatorChart,
      xaxis: {
        ...this.facilitatorChart.xaxis,
        categories: facilitators.map((row) => row.facilitator_name || 'Unknown'),
      },
      series: [{ name: 'Attendance %', data: facilitators.map((row) => Number(row.attendance_rate || 0)) }],
    };

    const departments = (this.data.department_compliance || []).slice(0, 10);
    this.departmentChart = {
      ...this.departmentChart,
      xaxis: {
        ...this.departmentChart.xaxis,
        categories: departments.map((row) => row.department || 'Unassigned'),
      },
      series: [{ name: 'Attendance %', data: departments.map((row) => Number(row.attendance_rate || 0)) }],
    };
  }

  get totals() {
    return (
      this.data?.totals || {
        total_sessions: 0,
        completed_sessions: 0,
        cancelled_sessions: 0,
        scheduled_sessions: 0,
        in_progress_sessions: 0,
        expected_attendees: 0,
        actual_attendees: 0,
        attendance_rate: 0,
      }
    );
  }

  get completionRate(): string {
    const total = Number(this.totals.total_sessions || 0);
    const completed = Number(this.totals.completed_sessions || 0);
    if (total <= 0) {
      return '0.0';
    }
    return ((completed / total) * 100).toFixed(1);
  }

  get selectedRangeLabel(): string {
    if (!this.dateFrom || !this.dateTo) {
      return 'Custom range';
    }
    return `${this.dateFrom} to ${this.dateTo}`;
  }

  get statusRows(): Array<{ metric: string; value: number }> {
    return [
      { metric: 'Scheduled', value: Number(this.totals.scheduled_sessions || 0) },
      { metric: 'In Progress', value: Number(this.totals.in_progress_sessions || 0) },
      { metric: 'Completed', value: Number(this.totals.completed_sessions || 0) },
      { metric: 'Cancelled', value: Number(this.totals.cancelled_sessions || 0) },
      { metric: 'Expected Attendees', value: Number(this.totals.expected_attendees || 0) },
      { metric: 'Actual Attendees', value: Number(this.totals.actual_attendees || 0) },
    ];
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private triggerChartReflow(): void {
    this.cdr.detectChanges();

    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      });
    }, 0);
  }
}
