import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { accessRight, departments } from "../../user-constant";
import { merge } from "rxjs";

@Component({
  standalone: true,
  imports: [SharedModule, UserSearchV1Component],
  selector: "app-user-create-form",
  templateUrl: "./user-create-form.component.html",
})
export class UserCreateFormComponent {
  @ViewChild('badgeInput') badgeInput?: ElementRef<HTMLInputElement>;

  constructor(private fb: FormBuilder) {
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
      this.form.get('lastLoggedIn').disable()
    });
  }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  accessRight = accessRight;

  title = "Create User Form";

  isLoading = false;

  @Input() submitted = false;

  departments = departments;

  get f() {
    return this.form.controls;
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

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

  private normalizeCardNumber(value: string): string {
    return String(value || '').replace(/\D+/g, '').slice(0, 20);
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
    employeeType: [0, Validators.required],
    enableTwostep: 0,
    isEmployee: [1],
    orgChartPlaceHolder: [0],
    showImage: [1],
    openPosition: 0,
    hire_date: null,
    org_chart_department: "",
    card_number: [null],
  });
}
