import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { NgbNavModule } from "@ng-bootstrap/ng-bootstrap";
import { FormGroup } from "@angular/forms";
import { NcrService } from "@app/core/api/quality/ncr-service";
import { NcrVerificationFormComponent } from "../../ncr-verification-form/ncr-verification-form.component";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";

//need to authorize qa only
@Component({
  standalone: true,
  imports: [SharedModule, NgbNavModule, NcrVerificationFormComponent],
  selector: "app-ncr-verification",
  templateUrl: "./ncr-verification.component.html",
  styleUrls: [],
})
export class NcrVerificationComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public ncrService: NcrService,
    private toastrService: ToastrService,
    public authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes["id"]) {
      this.id = changes["id"].currentValue;
      this.getData();
    }
  }

  @Output() setFormEmitterParent: EventEmitter<any> = new EventEmitter();

  setFormEmitter($event) {
    this.form = $event;
    this.setFormEmitterParent.emit(this.form);
  }

  @Input() id = null;

  isLoading = false;

  title = "CAR Verification";

  form: FormGroup;

  submitted = false;

  @Input() getHeaderData;

  async onSubmit() {
    try {
      this.isLoading = true;
      await this.ncrService.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.form.markAsPristine();
    } catch (err) {
      this.isLoading = false;
    }
  }

  async getData() {
    let data = await this.ncrService.getById(this.id);
    this.form.patchValue(data);

    if (data.submitted_date) {
      this.form.disable();
    }
    if (data.ca_action_req == "No" || !data.ca_action_req) {
      this.form.disable();
    }
  }

  async onClose() {
    try {
      this.form.patchValue({
        submitted_date: moment().format("YYYY-MM-DD HH:mm:ss"),
      });
      await this.ncrService.update(this.id, this.form.value);
      this.getHeaderData()
      this.form.markAsPristine();
      this.form.disable();
    } catch (err) {
      this.isLoading = false;
    }
  }
}
