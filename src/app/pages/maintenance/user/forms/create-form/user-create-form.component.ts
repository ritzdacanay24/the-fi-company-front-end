import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { UserFormComponent } from "@app/pages/operations/maintenance/user/user-form/user-form.component";
import { accessRight, departments } from "../../user-constant";

@Component({
  standalone: true,
  imports: [SharedModule, UserFormComponent, UserSearchV1Component],
  selector: "app-user-create-form",
  templateUrl: "./user-create-form.component.html",
})
export class UserCreateFormComponent {
  constructor(private fb: FormBuilder) {}

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
  });
}
