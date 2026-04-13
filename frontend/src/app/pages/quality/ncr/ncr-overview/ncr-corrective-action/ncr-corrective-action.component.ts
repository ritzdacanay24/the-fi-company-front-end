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
import { NcrCorrectiveActionFormComponent } from "../../ncr-corrective-action-form/ncr-corrective-action-form.component";
import { ToastrService } from "ngx-toastr";
import moment from "moment";

@Component({
  standalone: true,
  imports: [SharedModule, NgbNavModule, NcrCorrectiveActionFormComponent],
  selector: "app-ncr-corrective-action",
  templateUrl: "./ncr-corrective-action.component.html",
  styleUrls: [],
})
export class NcrCorrectiveAcrionComponent implements OnInit {
  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public ncrService: NcrService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {}

  setFormEmitter($event) {
    this.form = $event;
    this.setFormEmitterParent.emit(this.form);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["id"]) {
      this.id = changes["id"].currentValue;
      this.getData();
    }
  }

  @Input() id = null;

  isLoading = false;

  title = "Corrective Action";

  @Output() setFormEmitterParent: EventEmitter<any> = new EventEmitter();

  form: FormGroup;

  submitted = false;

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

  async onSubmitReview() {
    try {
      this.isLoading = true;
      await this.ncrService.update(this.id, {
        ...this.form.value,
        ca_submitted_date: moment().format("YYYY-MM-DD HH:mm:ss"),
      });
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

    if (data.submitted_date || data.ca_submitted_date) {
      this.form.disable();
    }

    if (data.ca_action_req == "No" || !data.ca_action_req) {
      this.form.disable();
    }
  }
}
