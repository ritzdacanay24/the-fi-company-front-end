import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { ToastrService } from 'ngx-toastr';
import { ShippingChecklistsService } from '@app/core/api/operations/shipping-checklists/shipping-checklists.service';
import { ShippingChecklistHistoryOpenActionRendererComponent } from './shipping-checklist-history-open-action-renderer.component';

interface ShippingChecklistHistoryRow {
  id: number;
  checklistNumber: string;
  customerName: string;
  createdBy: string;
  status: string;
  salesOrder: string;
  packingSlip: string;
  secondVerifierEmailSentAt: string;
  updatedAt: string;
}

@Component({
  standalone: true,
  selector: 'app-shipping-checklist-history',
  imports: [CommonModule, FormsModule, RouterModule, AgGridModule],
  templateUrl: './shipping-checklist-history.component.html',
  styleUrls: ['./shipping-checklist-history.component.scss'],
})
export class ShippingChecklistHistoryComponent implements OnInit {
  isLoading = false;
  searchTerm = '';
  statusFilter = 'all';
  rows: ShippingChecklistHistoryRow[] = [];
  filteredRows: ShippingChecklistHistoryRow[] = [];
  readonly components = {
    openActionRenderer: ShippingChecklistHistoryOpenActionRendererComponent,
  };

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
  };

  readonly columnDefs: ColDef[] = [
    { headerName: 'ID', field: 'id', width: 90, filter: 'agNumberColumnFilter' },
    { headerName: 'Checklist #', field: 'checklistNumber', minWidth: 160, flex: 1 },
    { headerName: 'Customer', field: 'customerName', minWidth: 160, flex: 1 },
    { headerName: 'Created By', field: 'createdBy', minWidth: 180, flex: 1 },
    {
      headerName: 'Status',
      field: 'status',
      width: 170,
      cellRenderer: (params: any) => {
        const statusValue = String(params?.value || '').trim().toLowerCase();
        const label = this.formatStatusLabel(statusValue);
        const statusClass = this.getStatusClass(statusValue);
        return `<span class="badge status-pill ${statusClass}">${label}</span>`;
      },
    },
    { headerName: 'Sales Order', field: 'salesOrder', width: 150 },
    { headerName: 'Packing Slip', field: 'packingSlip', width: 150 },
    {
      headerName: 'Email Sent',
      field: 'secondVerifierEmailSentAt',
      width: 180,
      valueFormatter: (params) => this.formatDateTime(params.value),
    },
    {
      headerName: 'Updated',
      field: 'updatedAt',
      width: 180,
      sort: 'desc',
      valueFormatter: (params) => this.formatDateTime(params.value),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 130,
      pinned: 'right',
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: 'openActionRenderer',
      cellRendererParams: {
        onOpen: (row: ShippingChecklistHistoryRow) => this.openChecklist(row?.id),
      },
    },
  ];

  constructor(
    private readonly service: ShippingChecklistsService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadHistory();
  }

  onFilterChanged(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    const status = this.statusFilter.trim().toLowerCase();

    this.filteredRows = this.rows.filter((row) => {
      const statusMatch = status === 'all' || String(row.status || '').toLowerCase() === status;
      if (!statusMatch) {
        return false;
      }

      if (!term) {
        return true;
      }

      const text = [
        String(row.id),
        row.checklistNumber,
        row.customerName,
        row.createdBy,
        row.status,
        row.salesOrder,
        row.packingSlip,
      ]
        .join(' ')
        .toLowerCase();

      return text.includes(term);
    });
  }

  async loadHistory(): Promise<void> {
    this.isLoading = true;

    try {
      const [templates, instances] = await Promise.all([
        this.service.getTemplates(),
        this.service.getInstances(),
      ]);

      const templateById = new Map<number, string>();
      for (const template of templates || []) {
        templateById.set(Number(template.id), String(template.formCode || '-'));
      }

      this.rows = (instances || [])
        .map((item: any) => ({
          id: Number(item.id),
          checklistNumber: templateById.get(Number(item.templateId)) || String(item.formCode || '-'),
          customerName: String(item.customerName || ''),
          createdBy: String(item.createdBy || '-'),
          status: String(item.status || ''),
          salesOrder: String(item.salesOrder || ''),
          packingSlip: String(item.packingSlip || ''),
          secondVerifierEmailSentAt: String(item.secondVerifierEmailSentAt || ''),
          updatedAt: String(item.updatedAt || ''),
        }))
        .sort((a, b) => Number(b.id) - Number(a.id));
      this.applyFilters();
    } catch {
      this.rows = [];
      this.filteredRows = [];
      this.toastr.error('Unable to load shipping checklist history');
    } finally {
      this.isLoading = false;
    }
  }

  private openChecklist(id: number): void {
    const normalizedId = Number(id || 0);
    if (normalizedId <= 0) {
      return;
    }

    void this.router.navigate(['/operations/forms/shipping-checklist'], {
      queryParams: { id: normalizedId },
    });
  }

  private formatStatusLabel(value: unknown): string {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'verified') {
      return 'Verified';
    }

    if (normalized === 'submitted') {
      return 'Pending Secondary Verification';
    }

    return 'Draft';
  }

  private formatDateTime(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '-';
    }

    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) {
      return raw;
    }

    return dt.toLocaleString();
  }

  private getStatusClass(value: string): string {
    if (value === 'verified') {
      return 'text-bg-success';
    }

    if (value === 'submitted') {
      return 'text-bg-warning';
    }

    return 'text-bg-secondary';
  }
}
