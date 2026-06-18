import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { DepartmentService } from "@app/pages/operations/org-chart/services/department.service";

@Component({
  standalone: true,
  imports: [SharedModule, UserSearchV1Component],
  selector: "app-user-create-form",
  templateUrl: "./user-create-form.component.html",
})
export class UserCreateFormComponent {
  @ViewChild('badgeInput') badgeInput?: ElementRef<HTMLInputElement>;
  @ViewChild('profileImageInput') profileImageInput?: ElementRef<HTMLInputElement>;

  constructor(private fb: FormBuilder, private departmentService: DepartmentService) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.setFormEmitter.emit(this.form);
  }

  title = "Create User Form";

  isLoading = false;

  @Input() submitted = false;

  departments: string[] = [];
  selectedProfileImageFile: File | null = null;
  profileImagePreviewUrl: string | null = null;

  get f() {
    return this.form.controls;
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  private loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (response) => {
        const names = (response?.data || [])
          .map((department) => String(department.department_name || '').trim())
          .filter(Boolean);
        this.departments = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
      },
      error: () => {
        this.departments = [];
      },
    });
  }

  notifyParent($event) {
    this.form.patchValue({ parentId: $event?.id });
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

  focusBadgeInput() {
    this.badgeInput?.nativeElement?.focus();
    this.badgeInput?.nativeElement?.select();
  }

  onBadgeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const normalized = this.normalizeCardNumber(input.value);
    input.value = normalized;
    this.form
      .get('card_number')
      ?.patchValue(normalized ? Number(normalized) : null, { emitEvent: false });
  }

  onBadgeEnter(event: KeyboardEvent) {
    event.preventDefault();
    this.onBadgeInput(event as unknown as Event);
  }

  onProfileImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedProfileImageFile = file;

    if (!file) {
      this.profileImagePreviewUrl = null;
      return;
    }

    this.profileImagePreviewUrl = URL.createObjectURL(file);
  }

  clearProfileImage(): void {
    this.selectedProfileImageFile = null;
    this.profileImagePreviewUrl = null;
    if (this.profileImageInput?.nativeElement) {
      this.profileImageInput.nativeElement.value = '';
    }
  }

  getSelectedProfileImageFile(): File | null {
    return this.selectedProfileImageFile;
  }

  private normalizeCardNumber(value: string): string {
    return String(value || '').replace(/\D+/g, '').slice(0, 20);
  }

  toggleActiveStatus() {
    const currentValue = this.form.get('active')?.value;
    this.form.get('active')?.patchValue(currentValue ? 0 : 1);
  }

  form = this.fb.group({
    access: [1],
    active: [1],
    area: [null, Validators.required],
    email: ["", [Validators.required, Validators.email]],
    first: ["", Validators.required],
    last: ["", Validators.required],
    title: ["", Validators.required],
    pass: ["", Validators.required],
    confirmPassword: ["", Validators.required],
    created_by: "",
    createdDate: [""],
    parentId: null,
    enableTwostep: 0,
    isEmployee: [1],
    hire_date: null,
    card_number: [null],
  });
}
