import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AttachmentsService } from "@app/core/api/attachments/attachments.service";
import { SchedulerService } from "@app/core/api/field-service/scheduler.service";
import { RequestService } from "@app/core/api/field-service/request.service";
import { FIELD_SERVICE } from "@app/pages/field-service/field-service-constant";
import { AddressSearchComponent } from "@app/shared/components/address-search/address-search.component";
import { states } from "@app/core/data/states";
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import {
  Observable,
  Subject,
  catchError,
  concat,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
} from "rxjs";

@Component({
  selector: "app-request-public-v2",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, AddressSearchComponent],
  templateUrl: "./request-public-v2.component.html",
  styleUrls: ["./request-public-v2.component.scss"],
})
export class RequestPublicV2Component {
  submitted = false;
  submitting = false;
  serviceRequestExpanded: boolean[] = [true];
  productExpanded: boolean[][] = [[true]];
  private productUidCounter = 1;

  private productSearchInputs: Record<string, Subject<string>> = {};
  private productSearchOptions: Record<string, Observable<any[]>> = {};
  productSearchLoading: Record<string, boolean> = {};
  productFiles: Record<string, File[]> = {};
  states = states;

  constructor(
    private fb: FormBuilder,
    private schedulerService: SchedulerService,
    private requestService: RequestService,
    private attachmentsService: AttachmentsService
  ) {}

  readonly form = this.fb.group({
    customer_name: ["", Validators.required],
    service_requestor: ["", Validators.required],
    primary_email: ["", [Validators.required, Validators.email]],
    additional_recipients: [""],

    requested_date: [""],
    requested_time: [""],

    casino_name: ["", Validators.required],
    address_line_1: ["", Validators.required],
    suite_unit: [""],
    state: [""],
    city: [""],
    zip: [""],

    gaming_license: [false],
    site_survey: [false],
    onsite_techs: [""],
    onsite_tech_contact: [""],
    special_site_notes: [""],

    service_requests: this.fb.array([this.createServiceRequestGroup()]),

    special_instructions: [""],
  });

  get serviceRequests(): FormArray<FormGroup> {
    return this.form.get("service_requests") as FormArray<FormGroup>;
  }

  private createServiceRequestGroup(): FormGroup {
    return this.fb.group({
      service_type: [null, Validators.required],
      sales_order_number: [""],
      service_request_summary: ["", Validators.required],
      products: this.fb.array([this.createProductGroup()]),
    });
  }

  private createProductGroup(): FormGroup {
    return this.fb.group({
      _uid: [this.productUidCounter++],
      platform: [""],
      configuration: [""],
      sign_theme: [""],
      sign_mount: [""],
      eyefi_customer_part_number: [""],
      sn: [""],
      customer_product_number: [null],
      sign_jacks_required: [false],
      floor_mounting_required: [false],
    });
  }

  addServiceRequest(): void {
    this.serviceRequests.push(this.createServiceRequestGroup());
    this.serviceRequestExpanded.push(true);
    this.productExpanded.push([true]);
  }

  removeServiceRequest(index: number): void {
    if (this.serviceRequests.length <= 1) {
      return;
    }

    const productUids = this.getProducts(index).controls.map((control) => this.getProductUid(control));

    this.serviceRequests.removeAt(index);
    this.serviceRequestExpanded.splice(index, 1);
    productUids.forEach((uid) => this.cleanupProductSearch(uid));
    this.productExpanded.splice(index, 1);
  }

  getProducts(requestIndex: number): FormArray<FormGroup> {
    return this.serviceRequests.at(requestIndex).get("products") as FormArray<FormGroup>;
  }

  addProduct(requestIndex: number): void {
    this.getProducts(requestIndex).push(this.createProductGroup());
    if (!this.productExpanded[requestIndex]) {
      this.productExpanded[requestIndex] = [];
    }
    this.productExpanded[requestIndex].push(true);
  }

  removeProduct(requestIndex: number, productIndex: number): void {
    const products = this.getProducts(requestIndex);
    if (products.length <= 1) {
      return;
    }

    const uid = this.getProductUid(products.at(productIndex));
    products.removeAt(productIndex);
    this.cleanupProductSearch(uid);
    this.productExpanded[requestIndex]?.splice(productIndex, 1);
  }

  getProductTypeahead(requestIndex: number, productIndex: number): Subject<string> {
    const productGroup = this.getProducts(requestIndex).at(productIndex);
    const uid = this.getProductUid(productGroup);
    this.ensureProductSearch(uid);
    return this.productSearchInputs[uid];
  }

  getProductOptions(requestIndex: number, productIndex: number): Observable<any[]> {
    const productGroup = this.getProducts(requestIndex).at(productIndex);
    const uid = this.getProductUid(productGroup);
    this.ensureProductSearch(uid);
    return this.productSearchOptions[uid];
  }

  isProductLoading(requestIndex: number, productIndex: number): boolean {
    const productGroup = this.getProducts(requestIndex).at(productIndex);
    const uid = this.getProductUid(productGroup);
    return !!this.productSearchLoading[uid];
  }

  private ensureProductSearch(uid: string): void {
    if (this.productSearchInputs[uid] && this.productSearchOptions[uid]) {
      return;
    }

    const input$ = new Subject<string>();
    this.productSearchInputs[uid] = input$;

    this.productSearchOptions[uid] = concat(
      of([]),
      input$.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => {
          this.productSearchLoading[uid] = true;
        }),
        switchMap((term) =>
          this.schedulerService.searchByQadPartNumber(term, "", true).pipe(
            catchError(() => of([])),
            tap(() => {
              this.productSearchLoading[uid] = false;
            })
          )
        )
      )
    );
  }

  private cleanupProductSearch(uid: string): void {
    if (this.productSearchInputs[uid]) {
      this.productSearchInputs[uid].complete();
    }
    delete this.productSearchInputs[uid];
    delete this.productSearchOptions[uid];
    delete this.productSearchLoading[uid];
    delete this.productFiles[uid];
  }

  private getProductUid(productControl: AbstractControl): string {
    const uid = productControl.get("_uid")?.value;
    return String(uid);
  }

  toggleServiceRequest(index: number): void {
    this.serviceRequestExpanded[index] = !this.serviceRequestExpanded[index];
  }

  toggleProduct(requestIndex: number, productIndex: number): void {
    if (!this.productExpanded[requestIndex]) {
      this.productExpanded[requestIndex] = [];
    }
    this.productExpanded[requestIndex][productIndex] = !this.productExpanded[requestIndex][productIndex];
  }

  getServiceRequestSummary(index: number): string {
    const request = this.serviceRequests.at(index)?.value as any;
    const serviceType = request?.service_type || "New service request";
    const salesOrder = request?.sales_order_number ? ` • SO ${request.sales_order_number}` : "";
    return `${serviceType}${salesOrder}`;
  }

  getProductSummary(requestIndex: number, productIndex: number): string {
    const product = this.getProducts(requestIndex).at(productIndex)?.value as any;
    const partNumber = product?.eyefi_customer_part_number || "No part #";
    const serial = product?.sn ? ` • SN ${product.sn}` : "";
    return `${partNumber}${serial}`;
  }

  onProductFilesSelected(requestIndex: number, productIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const uid = this.getProductUid(this.getProducts(requestIndex).at(productIndex));
    this.productFiles[uid] = files;
  }

  getProductFiles(requestIndex: number, productIndex: number): File[] {
    const uid = this.getProductUid(this.getProducts(requestIndex).at(productIndex));
    return this.productFiles[uid] || [];
  }

  removeProductFile(requestIndex: number, productIndex: number, fileIndex: number): void {
    const uid = this.getProductUid(this.getProducts(requestIndex).at(productIndex));
    const files = this.productFiles[uid] || [];
    files.splice(fileIndex, 1);
    this.productFiles[uid] = [...files];
  }

  notifyAddressSelected(addressResult: any): void {
    if (!addressResult) {
      return;
    }

    this.form.patchValue({
      address_line_1: addressResult?.fullStreetName || "",
      city: addressResult?.address?.localName || "",
      state: addressResult?.address?.countrySubdivisionCode || "",
      zip: addressResult?.address?.postalCode || "",
    });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidControl();
      return;
    }

    this.submitting = true;

    try {
      const payload = this.buildLegacyRequestPayload();
      const response: any = await this.requestService.createFieldServiceRequest(payload);
      const requestId = response?.id;

      let uploadedCount = 0;
      if (requestId) {
        uploadedCount = await this.uploadAllProductFiles(requestId);
      }

      alert(`Request submitted successfully${requestId ? ` (ID: ${requestId})` : ""}. Uploaded ${uploadedCount} attachment(s).`);
    } catch (error) {
      console.error("Error submitting V2 request", error);
      alert("Unable to submit request. Please try again.");
    } finally {
      this.submitting = false;
    }
  }

  isControlInvalid(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  normalizeAdditionalRecipients(): void {
    const control = this.form.get("additional_recipients");
    const normalized = this.normalizeRecipientEmails(control?.value as string);
    control?.setValue(normalized, { emitEvent: false });
  }

  getAdditionalRecipientList(): string[] {
    const value = this.form.get("additional_recipients")?.value as string;
    return this.parseRecipientEmails(value);
  }

  removeAdditionalRecipient(index: number): void {
    const list = this.getAdditionalRecipientList();
    list.splice(index, 1);
    this.form.get("additional_recipients")?.setValue(list.join(","), { emitEvent: false });
  }

  private buildLegacyRequestPayload(): Record<string, any> {
    const formValue: any = this.form.getRawValue();
    const firstServiceRequest = formValue.service_requests?.[0] || {};
    const firstProduct = firstServiceRequest.products?.[0] || {};
    const timestamp = this.formatDateTime(new Date());

    const dateAndTime = formValue.requested_date
      ? `${formValue.requested_date} ${formValue.requested_time || "00:00"}:00`
      : "";

    return {
      email: formValue.primary_email,
      requested_by: formValue.service_requestor,
      onsite_customer_name: formValue.onsite_techs || formValue.service_requestor,
      onsite_customer_phone_number: formValue.onsite_tech_contact || "",
      subject: firstServiceRequest.service_request_summary || "Service Request",
      type_of_service: firstServiceRequest.service_type || "Service Call",
      dateAndTime,
      date_of_service: formValue.requested_date || "",
      start_time: formValue.requested_time || "",
      so_number: firstServiceRequest.sales_order_number || "",
      customer_co_number: "",
      type_of_sign: firstProduct.configuration || "",
      eyefi_customer_sign_part: firstProduct.eyefi_customer_part_number || "",
      sign_theme: firstProduct.sign_theme || "",
      sign_manufacture: firstProduct.sign_mount || "",
      platform: firstProduct.platform || "",
      serial_number: firstProduct.sn || "",
      customer_product_number: firstProduct.customer_product_number || "",
      property: formValue.casino_name,
      address1: formValue.address_line_1,
      address2: formValue.suite_unit || "",
      state: formValue.state || "",
      city: formValue.city || "",
      zip: formValue.zip || "",
      licensing_required: formValue.gaming_license ? 1 : 0,
      site_survey_requested: formValue.site_survey ? 1 : 0,
      bolt_to_floor: firstProduct.floor_mounting_required ? 1 : 0,
      sign_jacks: firstProduct.sign_jacks_required ? 1 : 0,
      special_instruction: formValue.special_instructions || "",
      cc_email: this.normalizeRecipientEmails(formValue.additional_recipients),
      customer_name: formValue.customer_name,
      customer: formValue.customer_name,
      created_date: timestamp,
      active: 1,
      token: "",
      created_by: "public-v2",
      service_requests_v2: JSON.stringify(formValue.service_requests || []),
      special_site_notes_v2: formValue.special_site_notes || "",
    };
  }

  private async uploadAllProductFiles(requestId: number): Promise<number> {
    const files = Object.values(this.productFiles).flat();
    let uploadedCount = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", FIELD_SERVICE.UPLOAD_FIELD_NAME);
      formData.append("uniqueData", `${requestId}`);
      formData.append("folderName", FIELD_SERVICE.UPLOAD_FOLDER_NAME);

      try {
        await this.attachmentsService.uploadfilePublic(formData);
        uploadedCount++;
      } catch (error) {
        console.error("Failed to upload file", file?.name, error);
      }
    }

    return uploadedCount;
  }

  private formatDateTime(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private normalizeRecipientEmails(value: string): string {
    return this.parseRecipientEmails(value).join(",");
  }

  private parseRecipientEmails(value: string): string[] {
    return (value || "")
      .split(/[;,\n]+/)
      .map((email) => email.trim())
      .filter((email) => !!email);
  }

  onReset(): void {
    this.form.reset({
      gaming_license: false,
      site_survey: false,
    });

    this.serviceRequests.clear();
    this.serviceRequests.push(this.createServiceRequestGroup());
    this.serviceRequestExpanded = [true];
    this.productExpanded = [[true]];

    Object.keys(this.productSearchInputs).forEach((uid) => this.cleanupProductSearch(uid));

    this.submitted = false;
  }

  private focusFirstInvalidControl(): void {
    setTimeout(() => {
      const element = document.querySelector(".is-invalid") as HTMLElement | null;
      element?.focus();
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
}
