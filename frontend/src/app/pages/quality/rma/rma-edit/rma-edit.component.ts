import { Component, Input, ViewChild } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { RmaFormComponent } from "../rma-form/rma-form.component";
import { RmaService } from "@app/core/api/quality/rma.service";
import { NAVIGATION_ROUTE } from "../rma-constant";
import { SharedModule } from "@app/shared/shared.module";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { UploadAttachmentsModalComponent } from "@app/shared/components/attachments/upload-attachments-modal/upload-attachments-modal.component";
import { PendingUploadsListComponent } from "@app/shared/components/attachments/pending-uploads-list/pending-uploads-list.component";
import { UploadedAttachmentsListComponent } from "@app/shared/components/attachments/uploaded-attachments-list/uploaded-attachments-list.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    RmaFormComponent,
    UploadAttachmentsModalComponent,
    PendingUploadsListComponent,
    UploadedAttachmentsListComponent,
  ],
  selector: "app-rma-edit",
  templateUrl: "./rma-edit.component.html",
  styleUrls: ["./rma-edit.component.scss"],
})
export class RmaEditComponent {
  @ViewChild(UploadAttachmentsModalComponent) uploadModal: UploadAttachmentsModalComponent | null = null;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: RmaService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit RMA";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  authorizedBy = "Quality";

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  get isRmaClosed(): boolean {
    // Check if RMA status is 'Closed' or similar
    return this.data?.status === 'Closed' || this.data?.status === 'Complete';
  }

  data: any;
  attachments: any[] = [];
  selectedFiles: File[] = [];
  uploadTriggerMode: "manual" | "on-add" = "manual";

  async getAttachments() {
    if (!this.id) {
      this.attachments = [];
      return;
    }

    this.attachments = await this.attachmentsService.find({ field: "RMA", uniqueId: this.id });
  }

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
      
      // Disable form if RMA is closed
      if (this.isRmaClosed) {
        this.form.disable();
      } else {
        this.form.enable();
      }

      await this.getAttachments();
    } catch (err) { }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

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

  onPrintPage() {
    window.print();
  }

  onAttachmentFilesAdded(files: File[]) {
    if (!files?.length) {
      return;
    }

    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeFile(index: number) {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  async onUploadAttachments() {
    if (this.selectedFiles.length === 0 || !this.id || this.isRmaClosed) {
      return;
    }

    this.isLoading = true;
    let totalUploaded = 0;

    for (const file of this.selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", "RMA");
      formData.append("uniqueData", `${this.id}`);
      formData.append("subFolder", "quality/rma");

      try {
        await this.attachmentsService.uploadfile(formData);
        totalUploaded++;
      } catch (err) {}
    }

    this.isLoading = false;

    if (totalUploaded > 0) {
      this.selectedFiles = [];
      await this.getAttachments();
      this.toastrService.success(`${totalUploaded} attachment${totalUploaded > 1 ? "s" : ""} uploaded`);
    }
  }

  async deleteAttachment(id: number): Promise<void> {
    if (!confirm("Are you sure you want to remove attachment?")) {
      return;
    }

    await this.attachmentsService.delete(id);
    await this.getAttachments();
  }

  async onArchive() {
    if (!this.id || !this.form) return;
    if (!confirm(`Archive RMA #${this.id}?`)) return;

    try {
      this.isLoading = true;
      const payload = {
        ...this.form.getRawValue(),
        status: "Archived",
        active: 0,
      };
      await this.api.update(this.id, payload);
      this.toastrService.success("RMA archived successfully");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error("Failed to archive RMA");
    }
  }

  async onDelete() {
    if (!this.id) return;
    if (!confirm(`Delete RMA #${this.id}? This cannot be undone.`)) return;

    try {
      this.isLoading = true;
      await this.api.delete(this.id);
      this.toastrService.success("RMA deleted successfully");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
      this.toastrService.error("Failed to delete RMA");
    }
  }

  onPrint() {
    let row = this.form.value;

    var cmds,
      printwindow = window.open("", "PRINT", "height=500,width=600");

    cmds = "^XA^XFR:Format1.ZPL^FS^XZ";

    cmds += "^XA \n";
    cmds += "^DFR:Filename.ZPL^FS \n";
    cmds += "^FT220,250^A0N,210, 185^FH^FN1^FS \n";
    cmds += "^CFA,30^FO50,350^GB700,1,3^FS \n";
    cmds += "^FT50,440^A0N,50, 50^FH^FN3^FS \n";
    cmds += "^FT50,510^A0N,50, 50^FH^FN4^FS \n";
    cmds += "^FT50,580^A0N,50,50^FH^FN5^FS \n";
    cmds += "^FT50,720^A0N,50,50^FH^FN12^FS \n";
    cmds += "^FT50,650^A0N,50, 50^FH^FN6^FS \n";
    cmds += "^CFA,30^FO50,750^GB700,1,2^FS \n";
    cmds += "^FT50,840^A0N,50, 50^FH^FN7^FS \n";
    cmds += "^FT50,910^A0N,50, 50^FH^FN8^FS \n";
    cmds += "^FT50,980^A0N,50, 50^FH^FN9^FS \n";
    cmds += "^FT50,1050^A0N,50, 50^FH^FN10^FS \n";
    cmds += "^FT50,1120^A0N,50, 50^FH^FN11^FS \n";
    cmds += "^FT50,1190^A0N,50, 50^FH^FN12^FS \n";
    cmds += "^FQ1,0,1,Y \n";
    cmds += "^XZ \n";

    cmds += "^XA \n";
    cmds += "^XFR:Filename.ZPL^FS \n";
    cmds += "^FN1^FDRMA^FS \n";
    cmds += "^FN3^FDOrder No: " + row.orderNumber + " ^FS \n";
    cmds += "^FN4^FDPart No: " + row.partNumber + " ^FS \n";
    cmds += "^FN5^FDDescription: " + row.partDescription + " ^FS \n";
    cmds += "^FN12^FDQty: " + row.qty + " ^FS \n";
    cmds += "^FN6^FDProduce By: " + row.type + " ^FS \n";
    cmds += "^FN7^FDAuthorized By: " + this.authorizedBy + " ^FS \n";
    cmds += "^FN8^FDDate Issued: " + row.dateIssued + " ^FS \n";
    cmds += "^FN9^FDQIR No: " + row.qirNumber + " ^FS \n";
    cmds += "^FN10^FDTag QN Number: " + row.tag_qn_number + " ^FS \n";
    cmds += "^FN11^FDRMA No: " + row.rmaNumber + "^FS \n";
    cmds += "^FN11^FDisposition: " + row.disposition + "^FS \n";
    cmds += "^PQ1 \n";
    cmds += "^XZ \n";

    printwindow.document.write(cmds);
    printwindow.document.close();
    printwindow.focus();
    printwindow.print();
    printwindow.close();
  }
}
