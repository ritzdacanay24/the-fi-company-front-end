import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TripExpenseService } from '@app/core/api/field-service/trip-expense.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import moment from 'moment';
import imageCompression from 'browser-image-compression';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ExpenseReceiptPrediction } from '@app/core/api/mindee/mindee-interfaces';

import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { byteConverter } from 'src/assets/js/util/byteConverter';
import { AuthenticationService } from '@app/core/services/auth.service';
import { JobSearchComponent } from '@app/shared/components/job-search/job-search.component';
import { JobService } from '@app/core/api/field-service/job.service';
import { Observable, Subject, concat, of, filter, debounceTime, distinctUntilChanged, tap, switchMap, catchError } from 'rxjs';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgSelectModule,
    LazyLoadImageModule,
    JobSearchComponent
  ],
  selector: 'app-receipt-add-edit',
  templateUrl: './receipt-add-edit.component.html'
})
export class ReceiptAddEditComponent implements OnInit {

  @Input() public id: any;
  @Input() public fsId: any;
  @Input() public workOrderId: any;
  @Input() public typeOfClick: any = 'Front';

  selectedDate: any;
  selectedDateView: any;
  url: string | ArrayBuffer;
  isLoading: boolean;
  fileToUpload_;

  receiptOptions = [
    "Airfare",
    "Bag Fees",
    "Rental Car",
    "Hotel",
    "Gas",
    "Parking/Taxi",
    "Per Diem",
    "Equipment Rental",
    "Supplies"
  ]

  form: any = this.fb.group<any>({
    name: null,
    cost: null,
    workOrderId: null,
    created_date: null,
    vendor_name: null,
    fileName: null,
    locale: null,
    date: null,
    time: null,
    created_by: null,
    fs_scheduler_id: null,
    jobs: null,
    fromId: null,
    copiedFromTicketId: null, // Add this field to track copied receipts
  })

  jobsToView = []
  onMaterialGroupChange(event) {
    this.jobsToView = event;

  }


  notifyParent($event) {
    // for (let i = 0; i < $event.length; i++) {

    //   this.form.patchValue({
    //     jobs: $event[i].id
    //   })
    // }
  }

  link: any;

  constructor(
    private fb: FormBuilder,
    private ngbActiveModal: NgbActiveModal,
    private api: TripExpenseService,
    public schedulerService: SchedulerService,
    public authenticationService: AuthenticationService,
    private jobService: JobService
  ) {
    this.getList();
  }

  async getData() {
    let data: any = await this.api.getById(this.id);
    if (data && data.jobs) {
      let test = []
      data.jobs = String(data.jobs)?.split(',')
      for (let i = 0; i < data.jobs.length; i++) {
        test.push({ id: data.jobs[i] })
      }
      data.jobs = test
    }

    this.form.patchValue(data)
    this.link = data.link;

    this.form.get('jobs').disable()
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [null, Validators.required],
      cost: [null, Validators.required],
      workOrderId: null,
      created_date: null,
      vendor_name: [null],
      fileName: null,
      locale: [null],
      date: [null, Validators.required],
      time: [null, Validators.required],
      created_by: null,
      fs_scheduler_id: null,
      jobs: [[]],
      copiedFromTicketId: [null], // Add this field to track copied receipts
    });

    if (this.id) {
      this.getData();
    } else {
      this.form.patchValue({ fs_scheduler_id: this.fsId, workOrderId: this.workOrderId, created_by: this.authenticationService.currentUserValue.id });

      if (this.typeOfClick == 'Front') {
        let e = (<HTMLInputElement>document.getElementById("front"))
        e.click();
      } else if (this.typeOfClick == 'Folder') {
        let e = (<HTMLInputElement>document.getElementById("folder"))
        e.click();
      }
    }
  }

  dismiss() {
    this.ngbActiveModal.dismiss()
  }

  onChange(e) {
    if (!e._value) return
    this.selectedDateView = moment(e._value).format('LL')
  }

  get getForm() {
    return this.form['controls']
  }


  async deleteTripExpense() {

    const { value: accept } = await SweetAlert.confirm();

    if (!accept) return;

    try {
      SweetAlert.loading('Deleting. Please wait');
      await this.api.deleteById(this.id)
      this.ngbActiveModal.close()
      SweetAlert.close();
    } catch (err) {
      SweetAlert.close(0);
    }

  }

  setValue(key, value) {
    this.form
      .get(key)
      .setValue(value, { emitEvent: false })
  }

  removeImage() {
    this.setValue('fileName', null)
    this.link = null
  }

  autoExtract = true;
  originalFileSize = "";
  sizeOfFile = "";

  predictInfo

  receiptMessage = "";

  async handleFileInput(files) {
    this.receiptMessage = "";
    this.predictInfo = "";

    const imageFile = files[0];


    if (imageFile === undefined || !imageFile) {
      SweetAlert.close();
      return;
    }


    SweetAlert.loading('Please wait.. Extracting data from receipt.');

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 700,
      useWebWorker: true,
      alwaysKeepResolution: true
    }

    let compressedFile
    try {
      compressedFile = await imageCompression(imageFile, options);

    } catch (error) {
      compressedFile = files[0];
    }

    let data = new FormData();
    data.append('document', compressedFile, compressedFile.name);

    this.originalFileSize = byteConverter(imageFile.size, true, 0)
    this.sizeOfFile = byteConverter(compressedFile.size, true, 0)

    try {
      if (this.autoExtract) {
        // Use the new Mindee service for better error handling and type safety
        const mindeeResponse = await this.api.parseExpenseReceipt(compressedFile, {
          raw_text: false,
          polygon: true,
          confidence: false
        });
        
        console.log('Mindee response structure:', mindeeResponse);
        
        // Handle the response structure - could be inference directly or wrapped
        const inferenceData = (mindeeResponse as any).inference || mindeeResponse;
        const prediction = inferenceData.result.fields;
        this.predictInfo = inferenceData;

        // Extract data with confidence checking
        const extractedData = this.extractReceiptData(prediction, compressedFile.name);
        console.log('Extracted data:', extractedData);
        console.log('Time from prediction:', prediction.time);
        this.form.patchValue(extractedData);
        console.log('Form values after patch:', this.form.value);

        // Show confidence warnings if needed
        this.showConfidenceWarnings(prediction);

        SweetAlert.close();
      }
    } catch (err) {
      console.error('Mindee API Error:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Unable to extract the data from the receipt but you can still enter the information manually.';
      
      if (err instanceof Error) {
        if (err.message.includes('API key')) {
          errorMessage = 'Receipt extraction service unavailable. Please enter information manually.';
        } else if (err.message.includes('File size')) {
          errorMessage = 'Receipt file is too large. Please use a smaller image or enter information manually.';
        } else if (err.message.includes('file type')) {
          errorMessage = 'Unsupported file type. Please use JPG, PNG, or PDF files, or enter information manually.';
        }
      }
      
      this.receiptMessage = errorMessage;
      SweetAlert.close(0);
    } finally {

      var reader = new FileReader();

      reader.readAsDataURL(compressedFile); // read file as data url

      reader.onload = (event) => { // called once readAsDataURL is completed
        this.url = event.target.result;
      }
      this.fileToUpload_ = compressedFile;

    }
  }

  async create() {

    if (this.form.value.date && this.form.value.time) {
    } else {
      alert('Date and time is now required')
      return
    }


    let formData = new FormData();


    if (this.fileToUpload_) {
      formData.append("file", this.fileToUpload_, this.fileToUpload_.name);
      formData.append("fileName", this.fileToUpload_.name);
    }

    this.form.value.created_date = moment().format('YYYY-MM-DD HH:mm:ss')

    let e = []
    if (this.form.value.jobs) {
      for (let i = 0; i < this.form.value.jobs?.length; i++) {
        e.push(this.form.value.jobs[i].id)
      }
    }

    Object.keys(this.form.value).map((key) => {
      if(key == 'jobs'){
        formData.append(key, e?.toString());
      } else{
        formData.append(key, this.form.value[key]);
      }
    });

    try {
      SweetAlert.loading();

      let { insertId }: any = await this.api.create(formData)


      let errors = []
      if (this.form.value.jobs) {
        let d = this.form.value.jobs;
        for (let i = 0; i < d?.length; i++) {
          formData.append('jobs', e?.toString());
          formData.append('fs_scheduler_id', d[i].id);
          formData.append('fromId', insertId || null);
          formData.append('workOrderId', d[i].workOrderId || null);
          if (d[i].workOrderId) {
            await this.api.create(formData)
          } else {
            errors.push({ message: "Could not upload receipt to " + d[i].id })
          }
        }
      }

      if (errors.length) {
        alert(JSON.stringify(errors));
      }


      SweetAlert.close();
      this.ngbActiveModal.close()
    } catch (err) {
      SweetAlert.close(0);
    }

  }

  async update() {
    if (this.form.value.date && this.form.value.time) {
    } else {
      alert('Date and time is now required')
      return
    }

    let formData = new FormData();

    if (this.fileToUpload_) {
      formData.append("file", this.fileToUpload_, this.fileToUpload_.name);
      formData.append("fileName", this.fileToUpload_.name);
    }

    Object.keys(this.form.value).map((key) => {
      formData.append(key, this.form.value[key]);
    });

    try {
      SweetAlert.loading();
      await this.api.updateById(this.id, formData)
      SweetAlert.close();
      this.ngbActiveModal.close()
    } catch (err) {
      SweetAlert.close(0);
    }
  }

  onSubmit() {
    if (this.id) {
      this.update()
    } else {
      this.create()
    }
  }


  data$: Observable<any[]>;
  dataLoading = false;
  dataInput$ = new Subject<string>();


  private getList() {
    this.data$ = concat(
      of([]), // default items
      this.dataInput$.pipe(
        filter((term) => term != null),
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => {
          this.dataLoading = true;
        }),
        switchMap((term) =>
          this.jobService.searchByJob(term).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => {
              this.dataLoading = false;
            })
          )
        )
      )
    );
  }

  /**
   * Extract receipt data from Mindee V2 API prediction with proper typing
   */
  private extractReceiptData(prediction: any, fileName: string): any {
    return {
      cost: prediction.total_amount?.value || '',
      vendor_name: prediction.supplier_name?.value || '',
      date: prediction.date?.value || '',
      locale: this.formatLocale(prediction.locale),
      time: this.convertTimeTo24Hour(prediction.time?.value) || '',
      name: prediction.purchase_subcategory?.value || prediction.purchase_category?.value || '',
      fileName: fileName,
    };
  }

  /**
   * Convert time from 12-hour format (1:50:44 PM) to 24-hour format (13:50:44)
   */
  private convertTimeTo24Hour(timeStr: string): string {
    if (!timeStr) return '';
    
    try {
      // Handle formats like "1:50:44 PM" or "1:50 PM"
      const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
      if (!match) return timeStr; // Return as-is if format doesn't match
      
      let [, hours, minutes, seconds = '00', period] = match;
      let hour24 = parseInt(hours, 10);
      
      if (period.toUpperCase() === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      return `${hour24.toString().padStart(2, '0')}:${minutes}:${seconds}`;
    } catch (error) {
      console.warn('Failed to convert time format:', timeStr, error);
      return timeStr;
    }
  }

  /**
   * Format locale information for display (V2 API structure)
   */
  private formatLocale(locale: any): string {
    if (!locale) return '';
    
    if (typeof locale === 'object' && locale.fields) {
      // V2 API has nested fields structure
      const parts = [];
      if (locale.fields.currency?.value) parts.push(locale.fields.currency.value);
      if (locale.fields.country?.value) parts.push(locale.fields.country.value);
      return parts.join(' - ');
    } else if (typeof locale === 'object') {
      // Fallback for other structures
      const parts = [];
      if (locale.currency) parts.push(locale.currency);
      if (locale.country) parts.push(locale.country);
      return parts.join(' - ');
    }
    
    return String(locale);
  }

  /**
   * Show warnings for low confidence predictions (V2 API)
   */
  private showConfidenceWarnings(prediction: any): void {
    const lowConfidenceFields: string[] = [];
    const confidenceThreshold = 0.7;

    // Check confidence levels for important fields (V2 field names)
    const fieldsToCheck = ['total_amount', 'supplier_name', 'date', 'purchase_category'];
    
    fieldsToCheck.forEach(field => {
      const fieldValue = prediction[field];
      if (fieldValue?.confidence && fieldValue.confidence < confidenceThreshold) {
        lowConfidenceFields.push(field.replace('_', ' '));
      }
    });

    if (lowConfidenceFields.length > 0) {
      const warningMessage = `Low confidence detected for: ${lowConfidenceFields.join(', ')}. Please verify the extracted data.`;
      this.receiptMessage = warningMessage;
      console.warn('Low confidence fields:', lowConfidenceFields);
    }
  }
}
