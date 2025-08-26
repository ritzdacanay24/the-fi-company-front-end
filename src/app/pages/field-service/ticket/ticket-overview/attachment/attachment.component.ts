import { Component, Input, OnInit, SimpleChanges, TemplateRef } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { AttachmentService } from '@app/core/api/field-service/attachment.service'
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import moment from 'moment'
import imageCompression from 'browser-image-compression';
import { LazyLoadImageModule } from 'ng-lazyload-image'
import { AuthenticationService } from '@app/core/services/auth.service'
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service'
import { SharedModule } from '@app/shared/shared.module'

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
  @Input() public disabled: boolean = true;
  tripExpenseTotal = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['workOrderId']) {
      this.workOrderId = changes['workOrderId'].currentValue
      this.getData();
    }
  }

  constructor(
    public api: AttachmentService,
    private offcanvasService: NgbOffcanvas,
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
      this.loading = false;
    } catch (err) {
      this.loading = false;
    }
  }

  closeResult = "";
  openBottom(content: TemplateRef<any>) {
    this.offcanvasService.open(content, { ariaLabelledBy: 'offcanvas-basic-title', position: 'end' }).result.then(
      (result) => {
        this.getData()
      },
      (reason) => { },
    );
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
      this.offcanvasService?.dismiss();
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

}
