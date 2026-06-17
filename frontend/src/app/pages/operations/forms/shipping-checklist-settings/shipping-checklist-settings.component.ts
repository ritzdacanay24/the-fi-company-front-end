import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { ToastrService } from 'ngx-toastr';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import {
  ShippingChecklistCustomerSetting,
  ShippingChecklistCustomerSettingUpsertPayload,
  ShippingChecklistsService,
} from '@app/core/api/operations/shipping-checklists/shipping-checklists.service';

interface SettingsSection {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

@Component({
  standalone: true,
  selector: 'app-shipping-checklist-settings',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, AgGridModule],
  templateUrl: './shipping-checklist-settings.component.html',
  styleUrls: ['./shipping-checklist-settings.component.scss'],
})
export class ShippingChecklistSettingsComponent implements OnInit {
  isLoading = false;
  isSaving = false;
  isUploadingLogo = false;
  searchTerm = '';
  activeOnly = true;

  readonly sections: SettingsSection[] = [
    {
      key: 'customers',
      label: 'Customer Master',
      description: 'Canonical customers and logos used by shipping checklists.',
      enabled: true,
    },
    {
      key: 'notifications',
      label: 'Notification Rules',
      description: 'Future module for global checklist notification behavior.',
      enabled: false,
    },
    {
      key: 'workflows',
      label: 'Workflow Policies',
      description: 'Future module for status transitions and locks.',
      enabled: false,
    },
  ];

  selectedSectionKey = 'customers';
  rows: ShippingChecklistCustomerSetting[] = [];
  filteredRowsData: ShippingChecklistCustomerSetting[] = [];
  selectedCustomerId: number | null = null;

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
  };

  readonly columnDefs: ColDef[] = [
    { headerName: 'Code', field: 'customerCode', width: 130 },
    { headerName: 'Name', field: 'customerName', minWidth: 180, flex: 1 },
    {
      headerName: 'Logo',
      field: 'logoUrl',
      width: 130,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: (params: any) => {
        const raw = String(params?.value || '').trim();
        if (!/^https?:\/\//i.test(raw)) {
          return '<span class="text-body-secondary small">No logo</span>';
        }

        return `<img class="customer-logo-cell" src="${raw}" alt="Logo" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=&quot;text-body-secondary small&quot;>Invalid</span>';" />`;
      },
    },
    {
      headerName: 'Status',
      field: 'isActive',
      width: 110,
      valueFormatter: (params) => (params.value ? 'Active' : 'Inactive'),
    },
    {
      headerName: 'Mappings',
      field: 'mappingCount',
      width: 110,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Updated',
      field: 'updatedAt',
      width: 180,
      valueFormatter: (params) => this.formatDateTime(params.value),
    },
  ];

  readonly customerForm: FormGroup;

  constructor(
    private readonly service: ShippingChecklistsService,
    private readonly attachmentsService: AttachmentsService,
    private readonly fb: FormBuilder,
    private readonly toastr: ToastrService,
  ) {
    this.customerForm = this.fb.group({
      customerCode: ['', [Validators.required, Validators.maxLength(20)]],
      customerName: ['', [Validators.required, Validators.maxLength(120)]],
      logoUrl: ['', [Validators.maxLength(1000)]],
      isActive: [true],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCustomers();
  }

  get selectedSection(): SettingsSection {
    return this.sections.find((item) => item.key === this.selectedSectionKey) || this.sections[0];
  }

  get logoPreviewUrl(): string {
    const raw = String(this.customerForm.get('logoUrl')?.value || '').trim();
    return /^https?:\/\//i.test(raw) ? raw : '';
  }

  async loadCustomers(): Promise<void> {
    this.isLoading = true;

    try {
      this.rows = await this.service.getCustomerSettings();
      this.applyFilters();
      if (this.selectedCustomerId) {
        const selected = this.rows.find((item) => Number(item.id) === Number(this.selectedCustomerId));
        if (selected) {
          this.bindForm(selected);
        }
      }
    } catch {
      this.rows = [];
      this.toastr.error('Unable to load customer settings');
    } finally {
      this.isLoading = false;
    }
  }

  selectSection(section: SettingsSection): void {
    if (!section.enabled) {
      return;
    }

    this.selectedSectionKey = section.key;
  }

  onActiveOnlyChanged(value: boolean): void {
    this.activeOnly = Boolean(value);
    this.applyFilters();
  }

  onSearchTermChanged(value: string): void {
    this.searchTerm = String(value || '');
    this.applyFilters();
  }

  onRowClicked(event: any): void {
    const row = event?.data as ShippingChecklistCustomerSetting | undefined;
    if (!row?.id) {
      return;
    }

    this.bindForm(row);
  }

  startNewCustomer(): void {
    this.selectedCustomerId = null;
    this.customerForm.reset({
      customerCode: '',
      customerName: '',
      logoUrl: '',
      isActive: true,
    });
  }

  async saveCustomer(): Promise<void> {
    this.customerForm.markAllAsTouched();
    if (this.customerForm.invalid) {
      this.toastr.warning('Please complete required customer fields.');
      return;
    }

    const payload = this.buildCustomerPayload();
    this.isSaving = true;

    try {
      const result = await this.service.upsertCustomerSetting(payload);
      if (!result?.success) {
        this.toastr.error(result?.error || 'Unable to save customer setting');
        return;
      }

      this.toastr.success(this.selectedCustomerId ? 'Customer updated' : 'Customer created');
      this.selectedCustomerId = Number(result.customerId || this.selectedCustomerId || 0) || null;
      await this.loadCustomers();
    } catch {
      this.toastr.error('Unable to save customer setting');
    } finally {
      this.isSaving = false;
    }
  }

  async onLogoFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = (input?.files || [])[0];
    if (!file) {
      return;
    }

    const customerCode = String(this.customerForm.get('customerCode')?.value || '').trim().toLowerCase();
    if (!customerCode) {
      this.toastr.warning('Enter a customer code before uploading a logo.');
      input.value = '';
      return;
    }

    this.isUploadingLogo = true;
    const uniqueKey = this.buildLogoUploadKey(customerCode);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', 'customerMasterLogo');
      formData.append('uniqueData', uniqueKey);
      formData.append('subFolder', 'customerMaster');

      await this.attachmentsService.uploadfile(formData);

      const rows = await this.attachmentsService.find({
        field: 'customerMasterLogo',
        uniqueId: uniqueKey,
      });

      const latest = (rows || [])
        .map((row: any) => ({
          id: Number(row.id || 0),
          link: String(row.link || '').trim(),
        }))
        .filter((row: any) => row.id > 0 && row.link.length > 0)
        .sort((a: any, b: any) => b.id - a.id)[0];

      if (!latest?.link) {
        this.toastr.warning('Upload completed, but no logo URL was returned.');
        return;
      }

      this.customerForm.patchValue({ logoUrl: latest.link });
      this.toastr.success('Logo uploaded and applied.');
    } catch {
      this.toastr.error('Failed to upload logo.');
    } finally {
      this.isUploadingLogo = false;
      input.value = '';
    }
  }

  private bindForm(row: ShippingChecklistCustomerSetting): void {
    this.selectedCustomerId = Number(row.id);
    this.customerForm.patchValue({
      customerCode: String(row.customerCode || ''),
      customerName: String(row.customerName || ''),
      logoUrl: String(row.logoUrl || ''),
      isActive: Boolean(row.isActive),
    });
  }

  private buildCustomerPayload(): ShippingChecklistCustomerSettingUpsertPayload {
    const raw = this.customerForm.getRawValue();

    return {
      id: this.selectedCustomerId || undefined,
      customerCode: String(raw.customerCode || '').trim().toLowerCase(),
      customerName: String(raw.customerName || '').trim(),
      logoUrl: String(raw.logoUrl || '').trim(),
      isActive: Boolean(raw.isActive),
    };
  }

  private buildLogoUploadKey(customerCode: string): string {
    const normalizedCode = String(customerCode || '').trim().toLowerCase();
    if (this.selectedCustomerId) {
      return `customerMaster:${this.selectedCustomerId}`;
    }

    return `customerMaster:code:${normalizedCode}`;
  }

  private applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredRowsData = this.rows.filter((row) => {
      if (this.activeOnly && !row.isActive) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [row.customerCode, row.customerName, row.logoUrl || ''].join(' ').toLowerCase().includes(term);
    });
  }

  private formatDateTime(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '-';
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    return date.toLocaleString();
  }
}
