import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthenticationService } from "@app/core/services/auth.service";
import { SharedModule } from "@app/shared/shared.module";
import moment from "moment";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-customer-visit-form",
  templateUrl: "./customer-visit-form.component.html",
})
export class CustomerVisitFormComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    public router: Router,
    public activatedRoute: ActivatedRoute,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit() {
    this.setFormEmitter.emit(this.form);
  }

  @Input() id: any;

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  form = this.fb.group({
    header: this.fb.group({
      start_date: null,
      start_time: null,
      end_time: null,
      property_name: "",
      techs: this.authenticationService.currentUserValue.full_name,
      created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
      created_by: this.authenticationService.currentUserValue.id,
      contact_name: "",
    }),
    details: this.fb.group({
      customer_visit_log_id: null,
      sign_theme: "",
      manufacture: "",
      bank_location: "",
      issue: null,
      serial_number: "",
      description_of_issue: "",
      created_by: this.authenticationService.currentUserValue.id,
      created_date: moment().format("YYYY-MM-DD HH:mm:ss"),
    }),
  });

  get f() {
    return this.form.get("main")["controls"];
  }
}
