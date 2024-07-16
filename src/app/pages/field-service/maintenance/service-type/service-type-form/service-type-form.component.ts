import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from "@angular/forms";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";

export interface IServiceTypeForm {
  name: FormControl<string>;
  description: FormControl<string>;
  font_color: FormControl<string>;
  background_color: FormControl<string>;
  active: FormControl<number>;
}

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  selector: "app-service-type-form",
  templateUrl: "./service-type-form.component.html",
  styleUrls: ["./service-type-form.component.scss"],
})
export class ServiceTypeFormComponent {
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

  form = new FormGroup<IServiceTypeForm>({
    name: new FormControl("", { nonNullable: true }),
    description: new FormControl("", { nonNullable: true }),
    font_color: new FormControl("", { nonNullable: true }),
    background_color: new FormControl("", { nonNullable: true }),
    active: new FormControl(0, { nonNullable: true }),
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }
}
