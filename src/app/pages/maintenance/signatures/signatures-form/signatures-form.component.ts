import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { states } from "@app/core/data/states";
import { SharedModule } from "@app/shared/shared.module";
import { NgSelectModule } from "@ng-select/ng-select";
import { ControlsOf } from "src/assets/js/util/_formGroup";
import { QadCustomerPartSearchComponent } from "@app/shared/components/qad-customer-part-search/qad-customer-part-search.component";
import { QadWoSearchComponent } from "@app/shared/components/qad-wo-search/qad-wo-search.component";
import { SoSearchComponent } from "@app/shared/components/so-search/so-search.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    SoSearchComponent,
    QadWoSearchComponent,
    QadCustomerPartSearchComponent,
  ],
  selector: "app-signatures-form",
  templateUrl: "./signatures-form.component.html",
})
export class SignaturesFormComponent {
  constructor() {}

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls;
  }

  states = states;

  form = new FormGroup({
    Name: new FormControl(null),
    Title: new FormControl(""),
    Email: new FormControl(null),
    officePhone: new FormControl(""),
    officePhone2: new FormControl(null),
    mobilePhone: new FormControl(""),
    Address1: new FormControl(""),
    Address2: new FormControl(""),
  });
}
