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

  open(id: string | number | null | undefined, options?: { title?: string; presetData?: Record<string, unknown> }) {
    const normalizedId =
      id === null || id === undefined || String(id).trim() === "" || String(id).toLowerCase() === "undefined" || String(id).toLowerCase() === "null"
        ? null
        : id;

    this.modalRef = this.modalService.open(UserModalComponent, {
      size: "lg",
    });
    this.modalRef.componentInstance.id = normalizedId;
    this.modalRef.componentInstance.modalTitle = options?.title ?? (normalizedId ? "User Info" : "Create User");
    this.modalRef.componentInstance.presetData = options?.presetData ?? null;
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
  @Input() public modalTitle = "User Info";
  @Input() public presetData: Record<string, unknown> | null = null;
  @Output() imageUpdated = new EventEmitter<{userId: string, imageUrl: string}>();

  data: any;
  isLoading: any;
  private pendingPresetData: Record<string, unknown> | null = null;

  form: FormGroup;

  private normalizeUserId(rawId: unknown): number | null {
    if (rawId === null || rawId === undefined) {
      return null;
    }

    const value = String(rawId).trim();
    if (!value || value.toLowerCase() === "undefined" || value.toLowerCase() === "null") {
      return null;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private extractCreatedId(payload: any): number | null {
    const candidate =
      payload?.insertId ??
      payload?.id ??
      payload?.data?.insertId ??
      payload?.data?.id;

    return this.normalizeUserId(candidate);
  }

  isEditMode(): boolean {
    return this.normalizeUserId(this.id) !== null;
  }

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
    const userId = this.normalizeUserId(this.id);
    if (!userId) {
      return;
    }

    try {
      this.isLoading = true;
      this.data = await this.api.getById(userId);

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
    const userId = this.normalizeUserId(this.id);
    if (userId) {
      this.id = userId;
      this.getData();
      return;
    }

    this.id = null;

    this.pendingPresetData = this.presetData;
  }

  onFormReady(form: FormGroup): void {
    this.form = form;

    if (!this.id && this.pendingPresetData) {
      this.form.patchValue(this.pendingPresetData);
      this.pendingPresetData = null;
    }
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
    const userId = this.normalizeUserId(this.id);
    if (!userId) {
      alert("Save the user first, then upload a profile image.");
      return;
    }

    if (this.myFiles) {
      this.isLoading = true;
      const formData = new FormData();
      formData.append("file", this.myFiles[0]);
      try {
        let image: any = await this.api.uploadfile(userId, formData);
        console.log('Image uploaded successfully:', image);
        this.form.patchValue({ image: image.url });
        
        // Emit the imageUpdated event for org chart
        console.log('Emitting imageUpdated event from modal upload');
        this.imageUpdated.emit({
          userId: userId.toString(),
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
    const userId = this.normalizeUserId(this.id);

    if (this.form.invalid) {
      this.submitted = false;
      getFormValidationErrors();
      return;
    }

    if (
      userId &&
      (this.form.value.access == 0 ||
      this.form.value.active == 0)) {
      let test: any = await this.hasSubordinates(userId)
      if (test && test.length > 0) {
        alert(`Unable able to deactivate user because this user has a total of ${test.length} subordinate(s).`)
        return
      }
    }

    if (userId) {
      this.update();
    } else {
      this.create();
    }
  }

  async update() {
    const userId = this.normalizeUserId(this.id);
    if (!userId) {
      await this.create();
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(userId, {
        ...this.form.value,
        workArea: this.form.value.workArea?.toString(),
        access: this.form.value.access ? 1 : 100,
      });
      if (this.myFiles) {
        await this.onUploadAttachments();
      }
      this.isLoading = false;
      this.close({ ...this.form.value, id: userId });
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
      const createdId = this.extractCreatedId(data);
      if (!createdId) {
        throw new Error("User was created but no numeric ID was returned by the API response.");
      }
      this.id = createdId;

      if (this.myFiles) {
        await this.onUploadAttachments();
        await this.api.update(createdId, this.form.value);
      }
      this.isLoading = false;
      this.close({ ...this.form.value, id: createdId });
    } catch (err) {
      this.isLoading = false;
    }
  }
}
