import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { PartsOrderFormComponent } from '../parts-order-form/parts-order-form-component';
import { PartsOrderService } from '@app/core/api/field-service/parts-order/parts-order.service';
import { NAVIGATION_ROUTE, PARTS_ORDER_ATTACHMENT } from '../parts-order-constant';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { UploadNewAttachmentsComponent } from '@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component';
import { UploadedAttachmentsListComponent } from '@app/shared/components/attachments/uploaded-attachments-list/uploaded-attachments-list.component';

@Component({
  standalone: true,
  imports: [SharedModule, PartsOrderFormComponent, UploadNewAttachmentsComponent, UploadedAttachmentsListComponent],
  selector: 'app-parts-order-edit',
  templateUrl: './parts-order-edit.component.html',
})
export class PartsOrderEditComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private api: PartsOrderService,
    private toastrService: ToastrService,
    private attachmentsService: AttachmentsService,
    private fb: FormBuilder,
    private authenticationService: AuthenticationService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      if (this.id && this.form) {
        this.getData();
      }
    });
  }


  title = "Edit";

  form: FormGroup;

  id = null;

  isLoading = false;

  submitted = false;

  uploadTriggerMode: 'manual' | 'on-add' | 'parent-submit' = 'on-add';

  @Input() goBack: Function = () => {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  get isAdmin(): boolean {
    const user = this.authenticationService.currentUserValue || {};
    return user?.isAdmin === true || user?.isAdmin === 1 || user?.isAdmin === '1';
  }

  get canManage(): boolean {
    const user = this.authenticationService.currentUserValue || {};
    const employeeType = Number(user?.employeeType ?? 0);
    return this.isAdmin || employeeType !== 0;
  }

  async onDelete(): Promise<void> {
    const result = await SweetAlert.confirm({
      title: 'Delete Parts Order',
      text: 'Are you sure you want to permanently delete this parts order? This cannot be undone.',
      confirmButtonText: 'Delete',
      confirmButtonColor: '#dc3545',
    });
    if (!result.value) return;

    try {
      this.isLoading = true;
      await this.api.delete(this.id);
      this.toastrService.success('Parts order deleted');
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
    } catch {
      this.toastrService.error('Failed to delete parts order');
    } finally {
      this.isLoading = false;
    }
  }

  async onArchive(): Promise<void> {
    const result = await SweetAlert.confirm({
      title: 'Archive Parts Order',
      text: 'Are you sure you want to archive this parts order?',
      confirmButtonText: 'Archive',
      confirmButtonColor: '#6c757d',
    });
    if (!result.value) return;

    try {
      this.isLoading = true;
      await this.api.archive(this.id);
      this.toastrService.success('Parts order archived');
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
    } catch {
      this.toastrService.error('Failed to archive parts order');
    } finally {
      this.isLoading = false;
    }
  }

  data: any;
  details: FormArray;

  onFormReady(form: FormGroup) {
    this.form = form;
    if (this.id) {
      this.getData();
    }
  }

  async getData() {
    if (!this.form || !this.id) {
      return;
    }

    try {
      this.data = await this.api.getById(this.id);

      if (this.data.details) {
        this.data.details = Array.isArray(this.data.details)
          ? this.data.details
          : JSON.parse(this.data.details);

        this.details = this.form.get('details') as FormArray;

        while (this.details.length) {
          this.details.removeAt(0);
        }

        for (let i = 0; i < this.data.details.length; i++) {
          let row = this.data.details[i];

          this.details.push(this.fb.group({
            part_number: new FormControl(row.part_number, Validators.required),
            qty: new FormControl(row.qty, Validators.required),
            billable: new FormControl(row.billable, Validators.required),
            description: new FormControl(row.description, Validators.required),
          }))
        }
      };

      this.form.patchValue(this.data);
      
      this.getAttachments()

    } catch (err) {
      this.toastrService.error('Unable to load parts order data');
    }
  }

  async onSubmit() {
    this.submitted = true;

    if (this.form.value.details.length == 0) {
      alert('You have not items in your cart. Unable to submit request.');
      return;
    };

    if (this.form.invalid) {
      return;
    };

    try {

      this.form.value.details = JSON.stringify(this.form.value.details);

      this.isLoading = true;
      await this.api.update(this.id, this.form.value);
      this.isLoading = false;
      this.toastrService.success('Successfully Updated');
      this.goBack();
    } catch (err) {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.goBack()
  }


  attachments: any = []
  async getAttachments() {
    this.attachments = await this.attachmentsService.find({ field: PARTS_ORDER_ATTACHMENT.FIELD, uniqueId: this.id })
    this.attachments = this.attachments || [];
  }

  async deleteAttachment(id, index) {
    const result = await SweetAlert.confirm({
      title: 'Remove Attachment',
      text: 'Are you sure you want to remove this attachment?',
      confirmButtonText: 'Remove',
      confirmButtonColor: '#dc3545',
    });
    if (!result.value) return;

    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1)
  }

  async openAttachment(attachment: any): Promise<void> {
    await this.openAttachmentInNewTab(attachment);
  }

  async downloadAttachment(attachment: any): Promise<void> {
    await this.openAttachmentInNewTab(attachment);
  }

  async openAttachmentInNewTab(attachment: any, event?: Event): Promise<void> {
    event?.preventDefault();

    try {
      const resolved = await this.attachmentsService.getViewById(attachment?.id);
      const resolvedUrl = resolved?.url || attachment?.link;
      if (!resolvedUrl) {
        this.toastrService.warning('Attachment URL not available');
        return;
      }

      window.open(resolvedUrl, '_blank');
    } catch {
      this.toastrService.warning('Attachment URL not available');
    }
  }

  file: File = null;

  myFiles: File[] = [];

  onAttachmentFilesAdded(files: File[]) {
    if (!files?.length) {
      return;
    }

    this.myFiles = [...this.myFiles, ...files];
  }

  removeFile(index: number) {
    this.myFiles.splice(index, 1);
  }

  async onUploadAttachments() {
    if (this.isLoading || !this.myFiles?.length) {
      return;
    }

    const queuedFiles = [...this.myFiles];
    const failedFiles: File[] = [];

    this.isLoading = true;
    for (let i = 0; i < queuedFiles.length; i++) {
      const formData = new FormData();
      formData.append("file", queuedFiles[i]);
      formData.append("field", PARTS_ORDER_ATTACHMENT.FIELD);
      formData.append("uniqueData", `${this.id}`);
      formData.append("subFolder", PARTS_ORDER_ATTACHMENT.SUB_FOLDER);

      try {
        await this.attachmentsService.uploadfile(formData);
      } catch (err) {
        failedFiles.push(queuedFiles[i]);
      }
    }

    this.myFiles = failedFiles;
    this.isLoading = false;
    await this.getAttachments();
  }


}
