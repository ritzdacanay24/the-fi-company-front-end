import { Component, Input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import moment from "moment";
import { RmaFormComponent } from "../rma-form/rma-form.component";
import { NAVIGATION_ROUTE } from "../rma-constant";
import { AuthenticationService } from "@app/core/services/auth.service";
import { SharedModule } from "@app/shared/shared.module";
import { getFormValidationErrors } from "src/assets/js/util/getFormValidationErrors";
import { RmaService } from "@app/core/api/quality/rma.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { FeatureType } from "@app/shared/enums/feature.enum";

@Component({
  standalone: true,
  imports: [SharedModule, RmaFormComponent],
  selector: "app-rma-create",
  templateUrl: "./rma-create.component.html",
  styleUrls: ["./rma-create.component.scss"],
})
export class RmaCreateComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: RmaService,
    private toastrService: ToastrService,
    private authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.id = params["id"];
    });

    if (this.id) this.getData();
  }

  title = "Create RMA";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  myFiles: File[] = [];
  selectedFiles: File[] = [];

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  data: any;

  async getData() {
    try {
      this.data = await this.api.getById(this.id);
      this.form.patchValue(this.data);
    } catch (err) {}
  }

  setFormEmitter($event) {
    this.form = $event;
    this.form.patchValue(
      {
        createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        createdBy: this.authenticationService.currentUserValue.id,
      },
      { emitEvent: false }
    );
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      getFormValidationErrors();
      return;
    }

    try {
      this.isLoading = true;
      const { insertId } = await this.api.create(this.form.value);

      if (this.myFiles.length > 0) {
        await this.attachmentsService.uploadFilesByFeature(
          FeatureType.RMA,
          insertId,
          this.myFiles,
        );
      }

      this.isLoading = false;
      this.toastrService.success("Successfully Created");
      this.selectedFiles = [];
      this.myFiles = [];
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack();
  }

  onAttachmentFilesAdded(files: File[]): void {
    this.addFiles(files || []);
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.myFiles = [...this.selectedFiles];
  }

  private addFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    const dedupedFiles = new Map(
      this.selectedFiles.map((file) => [this.getFileKey(file), file])
    );

    files.forEach((file) => {
      dedupedFiles.set(this.getFileKey(file), file);
    });

    this.selectedFiles = Array.from(dedupedFiles.values());
    this.myFiles = [...this.selectedFiles];
  }

  private getFileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}
