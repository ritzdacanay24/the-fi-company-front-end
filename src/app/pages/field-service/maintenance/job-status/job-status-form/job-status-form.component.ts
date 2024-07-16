import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { cpPresetColors, cpPresetColorsText } from "@app/core/data/scheduler";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";
import { ColorPickerModule } from "ngx-color-picker";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, ColorPickerModule],
  selector: "app-job-status-form",
  templateUrl: "./job-status-form.component.html",
  styleUrls: ["./job-status-form.component.scss"],
})
export class JobStatusFormComponent {
  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  states = states;

  priceTables: any = [];

  @Input() submitted = false;

  @Input() public cpPresetColors = cpPresetColors;
  @Input() public cpPresetColorsText = cpPresetColorsText;

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({
    name: [""],
    description: [""],
    font_color: [""],
    background_color: [""],
    active: [1],
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }
}
