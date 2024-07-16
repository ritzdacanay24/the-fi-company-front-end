import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { FormGroup } from "@angular/forms";
import { NAVIGATION_ROUTE } from "../forklift-inspection-constant";
import { ForkliftInspectionFormComponent } from "../forklift-inspection-form/forklift-inspection-form.component";
import { ForkliftInspectionService } from "@app/core/api/operations/forklift-inspection/forklift-inspection.service";
import { formValues as formData } from "./../forklift-inspection-form/formData";

@Component({
  standalone: true,
  imports: [SharedModule, ForkliftInspectionFormComponent],
  selector: "app-forklift-inspection-edit",
  templateUrl: "./forklift-inspection-edit.component.html",
})
export class ForkliftInspectionEditComponent {
  constructor(
    private router: Router,
    private api: ForkliftInspectionService,
    private toastrService: ToastrService,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit Forklift Inspection";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data;

  viewImage(row) {}

  compare(a, b) {
    if (a.name > b.name) {
      return -1;
    }
    if (a.name < b.name) {
      return 1;
    }
    return 0;
  }
  formValues;

  attachments = [];
  async getData() {
    try {
      this.isLoading = true;
      let data = await this.api._searchById(this.id);

      this.attachments = data?.attachments;
      this.form.patchValue({
        ...data.main,
        details: data?.details,
      });

      this.formValues = {
        ...formData,
        checklist: data?.details,
      };

      data?.details.sort();

      this.form.disable();
    } catch (err) {
      this.isLoading = false;
    }
  }

  setFormEmitter($event) {
    this.form = $event;
  }

  details;
  setDetailsFormEmitter($event) {
    this.details = $event?.checklist;
  }

  async onSubmit() {
    this.submitted = true;
    this.form.value.details = this.details;

    try {
      this.isLoading = true;
      await this.api._create(this.form.value);

      this.isLoading = false;
      this.toastrService.success("Successfully Created");

      this.router.navigate([NAVIGATION_ROUTE.EDIT]);
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }
}
