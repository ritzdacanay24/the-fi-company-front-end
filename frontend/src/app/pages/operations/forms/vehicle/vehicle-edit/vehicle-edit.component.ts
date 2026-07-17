import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../vehicle-constant";
import { VehicleFormComponent } from "../vehicle-form/vehicle-form.component";
import { VehicleService } from "@app/core/api/operations/vehicle/vehicle.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { IVehicleForm } from "../vehicle-form/vehicle-form.type";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { FeatureType } from "@app/shared/enums/feature.enum";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { AuthenticationService } from "@app/core/services/auth.service";
import { VehicleMaintenanceModalComponent } from "./vehicle-maintenance-modal.component";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";

@Component({
  standalone: true,
  imports: [SharedModule, VehicleFormComponent],
  selector: "app-vehicle-edit",
  templateUrl: "./vehicle-edit.component.html",
})
export class VehicleEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: VehicleService,
    private toastrService: ToastrService,
    private modalService: NgbModal,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: MyFormGroup<IVehicleForm>;

  id = null;

  isLoading = false;

  submitted = false;
  readonly FeatureType = FeatureType;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;
  maintenanceHistory: any[] = [];
  isLoadingMaintenance = false;
  expandedMaintenanceAttachmentId: number | null = null;

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      if (this.form) {
        this.form.patchValue(this.data);
      }
      await this.loadMaintenanceHistory();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async loadMaintenanceHistory(): Promise<void> {
    const vehicleId = Number(this.id);
    if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
      this.maintenanceHistory = [];
      return;
    }

    this.isLoadingMaintenance = true;

    try {
      this.maintenanceHistory = await this.api.getMaintenanceHistory(vehicleId);
    } finally {
      this.isLoadingMaintenance = false;
    }
  }

  async addMaintenanceService(): Promise<void> {
    const vehicleId = Number(this.id);
    if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
      return;
    }

    const modalRef = this.modalService.open(VehicleMaintenanceModalComponent, {
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
        vehicle_id: vehicleId,
        service_date: result.service_date,
        mileage: result.mileage,
        service_type: result.service_type,
        description: result.description,
        vendor_name: result.vendor_name,
        cost: result.cost,
        work_order_no: result.work_order_no,
        next_service_date: result.next_service_date,
        next_service_mileage: result.next_service_mileage,
        created_by: this.authenticationService.currentUserValue?.id,
      });

      const maintenanceId = Number(createResult?.insertId);
      const files: File[] = Array.isArray(result?.files) ? result.files : [];

      if (Number.isFinite(maintenanceId) && maintenanceId > 0 && files.length > 0) {
        await this.attachmentsService.uploadFilesByFeature(
          FeatureType.VEHICLE_MAINTENANCE_SERVICE,
          maintenanceId,
          files,
        );
      }

      await this.loadMaintenanceHistory();
      this.expandedMaintenanceAttachmentId = Number.isFinite(maintenanceId) && maintenanceId > 0
        ? maintenanceId
        : null;
      this.toastrService.success('Maintenance service added');
    } catch {
      // Modal dismissed or request failed.
    }
  }

  async editMaintenanceService(row: any): Promise<void> {
    const maintenanceId = Number(row?.id);
    if (!Number.isFinite(maintenanceId) || maintenanceId <= 0) {
      return;
    }

    const modalRef = this.modalService.open(VehicleMaintenanceModalComponent, {
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
        mileage: result.mileage,
        service_type: result.service_type,
        description: result.description,
        vendor_name: result.vendor_name,
        cost: result.cost,
        work_order_no: result.work_order_no,
        next_service_date: result.next_service_date,
        next_service_mileage: result.next_service_mileage,
      });

      await this.loadMaintenanceHistory();
      this.toastrService.success('Maintenance service updated');
    } catch {
      // Modal dismissed or request failed.
    }
  }

  toggleMaintenanceAttachments(maintenanceId: number): void {
    if (!Number.isFinite(Number(maintenanceId)) || Number(maintenanceId) <= 0) {
      return;
    }

    const numericId = Number(maintenanceId);
    this.expandedMaintenanceAttachmentId =
      this.expandedMaintenanceAttachmentId === numericId ? null : numericId;
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  onFormReady(form: MyFormGroup<IVehicleForm>): void {
    this.form = form;
    if (this.data) {
      this.form.patchValue(this.data);
    }
  }
}