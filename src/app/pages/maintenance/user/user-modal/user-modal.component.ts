import { ChangeDetectorRef, Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { NewUserService } from "@app/core/api/users/users.service";
import { FormGroup } from "@angular/forms";
import { AuthenticationService } from "@app/core/services/auth.service";
import { UserEditFormComponent } from "../forms/edit-form/user-edit-form.component";

@Injectable({
  providedIn: "root",
})
export class UserModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) {}

  open(id: string) {
    this.modalRef = this.modalService.open(UserModalComponent, {
      size: "lg",
    });
    this.modalRef.componentInstance.id = id;
    return this.modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, UserEditFormComponent],
  selector: "app-user-modal",
  templateUrl: `./user-modal.component.html`,
  styleUrls: [],
})
export class UserModalComponent {
  constructor(
    private api: NewUserService,
    private ngbActiveModal: NgbActiveModal,
    private authenticationService: AuthenticationService,
    private cdref: ChangeDetectorRef
  ) {}

  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }

  @Input() public id;

  data: any;
  isLoading = true;

  form: FormGroup;

  removeImage() {
    this.data.image = null;
    this.myFiles = null;
    this.form.patchValue({ image: "" });
  }

  getData = async () => {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      if (this.data.workArea) {
        this.data.workArea = this.data.workArea.split(",");
      }

      this.form.patchValue(this.data);

      for (const fieldName of [
        "workArea",
        "lastLoggedIn",
        "attempts", 
      ]) {
        const control = this.form.get(fieldName);
        control.disable();
      }

      if (
        this.authenticationService.currentUserValue.employeeType === 0 &&
        !this.authenticationService.currentUserValue.isAdmin
      ) {
        this.form.disable();
      }

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  };
  ngOnInit() {
    this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss("dismiss");
  }

  close() {
    this.ngbActiveModal.close();
  }

  submitted = false;

  file: File = null;

  myFiles: any;

  onFilechange(event: any) {
    this.myFiles = event.target.files;
    if (this.myFiles[0]) {
      this.form.patchValue({ image: URL.createObjectURL(this.myFiles[0]) });
      this.data.image = URL.createObjectURL(this.myFiles[0]);
    }
  }

  async onUploadAttachments() {
    if (this.myFiles) {
      this.isLoading = true;
      const formData = new FormData();
      formData.append("file", this.myFiles[0]);
      try {
        await this.api.uploadfile(this.id, formData);
      } catch (err) {}

      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, {
        ...this.form.value,
        workArea: this.form.value.workArea?.toString(),
        access: this.form.value.access ? 1 : 100,
      });
      if (this.myFiles) {
        await this.onUploadAttachments();
      }
      this.isLoading = false;
      this.close();
    } catch (err) {
      this.isLoading = false;
    }
  }
}
