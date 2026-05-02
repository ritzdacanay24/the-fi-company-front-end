import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SerialNumberService } from '@app/features/serial-number-management/services/serial-number.service';
import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  NgApexchartsModule,
} from 'ng-apexcharts';

type StockPieChartOptions = {
  chart: ApexChart;
  labels: string[];
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
};

interface SerialAvailabilitySummaryData {
  eyefi_available: number;
  ul_new_available: number;
  ul_used_available: number;
  igt_available: number;
  eyefi_recently_used: number;
  ul_new_recently_used: number;
  ul_used_recently_used: number;
  igt_recently_used: number;
  eyefi_used_last_7_days: number;
  ul_new_used_last_7_days: number;
  ul_used_used_last_7_days: number;
  igt_used_last_7_days: number;
}

interface SerialAvailabilitySummaryResponse {
  success: boolean;
  data: SerialAvailabilitySummaryData;
}

interface SerialHealthCard {
  key: 'ul_new' | 'ul_used' | 'igt' | 'eyefi';
  title: string;
  route: string;
  available: number;
  recentlyUsed: number;
  threshold: number;
  pieSeries: ApexNonAxisChartSeries;
  pieColors: string[];
}

@Component({
  selector: 'app-serial-management-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule],
  templateUrl: './serial-management-dashboard.component.html',
  styleUrl: './serial-management-dashboard.component.scss',
})
export class SerialManagementDashboardComponent implements OnInit {
  private readonly serialNumberService = inject(SerialNumberService);

  loading = true;
  lastUpdated = '';
  loadError = '';

  readonly stockPieChartOptions: StockPieChartOptions = {
    chart: {
      type: 'donut',
      height: 210,
      toolbar: { show: false },
      foreColor: 'var(--bs-body-color)',
    },
    labels: ['Available', 'Shortfall', 'Buffer'],
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: { show: true, offsetY: 18 },
            value: {
              show: true,
              offsetY: -16,
              formatter: (_: string, opts?: any) => {
                const available = Number(opts?.w?.globals?.seriesTotals?.[0] ?? 0);
                return Math.round(available).toLocaleString();
              },
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Available',
              formatter: (w: any) => {
                const available = Number(w?.globals?.seriesTotals?.[0] ?? 0);
                return Math.round(available).toLocaleString();
              },
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '11px',
      labels: { colors: 'var(--bs-body-color)' },
    },
    stroke: {
      width: 1,
      colors: ['#ffffff'],
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${Math.round(value).toLocaleString()} serials`,
      },
    },
  };

  cards: SerialHealthCard[] = [
    {
      key: 'ul_new',
      title: 'UL Labels (New)',
      route: '/serial-management/ul-labels',
      available: 0,
      recentlyUsed: 0,
      threshold: 150,
      pieSeries: [0, 0, 0],
      pieColors: ['#0ab39c', '#f06548', '#405189'],
    },
    {
      key: 'ul_used',
      title: 'UL Labels (Used)',
      route: '/serial-management/ul-labels',
      available: 0,
      recentlyUsed: 0,
      threshold: 100,
      pieSeries: [0, 0, 0],
      pieColors: ['#0ab39c', '#f06548', '#405189'],
    },
    {
      key: 'igt',
      title: 'IGT Serials',
      route: '/serial-management/igt-inventory',
      available: 0,
      recentlyUsed: 0,
      threshold: 200,
      pieSeries: [0, 0, 0],
      pieColors: ['#0ab39c', '#f06548', '#405189'],
    },
    {
      key: 'eyefi',
      title: 'EyeFi Serials',
      route: '/serial-management/eyefi-serials',
      available: 0,
      recentlyUsed: 0,
      threshold: 300,
      pieSeries: [0, 0, 0],
      pieColors: ['#0ab39c', '#f06548', '#405189'],
    },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  async refresh(): Promise<void> {
    await this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      const summary = await this.serialNumberService.getAvailabilitySummaryFromAPI();
      const parsedSummary = this.extractSummary(summary);

      this.updateCard('ul_new', parsedSummary.ul_new_available, parsedSummary.ul_new_used_last_7_days);
      this.updateCard('ul_used', parsedSummary.ul_used_available, parsedSummary.ul_used_used_last_7_days);
      this.updateCard('igt', parsedSummary.igt_available, parsedSummary.igt_used_last_7_days);
      this.updateCard('eyefi', parsedSummary.eyefi_available, parsedSummary.eyefi_used_last_7_days);
      this.lastUpdated = new Date().toLocaleString();
    } catch {
      this.cards = this.cards.map((c) => ({ ...c, available: 0, recentlyUsed: 0 }));
      this.loadError = 'Could not load serial availability metrics. Values shown as zero.';
      this.lastUpdated = new Date().toLocaleString();
    } finally {
      this.loading = false;
    }
  }

  stockStatus(card: SerialHealthCard): 'critical' | 'low' | 'healthy' {
    if (card.available <= Math.floor(card.threshold * 0.3)) return 'critical';
    if (card.available <= card.threshold) return 'low';
    return 'healthy';
  }

  statusLabel(card: SerialHealthCard): string {
    const status = this.stockStatus(card);
    if (status === 'critical') return 'Critical';
    if (status === 'low') return 'Low';
    return 'Healthy';
  }

  totalAvailable(): number {
    return this.cards.reduce((sum, c) => sum + c.available, 0);
  }

  totalThreshold(): number {
    return this.cards.reduce((sum, c) => sum + c.threshold, 0);
  }

  systemsAtRisk(): number {
    return this.cards.filter((c) => this.stockStatus(c) !== 'healthy').length;
  }

  healthPercent(): number {
    const threshold = this.totalThreshold();
    if (threshold <= 0) {
      return 0;
    }
    const pct = (this.totalAvailable() / threshold) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  shortfallFor(card: SerialHealthCard): number {
    return Math.max(0, card.threshold - card.available);
  }

  stockProgressFor(card: SerialHealthCard): number {
    if (card.threshold <= 0) {
      return 0;
    }
    const pct = (card.available / card.threshold) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  private updateCard(key: SerialHealthCard['key'], available: number, recentlyUsed: number): void {
    const pie = this.buildPieData(available, this.cards.find((c) => c.key === key)?.threshold ?? 0);
    this.cards = this.cards.map((c) =>
      c.key === key
        ? {
            ...c,
            available,
            recentlyUsed,
            pieSeries: pie.series,
            pieColors: pie.colors,
          }
        : c,
    );
  }

  private buildPieData(available: number, threshold: number): { series: ApexNonAxisChartSeries; colors: string[] } {
    const clampedAvailable = Math.max(0, available);
    const shortfall = Math.max(0, threshold - clampedAvailable);
    const buffer = Math.max(0, clampedAvailable - threshold);

    const series: ApexNonAxisChartSeries = [clampedAvailable, shortfall, buffer];
    const colors = shortfall > 0
      ? ['#0ab39c', '#f06548', '#dfe3e8']
      : ['#0ab39c', '#e9ecef', '#405189'];

    return { series, colors };
  }

  private extractSummary(response: unknown): SerialAvailabilitySummaryData {
    const parsed = response as Partial<SerialAvailabilitySummaryResponse>;
    if (parsed?.success !== true || !parsed.data) {
      return {
        eyefi_available: 0,
        ul_new_available: 0,
        ul_used_available: 0,
        igt_available: 0,
        eyefi_recently_used: 0,
        ul_new_recently_used: 0,
        ul_used_recently_used: 0,
        igt_recently_used: 0,
        eyefi_used_last_7_days: 0,
        ul_new_used_last_7_days: 0,
        ul_used_used_last_7_days: 0,
        igt_used_last_7_days: 0,
      };
    }

    return {
      eyefi_available: Number(parsed.data.eyefi_available ?? 0),
      ul_new_available: Number(parsed.data.ul_new_available ?? 0),
      ul_used_available: Number(parsed.data.ul_used_available ?? 0),
      igt_available: Number(parsed.data.igt_available ?? 0),
      eyefi_recently_used: Number(parsed.data.eyefi_recently_used ?? 0),
      ul_new_recently_used: Number(parsed.data.ul_new_recently_used ?? 0),
      ul_used_recently_used: Number(parsed.data.ul_used_recently_used ?? 0),
      igt_recently_used: Number(parsed.data.igt_recently_used ?? 0),
      eyefi_used_last_7_days: Number(parsed.data.eyefi_used_last_7_days ?? 0),
      ul_new_used_last_7_days: Number(parsed.data.ul_new_used_last_7_days ?? 0),
      ul_used_used_last_7_days: Number(parsed.data.ul_used_used_last_7_days ?? 0),
      igt_used_last_7_days: Number(parsed.data.igt_used_last_7_days ?? 0),
    };
  }
}
