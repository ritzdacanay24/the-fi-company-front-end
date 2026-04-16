import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { BreadcrumbComponent, BreadcrumbItem } from '@app/shared/components/breadcrumb/breadcrumb.component';
import { UlAuditService } from '../../services/ul-audit.service';
import { UlConsumedSerialsService } from '../../services/ul-consumed-serials.service';
import { NgApexchartsModule } from 'ng-apexcharts';
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
} from 'ng-apexcharts';

type AuditHistoryChartOptions = {
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

interface ULAuditItem {
  ul_number: string;
}

interface AuditSignoff {
  id?: number | string;
  audit_date: string;
  auditor_name: string;
  auditor_signature: string;
  items_audited: number | string;
  ul_numbers: string[];
  notes: string;
  created_at?: string;
}

@Component({
  selector: 'app-ul-audit-history',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule, BreadcrumbComponent, NgApexchartsModule],
  templateUrl: './ul-audit-history.component.html',
  styleUrls: ['./ul-audit-history.component.scss']
})
export class UlAuditHistoryComponent implements OnInit {
  loading = false;
  error: string | null = null;

  auditHistory: AuditSignoff[] = [];
  ulItems: ULAuditItem[] = [];
  auditedUlNumbers: Set<string> = new Set();

  auditVolumeChart: Partial<AuditHistoryChartOptions> = {
    series: [
      {
        name: 'Items Audited',
        data: [],
      },
    ],
    chart: {
      type: 'bar',
      height: 230,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '45%',
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: [],
      labels: { rotate: 0 },
    },
    yaxis: {
      min: 0,
      labels: {
        formatter: (value) => `${Math.round(value)}`,
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${Math.round(value || 0)} items`,
      },
    },
    colors: ['#198754'],
  };

  coverageChart: Partial<AuditHistoryChartOptions> = {
    series: [0, 0],
    chart: {
      type: 'donut',
      height: 230,
    },
    labels: ['Audited', 'Pending'],
    legend: {
      position: 'bottom',
      fontSize: '12px',
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${Math.round(Number(val) || 0)}%`,
    },
    tooltip: {
      y: {
        formatter: (value) => `${Math.round(value || 0)} items`,
      },
    },
    stroke: {
      width: 0,
    },
    colors: ['#198754', '#6c757d'],
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { height: 220 },
          legend: { position: 'bottom' },
        },
      },
    ],
  };

  topAuditorsChart: Partial<AuditHistoryChartOptions> = {
    series: [
      {
        name: 'Items Audited',
        data: [],
      },
    ],
    chart: {
      type: 'bar',
      height: 230,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: '55%',
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: [],
      labels: {
        formatter: (value) => `${Math.round(Number(value) || 0)}`,
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${Math.round(value || 0)} items`,
      },
    },
    colors: ['#0d6efd'],
  };

  qtCompletionChart: Partial<AuditHistoryChartOptions> = {
    series: [
      {
        name: 'Audited',
        data: [0, 0],
      },
      {
        name: 'Pending',
        data: [0, 0],
      },
    ],
    chart: {
      type: 'bar',
      height: 230,
      stacked: true,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '50%',
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ['Q Series', 'T Series'],
    },
    yaxis: {
      min: 0,
      labels: {
        formatter: (value) => `${Math.round(value)}`,
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${Math.round(value || 0)} items`,
      },
    },
    legend: {
      position: 'bottom',
    },
    colors: ['#198754', '#dc3545'],
  };

  constructor(
    private ulConsumedSerialsService: UlConsumedSerialsService,
    private ulAuditService: UlAuditService,
  ) {}

  get coverageHasData(): boolean {
    const series = Array.isArray(this.coverageChart.series) ? this.coverageChart.series : [];
    return series.some((value) => this.toNumber(value) > 0);
  }

  ngOnInit(): void {
    this.refresh();
  }

  trackByAuditRecord(index: number, record: AuditSignoff): string | number {
    return record.id ?? `${record.audit_date}-${record.auditor_name}-${index}`;
  }

  breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Dashboard', link: '/dashboard' },
      { label: 'UL Management', link: '/ul-management' },
      { label: 'UL Audit History' },
    ];
  }

  async refresh(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      await Promise.all([this.loadULItems(), this.loadAuditHistory()]);
      this.buildAuditChart();
      this.buildAuditInsightsCharts();
    } catch (error: any) {
      this.error = error.message || 'Failed to load audit history data';
    } finally {
      this.loading = false;
    }
  }

  private async loadULItems(): Promise<void> {
    const response = await this.ulConsumedSerialsService.getAllConsumedSerials({
      ul_category: 'New'
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to load UL items');
    }

    this.ulItems = (response.data || [])
      .filter((item: any) => item.ul_number && item.ul_category === 'New')
      .map((item: any) => ({ ul_number: item.ul_number }));
  }

  private async loadAuditHistory(): Promise<void> {
    const response = await this.ulAuditService.getAuditSignoffs();
    if (!response.success) {
      throw new Error(response.error || 'Failed to load audit history');
    }

    this.auditHistory = response.data || [];

    this.auditedUlNumbers.clear();
    this.auditHistory.forEach(signoff => {
      (signoff.ul_numbers || []).forEach(ul => this.auditedUlNumbers.add(ul));
    });
  }

  private normalizeAuditDate(dateStr: string): string {
    if (!dateStr) return '';
    return dateStr.length >= 10 ? dateStr.substring(0, 10) : dateStr;
  }

  private toNumber(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private buildAuditChart(): void {
    const totalsByDate = new Map<string, number>();

    for (const signoff of this.auditHistory) {
      const dateKey = this.normalizeAuditDate(signoff.audit_date);
      if (!dateKey) continue;
      totalsByDate.set(dateKey, (totalsByDate.get(dateKey) ?? 0) + this.toNumber(signoff.items_audited));
    }

    const labels = Array.from(totalsByDate.keys()).sort((a, b) => a.localeCompare(b));
    const data = labels.map(label => totalsByDate.get(label) ?? 0);

    this.auditVolumeChart = {
      ...this.auditVolumeChart,
      series: [
        {
          name: 'Items Audited',
          data,
        },
      ],
      xaxis: {
        ...(this.auditVolumeChart.xaxis || {}),
        categories: labels,
      },
    };
  }

  private buildAuditInsightsCharts(): void {
    const uniqueUlNumbers = new Set(
      this.ulItems.map((item) => (item.ul_number || '').trim()).filter((ul) => !!ul),
    );

    const auditedUniqueCount = Array.from(uniqueUlNumbers).filter((ul) => this.auditedUlNumbers.has(ul)).length;
    const pendingUniqueCount = Math.max(0, uniqueUlNumbers.size - auditedUniqueCount);

    this.coverageChart = {
      ...this.coverageChart,
      series: [this.toNumber(auditedUniqueCount), this.toNumber(pendingUniqueCount)],
      labels: ['Audited', 'Pending'],
    };

    const auditorTotals = new Map<string, number>();
    this.auditHistory.forEach((signoff) => {
      const auditor = (signoff.auditor_name || 'Unknown').trim();
      auditorTotals.set(auditor, (auditorTotals.get(auditor) || 0) + this.toNumber(signoff.items_audited));
    });

    const topAuditors = Array.from(auditorTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    this.topAuditorsChart = {
      ...this.topAuditorsChart,
      series: [
        {
          name: 'Items Audited',
          data: topAuditors.map(([, total]) => this.toNumber(total)),
        },
      ],
      xaxis: {
        ...(this.topAuditorsChart.xaxis || {}),
        categories: topAuditors.map(([name]) => name),
      },
    };

    const ulList = Array.from(uniqueUlNumbers);
    const qTotal = ulList.filter((ul) => ul.toUpperCase().startsWith('Q')).length;
    const tTotal = ulList.filter((ul) => ul.toUpperCase().startsWith('T')).length;
    const qAudited = ulList.filter((ul) => ul.toUpperCase().startsWith('Q') && this.auditedUlNumbers.has(ul)).length;
    const tAudited = ulList.filter((ul) => ul.toUpperCase().startsWith('T') && this.auditedUlNumbers.has(ul)).length;

    this.qtCompletionChart = {
      ...this.qtCompletionChart,
      series: [
        {
          name: 'Audited',
          data: [this.toNumber(qAudited), this.toNumber(tAudited)],
        },
        {
          name: 'Pending',
          data: [this.toNumber(Math.max(0, qTotal - qAudited)), this.toNumber(Math.max(0, tTotal - tAudited))],
        },
      ],
      xaxis: {
        ...(this.qtCompletionChart.xaxis || {}),
        categories: ['Q Series', 'T Series'],
      },
    };
  }

  exportSignoffReport(signoff: AuditSignoff): void {
    const content = `
UL NEW AUDIT SIGN-OFF REPORT
============================

Audit Date: ${new Date(signoff.audit_date).toLocaleDateString()}
Auditor: ${signoff.auditor_name}
Signature: ${signoff.auditor_signature}
Items Audited: ${signoff.items_audited}

UL Numbers Audited:
${signoff.ul_numbers.join('\n')}

Notes:
${signoff.notes || 'No notes provided'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UL-Audit-Signoff-${signoff.audit_date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  printAuditReport(signoff: AuditSignoff): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the audit report');
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>UL Audit Sign-Off Report</title>
        <style>
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 11pt;
          }
          h1 {
            color: #198754;
            border-bottom: 3px solid #198754;
            padding-bottom: 10px;
            font-size: 18pt;
            margin-top: 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 8px;
            margin: 10px 0;
          }
          .label {
            font-weight: bold;
          }
          .signature {
            font-style: italic;
          }
          h3 {
            color: #333;
            font-size: 13pt;
            margin: 15px 0 10px 0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .ul-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 4px;
            margin: 10px 0;
            font-size: 9pt;
          }
          .ul-item {
            border: 1px solid #dee2e6;
            padding: 4px 6px;
            background-color: #f8f9fa;
            text-align: center;
            font-family: 'Courier New', monospace;
          }
          .summary-box {
            background-color: #e7f5ec;
            border: 2px solid #198754;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
          }
          .notes-box {
            border: 1px solid #dee2e6;
            padding: 10px;
            background-color: #f8f9fa;
            min-height: 60px;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 9pt;
            color: #666;
          }
        </style>
      </head>
      <body>
        <h1>🏷️ UL New Audit Sign-Off Report</h1>
        <div class="summary-box">
          <div class="info-grid">
            <div class="label">Audit Date:</div>
            <div>${new Date(signoff.audit_date).toLocaleDateString()}</div>
            <div class="label">Auditor Name:</div>
            <div>${signoff.auditor_name}</div>
            <div class="label">Signature:</div>
            <div class="signature">${signoff.auditor_signature}</div>
            <div class="label">Total Items:</div>
            <div><strong>${signoff.items_audited} UL Numbers</strong></div>
          </div>
        </div>
        <h3>UL Numbers Audited (${signoff.ul_numbers.length} items)</h3>
        <div class="ul-grid">
          ${signoff.ul_numbers.map(ul => `<div class="ul-item">${ul}</div>`).join('')}
        </div>
        <h3>Audit Notes</h3>
        <div class="notes-box">${signoff.notes || 'No notes provided'}</div>
        <div class="footer">
          <p><strong>Official Audit Record for UL New Label Verification</strong></p>
          <p>Generated: ${new Date().toLocaleString()} | Report ID: ${signoff.id || 'N/A'}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
