import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { SharedModule } from "@app/shared/shared.module";
import { NewUserService } from "@app/core/api/users/users.service";
import { DepartmentService } from "@app/pages/operations/org-chart/services/department.service";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    UserSearchV1Component,
  ],
  selector: "app-user-edit-form",
  templateUrl: "./user-edit-form.component.html",
})
export class UserEditFormComponent {
  title = "User Info";
  isLoading = false;
  @ViewChild('badgeInput') badgeInput?: ElementRef<HTMLInputElement>;

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();
  @Output() imageUploadSuccess: EventEmitter<any> = new EventEmitter();

  constructor(
    private fb: FormBuilder,
    private userService: NewUserService,
    private departmentService: DepartmentService
  ) {
    const areaControl = this.form.get('area');
    const departmentControl = this.form.get('department');

    departmentControl?.valueChanges.subscribe((value) => {
      if (areaControl?.value !== value) {
        areaControl?.patchValue(value, { emitEvent: false });
      }
    });

    areaControl?.valueChanges.subscribe((value) => {
      if (departmentControl?.value !== value) {
        departmentControl?.patchValue(value, { emitEvent: false });
      }
    });

    this.form.get("lastLoggedIn").disable();
    this.loadDepartments();
  }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  departments: string[] = [];

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

  private loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (response) => {
        const names: string[] = (response?.data || [])
          .map((department) => String(department.department_name || '').trim())
          .filter(Boolean);
        this.departments = Array.from(new Set<string>(names)).sort((a, b) => a.localeCompare(b));
      },
      error: () => {
        this.departments = [];
      },
    });
  }

  form = this.fb.group({
    access: [1],
    active: [1],
    department: [null, Validators.required],
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
    hire_date: null,
    card_number: [null],
  });

  focusBadgeInput() {
    this.badgeInput?.nativeElement?.focus();
    this.badgeInput?.nativeElement?.select();
  }

  onBadgeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const normalized = this.normalizeCardNumber(input.value);
    input.value = normalized;
    this.form.get('card_number')?.patchValue(normalized ? Number(normalized) : null, { emitEvent: false });
  }

  onBadgeEnter(event: KeyboardEvent) {
    event.preventDefault();
    this.onBadgeInput(event as unknown as Event);
  }

  private normalizeCardNumber(value: string): string {
    return String(value || '').replace(/\D+/g, '').slice(0, 20);
  }

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  onTwoStepToggle() {
    this.setBooleanToNumber('enableTwostep');

    if (this.isTwoStepEnabled() && !this.isEmailValidForNotifications()) {
      this.form.get('email')?.markAsTouched();
    }
  }

  isTwoStepEnabled(): boolean {
    return !!this.form.get('enableTwostep')?.value;
  }

  isEmailValidForNotifications(): boolean {
    const emailControl = this.form.get('email');
    return !!emailControl?.value && !emailControl?.invalid;
  }

  getNotificationTarget(): string {
    const email = this.form.get('email')?.value;
    return email || 'the email address above';
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
