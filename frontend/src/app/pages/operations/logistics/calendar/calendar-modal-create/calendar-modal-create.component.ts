import { Component, Injectable, Input } from "@angular/core";
import { FormGroup, ReactiveFormsModule } from "@angular/forms";
import { SharedModule } from "src/app/shared/shared.module";
import { CalendarFormComponent } from "../calendar-form/calendar-form.component";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import moment from "moment";
import { ReceivingService } from "@app/core/api/receiving/receiving.service";
import { first } from "rxjs";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { FeatureType } from "@app/shared/enums/feature.enum";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";

@Injectable({
  providedIn: "root",
})
export class CalendarModalCreateService {
  constructor(public modalService: NgbModal) {}

  open(data) {
    let modalRef = this.modalService.open(CalendarModalCreateComponent, {
      size: "lg",
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}
@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, CalendarFormComponent],
  selector: "app-calendar-modal-create",
  templateUrl: "./calendar-modal-create.component.html",
  styleUrls: [],
})
export class CalendarModalCreateComponent {
  constructor(
    private ngbActiveModal: NgbActiveModal,
    private api: ReceivingService,
    private attachmentsService: AttachmentsService,
  ) {}

  form: FormGroup;

  @Input() data: any;

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue(this.data);
  }

  ngOnInit(): void {}

  @Input() submitted = false;

  myFiles: File[] = [];
  selectedFiles: File[] = [];

  onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    this.create();
  }

  loadingIndicator = false;

  id = null;

  onAttachmentFilesAdded(files: File[]): void {
    this.addFiles(files || []);
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.myFiles = [...this.selectedFiles];
  }

  private addFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    const dedupedFiles = new Map(
      this.selectedFiles.map((file) => [this.getFileKey(file), file])
    );

    files.forEach((file) => {
      dedupedFiles.set(this.getFileKey(file), file);
    });

    this.selectedFiles = Array.from(dedupedFiles.values());
    this.myFiles = [...this.selectedFiles];
  }

  private getFileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  create() {
    this.loadingIndicator = true;
    this.form.value.start_date = moment(this.form.value.start_date).format(
      "YYYY-MM-DD"
    );
    this.form.value.end_date = moment(this.form.value.end_date).format(
      "YYYY-MM-DD"
    );
    this.form.value.created_date = moment().format("YYYY-MM-DD HH:mm:ss");

    this.api
      .create(this.form.value)
      .pipe(first())
      .subscribe(
        async (data) => {
          this.id = Number(data) || data;

          if (this.myFiles.length > 0) {
            await this.attachmentsService.uploadFilesByFeature(
              FeatureType.RECEIVING,
              this.id,
              this.myFiles,
            );
          }

          this.ngbActiveModal.close({ transaction: "CREATE", id: this.id });
          this.loadingIndicator = false;
        },
        () => (this.loadingIndicator = false)
      );
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }
}
