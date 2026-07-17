import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ToastrService } from 'ngx-toastr';
import { getFormValidationErrors } from 'src/assets/js/util/getFormValidationErrors';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { IComputerForm } from '../computer-form/computer-form.type';
import { ComputerFormComponent } from '../computer-form/computer-form.component';
import { NAVIGATION_ROUTE } from '../computer-constant';
import { ComputerService } from '@app/core/api/operations/computer/computer.service';
import { FeatureType } from '@app/shared/enums/feature.enum';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '@app/core/services/auth.service';
import { ComputerMaintenanceModalComponent } from './computer-maintenance-modal.component';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { ZebraLabelPrintModalService } from '@app/shared/components/zebra-label-print-modal/zebra-label-print-modal.service';

@Component({
  standalone: true,
  imports: [SharedModule, ComputerFormComponent],
  selector: 'app-computer-edit',
  templateUrl: './computer-edit.component.html',
})
export class ComputerEditComponent {
  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly api: ComputerService,
    private readonly toastrService: ToastrService,
    private readonly modalService: NgbModal,
    private readonly authenticationService: AuthenticationService,
    private readonly attachmentsService: AttachmentsService,
    private readonly zebraLabelPrintModalService: ZebraLabelPrintModalService,
  ) {}

  title = 'Edit Computer';
  id: number | null = null;
  form: MyFormGroup<IComputerForm>;
  submitted = false;
  isLoading = false;
  data: any = null;

  maintenanceHistory: any[] = [];
  isLoadingMaintenance = false;
  expandedMaintenanceAttachmentId: number | null = null;

  readonly FeatureType = FeatureType;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  };

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.id = Number(params['id']);
      if (Number.isFinite(this.id) && this.id > 0) {
        this.getData();
      }
    });
  }

  onFormReady(form: MyFormGroup<IComputerForm>): void {
    this.form = form;
    if (this.data) {
      this.form.patchValue(this.data, { emitEvent: false });
    }
  }

  async getData(): Promise<void> {
    if (!this.id) {
      return;
    }

    this.isLoading = true;
    try {
      this.data = await this.api.getById(this.id);
      if (this.form) {
        this.form.patchValue(this.data, { emitEvent: false });
      }
      await this.loadMaintenanceHistory();
    } finally {
      this.isLoading = false;
    }
  }

  async loadMaintenanceHistory(): Promise<void> {
    if (!this.id) {
      this.maintenanceHistory = [];
      return;
    }

    this.isLoadingMaintenance = true;
    try {
      this.maintenanceHistory = await this.api.getMaintenanceHistory(this.id);
    } finally {
      this.isLoadingMaintenance = false;
    }
  }

  async addMaintenanceService(): Promise<void> {
    if (!this.id) {
      return;
    }

    const modalRef = this.modalService.open(ComputerMaintenanceModalComponent, {
      centered: true,
      backdrop: 'static',
      size: 'lg',
    });
    modalRef.componentInstance.mode = 'create';

    try {
      const result = await modalRef.result;
      if (!result) {
        return;
      }

      const createResult = await this.api.createMaintenanceRecord({
        computer_id: this.id,
        service_date: result.service_date,
        usage_hours: result.usage_hours,
        service_type: result.service_type,
        description: result.description,
        vendor_name: result.vendor_name,
        cost: result.cost,
        ticket_no: result.ticket_no,
        next_service_date: result.next_service_date,
        next_service_usage_hours: result.next_service_usage_hours,
        created_by: this.authenticationService.currentUserValue?.id,
      });

      const maintenanceId = Number(createResult?.insertId);
      const files: File[] = Array.isArray(result?.files) ? result.files : [];

      if (Number.isFinite(maintenanceId) && maintenanceId > 0 && files.length > 0) {
        await this.attachmentsService.uploadFilesByFeature(
          FeatureType.COMPUTER_MAINTENANCE_SERVICE,
          maintenanceId,
          files,
        );
      }

      await this.loadMaintenanceHistory();
      this.expandedMaintenanceAttachmentId = Number.isFinite(maintenanceId) && maintenanceId > 0 ? maintenanceId : null;
      this.toastrService.success('Maintenance service added');
    } catch {
      // Modal dismissed
    }
  }

  async editMaintenanceService(row: any): Promise<void> {
    const maintenanceId = Number(row?.id);
    if (!Number.isFinite(maintenanceId) || maintenanceId <= 0) {
      return;
    }

    const modalRef = this.modalService.open(ComputerMaintenanceModalComponent, {
      centered: true,
      backdrop: 'static',
      size: 'lg',
    });
    modalRef.componentInstance.mode = 'edit';
    modalRef.componentInstance.initialData = row;

    try {
      const result = await modalRef.result;
      if (!result) {
        return;
      }

      await this.api.updateMaintenanceRecord({
        id: maintenanceId,
        service_date: result.service_date,
        usage_hours: result.usage_hours,
        service_type: result.service_type,
        description: result.description,
        vendor_name: result.vendor_name,
        cost: result.cost,
        ticket_no: result.ticket_no,
        next_service_date: result.next_service_date,
        next_service_usage_hours: result.next_service_usage_hours,
      });

      await this.loadMaintenanceHistory();
      this.toastrService.success('Maintenance service updated');
    } catch {
      // Modal dismissed
    }
  }

  toggleMaintenanceAttachments(maintenanceId: number): void {
    const id = Number(maintenanceId);
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }

    this.expandedMaintenanceAttachmentId = this.expandedMaintenanceAttachmentId === id ? null : id;
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    if (!this.id) {
      return;
    }

    this.isLoading = true;
    try {
      await this.api.update(this.id, this.form.getRawValue());
      this.toastrService.success('Successfully updated computer');
      this.goBack();
    } finally {
      this.isLoading = false;
    }
  }

  onCancel(): void {
    this.goBack();
  }

  onPrintAssetLabel(): void {
    const assetTag = String(this.data?.asset_tag || this.form?.get('asset_tag')?.value || '').trim();
    if (!assetTag) {
      this.toastrService.warning('Asset tag is required before printing a label');
      return;
    }

    this.zebraLabelPrintModalService.open({
      serialNumber: assetTag,
      title: 'Print Computer Asset Label',
      partNumber: String(this.data?.model_name || this.form?.get('model_name')?.value || '').trim(),
      templateId: 'serial-number-compact',
      lockTemplate: true,
    });
  }
}
