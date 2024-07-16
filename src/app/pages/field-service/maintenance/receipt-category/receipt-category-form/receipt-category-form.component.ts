import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  selector: "app-receipt-category-form",
  templateUrl: "./receipt-category-form.component.html",
  styleUrls: ["./receipt-category-form.component.scss"],
})
export class ReceiptCategoryFormComponent {
  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({
    category: [""],
    description: [""],
    accounting_code: [""],
    icon: [""],
    active: [1],
    background_color: "",
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key];
    this.form.get(key).patchValue(e ? 1 : 0);
  }
}
