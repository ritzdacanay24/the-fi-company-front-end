import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { NewUserService } from "@app/core/api/users/users.service";
import { OrgChartUserModalMode } from "./org-chart-user-modal.service";
import {
  AccessControlApiService,
  AccessControlRole,
  AccessControlUserGrant,
} from "@app/core/api/access-control/access-control.service";
import { DepartmentService } from "@app/pages/operations/org-chart/services/department.service";

@Component({
  standalone: true,
  selector: "app-org-chart-user-modal",
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: "./org-chart-user-modal.component.html",
})
export class OrgChartUserModalComponent {
  activeTab: 'details' | 'rbac' = 'details';
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
  isRbacLoading = false;
  submitted = false;
  data: any;
  form: FormGroup;
  myFiles: FileList | null = null;
  imagePreview: string | null = null;
  imageRemoved = false;
  availableRoles: AccessControlRole[] = [];
  availableDomains: string[] = [];
  userGrants: AccessControlUserGrant[] = [];
  selectedRoleIds: number[] = [];
  selectedScopes: string[] = [];
  departments: string[] = [];

  get displayImage(): string | null {
    return this.imagePreview || this.form.value.image || null;
  }

  get selectedRoleLabels(): string {
    if (this.selectedRoleIds.length === 0) {
      return 'No roles assigned';
    }

    return this.availableRoles
      .filter((role) => this.selectedRoleIds.includes(role.id))
      .map((role) => role.name)
      .join(', ');
  }

  constructor(
    private readonly api: NewUserService,
    private readonly accessControlApi: AccessControlApiService,
    private readonly departmentService: DepartmentService,
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
      hire_date: [""],
      image: [""],
    });
  }

  ngAfterContentChecked(): void {
    this.cdRef.detectChanges();
  }

  ngOnInit(): void {
    this.loadDepartments();

    if (this.id !== null && this.id !== undefined) {
      void this.loadData();
      if (this.isEditMode) {
        void this.loadRbacData();
      }
    }
  }

  private loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (response) => {
        const names: string[] = (response?.data || [])
          .map((department) => String(department.department_name || "").trim())
          .filter(Boolean);
        this.departments = Array.from(new Set<string>(names)).sort((a, b) => a.localeCompare(b));
      },
      error: () => {
        this.departments = [];
      },
    });
  }

  get isEditMode(): boolean {
    return this.mode === "edit";
  }

  dismiss(): void {
    this.activeModal.dismiss("dismiss");
  }

  setActiveTab(tab: 'details' | 'rbac'): void {
    this.activeTab = tab;
  }

  isRoleSelected(roleId: number): boolean {
    return this.selectedRoleIds.includes(roleId);
  }

  toggleRole(roleId: number, checked: boolean): void {
    this.selectedRoleIds = checked
      ? Array.from(new Set([...this.selectedRoleIds, roleId]))
      : this.selectedRoleIds.filter((id) => id !== roleId);
  }

  isScopeSelected(domain: string): boolean {
    return this.selectedScopes.includes(domain);
  }

  toggleScope(domain: string, checked: boolean): void {
    this.selectedScopes = checked
      ? Array.from(new Set([...this.selectedScopes, domain]))
      : this.selectedScopes.filter((value) => value !== domain);
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

  async loadRbacData(): Promise<void> {
    if (this.id === null || this.id === undefined) {
      return;
    }

    try {
      this.isRbacLoading = true;
      const userId = Number(this.id);
      const [roles, domains, userRoles, userScopes, userGrants] = await Promise.all([
        this.accessControlApi.getRoles(),
        this.accessControlApi.getDomains(),
        this.accessControlApi.getUserRoles(userId),
        this.accessControlApi.getUserScopes(userId),
        this.accessControlApi.getUserGrants(userId),
      ]);

      this.availableRoles = roles;
      this.availableDomains = domains;
      this.userGrants = userGrants;
      this.selectedRoleIds = userRoles.map((role) => role.id);
      this.selectedScopes = userScopes;
    } finally {
      this.isRbacLoading = false;
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
    this.imageRemoved = false;
    this.form.patchValue({ image: this.imagePreview });
  }

  removeImage(): void {
    this.imagePreview = null;
    this.myFiles = null;
    this.imageRemoved = !!this.data?.image;
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

      if (this.isEditMode) {
        await this.accessControlApi.replaceUserRoles(Number(this.id), this.selectedRoleIds);
        await this.accessControlApi.replaceUserScopes(Number(this.id), this.selectedScopes);
      }

      const hasNewFile = !!this.myFiles?.[0];
      if (this.imageRemoved && !hasNewFile) {
        await this.api.removePhoto(this.id);
        payload.image = "";
        payload.fileName = null;
        payload.showImage = 0;
        this.imageUpdated.emit({
          userId: String(this.id),
          imageUrl: "",
        });
      }

      const uploadedImageUrl = await this.uploadSelectedImage();
      if (uploadedImageUrl) {
        payload.image = uploadedImageUrl;
        payload.showImage = 1;
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