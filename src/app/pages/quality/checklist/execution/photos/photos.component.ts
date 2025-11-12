
import { Component, ElementRef, EventEmitter, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Observable } from 'rxjs';
import { FileUploader, FileUploadModule } from 'ng2-file-upload';
import { ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { first } from 'rxjs/operators';
import moment from 'moment';
import { AuthenticationService } from '@app/core/services/auth.service';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@app/shared/shared.module';
import { QualityPhotoChecklistService } from '@app/core/api/quality-photo-checklist/quality-photo-checklist-service';
import { PhotoChecklistConfigService, ChecklistInstance, ChecklistItem } from '@app/core/api/photo-checklist-config/photo-checklist-config.service';

interface ChecklistDetail {
  fileName: string;
  photoId?: string;
  photo?: string;
  photoInfo?: string;
  checklist?: string; // Changed from boolean to string
  id?: string;
  error?: boolean;
  exampleImage?: string;
  type?: string;
  name?: string;
  submittedDate?: string;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    FileUploadModule,
  ],
  selector: 'app-photos',
  templateUrl: './photos.component.html',
  styleUrls: ['./photos.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PhotosComponent implements OnInit {
  viewIndex = 1;
  beforeIndex = 0;

  @Input() public woNumber;
  @Input() public partNumber;
  @Input() public serialNumber;
  @Input() public typeOfView;

  @ViewChild('myInput')
  myInputVariable: ElementRef;
  currentUserInfo: any;
  loading: boolean;
  loadingIndicator: boolean;
  isChecklistSubmitted: any;
  largeView: boolean = false;
  isReview: boolean = false;

  // New properties for configuration management
  currentInstance: ChecklistInstance | null = null;
  useNewSystem: boolean = true; // Flag to switch between old and new system
  config: {[key: string]: any} = {};

  reset() {
    this.myInputVariable.nativeElement.value = "";
  }

  // In your component class, ensure checkList is typed properly:
  checkList: { 
    details: ChecklistDetail[]; 
    name: string;
    part_number?: string;
    customer_part_number?: string;
    revision?: string;
    original_filename?: string;
    review_date?: string;
    revision_number?: string;
    revision_details?: string;
    revised_by?: string;
  }[] = [];



  // checkList: any = [
  //   {
  //     name: "360 Sign & Wedges",
  //     details: [
  //       {
  //         checklist: "Picture of serial Tag, UL Label, and Main Power Switch (360 & Wedge)",
  //         photo: "",
  //         photoInfo: "",
  //         error: false,
  //         exampleImage: "https://dashboard.eye-fi.com/attachments/qc/qc1.PNG"
  //       },
  //       {
  //         checklist: "Picture of Inside of the Sign - Sending Card Side & Opposite Side (360)",
  //         photo: "",
  //         photoInfo: "",
  //         error: false,
  //         exampleImage: "https://dashboard.eye-fi.com/attachments/qc/qc2.PNG"
  //       }
  //     ]
  //   }

  searchWorkOrder() {
    this.loadingIndicator = true;
    
    // Load configuration first
    this.configService.getConfig().pipe(first()).subscribe(config => {
      this.config = config;
    });

    if (this.useNewSystem) {
      this.searchWorkOrderNew();
    } else {
      this.searchWorkOrderLegacy();
    }
  }

  searchWorkOrderNew() {
    // Try to find existing instance or create new one
    this.configService.readByPartNumber(this.woNumber, this.partNumber, this.serialNumber, this.typeOfView)
      .pipe(first()).subscribe({
        next: (data) => {
          this.loadingIndicator = false;
          
          if (data && data.items) {
            this.currentInstance = data;
            this.convertInstanceToCheckList(data);
            this.beginWhereLeftOff();
          } else {
            alert('No checklist found for this work order.');
            this.dismiss();
          }
        },
        error: () => {
          // Fallback to legacy system
          this.useNewSystem = false;
          this.searchWorkOrderLegacy();
        }
      });
  }

  searchWorkOrderLegacy() {
    this.qualityPhotoChecklistService.readByPartNumber(this.woNumber, this.partNumber, this.serialNumber, this.typeOfView).pipe(first()).subscribe(data => {
      this.loadingIndicator = false;

      if (data.length == 0) {
        alert('No checklist found for this work order.');
        this.dismiss()
      }

      let restructuedDetails = []
      for (let i = 0; i < data.length; i++) {
        let ext = data[i].fileName == null ? 'jpg' : data[i].fileName.split('.').pop();
        restructuedDetails.push({
          id: data[i].id,
          photoId: data[i].photoId,
          name: data[i].name,
          checklist: data[i].checklist,
          photo: data[i].url,
          fileName: data[i].fileName,
          photoInfo: "",
          error: false,
          submittedDate: data[i].submittedDate,
          exampleImage: `https://dashboard.eye-fi.com/attachments/qc/qc-sample-photos/${data[i].partNumber}/${data[i].samplePhoto}`,
          type: ['png', 'jpg', 'jpeg', 'gif'].includes(ext.toLowerCase()) ? 'img' : 'video'
        })
      }

      this.checkList.push({
        name: data[0].name,
        details: restructuedDetails
      })

      this.isChecklistSubmitted = restructuedDetails[0].submittedDate

      this.beginWhereLeftOff()

    }, () => {
      this.loadingIndicator = false;
      this.dismiss();
    });
  }

  convertInstanceToCheckList(instance: ChecklistInstance) {
    const restructuredDetails: ChecklistDetail[] = [];
    
    if (instance.items) {
      for (const item of instance.items) {
        const ext = item.file_name ? item.file_name.split('.').pop() : 'jpg';
        restructuredDetails.push({
          id: item.id.toString(),
          photoId: item.file_name ? item.id.toString() : null,
          name: instance.template_name || 'Checklist',
          checklist: item.title,
          photo: item.file_url || '',
          fileName: item.file_name || null,
          photoInfo: item.description || '',
          error: false,
          submittedDate: instance.submitted_at,
          exampleImage: item.sample_images?.find(img => img.is_primary)?.url || item.sample_images?.[0]?.url || '',
          type: ['png', 'jpg', 'jpeg', 'gif'].includes(ext?.toLowerCase() || '') ? 'img' : 'video'
        });
      }
    }

    this.checkList = [{
      name: instance.template_name || 'Quality Control Checklist',
      details: restructuredDetails
    }];

    this.isChecklistSubmitted = instance.submitted_at;
  }


  beginWhereLeftOff() {
    for (let i = 0; i < this.checkList[0].details.length; i++) {
      if (this.checkList[0].details[i].fileName == null) {

        this.goTo(i)
        break
      }
    }
  }


  getTotal() {
    return this.checkList[0]?.details.length
  }

  uploader: FileUploader;
  logoFileNameFile: any;
  imageUrlOfLogo: any;
  constructor(
    private ngbActiveModal: NgbActiveModal,
    private authenticationService: AuthenticationService,
    private qualityPhotoChecklistService: QualityPhotoChecklistService,
    private configService: PhotoChecklistConfigService,
  ) {
    this.currentUserInfo = authenticationService.currentUserValue;

    this.uploader = new FileUploader({
      url: 'https://dashboard.eye-fi.com/server/Api/QualityPhotoChecklist/save',
      disableMultipart: false,
      formatDataFunctionIsAsync: false,
      authToken: `Bearer ${this.authenticationService.currentUserValue.access_token}`,
      autoUpload: false,
      isHTML5: true,
      method: 'POST',
      queueLimit: 10,
      removeAfterUpload: false
    });


    this.uploader.onBeforeUploadItem = (item) => {
      item.withCredentials = false;
    }
  }

  ngOnInit(): void {
    this.searchWorkOrder()
  }

  change(v) {
    if (v == 'before') {
      this.viewIndex--;
      this.beforeIndex--
    } else if (v == 'first') {
      this.isReview = !this.isReview
      this.viewIndex = 1
      this.beforeIndex = 0
    } else {
      this.viewIndex++
      this.beforeIndex++
    }

  }

  goTo(ii) {
    let f = ii;
    let e = ii++;
    this.viewIndex = ii
    this.beforeIndex = f;


  }

  remove(i) {
    this.loadingIndicator = true;
    let d = this.checkList[0].details[this.getActualIndex];

    let params = {
      id: d.photoId,
      fileName: d.fileName
    }


    this.qualityPhotoChecklistService.removePhoto(params).pipe(first()).subscribe(data => {
      d.photo = ''
      d.photoInfo = '';
      this.loadingIndicator = false;
    }, () => this.loadingIndicator = false);

  }

  review() {
    this.isReview = !this.isReview
  }

  // Photo validation methods for limiting uploads
  get currentPhotoCount(): number {
    if (!this.checkList || !this.checkList[0]) return 0;
    return this.checkList[0].details.filter(detail => detail.photo).length;
  }

  get requiredPhotoCount(): number {
    if (!this.checkList || !this.checkList[0]) return 0;
    return this.checkList[0].details.length;
  }

  hasReachedPhotoLimit(): boolean {
    return this.currentPhotoCount >= this.requiredPhotoCount;
  }

  allPhotosCompleted(): boolean {
    return this.currentPhotoCount === this.requiredPhotoCount;
  }

  getMaxLength() {
    return this.checkList[0]?.details?.length == this.viewIndex
  }

  getMinLength() {
    return this.viewIndex == 1

  }

  get getActualIndex() {
    return this.checkList[0]?.details.map(function (e) { return e.id; }).indexOf(this.checkList[0]?.details[this.viewIndex - 1].id);
  }

  public onFileSelected(file: any, ii) {
    // Check if photo limit has been reached
    if (this.hasReachedPhotoLimit()) {
      alert(`Photo limit reached! You can only upload ${this.requiredPhotoCount} photos maximum.`);
      return;
    }

    this.loadingIndicator = true;
    var item = file.item(0);
    this.logoFileNameFile = file.item(0);
    var reader = new FileReader();

    let detailIndex:any = this.checkList[0].details[this.viewIndex - 1];
    let createdDate = moment().format('YYYY-MM-DD HH:mm:ss');

    reader.onload = (event: any) => {
      this.imageUrlOfLogo = event.target.result;


      detailIndex.photo = event.target.result
      detailIndex.photoInfo = item;


    }


    var formData = new FormData(); // Currently empty

    formData.append("file", item);
    formData.append("woNumber", this.woNumber);
    formData.append("checklist", detailIndex.checklist);
    formData.append("name", detailIndex.name);
    formData.append("createdDate", createdDate);
    formData.append("partNumber", this.partNumber);
    formData.append("serialNumber", this.serialNumber);
    formData.append("createdBy", this.currentUserInfo.id.toString());

    this.qualityPhotoChecklistService.create(formData).pipe(first()).subscribe(data => {
      this.loadingIndicator = false
      this.loading = false;
      reader.readAsDataURL(this.logoFileNameFile as File);
      detailIndex.photoId = data.id;
      detailIndex.fileName = 'https://dashboard.eye-fi.com' + data.fileName;

      if (!this.getMaxLength()) {
        this.change('next')
      } else {
        this.review()
      }


      this.reset()

    }, () => this.loadingIndicator = false);


  }

  checkErrors() {
    let errors = false;
    for (let i = 0; i < this.checkList[0].details.length; i++) {
      this.checkList[0].details[i].error = false;
      if (this.checkList[0].details[i].photo == null) {
        this.checkList[0].details[i].error = true;
        errors = true;
      }
    }

    return errors
  }



  isSubmitted = false
  submit() {

    this.loadingIndicator = true

    this.isSubmitted = true
    let submittedDate = moment().format('YYYY-MM-DD HH:mm:ss')

    if (this.checkErrors()) {
      if (!confirm('Missing photos found. Are you sure you want to continue?')) {
        this.loadingIndicator = false
        return;
      }
    }

    let params = {
      woNumber: this.woNumber,
      partNumber: this.partNumber,
      serialNumber: this.serialNumber,
      submitedBy: this.currentUserInfo.id,
      submittedDate: submittedDate
    }
    this.qualityPhotoChecklistService.submit(params).pipe(first()).subscribe(data => {
      this.loadingIndicator = false;
      alert('success!!')
      this.ngbActiveModal.close(this.checkList);
    }, () => this.loadingIndicator = false);

  }

  dismiss() {
    this.ngbActiveModal.dismiss('dismiss');
  }

  close() {
    this.ngbActiveModal.close();
  }

}
