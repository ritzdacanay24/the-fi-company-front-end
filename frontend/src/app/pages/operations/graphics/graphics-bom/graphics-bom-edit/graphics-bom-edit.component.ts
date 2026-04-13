import { Component, ElementRef, Input, ViewChild } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { GraphicsBomFormComponent } from "../graphics-bom-form/graphics-bom-form.component";
import { NAVIGATION_ROUTE } from "../graphics-bom-constant";
import { GraphicsBomService } from "@app/core/api/operations/graphics/graphics-bom.service";
import { FormGroup } from "@angular/forms";
import moment from "moment";

const GRAPHICS_BOM_FOLDER_LOCATION =
  "https://dashboard.eye-fi.com/attachments_mount/Yellowfish/";

@Component({
  standalone: true,
  imports: [SharedModule, GraphicsBomFormComponent],
  selector: "app-graphics-bom-edit",
  templateUrl: "./graphics-bom-edit.component.html",
})
export class GraphicsBomEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: GraphicsBomService,
    private toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Edit";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;

  get isPdf() {
    return this.form?.value?.Image_Data?.includes("PDF");
  }

  onDuplicate() {
    this.id = null;
    this.form.patchValue({ Image_Data: null, ID_Product: null });
  }

  image = null;

  async getData() {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
      this.image = GRAPHICS_BOM_FOLDER_LOCATION + this.data?.Image_Data;
      this.form.patchValue(this.data);
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.id) {
      this.update();
    } else {
      this.create();
    }
  }

  async update() {
    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }
    try {
      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success("Successfully Updated");
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  async create() {
    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }
    try {
      this.isLoading = true;
      let data = await this.api.create(this.form.value);
      this.id = data.insertId;
      this.isLoading = false;
      this.router.navigate([NAVIGATION_ROUTE.EDIT], {
        queryParamsHandling: "merge",
        queryParams: { id: data.insertId },
      });
      this.getData();
      this.toastrService.success("Successfully Created");

      window.scroll({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  async onDeleteFile() {
    if (!confirm("Are you sure you want to remove attachment?")) return;
    try {
      this.isLoading = true;
      this.form.patchValue({ Image_Data: null }, { emitEvent: false });
      await this.api.update(this.id, this.form.value);
      await this.getData();
      this.image = null;

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  @ViewChild("myInput")
  myInputVariable: ElementRef;

  file: File = null;

  myFiles: any;

  onFilechange(event: any) {
    this.myFiles = event.target.files;
  }

  clearUploadFile() {
    this.myFiles = null;
    this.myInputVariable.nativeElement.value = "";
  }

  async onUploadFile() {
    if (this.myFiles) {
      let file: File = this.myFiles[0];
      let formData: FormData = new FormData();
      formData.append("file", file, file.name);
      let headers = new Headers();
      headers.append("Content-Type", "multipart/form-data");
      headers.append("Accept", "application/json");

      this.form.patchValue({ Image_Data: file.name }, { emitEvent: false });

      this.image =
        GRAPHICS_BOM_FOLDER_LOCATION + file.name + "?" + moment().valueOf();

      try {
        this.isLoading = true;
        await this.api.upload(formData);

        await this.api.update(this.id, this.form.value);
        await this.getData();
        this.myFiles = null;
        this.isLoading = false;
      } catch (err) {
        this.isLoading = false;
      }
    }
  }
}
