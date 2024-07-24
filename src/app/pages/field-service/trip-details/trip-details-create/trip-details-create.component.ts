import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { ToastrService } from "ngx-toastr";
import { NAVIGATION_ROUTE } from "../trip-details-constant";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { TripDetailService } from "@app/core/api/field-service/trip-detail/trip-detail.service";
import { TripDetailsFormComponent } from "../trip-details-form/trip-details-form.component";
import { TripDetailHeaderService } from "@app/core/api/field-service/trip-detail-header/trip-detail-header.service";
import { _compressToEncodedURIComponent } from "src/assets/js/util/jslzString";

@Component({
  standalone: true,
  imports: [SharedModule, TripDetailsFormComponent],
  selector: "app-trip-details-create",
  templateUrl: "./trip-details-create.component.html",
})
export class TripDetailsCreateComponent {
  constructor(
    private router: Router,
    private api: TripDetailService,
    private toastrService: ToastrService,
    private tripDetailHeaderService: TripDetailHeaderService
  ) {}

  createNew = false;

  ngOnInit(): void {
    this.getHeader();
  }

  title = "Create Trip Detail";

  form: FormGroup;

  isLoading = false;

  sendEmail = true;

  submitted = false;

  //Go Back button;
  @Input() goBack: Function = (id?: string) => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
      queryParams: { id: id },
    });
  };

  setFormEmitter($event: FormGroup<any>) {
    this.form = $event;
  }

  onSubmit = async () => {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;

      let data = await this.api.create(this.form.value);

      this.isLoading = false;
      this.toastrService.success("Successfully Created");
      this.goBack(data.insertId);
    } catch (err) {
      this.isLoading = false;
    }
  };

  async createNewGroup() {
    let { insertId } = await this.tripDetailHeaderService.create({});

    this.currentFsIdGroupSelection = insertId
    this.router.navigate([NAVIGATION_ROUTE.SUMMARY_EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        group_id: this.currentFsIdGroupSelection,
      },
    });
  }

  currentFsIdGroupSelection = null;

  headerInfo: any;
  async getHeader() {
    this.headerInfo = await this.tripDetailHeaderService.getAll();
  }

  goToView() {
    this.router.navigate([NAVIGATION_ROUTE.SUMMARY_EDIT], {
      queryParamsHandling: "merge",
      queryParams: {
        group_id: this.currentFsIdGroupSelection,
      },
    });
  }

  onCancel() {
    this.goBack();
  }
}
