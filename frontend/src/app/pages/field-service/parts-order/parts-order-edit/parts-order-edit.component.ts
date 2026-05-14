import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '@app/shared/shared.module';
import { PartsOrderFormComponent } from '../parts-order-form/parts-order-form-component';
import { PartsOrderService } from '@app/core/api/field-service/parts-order/parts-order.service';
import { NAVIGATION_ROUTE } from '../parts-order-constant';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FileViewerModalComponent } from '@app/shared/components/file-viewer-modal/file-viewer-modal.component';
import { AuthenticationService } from '@app/core/services/auth.service';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

@Component({
  standalone: true,
  imports: [SharedModule, PartsOrderFormComponent],
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
    private modalService: NgbModal,
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


  images
  attachments: any = []
  async getAttachments() {
    this.images = []
    this.attachments = await this.attachmentsService.find({ field: 'FS Parts Order', uniqueId: this.id })

    for (let i = 0; i < this.attachments.length; i++) {
      let row = this.attachments[i]
      const src = this.getAttachmentUrl(row);
      const caption = 'Image ' + i + '- ' + row.createdDate;
      const thumb = src;
      const item = {
        src: src,
        caption: caption,
        thumb: thumb
      };
      this.images.push(item);
    }

  }


  open(index: number): void {
    const items = (this.attachments || []).map((attachment) => ({
      id: attachment?.id,
      url: this.getAttachmentUrl(attachment),
      fileName: attachment?.fileName || 'Attachment',
    }));

    if (!items[index]?.url && !items[index]?.id) {
      this.toastrService.warning('Attachment URL not available');
      return;
    }

    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: 'xl',
      centered: true,
      scrollable: true,
    });

    modalRef.componentInstance.url = items[index].url;
    modalRef.componentInstance.fileName = items[index].fileName;
    modalRef.componentInstance.items = items;
    modalRef.componentInstance.initialIndex = index;
    modalRef.componentInstance.enableNavigation = true;
    modalRef.componentInstance.resolveById = async (id: string | number) => {
      try {
        const resolved = await this.attachmentsService.getViewById(Number(id));
        return {
          url: this.normalizeAttachmentUrl(resolved?.url || ''),
          fileName: resolved?.fileName,
        };
      } catch (error) {
        return null;
      }
    };
  }

  async openAttachmentInNewTab(attachment: any, event?: Event): Promise<void> {
    event?.preventDefault();

    const resolvedUrl = await this.resolveAttachmentUrl(attachment);
    if (!resolvedUrl) {
      this.toastrService.warning('Attachment URL not available');
      return;
    }

    window.open(resolvedUrl, '_blank');
  }

  private getAttachmentUrl(attachment: any): string {
    const link = this.normalizeAttachmentUrl(String(attachment?.link || '').trim());
    if (link) {
      return link;
    }

    const fileName = attachment?.fileName || '';
    if (!fileName) {
      return '';
    }

    return this.getLegacyAttachmentUrl(fileName);
  }

  private getLegacyAttachmentUrl(fileName: string): string {
    return `https://dashboard.eye-fi.com/attachments/fieldService/${encodeURIComponent(fileName)}`;
  }

  private normalizeAttachmentUrl(rawUrl: string): string {
    if (!rawUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(rawUrl)) {
      return rawUrl;
    }

    if (rawUrl.startsWith('/attachments/')) {
      return `https://dashboard.eye-fi.com${rawUrl}`;
    }

    if (rawUrl.startsWith('/')) {
      return `${window.location.origin}${rawUrl}`;
    }

    return rawUrl;
  }

  private async resolveAttachmentUrl(attachment: any): Promise<string> {
    try {
      const resolved = await this.attachmentsService.getViewById(attachment?.id);
      const resolvedUrl = this.normalizeAttachmentUrl(resolved?.url || '');
      if (resolvedUrl) {
        return resolvedUrl;
      }
    } catch (error) {
    }

    return this.getAttachmentUrl(attachment);
  }

  async deleteAttachment(id, index) {
    if (!confirm('Are you sure you want to remove attachment?')) return
    await this.attachmentsService.delete(id);
    this.attachments.splice(index, 1)
  }

  file: File = null;

  myFiles: File[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
    }
  }

  async onUploadAttachments() {
    if (this.myFiles?.length) {
      let totalAttachments = 0;
      this.isLoading = true;
      for (var i = 0; i < this.myFiles.length; i++) {
        const formData = new FormData();
        formData.append("file", this.myFiles[i]);
        formData.append("field", "FS Parts Order");
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", 'fieldService');
        try {
          await this.attachmentsService.uploadfile(formData);
          totalAttachments++
        } catch (err) {
        }
      }
      this.isLoading = false;
      await this.getAttachments()
    }
  }


}
