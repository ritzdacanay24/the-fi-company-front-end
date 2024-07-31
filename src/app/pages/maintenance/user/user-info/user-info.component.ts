import { Component, Input } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { UserService } from "@app/core/api/field-service/user.service";
import { states } from "@app/core/data/states";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, UserSearchV1Component],
  selector: "app-user-info",
  templateUrl: "./user-info.component.html",
})
export class UserInfoComponent {
  title = "User Info";
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.id) this.getData();
  }

  @Input() id = null;

  states = states;

  priceTables: any = [];

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  notifyParent($event) {
    this.form.patchValue({ parentId: $event?.id });
  }

  accessRight = [
    { name: "Regular", value: 0 },
    { name: "Lead", value: 1 },
    { name: "Supervisor", value: 2 },
    { name: "Manager", value: 3 },
    { name: "Director", value: 4 },
  ];

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
    leadInstaller: [0],
    title: [""],
    workPhone: [""],
    pass: ["", Validators.required],
    department: [null],
    employeeType: [0],
    parentId: [0],
    isEmployee: [0],
    lastLoggedIn: [""],
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) return;

    await this.userService.update(this.id, this.form.value);

    this.toastrService.success("Updated successfully");
  }

  async getData() {
    let data = await this.userService.getById(this.id);
    this.form.patchValue(data);
  }
}
