import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import { ToastrService } from 'ngx-toastr';
import {
  UniqueLabelBatch,
  UniqueLabelGeneratorApiService,
  UniqueLabelIdentifier,
} from './unique-label-generator-api.service';
import { printZplToZebra } from './unique-label-zpl.util';

interface BatchDetails {
  batch: Record<string, unknown>;
  identifiers: UniqueLabelIdentifier[];
}

@Component({
  selector: 'app-unique-label-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, AgGridModule],
  templateUrl: './unique-label-history.component.html',
})
export class UniqueLabelHistoryComponent implements OnInit {
  private readonly api = inject(UniqueLabelGeneratorApiService);
  private readonly modalService = inject(NgbModal);
  private readonly toastr = inject(ToastrService);

  isLoading = false;
  isLoadingDetails = false;
  isReprintEnabled = true;
  searchTerm = '';
  batches: UniqueLabelBatch[] = [];
  selectedBatchDetails: BatchDetails | null = null;
  private detailsModalRef: NgbModalRef | null = null;

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
  };

  @ViewChild('batchDetailsModal', { static: true }) batchDetailsModalTpl?: TemplateRef<unknown>;

  readonly batchColumnDefs: ColDef[] = [
    { headerName: 'ID', field: 'id', width: 90 },
    { headerName: 'Source', field: 'source_type', width: 110 },
    { headerName: 'WO #', field: 'work_order_number', width: 120, valueFormatter: (p: any) => p.value || '-' },
    { headerName: 'Part Number', field: 'part_number', minWidth: 180, flex: 1 },
    { headerName: 'Requested', field: 'requested_quantity', width: 110, filter: 'agNumberColumnFilter' },
    { headerName: 'Generated', field: 'generated_count', width: 110, filter: 'agNumberColumnFilter' },
    { headerName: 'Created By', field: 'created_by_name', width: 140 },
    { headerName: 'Created At', field: 'created_at', width: 170 },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 130,
      pinned: 'right',
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: () => '<button class="btn btn-outline-primary btn-sm action-btn" data-action="view">View Details</button>',
      onCellClicked: (params: any) => {
        const button = params?.event?.target?.closest?.('.action-btn');
        if (button && params?.data?.id) {
          if (this.batchDetailsModalTpl) {
            this.viewBatchDetails(params.data.id, this.batchDetailsModalTpl);
          }
        }
      },
    },
  ];

  readonly detailColumnDefs: ColDef[] = [
    { headerName: 'Unique ID', field: 'unique_identifier', minWidth: 180, flex: 1 },
    { headerName: 'Part Number', field: 'part_number', width: 150 },
    { headerName: 'WO #', field: 'work_order_number', width: 120, valueFormatter: (p: any) => p.value || '-' },
    { headerName: 'Qty Printed', field: 'quantity_printed', width: 120, filter: 'agNumberColumnFilter' },
    { headerName: 'Created At', field: 'created_at', width: 170, valueFormatter: (p: any) => p.value || '-' },
    {
      headerName: 'Actions',
      colId: 'detailActions',
      width: 180,
      pinned: 'right',
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: () => `
        <div class="d-inline-flex align-items-center gap-2">
          <button type="button" class="btn btn-sm btn-outline-secondary action-btn" data-action="reprint">Reprint</button>
          <button type="button" class="btn btn-sm btn-outline-primary action-btn" data-action="zebra">Zebra</button>
        </div>
      `,
      onCellClicked: (params: any) => {
        const button = params?.event?.target?.closest?.('.action-btn');
        const action = button?.getAttribute?.('data-action');
        if (!action || !params?.data) return;
        if (action === 'reprint') {
          this.reprintIdentifier(params.data);
        } else if (action === 'zebra') {
          this.printIdentifierZpl(params.data);
        }
      },
    },
  ];


  get filteredBatches(): UniqueLabelBatch[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.batches;
    }

    return this.batches.filter((batch) => {
      const searchable = [
        String(batch.id),
        batch.source_type,
        batch.work_order_number || '',
        batch.part_number,
        String(batch.requested_quantity),
        String(batch.generated_count),
        batch.created_by_name,
        batch.created_at,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadBatches(), this.loadSettings()]);
  }

  async loadSettings(): Promise<void> {
    try {
      const response = await this.api.getSettings();
      if (response.success && response.data) {
        this.isReprintEnabled = Boolean(response.data.allow_reprint);
      }
    } catch (error) {
      this.toastr.warning('Failed to load reprint settings. Reprint remains available by default.');
      console.error(error);
    }
  }

  async loadBatches(): Promise<void> {
    this.isLoading = true;
    try {
      const response = await this.api.getRecentBatches(30);
      this.batches = response.success && response.data ? response.data : [];
    } catch (error) {
      this.toastr.error('Failed to load batch history.');
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  async viewBatchDetails(batchId: number, modalContent: TemplateRef<unknown>): Promise<void> {
    this.isLoadingDetails = true;
    try {
      const response = await this.api.getBatchDetails(batchId);
      if (!response.success || !response.data) {
        this.toastr.warning(response.message || 'Batch details not found.');
        return;
      }

      this.selectedBatchDetails = {
        batch: response.data.batch,
        identifiers: response.data.identifiers || [],
      };

      this.detailsModalRef = this.modalService.open(modalContent, {
        size: 'xl',
        scrollable: true,
      });

      this.detailsModalRef.result.finally(() => {
        this.detailsModalRef = null;
      });
    } catch (error) {
      this.toastr.error('Failed to load batch details.');
      console.error(error);
    } finally {
      this.isLoadingDetails = false;
    }
  }

  printSelectedBatch(): void {
    const details = this.selectedBatchDetails;
    if (!details || !details.identifiers.length) {
      this.toastr.warning('No identifiers available to print for this batch.');
      return;
    }

    const batchId = String(details.batch['id'] ?? '-');
    this.openPrintPopup(details.identifiers, `Reprint Labels - Batch ${batchId}`, batchId);
  }

  reprintIdentifier(item: UniqueLabelIdentifier): void {
    if (!this.isReprintEnabled) {
      this.toastr.warning('Reprint is currently disabled in admin settings.');
      return;
    }

    const details = this.selectedBatchDetails;
    const batchId = String(details?.batch?.['id'] ?? '-');
    this.openPrintPopup([item], `Reprint Label ${item.unique_identifier}`, batchId);
  }

  async printBatchZpl(): Promise<void> {
    if (!this.isReprintEnabled) {
      this.toastr.warning('Reprint is currently disabled in admin settings.');
      return;
    }

    const details = this.selectedBatchDetails;
    if (!details || !details.identifiers.length) {
      this.toastr.warning('No identifiers available for Zebra print.');
      return;
    }

    try {
      await printZplToZebra(details.identifiers);
      this.toastr.success('Batch labels sent to default Zebra printer.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to print batch labels.';
      this.toastr.error(message);
      console.error(error);
    }
  }

  async printIdentifierZpl(item: UniqueLabelIdentifier): Promise<void> {
    if (!this.isReprintEnabled) {
      this.toastr.warning('Reprint is currently disabled in admin settings.');
      return;
    }

    try {
      await printZplToZebra([item]);
      this.toastr.success(`Label ${item.unique_identifier} sent to default Zebra printer.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to print ${item.unique_identifier}.`;
      this.toastr.error(message);
      console.error(error);
    }
  }

  private openPrintPopup(items: UniqueLabelIdentifier[], title: string, batchId: string): void {
    const printableRows = items
      .map((item) => {
        return `
          <div class="label-card">
            <div class="label-title">Unique Label</div>
            <div class="label-id">${item.unique_identifier}</div>
            <div class="label-line"><strong>Part:</strong> ${item.part_number}</div>
            <div class="label-line"><strong>Qty Printed:</strong> ${item.quantity_printed}</div>
          </div>
        `;
      })
      .join('');

    const popup = window.open('', '_blank', 'width=1000,height=760');
    if (!popup) {
      this.toastr.warning('Allow popups to print labels.');
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 16px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
            .label-card { border: 1px solid #111; border-radius: 8px; padding: 12px; min-height: 150px; }
            .label-title { font-size: 14px; color: #444; margin-bottom: 10px; }
            .label-id { font-size: 32px; font-weight: 700; margin-bottom: 10px; letter-spacing: 1px; }
            .label-line { font-size: 16px; margin-bottom: 6px; }
          </style>
        </head>
        <body>
          <h2>Unique Label Generator</h2>
          <p>Batch ID: ${batchId}</p>
          <div class="grid">${printableRows}</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    popup.document.close();
  }
}
