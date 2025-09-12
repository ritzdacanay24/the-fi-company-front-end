import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { SharedModule } from "@app/shared/shared.module";
import { accessRight, departments } from "../../user-constant";
import { NgSelectModule } from "@ng-select/ng-select";
import { merge } from "rxjs";

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
    });
    this.form.get("lastLoggedIn").disable();
  }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  departments = departments;

  @Input() id = null;

  @Input() submitted = false;

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
}
