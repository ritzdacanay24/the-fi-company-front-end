import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";
import { AddressSearchComponent } from "@app/shared/components/address-search/address-search.component";
import { QadPartSearchComponent } from "@app/shared/components/qad-part-search/qad-part-search.component";
import { QirSearchComponent } from "@app/shared/components/qir-search/qir-search.component";
import { SharedModule } from "@app/shared/shared.module";
import { AutosizeModule } from "ngx-autosize";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    QirSearchComponent,
    QadPartSearchComponent,
    AddressSearchComponent,
    AutosizeModule,
  ],
  selector: "app-qir-response-form",
  templateUrl: "./qir-response-form.component.html",
})
export class QirResponseFormComponent {
  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;
  @Input() id = null;

  get f() {
    return this.form.controls;
  }

  form = this.fb.group({
    qir_number: null,
    findings: [null],
    document_control_response: [null],
    fs_engineering_reponse: [null],
    closure_date: [null],
    closure_by: null,
    quality_team: "",
    preliminary_investigation: null,
  });

  public setValue(column, value) {
    this.form.controls[column].setValue(value, { emitEvent: false });
  }
}
