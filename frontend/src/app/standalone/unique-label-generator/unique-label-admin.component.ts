import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';
import { ToastrService } from 'ngx-toastr';
import { UniqueLabelBatch, UniqueLabelGeneratorApiService } from './unique-label-generator-api.service';
import { UniqueLabelAdminActionDropdownRendererComponent } from './unique-label-admin-action-dropdown-renderer.component';

@Component({
  selector: 'app-unique-label-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModalModule,
    AgGridModule,
  ],
  templateUrl: './unique-label-admin.component.html',
})
export class UniqueLabelAdminComponent implements OnInit {
  private readonly api = inject(UniqueLabelGeneratorApiService);
  private readonly fb = inject(FormBuilder);
  private readonly modalService = inject(NgbModal);
  private readonly toastr = inject(ToastrService);

  isLoadingBatches = false;
  isSavingEdit = false;
  lifecycleStatus: 'active' | 'archived' | 'deleted' | 'all' = 'active';
  searchTerm = '';
  actorName = 'Admin';
  batches: UniqueLabelBatch[] = [];
  selectedBatchId: number | null = null;
  private editModalRef: NgbModalRef | null = null;

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
  };

  readonly batchColumnDefs: ColDef[] = [
    { headerName: 'ID', field: 'id', width: 90 },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      cellRenderer: (params: any) => `<span class="badge bg-secondary text-uppercase">${params.value || '-'}</span>`,
      filter: 'agSetColumnFilter',
    },
    { headerName: 'Source', field: 'source_type', width: 110 },
    { headerName: 'WO #', field: 'work_order_number', width: 120, valueFormatter: (p: any) => p.value || '-' },
    { headerName: 'Part Number', field: 'part_number', minWidth: 180, flex: 1 },
    { headerName: 'Qty', field: 'requested_quantity', width: 90, filter: 'agNumberColumnFilter' },
    { headerName: 'Created By', field: 'created_by_name', width: 140 },
    { headerName: 'Created At', field: 'created_at', width: 170 },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 120,
      pinned: 'right',
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: UniqueLabelAdminActionDropdownRendererComponent,
      cellRendererParams: {
        onArchive: (batch: UniqueLabelBatch) => this.archiveBatch(batch),
        onSoftDelete: (batch: UniqueLabelBatch) => this.softDeleteBatch(batch),
        onRestore: (batch: UniqueLabelBatch) => this.restoreBatch(batch),
        onHardDelete: (batch: UniqueLabelBatch) => this.hardDeleteBatch(batch),
      },
    },
  ];

  readonly editForm = this.fb.group({
    source_type: this.fb.nonNullable.control<'WO' | 'MANUAL'>('MANUAL'),
    work_order_number: this.fb.nonNullable.control(''),
    part_number: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(128)]),
  });

  get filteredBatches(): UniqueLabelBatch[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.batches;
    }

    return this.batches.filter((batch) => {
      const searchable = [
        String(batch.id),
        batch.status,
        batch.source_type,
        batch.work_order_number || '',
        batch.part_number,
        String(batch.requested_quantity),
        batch.created_by_name,
        batch.created_at,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadBatches();
  }

  async loadBatches(): Promise<void> {
    this.isLoadingBatches = true;
    try {
      const response = await this.api.getRecentBatches(50, this.lifecycleStatus);
      this.batches = response.success && response.data ? response.data : [];
    } catch (error) {
      this.toastr.error('Failed to load admin batch list.');
      console.error(error);
    } finally {
      this.isLoadingBatches = false;
    }
  }

  startEdit(batch: UniqueLabelBatch, modalContent: TemplateRef<unknown>): void {
    this.selectedBatchId = batch.id;
    this.editForm.patchValue({
      source_type: batch.source_type === 'WO' ? 'WO' : 'MANUAL',
      work_order_number: batch.work_order_number || '',
      part_number: batch.part_number,
    });

    this.editModalRef = this.modalService.open(modalContent, { size: 'lg', backdrop: 'static' });
    this.editModalRef.result.finally(() => {
      this.selectedBatchId = null;
      this.editModalRef = null;
    });
  }

  cancelEdit(): void {
    this.editModalRef?.dismiss();
  }

  async saveBatchEdit(): Promise<void> {
    if (!this.selectedBatchId) {
      return;
    }

    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) {
      this.toastr.warning('Please fix batch edit validation errors.');
      return;
    }

    this.isSavingEdit = true;
    try {
      const payload = {
        source_type: this.editForm.controls.source_type.value,
        work_order_number: this.editForm.controls.work_order_number.value.trim() || null,
        part_number: this.editForm.controls.part_number.value.trim(),
        updated_by_name: this.actorName.trim() || 'Admin',
      };

      const response = await this.api.updateBatch(this.selectedBatchId, payload);
      if (!response.success) {
        this.toastr.error(response.message || 'Failed to update batch.');
        return;
      }

      this.toastr.success('Batch updated successfully.');
      this.editModalRef?.close();
      await this.loadBatches();
    } catch (error) {
      this.toastr.error('Failed to update batch.');
      console.error(error);
    } finally {
      this.isSavingEdit = false;
    }
  }

  async archiveBatch(batch: UniqueLabelBatch): Promise<void> {
    const reason = prompt(`Archive reason for batch ${batch.id}:`, 'Archived by admin');
    if (!reason) {
      return;
    }

    const response = await this.api.archiveBatch(batch.id, this.actorName.trim() || 'Admin', reason.trim());
    if (!response.success) {
      this.toastr.error(response.message || 'Failed to archive batch.');
      return;
    }

    this.toastr.success('Batch archived.');
    await this.loadBatches();
  }

  async softDeleteBatch(batch: UniqueLabelBatch): Promise<void> {
    const reason = prompt(`Soft delete reason for batch ${batch.id}:`, 'Deleted by admin');
    if (!reason) {
      return;
    }

    const response = await this.api.softDeleteBatch(batch.id, this.actorName.trim() || 'Admin', reason.trim());
    if (!response.success) {
      this.toastr.error(response.message || 'Failed to soft delete batch.');
      return;
    }

    this.toastr.success('Batch soft deleted.');
    await this.loadBatches();
  }

  async restoreBatch(batch: UniqueLabelBatch): Promise<void> {
    const response = await this.api.restoreBatch(batch.id, this.actorName.trim() || 'Admin');
    if (!response.success) {
      this.toastr.error(response.message || 'Failed to restore batch.');
      return;
    }

    this.toastr.success('Batch restored to active.');
    await this.loadBatches();
  }

  async hardDeleteBatch(batch: UniqueLabelBatch): Promise<void> {
    const confirmed = confirm(`Permanently delete batch ${batch.id}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    const response = await this.api.hardDeleteBatch(batch.id);
    if (!response.success) {
      this.toastr.error(response.message || 'Failed to hard delete batch.');
      return;
    }

    this.toastr.success('Batch hard deleted.');
    await this.loadBatches();
  }
}
