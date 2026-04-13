import { ChangeDetectorRef, Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { NewUserService } from "@app/core/api/users/users.service";
import { FormGroup } from "@angular/forms";
import { EmailNotificationFormComponent } from "../email-notification-form/email-notification-form.component";

@Injectable({
  providedIn: "root",
})
export class EmailNotificationModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  open(id: string) {
    this.modalRef = this.modalService.open(EmailNotificationModalComponent, {
      size: "lg",
    });
    this.modalRef.componentInstance.location = id;
    return this.modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, EmailNotificationFormComponent],
  selector: "app-email-notification-modal",
  templateUrl: `./email-notification-modal.component.html`,
  styleUrls: [],
})
export class EmailNotificationModalComponent {
  constructor(
    private api: NewUserService,
    private ngbActiveModal: NgbActiveModal,
    private cdref: ChangeDetectorRef
  ) {}

  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }

  @Input() public location;

  data: any;
  isLoading = true;

  form: FormGroup;

  listByFileName;
  async getData() {
    try {
      this.listByFileName = await this.api.find({
        location: this.data.location,
      });
    } catch (err) {}
  }

  ngOnInit() {
    if (this.location) this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss("dismiss");
  }

  close() {
    this.ngbActiveModal.close();
  }
}
