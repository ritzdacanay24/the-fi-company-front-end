import { Component, Input } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { GraphicsBomFormComponent } from "../graphics-bom-form/graphics-bom-form.component";
import { NAVIGATION_ROUTE } from "../graphics-bom-constant";
import { GraphicsBomService } from "@app/core/api/operations/graphics/graphics-bom.service";
import { FormGroup } from "@angular/forms";
import { UploadNewAttachmentsComponent } from "@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component";

@Component({
  standalone: true,
  imports: [SharedModule, GraphicsBomFormComponent, UploadNewAttachmentsComponent],
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
      // Backend resolves the correct URL regardless of storage location (legacy, local, or S3)
      this.image = this.data?.image_url ?? null;
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
    if (!confirm('Are you sure you want to remove attachment?')) return;
    try {
      this.isLoading = true;
      // Deletes from S3 (if stored there) and clears DB fields in one call
      await this.api.deleteImage(this.id);
      await this.getData();
      this.image = null;
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }

  async onFilesAdded(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file, file.name);

    // Pass old S3 key/bucket so the backend can delete the previous object
    const previousKey = this.data?.image_storage_key ?? null;
    const previousBucket = this.data?.image_storage_bucket ?? null;

    try {
      this.isLoading = true;
      const result: any = await this.api.upload(formData, previousKey, previousBucket);

      // Use the URL resolved by the backend (works for both local and S3)
      this.image = result?.url ?? null;
      this.form.patchValue({ Image_Data: result?.fileName ?? file.name }, { emitEvent: false });

      // Persist storage metadata immediately after upload
      const storageMetadata = {
        image_storage_source: result?.imageStorageSource ?? null,
        image_storage_bucket: result?.imageStorageBucket ?? null,
        image_storage_key: result?.imageStorageKey ?? null,
      };
      await this.api.update(this.id, { ...this.form.value, ...storageMetadata });
      await this.getData();
      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }
  }
}
