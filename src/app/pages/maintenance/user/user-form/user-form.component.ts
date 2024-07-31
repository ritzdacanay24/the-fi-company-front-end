import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { states } from "@app/core/data/states";
import { UserSearchV1Component } from "@app/shared/components/user-search-v1/user-search-v1.component";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, UserSearchV1Component],
  selector: "app-user-form",
  templateUrl: "./user-form.component.html",
  styleUrls: ["./user-form.component.scss"],
})
export class UserFormComponent {
  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  states = states;

  priceTables: any = [];

  @Input() submitted = false;

  get f() {
    return this.form.controls;
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
    pass: [""],
    department: [null],
    parentId: "",
    isEmployee: "",
    employeeType: null,
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }

  notifyParent($event) {
    this.form.patchValue({ parentId: $event?.id });
  }
}
