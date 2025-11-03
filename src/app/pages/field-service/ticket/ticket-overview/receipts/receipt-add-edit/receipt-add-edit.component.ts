import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TripExpenseService } from '@app/core/api/field-service/trip-expense.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import moment from 'moment';
import imageCompression from 'browser-image-compression';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { ExpenseReceiptPrediction } from '@app/core/api/mindee/mindee-interfaces';
import { trigger, state, style, transition, animate } from '@angular/animations';

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
  templateUrl: './receipt-add-edit.component.html',
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: 0, overflow: 'hidden' }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('200ms ease-in', style({ height: '0', opacity: 0 }))
      ])
    ])
  ]
})
export class ReceiptAddEditComponent implements OnInit {

  @Input() public id: any;
  @Input() public fsId: any;
  @Input() public workOrderId: any;
  @Input() public typeOfClick: any = 'Front';
  @Input() public loadDraftOnInit?: string; // Draft name to load on initialization

  selectedDate: any;
  selectedDateView: any;
  url: string | ArrayBuffer;
  isLoading: boolean;
  fileToUpload_;

  // Batch upload mode
  batchMode = false;
  batchReceipts: Array<{
    id: string;
    file: File;
    url: string;
    form: any;
    predictInfo: any;
    isProcessing: boolean;
    isExpanded: boolean;
    error?: string;
  }> = [];
  batchProcessingProgress = { current: 0, total: 0 };
  private DRAFT_STORAGE_KEY = 'receipt_batch_drafts_'; // Changed to plural
  currentDraftName = ''; // Track current draft name
  availableDrafts: Array<{ name: string; timestamp: string; count: number }> = [];

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
    
    // If draft name provided, load it immediately (skip draft picker modal)
    if (this.loadDraftOnInit) {
      this.loadAvailableDrafts(); // Load available drafts but don't show picker
      this.loadDraft(this.loadDraftOnInit);
      return; // Skip normal initialization
    }

    // Check for saved draft on load (will show picker if drafts exist)
    this.loadAvailableDrafts();

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
    // Handle batch mode
    if (this.batchMode && files.length > 0) {
      await this.handleBatchUpload(files);
      return;
    }

    // Single upload mode (existing logic)
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

  /**
   * Handle batch upload of multiple receipts
   */
  async handleBatchUpload(files: FileList) {
    const fileArray = Array.from(files);
    
    this.batchProcessingProgress = {
      current: 0,
      total: fileArray.length
    };

    SweetAlert.loading(`Processing ${fileArray.length} receipt(s)... (0/${fileArray.length})`);

    for (const file of fileArray) {
      const receiptId = `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a form for this receipt
      const receiptForm = this.fb.group({
        name: [null, Validators.required],
        cost: [null, Validators.required],
        workOrderId: [this.workOrderId],
        created_date: [null],
        vendor_name: [null],
        fileName: [file.name],
        locale: [null],
        date: [null, Validators.required],
        time: [null, Validators.required],
        created_by: [this.authenticationService.currentUserValue.id],
        fs_scheduler_id: [this.fsId],
        jobs: [[]],
        copiedFromTicketId: [null],
      });

      const receipt = {
        id: receiptId,
        file: file,
        url: '',
        form: receiptForm,
        predictInfo: null,
        isProcessing: true,
        isExpanded: false,
        error: null
      };

      this.batchReceipts.push(receipt);

      // Process the receipt
      await this.processBatchReceipt(receipt);
      
      this.batchProcessingProgress.current++;
      SweetAlert.loading(`Processing ${fileArray.length} receipt(s)... (${this.batchProcessingProgress.current}/${this.batchProcessingProgress.total})`);
    }

    SweetAlert.close();
    
    // Expand first receipt for review
    if (this.batchReceipts.length > 0) {
      this.batchReceipts[0].isExpanded = true;
    }
  }

  /**
   * Process a single receipt in batch mode
   */
  async processBatchReceipt(receipt: any) {
    try {
      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 700,
        useWebWorker: true,
        alwaysKeepResolution: true
      };

      let compressedFile;
      try {
        compressedFile = await imageCompression(receipt.file, options);
      } catch (error) {
        compressedFile = receipt.file;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      await new Promise((resolve) => {
        reader.onload = (event) => {
          receipt.url = event.target.result;
          resolve(true);
        };
      });

      // Extract data with Mindee if auto-extract is enabled
      if (this.autoExtract) {
        try {
          const mindeeResponse = await this.api.parseExpenseReceipt(compressedFile, {
            raw_text: false,
            polygon: true,
            confidence: false
          });

          const inferenceData = (mindeeResponse as any).inference || mindeeResponse;
          const prediction = inferenceData.result.fields;
          receipt.predictInfo = inferenceData;

          // Extract and populate form data
          const extractedData = this.extractReceiptData(prediction, compressedFile.name);
          receipt.form.patchValue(extractedData);

        } catch (err) {
          console.error('Mindee extraction failed for receipt:', receipt.id, err);
          receipt.error = 'Auto-extraction failed. Please enter data manually.';
        }
      }

      // Store the compressed file for upload
      receipt.file = compressedFile;
      receipt.isProcessing = false;

      // Auto-save draft after each receipt is processed (if draft name exists)
      this.autoSaveDraft();

    } catch (error) {
      console.error('Error processing batch receipt:', error);
      receipt.error = 'Failed to process receipt. Please try again.';
      receipt.isProcessing = false;
    }
  }

  /**
   * Toggle batch receipt expansion
   */
  toggleBatchReceipt(index: number) {
    this.batchReceipts[index].isExpanded = !this.batchReceipts[index].isExpanded;
  }

  /**
   * Collapse all batch receipts
   */
  collapseAllReceipts() {
    this.batchReceipts.forEach(r => r.isExpanded = false);
  }

  /**
   * Remove a receipt from batch
   */
  removeBatchReceipt(index: number) {
    this.batchReceipts.splice(index, 1);
  }

  /**
   * Submit all batch receipts
   */
  async submitBatchReceipts() {
    // Validate all forms
    const invalidReceipts = this.batchReceipts.filter(r => !r.form.valid);
    
    if (invalidReceipts.length > 0) {
      alert('Please fill in all required fields for all receipts');
      // Expand first invalid receipt
      const firstInvalidIndex = this.batchReceipts.findIndex(r => !r.form.valid);
      if (firstInvalidIndex >= 0) {
        this.batchReceipts[firstInvalidIndex].isExpanded = true;
      }
      return;
    }

    const { value: accept } = await SweetAlert.confirm({
      title: 'Submit All Receipts?',
      text: `You are about to submit ${this.batchReceipts.length} receipt(s). Continue?`,
      confirmButtonText: 'Yes, submit all'
    });

    if (!accept) return;

    SweetAlert.loading(`Uploading receipts... (0/${this.batchReceipts.length})`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < this.batchReceipts.length; i++) {
      const receipt = this.batchReceipts[i];
      
      try {
        const formData = new FormData();
        formData.append("file", receipt.file, receipt.file.name);
        formData.append("fileName", receipt.file.name);
        
        receipt.form.value.created_date = moment().format('YYYY-MM-DD HH:mm:ss');

        Object.keys(receipt.form.value).forEach((key) => {
          if (key === 'jobs') {
            const jobIds = receipt.form.value.jobs?.map(j => j.id) || [];
            formData.append(key, jobIds.toString());
          } else {
            formData.append(key, receipt.form.value[key]);
          }
        });

        await this.api.create(formData);
        successCount++;
        
        SweetAlert.loading(`Uploading receipts... (${i + 1}/${this.batchReceipts.length})`);
      } catch (error) {
        errorCount++;
        errors.push({ receipt: i + 1, error: error.message || 'Unknown error' });
      }
    }

    SweetAlert.close();

    if (errorCount === 0) {
      // Clear only the current draft, not all drafts
      if (this.currentDraftName) {
        this.deleteSingleDraft(this.currentDraftName);
      }
      await SweetAlert.confirm({ title: 'Success!', text: `Successfully uploaded ${successCount} receipt(s)!`, icon: 'success' });
      this.ngbActiveModal.close();
    } else {
      await SweetAlert.confirm({ title: 'Partial Success', text: `Uploaded ${successCount} receipt(s), but ${errorCount} failed. Check console for details.`, icon: 'warning' });
      console.error('Batch upload errors:', errors);
    }
  }

  /**
   * Toggle between single and batch mode
   */
  toggleBatchMode() {
    // Note: batchMode is already toggled by ngModel binding, no need to toggle again
    
    if (!this.batchMode) {
      // Clear batch data when switching back to single mode
      this.batchReceipts = [];
      this.batchProcessingProgress = { current: 0, total: 0 };
      this.currentDraftName = '';
    } else {
      // Load available drafts when entering batch mode
      this.loadAvailableDrafts();
    }
  }

  /**
   * Save batch receipts draft to localStorage with a name
   */
  async saveDraft(draftName?: string) {
    if (!this.batchMode || this.batchReceipts.length === 0) {
      return;
    }

    // Prompt for draft name if not provided
    if (!draftName) {
      const result = await SweetAlert.fire({
        title: 'Save Draft',
        text: 'Enter a name for this draft:',
        input: 'text',
        inputPlaceholder: 'e.g., Morning Receipts, Gas Receipts',
        inputValue: this.currentDraftName || `Draft ${new Date().toLocaleString()}`,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel'
      });
      
      if (result.isConfirmed && result.value) {
        this.saveDraftWithName(result.value);
      }
      return;
    }

    this.saveDraftWithName(draftName);
  }

  /**
   * Save draft with specified name
   */
  private async saveDraftWithName(draftName: string) {
    const draftKey = this.getDraftKey();
    const currentUser = this.authenticationService.currentUserValue;
    
    // Convert files to base64 for storage
    const receiptsWithBase64 = await Promise.all(
      this.batchReceipts.map(async (r) => {
        const base64 = await this.fileToBase64(r.file);
        return {
          id: r.id,
          fileName: r.file.name,
          fileSize: r.file.size,
          fileType: r.file.type,
          fileBase64: base64, // Store as base64 instead of blob URL
          formValue: r.form.value,
          predictInfo: r.predictInfo,
          error: r.error,
          isExpanded: r.isExpanded
        };
      })
    );
    
    const draft = {
      name: draftName,
      timestamp: new Date().toISOString(),
      fsId: this.fsId,
      workOrderId: this.workOrderId,
      createdBy: {
        id: currentUser.id,
        name: currentUser.full_name || currentUser.username,
        username: currentUser.username
      },
      receipts: receiptsWithBase64
    };

    try {
      // Get existing drafts
      const existingDraftsJson = localStorage.getItem(draftKey);
      const existingDrafts = existingDraftsJson ? JSON.parse(existingDraftsJson) : {};
      
      // Add or update this draft
      existingDrafts[draftName] = draft;
      
      localStorage.setItem(draftKey, JSON.stringify(existingDrafts));
      this.currentDraftName = draftName;
      this.loadAvailableDrafts();
      
      SweetAlert.confirm({
        title: 'Draft Saved!',
        text: `"${draftName}" saved with ${draft.receipts.length} receipt(s)`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
      console.log('✅ Draft saved:', draftName, draft.receipts.length, 'receipts');
    } catch (error) {
      console.error('❌ Failed to save draft:', error);
      SweetAlert.confirm({
        title: 'Error',
        text: 'Failed to save draft. Storage might be full.',
        icon: 'error'
      });
    }
  }

  /**
   * Convert File to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Load available drafts for this ticket
   */
  loadAvailableDrafts() {
    const draftKey = this.getDraftKey();
    const draftsJson = localStorage.getItem(draftKey);
    
    if (!draftsJson) {
      this.availableDrafts = [];
      return;
    }

    try {
      const drafts = JSON.parse(draftsJson);
      this.availableDrafts = Object.keys(drafts).map(name => ({
        name: name,
        timestamp: drafts[name].timestamp,
        count: drafts[name].receipts.length,
        createdBy: drafts[name].createdBy
      })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Auto-show draft picker if drafts exist and batch mode just enabled (unless we're explicitly loading a specific draft)
      if (this.availableDrafts.length > 0 && this.batchMode && this.batchReceipts.length === 0 && !this.loadDraftOnInit) {
        this.showDraftPicker();
      }
    } catch (error) {
      console.error('❌ Failed to load drafts:', error);
      this.availableDrafts = [];
    }
  }

  /**
   * Show draft picker modal
   */
  async showDraftPicker() {
    if (this.availableDrafts.length === 0) {
      return;
    }

    const draftOptions = this.availableDrafts.map(d => 
      `<div class="form-check p-3 border rounded mb-2">
        <input class="form-check-input" type="radio" name="draftSelection" id="draft_${d.name}" value="${d.name}">
        <label class="form-check-label w-100" for="draft_${d.name}">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="fw-bold">${d.name}</div>
              <small class="text-muted">${new Date(d.timestamp).toLocaleString()}</small>
            </div>
            <span class="badge bg-primary">${d.count} receipt${d.count !== 1 ? 's' : ''}</span>
          </div>
        </label>
      </div>`
    ).join('');

    const result = await SweetAlert.fire({
      title: 'Load Saved Draft?',
      html: `
        <div class="text-start">
          <p class="mb-3">Found ${this.availableDrafts.length} saved draft(s). Select one to restore:</p>
          ${draftOptions}
          <div class="form-check p-3 border rounded border-danger mb-2">
            <input class="form-check-input" type="radio" name="draftSelection" id="draft_new" value="_new_" checked>
            <label class="form-check-label w-100" for="draft_new">
              <div class="fw-bold text-danger">Start Fresh (don't load any draft)</div>
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Load Selected',
      cancelButtonText: 'Cancel',
      width: '600px',
      preConfirm: () => {
        const selected = document.querySelector('input[name="draftSelection"]:checked') as HTMLInputElement;
        return selected ? selected.value : null;
      }
    });
    
    if (result.isConfirmed && result.value && result.value !== '_new_') {
      this.loadDraft(result.value);
    }
  }

  /**
   * Load specific draft by name
   */
  async loadDraft(draftName: string) {
    const draftKey = this.getDraftKey();
    const draftsJson = localStorage.getItem(draftKey);
    
    if (!draftsJson) {
      return;
    }

    try {
      const drafts = JSON.parse(draftsJson);
      const draft = drafts[draftName];
      
      if (!draft) {
        SweetAlert.confirm({
          title: 'Draft Not Found',
          text: 'The selected draft no longer exists.',
          icon: 'error'
        });
        return;
      }

      await this.restoreDraft(draft);
      this.currentDraftName = draftName;
    } catch (error) {
      console.error('❌ Failed to load draft:', error);
      SweetAlert.confirm({
        title: 'Error',
        text: 'Failed to load draft.',
        icon: 'error'
      });
    }
  }

  /**
   * Restore draft receipts with base64 images converted back to File objects
   */
  private async restoreDraft(draft: any) {
    this.batchMode = true;
    
    // Convert base64 back to File objects
    for (const draftReceipt of draft.receipts) {
      const form = this.fb.group({
        name: [draftReceipt.formValue.name, Validators.required],
        cost: [draftReceipt.formValue.cost, Validators.required],
        workOrderId: [draftReceipt.formValue.workOrderId],
        created_date: [draftReceipt.formValue.created_date],
        vendor_name: [draftReceipt.formValue.vendor_name],
        fileName: [draftReceipt.fileName],
        locale: [draftReceipt.formValue.locale],
        date: [draftReceipt.formValue.date, Validators.required],
        time: [draftReceipt.formValue.time, Validators.required],
        created_by: [draftReceipt.formValue.created_by],
        fs_scheduler_id: [draftReceipt.formValue.fs_scheduler_id],
        jobs: [draftReceipt.formValue.jobs || []],
        copiedFromTicketId: [draftReceipt.formValue.copiedFromTicketId],
      });

      // Convert base64 back to File object
      const file = await this.base64ToFile(
        draftReceipt.fileBase64, 
        draftReceipt.fileName, 
        draftReceipt.fileType
      );
      
      // Create blob URL for preview
      const url = URL.createObjectURL(file);

      this.batchReceipts.push({
        id: draftReceipt.id,
        file: file,
        url: url,
        form: form,
        predictInfo: draftReceipt.predictInfo,
        isProcessing: false,
        isExpanded: draftReceipt.isExpanded || false,
        error: draftReceipt.error
      });
    }

    console.log('✅ Draft restored:', this.batchReceipts.length, 'receipts');
  }

  /**
   * Convert base64 string back to File object
   */
  private async base64ToFile(base64: string, fileName: string, fileType: string): Promise<File> {
    const response = await fetch(base64);
    const blob = await response.blob();
    return new File([blob], fileName, { type: fileType });
  }

  /**
   * Clear draft from localStorage
   */
  async clearDraft(draftName?: string) {
    // If no name provided, show draft selector
    if (!draftName && this.availableDrafts.length > 1) {
      const draftOptions = this.availableDrafts.map(d => 
        `<div class="form-check p-3 border rounded mb-2">
          <input class="form-check-input" type="checkbox" name="draftDelete" id="delete_${d.name}" value="${d.name}">
          <label class="form-check-label w-100" for="delete_${d.name}">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-bold">${d.name}</div>
                <small class="text-muted">${new Date(d.timestamp).toLocaleString()}</small>
              </div>
              <span class="badge bg-primary">${d.count} receipt${d.count !== 1 ? 's' : ''}</span>
            </div>
          </label>
        </div>`
      ).join('');

      const result = await SweetAlert.fire({
        title: 'Delete Drafts',
        html: `
          <div class="text-start">
            <p class="mb-3">Select draft(s) to delete:</p>
            ${draftOptions}
            <div class="form-check p-3 border rounded border-danger mb-2">
              <input class="form-check-input" type="checkbox" name="draftDelete" id="delete_all" value="_all_">
              <label class="form-check-label w-100" for="delete_all">
                <div class="fw-bold text-danger">Delete ALL drafts</div>
              </label>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Delete Selected',
        confirmButtonColor: '#dc3545',
        cancelButtonText: 'Cancel',
        width: '600px',
        preConfirm: () => {
          const selected = Array.from(document.querySelectorAll('input[name="draftDelete"]:checked'))
            .map((input: HTMLInputElement) => input.value);
          return selected.length > 0 ? selected : null;
        }
      });
      
      if (result.isConfirmed && result.value) {
        if (result.value.includes('_all_')) {
          this.clearAllDrafts();
        } else {
          result.value.forEach(name => this.deleteSingleDraft(name));
          this.loadAvailableDrafts();
        }
      }
      return;
    }

    // Clear single draft or current draft
    if (draftName) {
      this.deleteSingleDraft(draftName);
    } else if (this.currentDraftName) {
      this.deleteSingleDraft(this.currentDraftName);
    } else {
      this.clearAllDrafts();
    }
  }

  /**
   * Delete a single draft by name
   */
  private deleteSingleDraft(draftName: string) {
    const draftKey = this.getDraftKey();
    const draftsJson = localStorage.getItem(draftKey);
    
    if (!draftsJson) return;

    try {
      const drafts = JSON.parse(draftsJson);
      delete drafts[draftName];
      
      if (Object.keys(drafts).length === 0) {
        localStorage.removeItem(draftKey);
      } else {
        localStorage.setItem(draftKey, JSON.stringify(drafts));
      }
      
      if (this.currentDraftName === draftName) {
        this.currentDraftName = '';
      }
      
      this.loadAvailableDrafts();
      console.log('🗑️ Draft deleted:', draftName);
      
      SweetAlert.confirm({
        title: 'Draft Deleted',
        text: `"${draftName}" has been removed.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('❌ Failed to delete draft:', error);
    }
  }

  /**
   * Clear all drafts for this ticket
   */
  private clearAllDrafts() {
    const draftKey = this.getDraftKey();
    localStorage.removeItem(draftKey);
    this.currentDraftName = '';
    this.availableDrafts = [];
    console.log('🗑️ All drafts cleared');
    
    SweetAlert.confirm({
      title: 'All Drafts Cleared',
      text: 'All saved drafts have been removed.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  }

  /**
   * Get unique draft storage key based on ticket/work order
   */
  private getDraftKey(): string {
    return `${this.DRAFT_STORAGE_KEY}${this.workOrderId || 'new'}`;
  }

  /**
   * Auto-save current draft (called after each receipt is processed)
   */
  private autoSaveDraft() {
    if (this.currentDraftName) {
      // Auto-save to existing draft name
      this.saveDraftWithName(this.currentDraftName);
    }
    // If no current draft name, user needs to manually save with a name
  }
}
