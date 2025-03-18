import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { MyFormGroup } from "src/assets/js/util/_formGroup";
import { IPlacardForm } from "../placard-form/placard-form.type";
import { PlacardFormComponent } from "../placard-form/placard-form.component";
import { NAVIGATION_ROUTE } from "../placard-constant";
import { PlacardService } from "@app/core/api/operations/placard/placard.service";

@Component({
  standalone: true,
  imports: [SharedModule, PlacardFormComponent],
  selector: "app-placard-edit",
  templateUrl: "./placard-edit.component.html",
})
export class PlacardEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: PlacardService,
    private toastrService: ToastrService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  setFormEmitter($event) {
    this.form = $event;


    this.form.valueChanges.subscribe(value => {
      this.totalPrints = []
      for (let i = 0; i < this.form.value.total_label_count; i++) {
        let count = i + 1;
        this.totalPrints.push({
          ...this.form.value,
          label_count: count
        })
      }
    });

  }

  title = "Edit";

  form: MyFormGroup<IPlacardForm>;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);


      this.totalPrints = []
      for (let i = 0; i < this.data.total_label_count; i++) {
        let count = i + 1;
        this.totalPrints.push({
          ...this.data,
          label_count: count
        })
      }

      this.form.patchValue(this.data);
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.form.markAsPristine()
      this.toastrService.success("Successfully Updated");
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  totalPrints = [];
  onPrint() {

    if (this.form.dirty) {
      alert('You have unsaved data. Please save before printing')
      return
    }


    setTimeout(() => {

      var printContents = document.getElementById("pickSheet").innerHTML;
      var popupWin = window.open("", "_blank", "width=1000,height=600");
      popupWin.document.open();
      var pathCss =
        "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
      popupWin.document.write(
        '<html><head><link type="text/css" rel="stylesheet" media="screen, print" href="' +
        pathCss +
        '" /></head><body onload="window.print()">' +
        printContents +
        "</body></html>"
      );
      popupWin.document.close();
      popupWin.onload = () => {
        popupWin.print();
        popupWin.close();
        this.form.markAsPristine()
      };

    }, 500);

  }
}
