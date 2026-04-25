import { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { QirSettingsService } from '@app/core/api/quality/qir-settings.service';
import { LinkRendererV2Component } from '@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component';
import { autoSizeColumns } from 'src/assets/js/util';

const QIR_CATEGORY_SLUGS: Record<string, string> = {
  priority:      'Priority',
  status:        'Status',
  statusReason:  'Status Reason',
  type:          'Incident Type',
  typeSub:       'Incident Sub-Type',
  componentType: 'Component Type',
  platformType:  'Platform Type',
  failureType:   'Failure Type',
  stakeholder:   'Stakeholder',
  customerName:  'Customer Name',
};

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, NgSelectModule, ReactiveFormsModule, NgbModalModule],
  selector: 'app-qir-options-list',
  templateUrl: './qir-options-list.component.html',
})
export class QirOptionsListComponent implements OnInit {
  constructor(
    private api: QirSettingsService,
    private modalService: NgbModal,
    private fb: FormBuilder,
    private toastr: ToastrService,
  ) {}

  @ViewChild('optionModal') optionModal!: TemplateRef<unknown>;

  title = 'QIR Options';

  gridApi!: GridApi;
  data: any[] = [];
  isLoading = false;
  isSaving = false;
  submitted = false;

  // categories loaded from API
  categories: any[] = [];

  // Category filter tabs
  readonly categoryTabs = Object.entries(QIR_CATEGORY_SLUGS).map(([slug, label]) => ({ slug, label }));
  selectedCategory: string | null = null;

  // Active/Inactive filter
  selectedViewType = 'Active';
  selectedViewOptions = [
    { name: 'Active',   value: 1 },
    { name: 'Inactive', value: 0 },
    { name: 'All',      value: null },
  ];

  // Modal state
  modalRef?: NgbModalRef;
  editingId: number | null = null;
  editingActive = 1;

  form: FormGroup = this.fb.group({
    category_id:    [null as number | null, Validators.required],
    name:           ['', Validators.required],
    code:           [''],
    description:    [''],
    show_in_public: [1],
    sort_order:     [0],
    active:         [1],
  });

  get f() { return this.form.controls; }

  get selectedCategorySlug(): string | null {
    const catId = this.form.value.category_id;
    const found = this.categories.find(c => c.id === catId);
    return found?.slug ?? null;
  }

  get modalTitle() {
    return this.editingId ? 'Edit Option' : 'Add Option';
  }

  columnDefs: ColDef[] = [
    {
      field: 'View',
      headerName: '',
      pinned: 'left',
      maxWidth: 80,
      minWidth: 80,
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.openModal(e.rowData),
        value: 'EDIT',
      },
    },
    { field: 'id',             headerName: 'ID',          filter: 'agMultiColumnFilter', maxWidth: 80 },
    { field: 'category_label', headerName: 'Category',    filter: 'agTextColumnFilter' },
    { field: 'name',           headerName: 'Name',        filter: 'agTextColumnFilter' },
    { field: 'code',           headerName: 'Code',        filter: 'agTextColumnFilter', maxWidth: 100 },
    { field: 'description',    headerName: 'Description', filter: 'agTextColumnFilter' },
    {
      field: 'show_in_public',
      headerName: 'Public',
      filter: 'agTextColumnFilter',
      maxWidth: 100,
      valueFormatter: (p) => p.value === 1 ? 'Yes' : 'No',
    },
    {
      field: 'sort_order',
      headerName: 'Order',
      filter: 'agNumberColumnFilter',
      maxWidth: 90,
    },
    {
      field: 'active',
      headerName: 'Active',
      filter: 'agTextColumnFilter',
      maxWidth: 90,
      valueFormatter: (p) => p.value === 1 ? 'Yes' : 'No',
    },
  ];

  gridOptions: GridOptions = {
    suppressCellFocus: true,
    onGridReady: (params) => { this.gridApi = params.api; },
    onFirstDataRendered: (params) => { autoSizeColumns(params); },
    getRowId: (params) => params.data.id?.toString(),
  };

  get filteredData() {
    if (!this.selectedCategory) return this.data;
    return this.data.filter(r => r.category === this.selectedCategory);
  }

  async ngOnInit() {
    await Promise.all([this.loadCategories(), this.getData()]);
  }

  async loadCategories() {
    try { this.categories = await this.api.getCategories(); } catch {}
  }

  async getData() {
    this.isLoading = true;
    try {
      const activeFilter = this.selectedViewOptions.find(o => o.name === this.selectedViewType);
      const params: any = {};
      if (activeFilter?.value !== null) params['active'] = activeFilter!.value;
      this.data = await this.api.getOptions(params);
    } finally {
      this.isLoading = false;
    }
  }

  openModal(row?: any) {
    this.submitted = false;
    this.editingId = row?.id ?? null;
    this.editingActive = row?.active ?? 1;
    this.form.reset({
      category_id:    row?.category_id ?? null,
      name:           row?.name ?? '',
      code:           row?.code ?? '',
      description:    row?.description ?? '',
      show_in_public: row?.show_in_public ?? 1,
      sort_order:     row?.sort_order ?? 0,
      active:         row?.active ?? 1,
    });
    this.modalRef = this.modalService.open(this.optionModal, { size: 'lg', backdrop: 'static' });
    this.modalRef.result.catch(() => {}); // suppress uncaught promise on dismiss
  }

  async onSave() {
    this.submitted = true;
    if (this.form.invalid) return;

    this.isSaving = true;
    try {
      if (this.editingId) {
        await this.api.updateOption(this.editingId, this.form.value);
        this.toastr.success('Option updated');
      } else {
        await this.api.createOption(this.form.value);
        this.toastr.success('Option created');
      }
      this.modalRef?.close();
      await this.getData();
    } catch {
      this.toastr.error('Failed to save option');
    } finally {
      this.isSaving = false;
    }
  }

  async onToggleActive() {
    const newActive = this.editingActive === 1 ? 0 : 1;
    const action = newActive === 0 ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} this option?`)) return;
    this.isSaving = true;
    try {
      await this.api.updateOption(this.editingId!, { active: newActive });
      this.toastr.success(`Option ${action}d`);
      this.modalRef?.close();
      await this.getData();
    } catch {
      this.toastr.error(`Failed to ${action} option`);
    } finally {
      this.isSaving = false;
    }
  }

  selectCategory(slug: string | null) {
    this.selectedCategory = slug;
  }
}
