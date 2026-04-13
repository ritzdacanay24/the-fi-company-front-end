import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormGroup } from "@angular/forms";
import {
  NgbActiveModal,
  NgbCarouselModule,
  NgbScrollSpyModule,
} from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { TripDetailsFormComponent } from "../trip-details-form/trip-details-form.component";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { TripDetailsSummaryComponent } from "../trip-details-summary/trip-details-summary.component";
import { ToastrService } from "ngx-toastr";
import { TripDetailHeaderService } from "@app/core/api/field-service/trip-detail-header/trip-detail-header.service";
import { JobSearchComponent } from "@app/shared/components/job-search/job-search.component";
import { UploadService } from "@app/core/api/upload/upload.service";
import { first } from "rxjs";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { uniqueId } from "lodash";

@Injectable({
  providedIn: "root",
})
export class TripDetailsModalService {
  constructor(public modalService: NgbModal) {}

  open({
    id: id,
    fs_travel_header_id: fs_travel_header_id,
    fsId: fsId,
  }: {
    id?: any;
    fs_travel_header_id?: any;
    fsId?: any;
  }) {
    let modalRef = this.modalService.open(TripDetailsModalComponent, {
      size: "lg",
    });
    modalRef.componentInstance.id = id;
    modalRef.componentInstance.fs_travel_header_id = fs_travel_header_id;
    modalRef.componentInstance.fsId = fsId;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    TripDetailsModalComponent,
    NgbScrollSpyModule,
    TripDetailsFormComponent,
    NgbCarouselModule,
    TripDetailsSummaryComponent,
    TripDetailsFormComponent,
    JobSearchComponent,
  ],
  selector: "app-trip-details-modal",
  templateUrl: "./trip-details-modal.component.html",
  styleUrls: [],
})
export class TripDetailsModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: TripDetailService,
    private tripDetailHeaderService: TripDetailHeaderService,
    private toastrService: ToastrService,
    private uploadService: UploadService,
    private attachmentsService: AttachmentsService
  ) {}

  ngOnInit(): void {
    if (this.id) {
      this.getData();
    }
  }

  attachments = [];
  async getAttachments() {
    this.attachments = [];
    this.attachments = await this.attachmentsService.find({
      field: "Field Service Trip Details",
      mainId: this.id,
    });
  }

  attachmentsToDelete = [];
  async deleteAttachment(id) {

    if(!confirm('Are you sure you want to delete?')) return;
    
    try {
      await this.attachmentsService.delete(id);
      this.getAttachments();
    } catch (err) {}
  }

  setFormElements = ($event) => {
    this.form = $event;

    if (this.fs_travel_header_id && !this.id) {
      this.form.patchValue({
        fs_travel_header_id: this.fs_travel_header_id,
      });
    }

    if (this.fsId && !this.id) {
      this.form.patchValue({
        fsId: this.fsId,
      });
    }
  };

  @Input() id = null;
  @Input() fs_travel_header_id = null;
  @Input() fsId = null;

  submitted = false;

  title = "Trip Detail Modal";

  form: FormGroup;

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  group_details: any;

  async getGroupDataInformation() {
    try {
      this.group_details = await this.tripDetailHeaderService.getById(
        this.fs_travel_header_id
      );

      this.group_details.fsId = this.group_details.fsId?.split(",");
    } catch (err) {}
  }

  async getData() {
    try {
      let data = await this.api.getById(this.id);
      await this.getAttachments();
      this.form.patchValue(data);
    } catch (err) {}
  }

  async onSubmit() {
    try {
      let data = await this.tripDetailHeaderService.multipleGroups(
        this.form.value.fsId
      );

      if (data) {
        alert("This FSID cannot be in two different groups. ");
        return;
      }
    } catch (err) {}

    if (this.id) {
      this.update();
    } else {
      this.create();
    }
  }

  async create() {
    try {
      let data: any = await this.api.create(this.form.value);

      if (this.myAttachmentFiles) {
        this.uploadAttachments(data?.id);
      }

      this.toastrService.success("Successfully Created");
      this.close();
    } catch (err) {}
  }

  async update() {
    try {
      await this.api.update(this.id, this.form.value);

      if (this.myAttachmentFiles) {
        this.uploadAttachments(this.id);
      }

      this.toastrService.success("Updated successfully");
      this.close();
    } catch (err) {}
  }

  async onDelete() {
    try {
      await this.api.delete(this.id);
      this.toastrService.success("Deleted successfully");
      this.close();
    } catch (err) {}
  }

  myAttachmentFiles: string[] = [];
  async onChange(event) {
    this.myAttachmentFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myAttachmentFiles.push(event.target.files[i]);
    }
  }

  async uploadAttachments(insertId) {
    if (this.myAttachmentFiles) {
      const formData = new FormData();
      for (var i = 0; i < this.myAttachmentFiles.length; i++) {
        formData.append("file", this.myAttachmentFiles[i]);
        formData.append("field", "Field Service Trip Details");
        formData.append("uniqueData", this.fs_travel_header_id);
        formData.append("mainId", insertId);
        formData.append("folderName", "fieldService");
        this.uploadService
          .upload(formData)
          .pipe(first())
          .subscribe((data) => {});
      }
      this.myAttachmentFiles = [];
    }
  }
}
