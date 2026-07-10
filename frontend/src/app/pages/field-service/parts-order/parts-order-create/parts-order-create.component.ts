import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { SharedModule } from "@app/shared/shared.module";
import { PartsOrderFormComponent } from "../parts-order-form/parts-order-form-component";
import { FormGroup } from "@angular/forms";
import { PartsOrderService } from "@app/core/api/field-service/parts-order/parts-order.service";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { FeatureType } from "@app/shared/enums/feature.enum";
import moment from "moment";
import { AuthenticationService } from "@app/core/services/auth.service";
import { NAVIGATION_ROUTE } from "../parts-order-constant";

@Component({
  standalone: true,
  imports: [SharedModule, PartsOrderFormComponent],
  selector: "app-parts-order-create",
  templateUrl: "./parts-order-create.component.html",
  styleUrls: [],
})
export class PartsOrderCreateComponent implements OnInit {
  currentUrl: string;

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public partsOrderService: PartsOrderService,
    public authenticationService: AuthenticationService,
    private attachmentsService: AttachmentsService,
  ) {}

  ngOnInit(): void {}

  onCancel() {
    this.goBack();
  }

  async onSubmit() {
    try {
      if (this.form.value.details.length == 0) {
        alert("You have not items in your cart. Unable to submit request.");
        return;
      }

      this.form.value.details = JSON.stringify(this.form.value.details);

      this.isLoading = true;
      this.form.value.created_date = moment().format("YYYY-MM-DD HH:mm:ss");
      this.form.value.created_by =
        this.authenticationService.currentUserValue.id;
      let { insertId } = await this.partsOrderService.create(this.form.value);

      if (this.myFiles?.length) {
        await this.attachmentsService.uploadFilesByFeature(
          FeatureType.PARTS_REQUEST,
          insertId,
          this.myFiles,
        );
      }

      this.isLoading = false;
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], {
      queryParamsHandling: "merge",
    });
  };

  title = "Parts Order Form";

  form: FormGroup;

  submitted = false;

  isLoading = false;

  myFiles: File[] = [];
  selectedFiles: File[] = [];

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
