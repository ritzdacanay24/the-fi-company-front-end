import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { SerialAssignmentsService } from '../serial-assignments/services/serial-assignments.service';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

interface ULAuditItem {
  id: number;
  ul_number: string;
  ul_category: string;
  eyefi_serial_number: string;
  part_number: string;
  wo_number: string;
  used_date: string;
  used_by: string;
  audit_date?: string;
  audit_id?: number;
  selected?: boolean;
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
  selector: 'app-ul-audit-signoff',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, AgGridAngular, NgChartsModule],
  templateUrl: './ul-audit-signoff.component.html',
  styleUrls: ['./ul-audit-signoff.component.scss']
})
export class UlAuditSignoffComponent implements OnInit {
  // Data
  ulItems: ULAuditItem[] = [];
  filteredItems: ULAuditItem[] = [];
  selectedItems: ULAuditItem[] = [];
  auditHistory: AuditSignoff[] = [];
  auditedUlNumbers: Set<string> = new Set();
  ulNumberToAuditDate: Map<string, string> = new Map();
  ulNumberToAuditId: Map<string, number> = new Map();

  // UI State
  loading = false;
  error: string | null = null;
  showSignoffModal = false;
  showHistoryModal = false;
  showSuccessModal = false;
  lastSignedOffRecord: AuditSignoff | null = null;

  // Signoff Form
  auditorName = '';
  auditorSignature = '';
  auditorEmail = '';
  auditNotes = '';
  currentDate = new Date().toISOString().split('T')[0];

  // Filters
  categoryFilter = '';
  dateFromFilter = '';
  dateToFilter = '';
  showAuditedItems = false;

  // Audit History Chart
  auditChartType: 'bar' = 'bar';
  auditChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Items Audited',
        data: [],
        backgroundColor: 'rgba(25, 135, 84, 0.35)',
        borderColor: 'rgba(25, 135, 84, 1)',
        borderWidth: 1
      }
    ]
  };
  auditChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true }
    },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, ticks: { precision: 0 } }
    }
  };

  // AG Grid
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = {
    pagination: false,
    animateRows: true,
    rowSelection: 'multiple',
    suppressRowClickSelection: false,
    rowMultiSelectWithClick: true
  };
  private gridApi: any;

  constructor(
    private serialAssignmentsService: SerialAssignmentsService
  ) {
    this.initializeGrid();
  }

  ngOnInit(): void {
    this.loadULItems();
    this.loadAuditHistory();
  }

  initializeGrid(): void {
    this.columnDefs = [
      {
        headerName: '',
        checkboxSelection: (params: any) => {
          // Only allow selection of unaudited items
          return !this.auditedUlNumbers.has(params.data?.ul_number);
        },
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        width: 50,
        pinned: 'left',
        lockPosition: true
      },
      {
        headerName: 'UL Number',
        field: 'ul_number',
        width: 140,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `<strong class="text-primary">${params.value}</strong>`;
        }
      },
      {
        headerName: 'Category',
        field: 'ul_category',
        width: 120,
        cellRenderer: (params: any) => {
          const categoryClass = params.value === 'New' ? 'bg-success' : 'bg-info';
          return `<span class="badge ${categoryClass}">${params.value}</span>`;
        }
      },
      {
        headerName: 'EyeFi Serial',
        field: 'eyefi_serial_number',
        width: 150
      },
      {
        headerName: 'Part Number',
        field: 'part_number',
        width: 140,
        hide:true
      },
      {
        headerName: 'Status',
        field: 'ul_number',
        width: 120,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const isAudited = this.auditedUlNumbers.has(params.value);
          return isAudited 
            ? '<span class="badge bg-success"><i class="mdi mdi-check"></i> Audited</span>'
            : '<span class="badge bg-secondary">Pending</span>';
        }
      },
      {
        headerName: 'Audit Date',
        field: 'audit_date',
        width: 120,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-muted">-</span>';
          return params.value;
        }
      },
      {
        headerName: 'Audit ID',
        field: 'audit_id',
        width: 100,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-muted">-</span>';
          return `<span class="badge bg-info">#${params.value}</span>`;
        }
      },
      {
        headerName: 'WO Number',
        field: 'wo_number',
        width: 130
      },
      {
        headerName: 'Used Date',
        field: 'used_date',
        width: 160,
        valueFormatter: (params: any) => {
          if (!params.value) return '-';
          return new Date(params.value).toLocaleString();
        }
      },
      {
        headerName: 'Used By',
        field: 'used_by',
        width: 150
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    params.api.sizeColumnsToFit();
  }

  async loadULItems(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const response = await this.serialAssignmentsService.getAllConsumedSerials({
        ul_category: 'New' // Only load UL New items
      });

      if (response.success) {
        this.ulItems = response.data
          .filter((item: any) => item.ul_number && item.ul_category === 'New')
          .map((item: any) => ({
            id: item.id,
            ul_number: item.ul_number,
            ul_category: item.ul_category,
            eyefi_serial_number: item.eyefi_serial_number,
            part_number: item.part_number || '-',
            wo_number: item.wo_number || '-',
            used_date: item.used_date,
            used_by: item.used_by,
            audit_date: this.ulNumberToAuditDate.get(item.ul_number),
            audit_id: this.ulNumberToAuditId.get(item.ul_number),
            selected: false
          }));
        
        this.applyFilters();
      } else {
        this.error = response.error || 'Failed to load UL items';
      }
    } catch (error: any) {
      this.error = error.message || 'An error occurred while loading UL items';
      console.error('Error loading UL items:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadAuditHistory(): Promise<void> {
    try {
      const response = await this.serialAssignmentsService.getAuditSignoffs();
      if (response.success) {
        this.auditHistory = response.data || [];
        
        // Build set of already audited UL numbers and map to audit dates and IDs
        this.auditedUlNumbers.clear();
        this.ulNumberToAuditDate.clear();
        this.ulNumberToAuditId.clear();
        
        this.auditHistory.forEach(signoff => {
          if (signoff.ul_numbers && Array.isArray(signoff.ul_numbers)) {
            signoff.ul_numbers.forEach(ul => {
              this.auditedUlNumbers.add(ul);
              // Store the most recent audit date and ID (since sorted DESC)
              if (!this.ulNumberToAuditDate.has(ul)) {
                this.ulNumberToAuditDate.set(ul, signoff.audit_date);
                const signoffId = Number(signoff.id);
                if (Number.isFinite(signoffId) && signoffId > 0) {
                  this.ulNumberToAuditId.set(ul, signoffId);
                }
              }
            });
          }
        });
        
        // Update audit dates in ulItems
        this.ulItems.forEach(item => {
          item.audit_date = this.ulNumberToAuditDate.get(item.ul_number);
          item.audit_id = this.ulNumberToAuditId.get(item.ul_number);
        });

        this.buildAuditChart();
        
        // Refresh grid to update status badges
        this.applyFilters();
        
        // Force grid redraw to update cell renderers
        if (this.gridApi) {
          this.gridApi.redrawRows();
        }
      }
    } catch (error) {
      console.error('Error loading audit history:', error);
    }
  }

  private normalizeAuditDate(dateStr: string): string {
    if (!dateStr) return '';
    // Supports 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss', and 'YYYY-MM-DD HH:mm:ss'
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

    this.auditChartData = {
      labels,
      datasets: [
        {
          label: 'Items Audited',
          data,
          backgroundColor: 'rgba(25, 135, 84, 0.35)',
          borderColor: 'rgba(25, 135, 84, 1)',
          borderWidth: 1
        }
      ]
    };
  }

  applyFilters(): void {
    this.filteredItems = this.ulItems.filter(item => {
      // Filter out already audited items if toggle is off
      if (!this.showAuditedItems && this.auditedUlNumbers.has(item.ul_number)) {
        return false;
      }
      
      if (this.categoryFilter && item.ul_category !== this.categoryFilter) {
        return false;
      }
      
      // Date filtering based on used_date
      if (this.dateFromFilter && item.used_date) {
        // Extract just the date portion (YYYY-MM-DD) for comparison
        const itemDateStr = item.used_date.split('T')[0].split(' ')[0];
        const itemDate = new Date(itemDateStr + 'T00:00:00');
        const fromDate = new Date(this.dateFromFilter + 'T00:00:00');
        
        if (itemDate < fromDate) return false;
      }
      
      if (this.dateToFilter && item.used_date) {
        // Extract just the date portion (YYYY-MM-DD) for comparison
        const itemDateStr = item.used_date.split('T')[0].split(' ')[0];
        const itemDate = new Date(itemDateStr + 'T00:00:00');
        const toDate = new Date(this.dateToFilter + 'T00:00:00');
        
        if (itemDate > toDate) return false;
      }
      
      return true;
    });
  }

  clearFilters(): void {
    this.categoryFilter = '';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.applyFilters();
  }

  onSelectionChanged(event: any): void {
    this.selectedItems = event.api.getSelectedRows();
  }

  openSignoffModal(): void {
    if (this.selectedItems.length === 0) {
      alert('Please select at least one item to audit');
      return;
    }
    this.showSignoffModal = true;
  }

  closeSignoffModal(): void {
    this.showSignoffModal = false;
    this.auditorName = '';
    this.auditorSignature = '';
    this.auditorEmail = '';
    this.auditNotes = '';
  }

  isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async submitSignoff(): Promise<void> {
    if (!this.auditorName || !this.auditorSignature || !this.auditorEmail) {
      alert('Please provide auditor name, signature, and email address');
      return;
    }

    if (!this.isValidEmail(this.auditorEmail)) {
      alert('Please provide a valid email address');
      return;
    }

    const signoff: AuditSignoff = {
      audit_date: this.currentDate,
      auditor_name: this.auditorName,
      auditor_signature: this.auditorSignature,
      items_audited: this.selectedItems.length,
      ul_numbers: this.selectedItems.map(item => item.ul_number),
      notes: this.auditNotes
    };

    try {
      const response = await this.serialAssignmentsService.submitAuditSignoff(signoff, this.auditorEmail);
      
      if (response.success) {
        this.lastSignedOffRecord = signoff;
        this.closeSignoffModal();
        
        // Clear form
        this.auditorName = '';
        this.auditorSignature = '';
        this.auditorEmail = '';
        this.auditNotes = '';
        
        // Reload audit history to update audited UL numbers
        await this.loadAuditHistory();
        
        // Reload UL items to refresh the data
        await this.loadULItems();
        
        // Clear grid selection
        if (this.gridApi) {
          this.gridApi.deselectAll();
        }
        
        // Clear selection array
        this.selectedItems = [];
        
        // Show success modal with print option
        this.showSuccessModal = true;
      } else {
        alert('Failed to submit audit signoff: ' + (response.error || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Error submitting audit signoff: ' + error.message);
      console.error('Error submitting signoff:', error);
    }
  }

  openHistoryModal(): void {
    this.showHistoryModal = true;
    this.buildAuditChart();
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
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
          
          .info-section { 
            margin: 15px 0;
            page-break-inside: avoid;
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
            page-break-inside: avoid;
          }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
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
        
        <div class="info-section">
          <h3>UL Numbers Audited (${signoff.ul_numbers.length} items)</h3>
          <div class="ul-grid">
            ${signoff.ul_numbers.map(ul => `<div class="ul-item">${ul}</div>`).join('')}
          </div>
        </div>
        
        <div class="info-section">
          <h3>Audit Notes</h3>
          <div class="notes-box">${signoff.notes || 'No notes provided'}</div>
        </div>
        
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

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.lastSignedOffRecord = null;
  }

  refresh(): void {
    this.loadULItems();
    this.loadAuditHistory();
  }
}
