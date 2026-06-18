import { ChangeDetectorRef, Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE, VEHICLE_ATTACHMENT } from "../vehicle-constant";
import { VehicleFormComponent } from "../vehicle-form/vehicle-form.component";
import { VehicleService } from "@app/core/api/operations/vehicle/vehicle.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { IVehicleForm } from "../vehicle-form/vehicle-form.type";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { ColDef, GridOptions } from "ag-grid-community";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { environment } from "src/environments/environment";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FileViewerModalComponent } from "@app/shared/components/file-viewer-modal/file-viewer-modal.component";
import { UploadNewAttachmentsComponent } from "@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component";
import { UploadedAttachmentsListComponent } from "@app/shared/components/attachments/uploaded-attachments-list/uploaded-attachments-list.component";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";

@Component({
  standalone: true,
  imports: [SharedModule, VehicleFormComponent, UploadNewAttachmentsComponent, UploadedAttachmentsListComponent],
  selector: "app-vehicle-edit",
  templateUrl: "./vehicle-edit.component.html",
})
export class VehicleEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: VehicleService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService,
    private ref: ChangeDetectorRef,
    private modalService: NgbModal
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

  uploadTriggerMode: "manual" | "on-add" | "parent-submit" = "on-add";

  async saveAttachmentInfo(id, key, value) {
    try {
      await this.attachmentsService.update(id, {
        [key]: value
      })
      this.toastrService.success("Successfully Updated");
    } catch (err) {
    }
  }

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;

  async onEdit(row: any) {
    try {
      const attachmentId = Number(row?.id);
      if (!attachmentId) {
        this.toastrService.warning("Attachment ID not available");
        return;
      }

      const payload = await this.attachmentsService.getViewById(attachmentId);
      const url = this.normalizeAttachmentViewUrl(String(payload?.url || "").trim());
      if (!url) {
        this.toastrService.warning("Attachment URL not available");
        return;
      }

      const modalRef = this.modalService.open(FileViewerModalComponent, {
        size: "xl",
        centered: true,
        scrollable: true,
      });
      modalRef.componentInstance.url = url;
      modalRef.componentInstance.fileName = payload?.fileName || row?.fileName || "Attachment";
    } catch (error) {
      this.toastrService.error("Unable to load attachment");
    }
  }

  private normalizeAttachmentViewUrl(url: string): string {
    if (!url) {
      return "";
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const apiBaseUrl = String(environment.apiV2BaseUrl || "").replace(/\/+$/, "");
    const normalizedPath = url.startsWith("/") ? url : `/${url}`;

    return `${apiBaseUrl}${normalizedPath}`;
  }

  getAttachmentUrl(row: any): string {
    const rawLink = String(row?.link || "").trim();
    if (rawLink) {
      if (/^https?:\/\//i.test(rawLink)) {
        return rawLink;
      }

      if (rawLink.startsWith("/")) {
        const apiBaseUrl = String(environment.apiV2BaseUrl || "").replace(/\/+$/, "");
        return `${apiBaseUrl}${rawLink}`;
      }

      return rawLink;
    }

    const fileName = String(row?.fileName || "").trim();
    if (!fileName) {
      return "";
    }

    const apiBaseUrl = String(environment.apiV2BaseUrl || "").replace(/\/+$/, "");
    return `${apiBaseUrl}/attachments/vehicleInformation/${encodeURIComponent(fileName)}`;

  }

  columnDefs: ColDef[] = [
    {
      field: "View",
      headerName: "View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData),
        value: "View",
      },
      maxWidth: 100,
      minWidth: 100,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    { field: "fileName", headerName: "File Name", filter: "agMultiColumnFilter" },
    { field: "date_of_service", headerName: "Date of Service", filter: "agMultiColumnFilter", editable: true, cellEditor: 'agDateStringCellEditor', },
    { field: "type_of_work_completed", headerName: "Type of Work Completed", filter: "agMultiColumnFilter", editable: true },
    { field: "createdDate", headerName: "Created Date", filter: "agMultiColumnFilter" },
    {
      headerName: "Delete",
      field: "delete",
      pinned: "right",
      maxWidth: 120,
      minWidth: 120,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => {
        if (!params?.data?.id) {
          return "";
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-sm btn-outline-danger";
        btn.innerHTML = '<i class="mdi mdi-delete-outline me-1"></i>Delete';
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          this.deleteAttachment(params.data.id);
        });
        return btn;
      },
    },
  ]


  gridApi
  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
    },
    getRowId: (params) => params.data.id?.toString(),
    onCellEditingStopped: (event) => {
      if (event.oldValue == event.newValue || event.value === undefined) return;
      this.update(event.data, event);
    },
  };


  public async update(data: any, event) {
    try {
      await this.attachmentsService.update(data.id, {
        [event.column.colId]: event.value
      })
      this.toastrService.success("Successfully Updated");
    } catch (err) {
    }
  }

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      await this.getAttachments();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
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

  async onDelete(): Promise<void> {
    const vehicleId = Number(this.id);
    if (!Number.isFinite(vehicleId)) {
      this.toastrService.warning("Vehicle ID not available");
      return;
    }

    const result = await SweetAlert.confirm({
      title: "Delete Vehicle",
      text: "Are you sure you want to permanently delete this vehicle? This cannot be undone.",
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc3545",
    });
    if (!result.value) return;

    try {
      this.isLoading = true;
      await this.api.delete(vehicleId);
      this.toastrService.success("Vehicle deleted");
      this.goBack();
    } catch {
      this.toastrService.error("Failed to delete vehicle");
    } finally {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  attachments: any = [];
  async getAttachments() {
    this.attachments = await this.attachmentsService.find({
      field: VEHICLE_ATTACHMENT.FIELD,
      uniqueId: this.id,
    });
    this.gridApi?.setGridOption("rowData", this.attachments || []);
    this.ref.detectChanges();
  }

  async deleteAttachment(id) {
    const result = await SweetAlert.confirm({
      title: "Remove Attachment",
      text: "Are you sure you want to remove this attachment?",
      confirmButtonText: "Remove",
      confirmButtonColor: "#dc3545",
    });
    if (!result.value) return;

    await this.attachmentsService.delete(id);
    await this.getAttachments();
    this.toastrService.success("Attachment deleted");
  }

  file: File = null;

  myFiles: File[] = [];

  onAttachmentFilesAdded(files: File[]) {
    if (!files?.length) {
      return;
    }

    this.myFiles = [...this.myFiles, ...files];
    this.ref.markForCheck();
  }

  removeFile(index: number) {
    this.myFiles.splice(index, 1);
  }

  async onUploadAttachments() {
    if (this.isLoading || !this.myFiles?.length) {
      return;
    }

    const queuedFiles = [...this.myFiles];
    const failedFiles: File[] = [];

    this.isLoading = true;
    for (let i = 0; i < queuedFiles.length; i++) {
      const formData = new FormData();
      formData.append("file", queuedFiles[i]);
      formData.append("field", VEHICLE_ATTACHMENT.FIELD);
      formData.append("uniqueData", `${this.id}`);
      formData.append("subFolder", VEHICLE_ATTACHMENT.SUB_FOLDER);
      try {
        await this.attachmentsService.uploadfile(formData);
      } catch (err) {
        failedFiles.push(queuedFiles[i]);
      }
    }

    this.myFiles = failedFiles;
    this.isLoading = false;
    await this.getAttachments();
  }
}