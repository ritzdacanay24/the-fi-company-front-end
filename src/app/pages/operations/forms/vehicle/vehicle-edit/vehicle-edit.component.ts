import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../vehicle-constant";
import { VehicleFormComponent } from "../vehicle-form/vehicle-form.component";
import { VehicleService } from "@app/core/api/operations/vehicle/vehicle.service";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { IVehicleForm } from "../vehicle-form/vehicle-form.type";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { ColDef, GridOptions } from "ag-grid-community";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { AgGridModule } from "ag-grid-angular";

@Component({
  standalone: true,
  imports: [SharedModule, VehicleFormComponent, AgGridModule],
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
    private ref: ChangeDetectorRef
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

  onEdit(e: any) {
    window.open(e, '_blank').focus();

  }

  columnDefs: ColDef[] = [
    {
      field: "View",
      headerName: "View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(`https://dashboard.eye-fi.com/attachments/vehicleInformation/${e.rowData.fileName}`),
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

  onCancel() {
    this.goBack();
  }

  attachments: any = [];
  async getAttachments() {
    this.attachments = await this.attachmentsService.find({
      field: "Vehicle Information",
      uniqueId: this.id,
    });
  }

  async deleteAttachment(id, index) {
    if (!confirm("Are you sure you want to remove attachment?")) return;
    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1);
  }

  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
    this.ref.markForCheck();

  }

  @ViewChild("userPhoto") userPhoto!: ElementRef;
  clearFile() {
    this.file = null;
    this.userPhoto.nativeElement.value = null;
  }

  async onUploadAttachments() {
    if (this.myFiles) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();
      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", "Vehicle Information");
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", "vehicleInformation");
        try {
          await this.attachmentsService.uploadfile(formData);
          totalAttachments++;
        } catch (err) { }
      }
      this.isLoading = false;
      this.clearFile()
      await this.getAttachments();
    }
  }
}