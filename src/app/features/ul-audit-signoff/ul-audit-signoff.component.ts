import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { SerialAssignmentsService } from '../serial-assignments/services/serial-assignments.service';

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
  id?: number;
  audit_date: string;
  auditor_name: string;
  auditor_signature: string;
  items_audited: number;
  ul_numbers: string[];
  notes: string;
  created_at?: string;
}

@Component({
  selector: 'app-ul-audit-signoff',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, AgGridAngular],
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
  auditNotes = '';
  currentDate = new Date().toISOString().split('T')[0];

  // Filters
  categoryFilter = '';
  dateFromFilter = '';
  dateToFilter = '';
  showAuditedItems = false;

  // AG Grid
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = {
    pagination: true,
    paginationPageSize: 50,
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
                if (signoff.id) {
                  this.ulNumberToAuditId.set(ul, signoff.id);
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

  applyFilters(): void {
    this.filteredItems = this.ulItems.filter(item => {
      // Filter out already audited items if toggle is off
      if (!this.showAuditedItems && this.auditedUlNumbers.has(item.ul_number)) {
        return false;
      }
      
      if (this.categoryFilter && item.ul_category !== this.categoryFilter) {
        return false;
      }
      if (this.dateFromFilter) {
        const itemDate = new Date(item.used_date);
        const fromDate = new Date(this.dateFromFilter);
        if (itemDate < fromDate) return false;
      }
      if (this.dateToFilter) {
        const itemDate = new Date(item.used_date);
        const toDate = new Date(this.dateToFilter);
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
    this.auditNotes = '';
  }

  async submitSignoff(): Promise<void> {
    if (!this.auditorName || !this.auditorSignature) {
      alert('Please provide auditor name and signature');
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
      const response = await this.serialAssignmentsService.submitAuditSignoff(signoff);
      
      if (response.success) {
        this.lastSignedOffRecord = signoff;
        this.closeSignoffModal();
        await this.loadAuditHistory();
        // Clear selection
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
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #198754; border-bottom: 3px solid #198754; padding-bottom: 10px; }
          .info-section { margin: 20px 0; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; display: inline-block; width: 150px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .signature { font-style: italic; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>UL New Audit Sign-Off Report</h1>
        <div class="info-section">
          <div class="info-row">
            <span class="label">Audit Date:</span>
            <span>${signoff.audit_date}</span>
          </div>
          <div class="info-row">
            <span class="label">Auditor Name:</span>
            <span>${signoff.auditor_name}</span>
          </div>
          <div class="info-row">
            <span class="label">Signature:</span>
            <span class="signature">${signoff.auditor_signature}</span>
          </div>
          <div class="info-row">
            <span class="label">Items Audited:</span>
            <span><strong>${signoff.items_audited}</strong></span>
          </div>
        </div>
        
        <div class="info-section">
          <h3>UL Numbers Audited (${signoff.ul_numbers.length})</h3>
          <table>
            <tbody>
              ${(() => {
                let rows = '';
                for (let i = 0; i < signoff.ul_numbers.length; i += 4) {
                  rows += '<tr>';
                  for (let j = 0; j < 4; j++) {
                    const index = i + j;
                    if (index < signoff.ul_numbers.length) {
                      rows += `<td>${signoff.ul_numbers[index]}</td>`;
                    } else {
                      rows += '<td></td>';
                    }
                  }
                  rows += '</tr>';
                }
                return rows;
              })()}
            </tbody>
          </table>
        </div>
        
        <div class="info-section">
          <h3>Audit Notes</h3>
          <p>${signoff.notes || 'No notes provided'}</p>
        </div>
        
        <div class="footer">
          <p>This is an official audit record for UL New label verification.</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
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
