import { ChangeDetectorRef, Component, Input, Output, EventEmitter } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { NewUserService } from "@app/core/api/users/users.service";
import { FormGroup } from "@angular/forms";
import { AuthenticationService } from "@app/core/services/auth.service";
import { UserEditFormComponent } from "../forms/edit-form/user-edit-form.component";
import moment from "moment";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { UserService } from "@app/core/api/field-service/user.service";

@Injectable({
  providedIn: "root",
})
export class UserModalService {
  modalRef: any;

  constructor(public modalService: NgbModal) { }

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
    private cdref: ChangeDetectorRef,
    private userService: UserService
  ) { }

  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }


  async hasSubordinates(id?) {
    return await this.userService.hasSubordinates(id);
  }



  @Input() public id;
  @Output() imageUpdated = new EventEmitter<{userId: string, imageUrl: string}>();

  data: any;
  isLoading: any;

  form: FormGroup;

  removeImage() {
    this.data.image = null;
    this.myFiles = null;
    this.form.patchValue({ image: "" });
  }

  onImageUploadSuccess(event: {userId: string, imageUrl: string}) {
    console.log('Modal onImageUploadSuccess called with:', event);
    
    // Add cache-busting parameter to force browser to reload image
    const cacheBustUrl = event.imageUrl + '?t=' + new Date().getTime();
    
    // Update the local data with the new image
    if (this.data) {
      this.data.image = cacheBustUrl;
      console.log('Updated modal data.image to:', cacheBustUrl);
    }
    
    // Emit the event with the original URL (org chart will add its own cache-busting)
    console.log('Emitting imageUpdated event:', {
      userId: event.userId,
      imageUrl: event.imageUrl
    });
    
    this.imageUpdated.emit({
      userId: event.userId,
      imageUrl: event.imageUrl
    });
  }

  getData = async () => {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);

      if (!this.data) {
        this.form.disable();
      }

      if (this.data.workArea) {
        this.data.workArea = this.data.workArea.split(",");
      }

      this.form.patchValue(this.data);

      for (const fieldName of ["workArea", "lastLoggedIn", "attempts"]) {
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
    if (this.id) this.getData();
  }

  dismiss() {
    this.ngbActiveModal.dismiss("dismiss");
  }

  close(value) {
    this.ngbActiveModal.close(value);
  }

  submitted = false;

  file: File = null;

  myFiles: any;

  imageTemp;
  onFilechange(event: any) {
    this.myFiles = event.target.files;
    if (this.myFiles[0]) {
      this.form.patchValue({ image: URL.createObjectURL(this.myFiles[0]) });

      if (this.id) {
        this.data.image = URL.createObjectURL(this.myFiles[0]);
      } else {
        this.imageTemp = URL.createObjectURL(this.myFiles[0]);
      }
    } else {
      this.form.patchValue({ image: null });
      this.imageTemp = null;
    }
  }

  async onUploadAttachments() {
    console.log('Modal onUploadAttachments called');
    if (this.myFiles) {
      this.isLoading = true;
      const formData = new FormData();
      formData.append("file", this.myFiles[0]);
      try {
        let image: any = await this.api.uploadfile(this.id, formData);
        console.log('Image uploaded successfully:', image);
        this.form.patchValue({ image: image.url });
        
        // Emit the imageUpdated event for org chart
        console.log('Emitting imageUpdated event from modal upload');
        this.imageUpdated.emit({
          userId: this.id.toString(),
          imageUrl: image.url
        });
        
      } catch (err) { 
        console.error('Upload failed:', err);
      }

      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (
      this.form.invalid &&
      this.form.value.isEmployee == 1 &&
      this.form.value.active == 1 &&
      this.form.value.orgChartPlaceHolder == 1
    ) {
      this.submitted = false;
      getFormValidationErrors();
      return;
    }

    if (
      this.form.value.access == 0 ||
      this.form.value.active == 0) {
      let test: any = await this.hasSubordinates(this.id)
      if (test && test.length > 0) {
        alert(`Unable able to deactivate user because this user has a total of ${test.length} subordinate(s).`)
        return
      }
    }

    if (this.id) {
      this.update();
    } else {
      this.create();
    }
  }

  async update() {
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
      this.close({ ...this.form.value, id: this.id });
    } catch (err) {
      this.isLoading = false;
    }
  }

  async create() {
    try {
      this.isLoading = true;

      this.form.patchValue({
        createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        created_by: this.authenticationService.currentUserValue.id,
      });

      let data: any = await this.api.create(this.form.value);
      this.id = data.insertId;

      if (this.myFiles) {
        await this.onUploadAttachments();
        await this.api.update(data.insertId, this.form.value);
      }
      this.isLoading = false;
      this.close({ ...this.form.value, id: data.insertId });
    } catch (err) {
      this.isLoading = false;
    }
  }
}
