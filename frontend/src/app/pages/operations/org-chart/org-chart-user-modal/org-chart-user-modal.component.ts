import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { NewUserService } from "@app/core/api/users/users.service";
import { OrgChartUserModalMode } from "./org-chart-user-modal.service";

@Component({
  standalone: true,
  selector: "app-org-chart-user-modal",
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: "./org-chart-user-modal.component.html",
})
export class OrgChartUserModalComponent {
  readonly employmentTypeOptions = [
    { value: 'FT', label: 'Permanent' },
    { value: 'PT', label: 'Part Time' },
    { value: 'CT', label: 'Contract' },
  ];
  readonly locationOptions = [
    { value: 'las-vegas-nv', label: 'Las Vegas, NV' },
    { value: 'seattle-wa', label: 'Seattle, WA' },
    { value: 'tijuana-mexico', label: 'Tijuana, Mexico' },
  ];

  @Input() id!: number | string;
  @Input() mode: OrgChartUserModalMode = "view";
  @Input() modalTitle = "User Profile";
  @Output() saved = new EventEmitter<any>();
  @Output() imageUpdated = new EventEmitter<{ userId: string; imageUrl: string }>();

  isLoading = false;
  submitted = false;
  data: any;
  form: FormGroup;
  myFiles: FileList | null = null;
  imagePreview: string | null = null;

  get displayImage(): string | null {
    return this.imagePreview || this.form.value.image || null;
  }

  constructor(
    private readonly api: NewUserService,
    private readonly activeModal: NgbActiveModal,
    private readonly fb: FormBuilder,
    private readonly cdRef: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      first: ["", [Validators.required, Validators.maxLength(100)]],
      last: ["", [Validators.required, Validators.maxLength(100)]],
      title: ["", [Validators.maxLength(150)]],
      email: ["", [Validators.email, Validators.maxLength(200)]],
      workPhone: ["", [Validators.maxLength(50)]],
      card_number: [null],
      active: [1],
      employeeType1: ["", [Validators.maxLength(20)]],
      locationKey: [""],
      city: ["", [Validators.maxLength(100)]],
      state: ["", [Validators.maxLength(50)]],
      department: ["", [Validators.maxLength(150)]],
      org_chart_department: ["", [Validators.maxLength(150)]],
      hire_date: [""],
      image: [""],
    });
  }

  ngAfterContentChecked(): void {
    this.cdRef.detectChanges();
  }

  ngOnInit(): void {
    if (this.id !== null && this.id !== undefined) {
      void this.loadData();
    }
  }

  get isEditMode(): boolean {
    return this.mode === "edit";
  }

  dismiss(): void {
    this.activeModal.dismiss("dismiss");
  }

  async loadData(): Promise<void> {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(Number(this.id));

      if (!this.data) {
        this.form.disable();
        return;
      }

      this.form.patchValue({
        first: this.data.first || "",
        last: this.data.last || "",
        title: this.data.title || "",
        email: this.data.email || "",
        workPhone: this.data.workPhone || "",
        card_number: this.data.card_number ?? null,
        active: Number(this.data.active ?? 1),
        employeeType1: this.data.employeeType1 || "",
        locationKey: this.getLocationKey(this.data.city, this.data.state),
        city: this.data.city || "",
        state: this.data.state || "",
        department: this.data.department || "",
        org_chart_department: this.data.org_chart_department || "",
        hire_date: this.data.hire_date || "",
        image: this.data.image || "",
      });

      this.imagePreview = this.data.image || null;

      if (!this.isEditMode) {
        this.form.disable({ emitEvent: false });
      }
    } finally {
      this.isLoading = false;
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.myFiles = input.files;
    const file = this.myFiles?.[0];

    if (!file) {
      this.imagePreview = this.data?.image || null;
      return;
    }

    this.imagePreview = URL.createObjectURL(file);
    this.form.patchValue({ image: this.imagePreview });
  }

  removeImage(): void {
    this.imagePreview = null;
    this.myFiles = null;
    this.form.patchValue({ image: "" });
  }

  async uploadSelectedImage(): Promise<string | null> {
    const file = this.myFiles?.[0];
    if (!file || this.id === null || this.id === undefined) {
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    const uploaded: any = await this.api.uploadfile(this.id, formData);
    const imageUrl = uploaded?.url || null;

    if (imageUrl) {
      this.imageUpdated.emit({
        userId: String(this.id),
        imageUrl,
      });
    }

    return imageUrl;
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    if (!this.isEditMode || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      this.isLoading = true;
      const formValue = this.form.getRawValue();
      const locationParts = this.getLocationParts(formValue.locationKey);
      const payload = {
        ...formValue,
        city: locationParts.city,
        state: locationParts.state,
      } as any;

      delete payload.locationKey;

      await this.api.update(this.id, payload);

      const uploadedImageUrl = await this.uploadSelectedImage();
      if (uploadedImageUrl) {
        payload.image = uploadedImageUrl;
      }

      const result = { ...this.data, ...payload, id: this.id };
      this.saved.emit(result);
      this.activeModal.close(result);
    } finally {
      this.isLoading = false;
    }
  }

  private getLocationKey(city?: string | null, state?: string | null): string {
    const normalizedCity = String(city || '').trim().toLowerCase();
    const normalizedState = String(state || '').trim().toLowerCase();

    if (normalizedCity.includes('las vegas') || normalizedState === 'nv' || normalizedState === 'nevada') {
      return 'las-vegas-nv';
    }

    if (normalizedCity.includes('seattle') || normalizedState === 'wa' || normalizedState === 'washington') {
      return 'seattle-wa';
    }

    if (normalizedCity.includes('tijuana') || normalizedState === 'mexico') {
      return 'tijuana-mexico';
    }

    return '';
  }

  private getLocationParts(locationKey?: string | null): { city: string; state: string } {
    switch (locationKey) {
      case 'las-vegas-nv':
        return { city: 'Las Vegas', state: 'NV' };
      case 'seattle-wa':
        return { city: 'Seattle', state: 'WA' };
      case 'tijuana-mexico':
        return { city: 'Tijuana', state: 'Mexico' };
      default:
        return {
          city: String(this.form.get('city')?.value || '').trim(),
          state: String(this.form.get('state')?.value || '').trim(),
        };
    }
  }
}