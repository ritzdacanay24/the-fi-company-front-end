import { Component, Input, OnInit, SimpleChanges, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { FormGroup } from "@angular/forms";
import { NcrService } from "@app/core/api/quality/ncr-service";
import { ToastrService } from "ngx-toastr";
import { AgGridModule } from "ag-grid-angular";
import { autoSizeColumns } from "src/assets/js/util";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { IconRendererComponent } from "@app/shared/ag-grid/icon-renderer/icon-renderer.component";
import { AuthenticationService } from "@app/core/services/auth.service";
import { ColDef, GridOptions } from "ag-grid-community";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FileViewerModalComponent } from "@app/shared/components/file-viewer-modal/file-viewer-modal.component";
import { UploadAttachmentsModalComponent } from "@app/shared/components/attachments/upload-attachments-modal/upload-attachments-modal.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbNavModule,
    AgGridModule,
    UploadAttachmentsModalComponent,
  ],
  selector: "app-ncr-attachments-list",
  templateUrl: "./ncr-attachments-list.component.html",
  styleUrls: [],
})
export class NcrAttachmentsListComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public ncrService: NcrService,
    public attachmentsService: AttachmentsService,
    private toastrService: ToastrService,
    private modalService: NgbModal,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {}

  @ViewChild(UploadAttachmentsModalComponent) uploadModal: UploadAttachmentsModalComponent | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes["id"]) {
      this.id = changes["id"].currentValue;
      this.getData();
    }
  }

  @Input() id = null;

  isLoading = false;

  title = "Corrective Action";

  form: FormGroup;

  submitted = false;

  async onSubmit() {
    try {
      this.isLoading = true;
      await this.ncrService.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
    } catch (err) {
      this.isLoading = false;
    }
  }

  data;

  async getData() {
    this.data = await this.attachmentsService.find({
      field: "NCR",
      uniqueId: this.id,
      active: 1,
    });
  }

  private openFileViewerModal(url: string, fileName: string): void {
    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: "xl",
      centered: true,
      backdrop: true,
      keyboard: true,
    });

    modalRef.componentInstance.url = url;
    modalRef.componentInstance.fileName = fileName;
  }

  async onDelete(data) {
    const currentUserId = String(this.authenticationService.currentUserValue?.id ?? "").trim();
    const createdBy = String(data?.createdBy ?? "").trim();

    // Only enforce ownership when createdBy is present and comparable.
    if (createdBy && currentUserId && createdBy !== currentUserId) {
      this.toastrService.error("Access denied.");
      return;
    }

    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
      await this.attachmentsService.delete(data.id);
      await this.getData();
      this.toastrService.success("Attachment deleted");
    } catch (err) {
      this.toastrService.error("Unable to delete attachment");
    }
  }

  async onEdit(row: any) {
    try {
      const resolved = await this.attachmentsService.getViewById(row?.id);
      const resolvedUrl = resolved?.url || row?.link || '';

      if (!resolvedUrl) {
        this.toastrService.warning("Attachment URL not available");
        return;
      }

      this.openFileViewerModal(resolvedUrl, row?.fileName || resolved?.fileName || "Attachment");
    } catch (error) {
      console.error("Failed to resolve NCR attachment URL:", error);
      this.toastrService.error("Unable to open attachment");
    }
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
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "createdDate",
      headerName: "Created Date",
      filter: "agTextColumnFilter",
    },
    {
      field: "createdBy",
      headerName: "Created By",
      filter: "agTextColumnFilter",
    },
    {
      field: "fileName",
      headerName: "File name",
      filter: "agTextColumnFilter",
      cellDataType: "text",
    },
    {
      field: "ext",
      headerName: "Ext",
      filter: "agTextColumnFilter",
      cellDataType: "text",
    },
    {
      field: "Delete",
      headerName: "Delete",
      filter: "agMultiColumnFilter",
      cellRenderer: IconRendererComponent,
      cellRendererParams: {
        onClick: (e) => {
          this.onDelete(e.rowData);
        },
        iconName: "mdi mdi-delete text-danger",
      },
    },
  ];

  gridApi;

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
    },
    onFirstDataRendered: (params) => {
      autoSizeColumns(params);
    },
  };

  selectedFiles: File[] = [];
  uploadTriggerMode: "manual" | "on-add" = "manual";

  openUploadModal() {
    this.uploadModal?.openModal();
  }

  onAttachmentFilesAdded(files: File[]) {
    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeFile(index: number) {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  async onUploadAttachments() {
    if (this.isLoading || this.selectedFiles.length === 0) return;

    const filesToUpload = [...this.selectedFiles];
    this.selectedFiles = [];

    let totalAttachments = 0;
    this.isLoading = true;

    for (const file of filesToUpload) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", "NCR");
      formData.append("uniqueData", `${this.id}`);
      formData.append("subFolder", "quality/ncr");

      try {
        await this.attachmentsService.uploadfile(formData);
        totalAttachments++;
      } catch (err) {}
    }

    this.isLoading = false;

    if (totalAttachments > 0) {
      await this.getData();
      this.toastrService.success(`${totalAttachments} attachment${totalAttachments > 1 ? "s" : ""} uploaded`);
      if (this.uploadTriggerMode === "manual") {
        this.uploadModal?.closeModal();
      }
    }

    if (this.uploadTriggerMode === "on-add" && this.selectedFiles.length > 0) {
      await this.onUploadAttachments();
    }
  }
}
