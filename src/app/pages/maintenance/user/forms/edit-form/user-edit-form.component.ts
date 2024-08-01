import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { SharedModule } from "@app/shared/shared.module";
import { accessRight, departments } from "../../user-constant";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, UserSearchV1Component],
  selector: "app-user-edit-form",
  templateUrl: "./user-edit-form.component.html",
})
export class UserEditFormComponent {
  title = "User Info";
  isLoading = false;

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  constructor(private fb: FormBuilder) {}

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
    area: [""],
    workArea: [""],
    attempts: [0],
    createdDate: [""],
    email: ["", Validators.required],
    first: ["", Validators.required],
    last: ["", Validators.required],
    title: [""],
    employeeType: [0],
    parentId: [0],
    isEmployee: [0],
    lastLoggedIn: [""],
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }
}
