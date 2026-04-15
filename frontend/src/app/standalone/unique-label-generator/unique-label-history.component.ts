import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, inject } from '@angular/core';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import {
  UniqueLabelBatch,
  UniqueLabelGeneratorApiService,
  UniqueLabelIdentifier,
} from './unique-label-generator-api.service';

interface BatchDetails {
  batch: Record<string, unknown>;
  identifiers: UniqueLabelIdentifier[];
}

@Component({
  selector: 'app-unique-label-history',
  standalone: true,
  imports: [CommonModule, NgbModalModule],
  templateUrl: './unique-label-history.component.html',
})
export class UniqueLabelHistoryComponent implements OnInit {
  private readonly api = inject(UniqueLabelGeneratorApiService);
  private readonly modalService = inject(NgbModal);
  private readonly toastr = inject(ToastrService);

  isLoading = false;
  isLoadingDetails = false;
  isReprintEnabled = true;
  batches: UniqueLabelBatch[] = [];
  selectedBatchDetails: BatchDetails | null = null;
  private detailsModalRef: NgbModalRef | null = null;

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
