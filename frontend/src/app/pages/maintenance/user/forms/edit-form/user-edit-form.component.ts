import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { SharedModule } from "@app/shared/shared.module";
import { accessRight, departments } from "../../user-constant";
import { NgSelectModule } from "@ng-select/ng-select";
import { merge } from "rxjs";
import { NewUserService } from "@app/core/api/users/users.service";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    UserSearchV1Component,
    NgSelectModule,
  ],
  selector: "app-user-edit-form",
  templateUrl: "./user-edit-form.component.html",
})
export class UserEditFormComponent {
  title = "User Info";
  isLoading = false;

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();
  @Output() imageUploadSuccess: EventEmitter<any> = new EventEmitter();

  constructor(private fb: FormBuilder, private userService: NewUserService) {
    merge(
      this.form.get("orgChartPlaceHolder").valueChanges,
      this.form.get("openPosition").valueChanges
    ).subscribe((change) => {
      if (change) {
        this.form.get("last").disable();
        this.form.get("email").disable();
        this.form.get("area").disable();
        this.form.get("workArea").disable();
        this.form.get("access").disable();
        this.form.get("employeeType").disable();
        this.form.get("enableTwostep").disable();
        this.form.get("hire_date").disable();
      } else {
        this.form.get("last").enable();
        this.form.get("email").enable();
        this.form.get("area").enable();
        this.form.get("workArea").enable();
        this.form.get("access").enable();
        this.form.get("employeeType").enable();
        this.form.get("enableTwostep").enable();
        this.form.get("hire_date").enable();
      }
    });
    this.form.get("lastLoggedIn").disable();
  }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  departments = departments;

  @Input() id = null;

  @Input() submitted = false;

  // Image upload properties
  selectedFile: File | null = null;
  isUploadingImage = false;

  get f() {
    return this.form.controls;
  }

  notifyParent($event) {
    this.form.patchValue({ parentId: $event?.id });
  }

  accessRight = accessRight;

  form = this.fb.group({
    access: [1],
    active: [1],
    area: [null],
    workArea: [""],
    attempts: [0],
    createdDate: [""],
    email: ["", Validators.required],
    first: ["", Validators.required],
    last: ["", Validators.required],
    title: [""],
    employeeType: [0],
    parentId: [null],
    isEmployee: [1],
    lastLoggedIn: [null],
    image: "",
    enableTwostep: 0,
    orgChartPlaceHolder: [0],
    showImage: [1],
    openPosition: 0,
    hire_date: null,
    org_chart_department: "",
    org_chart_expand: 0,
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  toggleActiveStatus() {
    const currentValue = this.form.get('active').value;
    this.form.get('active').patchValue(currentValue ? 0 : 1);
  }

  removeImage() {
    this.form.get("image").patchValue(null);
  }

  clearAttempts() {
    this.form.get("attempts").patchValue(0);
  }

  onImageSelected(event: Event) {
    console.log('onImageSelected called');
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
      console.log('File selected:', this.selectedFile.name, this.selectedFile.type, this.selectedFile.size);
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(this.selectedFile.type)) {
        alert('Please select a valid image file (JPG, PNG, or GIF).');
        this.selectedFile = null;
        target.value = '';
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (this.selectedFile.size > maxSize) {
        alert('Image file size must be less than 5MB.');
        this.selectedFile = null;
        target.value = '';
        return;
      }
      
      console.log('File validation passed, ready to upload');
    } else {
      this.selectedFile = null;
      console.log('No file selected');
    }
  }

  async uploadImage() {
    console.log('uploadImage method called');
    console.log('selectedFile:', this.selectedFile);
    console.log('id:', this.id);
    
    if (!this.selectedFile || !this.id) {
      console.log('Upload validation failed - missing file or ID');
      alert('Please select an image file first.');
      return;
    }

    try {
      console.log('Starting image upload...');
      this.isUploadingImage = true;
      
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      
      // Use the existing user service upload method
      const result: any = await this.userService.uploadfile(this.id, formData);
      
      if (result && result.url) {
        // Update the form with the new image URL
        this.form.get('image').patchValue(result.url);
        
        // Clear the file input
        this.selectedFile = null;
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Emit success event with user ID and new image URL
        console.log('Form emitting imageUploadSuccess:', {
          userId: this.id,
          imageUrl: result.url
        });
        
        this.imageUploadSuccess.emit({
          userId: this.id,
          imageUrl: result.url
        });
        
        alert('Image uploaded successfully!');
      } else {
        throw new Error('Upload failed - no URL returned');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      this.isUploadingImage = false;
    }
  }
}
