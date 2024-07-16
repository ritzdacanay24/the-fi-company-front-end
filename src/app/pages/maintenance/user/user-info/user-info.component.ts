import { Component, Input } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { UserService } from "@app/core/api/field-service/user.service";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
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
    department: [""],
    employeeType: [0],
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
