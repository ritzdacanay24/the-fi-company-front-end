import { Component, Input, OnInit, SimpleChanges } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { AttachmentService } from '@app/core/api/field-service/attachment.service'
import moment from 'moment'
import imageCompression from 'browser-image-compression';
import { LazyLoadImageModule } from 'ng-lazyload-image'
import { AuthenticationService } from '@app/core/services/auth.service'
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service'
import { SharedModule } from '@app/shared/shared.module'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { FileViewerModalComponent } from '@app/shared/components/file-viewer-modal/file-viewer-modal.component'

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    LazyLoadImageModule
  ],
  selector: 'app-attachment',
  templateUrl: `./attachment.component.html`,
})
export class AttachmentComponent implements OnInit {
  @Input() public data: any = [];
  @Input() public workOrderId: number | string;
  @Input() public disabled: boolean = false;
  tripExpenseTotal = 0;
  private viewerItems: Array<{ id: any; url: string; fileName: string }> = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['workOrderId']) {
      this.workOrderId = changes['workOrderId'].currentValue
      this.getData();
    }
  }

  constructor(
    public api: AttachmentService,
    private modalService: NgbModal,
    private authenticationService: AuthenticationService
  ) {
  }

  ngOnInit(): void {
  }

  loading = false
  async getData() {
    this.data = [];
    try {
      this.loading = true;
      this.data = await this.api.getByWorkOrderId(this.workOrderId);
      this.rebuildViewerItems();
      this.loading = false;
    } catch (err) {
      this.loading = false;
    }
  }

  openMedia(row: any): void {
    if (this.disabled) {
      return;
    }

    const currentLink = String(row?.link || '').trim();
    if (!currentLink) {
      return;
    }

    const viewerItems = this.viewerItems.length
      ? this.viewerItems
      : this.buildViewerItems(this.data || []);

    const initialIndex = Math.max(
      0,
      viewerItems.findIndex((item: any) => String(item.url || '').trim() === currentLink),
    );

    const modalRef = this.modalService.open(FileViewerModalComponent, {
      size: 'xl',
      centered: true,
      backdrop: true,
      keyboard: true,
      animation: false,
    });

    modalRef.componentInstance.items = viewerItems;
    modalRef.componentInstance.initialIndex = initialIndex;
    modalRef.componentInstance.enableNavigation = true;
    modalRef.componentInstance.url = viewerItems[initialIndex]?.url || currentLink;
    modalRef.componentInstance.fileName = viewerItems[initialIndex]?.fileName || 'Attachment';
  }

  async onChange(event) {

    let file = event.target.files[0];

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 500,
      useWebWorker: true,
      alwaysKeepResolution: true
    }

    let compressedFile
    try {
      compressedFile = await imageCompression(file, options);

    } catch (error) {
      compressedFile = event.target.files[0];
    }

    let formData = new FormData();

    formData.append("file", compressedFile, compressedFile.name);
    formData.append("fileName", compressedFile.name);

    let params = {
      field: 'Field Service',
      uniqueId: this.workOrderId,
      createdBy: this.authenticationService.currentUserValue.id,
      createdDate: moment().format('YYYY-MM-DD HH:mm:ss')
    }

    Object.keys(params).map((key) => {
      formData.append(key, params[key]);
    });

    formData.append('subFolder', 'fieldService');

    try {
      SweetAlert.loading();
      await this.api.create(formData)
      await this.getData();
      SweetAlert.close();
    } catch (err) {
      SweetAlert.close(0);
    }

  }

  async deleteAttachment(row) {

    const { value: accept } = await SweetAlert.confirm();

    if (!accept) return;

    try {
      SweetAlert.loading('Deleting. Please wait.')
      await this.api.deleteById(row.id)
      await this.getData();
      SweetAlert.close()
    } catch (err) {
      SweetAlert.close(0)
    }
  }

  // Helper methods for sidebar functionality
  getAvailableFiles(): number {
    return this.data?.filter(file => file.link).length || 0;
  }

  getRecentFiles(): any[] {
    return this.data?.slice(-5).reverse() || [];
  }

  downloadAll(): void {
    // Implement download all functionality
    const availableFiles = this.data?.filter(file => file.link) || [];
    availableFiles.forEach(file => {
      if (file.link) {
        window.open(file.link, '_blank');
      }
    });
  }

  deleteAll(): void {
    if (!confirm('Are you sure you want to delete all attachments? This action cannot be undone.')) {
      return;
    }
    // Implement delete all functionality
    // this.api.deleteAllByWorkOrderId(this.workOrderId);
  }

  private rebuildViewerItems(): void {
    this.viewerItems = this.buildViewerItems(this.data || []);
  }

  private buildViewerItems(source: any[]): Array<{ id: any; url: string; fileName: string }> {
    return source
      .filter((item: any) => String(item?.link || '').trim())
      .map((item: any) => ({
        id: item?.id,
        url: String(item?.link || '').trim(),
        fileName: String(item?.fileName || 'Attachment').trim(),
      }));
  }

}
