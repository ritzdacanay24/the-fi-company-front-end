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

      const checklist = (data?.details || []).map((group: any) => {
        const details = (group?.details || []).map((item: any) => {
          const normalizedStatus =
            item?.status === null || item?.status === undefined || item?.status === ""
              ? undefined
              : Number(item.status);

          return {
            ...item,
            status: normalizedStatus,
            needMaint: normalizedStatus === 0,
            error: false,
            remarks: item?.remarks || "",
          };
        });

        return {
          ...group,
          status: details.length > 0 && details.every((d: any) => d.status === 1),
          needMaint: details.some((d: any) => d.status === 0),
          details,
        };
      });

      this.attachments = data?.attachments;
      this.data = data;
      this.form.patchValue({
        ...data.main,
        details: checklist,
      });

      this.formValues = {
        ...formData,
        checklist,
      };

      this.form.disable();
      this.isLoading = false;
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

  hasFailedInspections(): boolean {
    if (!this.formValues?.checklist) return false;
    
    return this.formValues.checklist.some((section: any) => 
      section.details?.some((item: any) => item.status === 0)
    );
  }
}
