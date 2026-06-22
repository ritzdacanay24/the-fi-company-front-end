import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { AttachmentsService } from '@app/core/api/attachments/attachments.service';
import { SharedModule } from '@app/shared/shared.module';
import { UploadNewAttachmentsComponent } from '@app/shared/components/attachments/upload-new-attachments/upload-new-attachments.component';
import moment from 'moment';
import { MbscModule, setOptions } from '@mobiscroll/angular';
import { NgSelectModule } from '@ng-select/ng-select';
import { AutosizeModule } from 'ngx-autosize';
import { MyRecaptchaModule, RecaptchaProviders } from '../providers/recaptcha';
import { AddTagFn } from '@ng-select/ng-select/lib/ng-select.component';
import { Observable, Subject, concat, of, debounceTime, distinctUntilChanged, tap, switchMap, catchError } from 'rxjs';
import { validateEmail } from 'src/assets/js/util/validateEmail';
import { states } from '@app/core/data/states';
import { Store } from '@ngrx/store';
import { RootReducerState } from '@app/store';
import { getLayoutMode } from '@app/store/layouts/layout-selector';
import { EventService } from '@app/core/services/event.service';
import { AddressSearchComponent } from '@app/shared/components/address-search/address-search.component';

setOptions({
  theme: 'ios',
  stepMinute: 5,
  showOuterDays: false,
  dateFormat: "MM-DD-YYYY",
  themeVariant: "light",
  controls: ['calendar'],
  display: "anchored",
  returnFormat: "moment"
});

@Component({
  standalone: true,
  imports: [
    SharedModule,
    MbscModule,
    AutosizeModule,
    MyRecaptchaModule,
    NgSelectModule,
    AddressSearchComponent,
    UploadNewAttachmentsComponent,
  ],
  selector: 'app-request-form',
  templateUrl: './request-form.component.html',
  styleUrls: ['./request-form.component.scss'],
  providers: [RecaptchaProviders]
})
export class RequestFormComponent implements OnChanges {

  constructor(
    private fb: FormBuilder,
    private api: SchedulerService,
    private attachmentsService: AttachmentsService,
    public router: ActivatedRoute,
    public route: Router,
    private store: Store<RootReducerState>,
    private eventService: EventService
  ) { }

  ngOnInit(): void {
    this.eventService.subscribe('changeMode', (mode) => {
      setOptions({ themeVariant: mode })
    })
    this.store.select(getLayoutMode).subscribe((mode) => {
      setOptions({ themeVariant: mode })
    })
    this.form.controls['dateAndTime'].valueChanges.subscribe(value => {

      if (value)
        this.form.patchValue({
          dateAndTime: moment(value).format('YYYY-MM-DD HH:mm:ss'),
          date_of_service: moment(value).format('YYYY-MM-DD'),
          start_time: moment(value).format('HH:mm:ss')
        }, { emitEvent: false })

    });

    this.form.controls['customer'].valueChanges.subscribe(value => {
      if (value == "") {
        this.form.get('customer_product_number').disable()
      } else {
        this.form.get('customer_product_number').enable()
      }
    });

    this.loadData()
    this.setFormEmitter.emit(this.form)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requestId'] && changes['requestId'].currentValue && !changes['requestId'].previousValue) {
      if (this.selectedFiles.length > 0) {
        // Request ID just became available - auto-upload queued files
        this.uploadQueuedAttachments().catch(err => {
          console.error('Auto-upload of attachments failed:', err);
        });
      } else {
        void this.loadUploadedAttachments();
      }
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.selectedFiles.length > 0) {
      $event.returnValue = 'You have queued files that will be lost if you refresh.';
      return $event.returnValue;
    }
  }

  myLabels = [];
  myInvalid = [];
  
  @Input() showCaptcha = true
  @Input() publicAddressSearch = false;
  
  @Input() disabled = false;

  myDatepickerOptions: any = {
    controls: ['date'],
    timeFormat: "hh:mm A",
    headerText: "{value}",
    placeholder: "Please Select...",
    display: "anchored",
    returnFormat: "moment"
  }

  myDatepickerOptionsTime: any = {
    controls: ['time'],
    timeFormat: "hh:mm A",
    headerText: "{value}",
    placeholder: "Please Select...",
    display: "anchored",
    returnFormat: "moment"
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();
  @Output() attachmentsUploaded: EventEmitter<void> = new EventEmitter<void>();

  states = states

  @Input() submitted = false;
  @Input() requestToken: string | null = null;
  @Input() requestId: number | null = null;
  @Input() authenticatedUserId: number | null = null;


  notifyParent($event) {
    this.form.patchValue({
      address1: $event?.fullStreetName,
      city: $event?.address?.localName,
      state: $event?.address?.countrySubdivisionCode || null,
      zip: $event?.address?.postalCode,
      property: $event?.poi?.name,
      lat: $event?.position?.lat || null,
      lon: $event?.position?.lon || null
    })
  }


  typeOfServiceOptions = [
    "Conversion", "Install", "Reface", "Relocation", "Removal", "Repair", "Service Call", "Site Survey"
  ]

  customerOptions = [
    { name: "AGS", code: "test" },
    { name: "Ainsworth", code: "" },
    { name: "ATI", code: "ATI" },
    { name: "Bally", code: "" },
    { name: "Bellagio", code: "" },
    { name: "Bluberi", code: "bluberi" },
    { name: "Casino", code: "" },
    { name: "EpicTech", code: "" },
    { name: "Everi", code: "EVIGAM" },
    { name: "IGT", code: "INTGAM" },
    { name: "Konami", code: "KONGAM" },
    { name: "L&W", code: "" },
    { name: "Synergy Blue", code: "" },
    { name: "Zitro", code: "ZITRO" },
    { name: "Other", code: "" },
  ]

  form = this.fb.group({
    email: [null, [Validators.required, Validators.email]],
    subject: [null, [Validators.required]],
    cc_email: [null],
    requested_by: [null, Validators.required],
    dateAndTime: ["", Validators.required],
    type_of_service: ["", Validators.required],
    date_of_service: ['', Validators.required],
    start_time: ['', Validators.required],
    so_number: [null],
    customer_co_number: [null],
    type_of_sign: [null, Validators.required],
    eyefi_customer_sign_part: [null, Validators.required],
    sign_theme: [null, Validators.required],
    onsite_customer_name: [null, Validators.required],
    onsite_customer_phone_number: [null, Validators.required],
    property: [null, Validators.required],
    address1: [null, Validators.required],
    address2: [null],
    state: ["", Validators.required],
    city: [null, Validators.required],
    zip: [null, Validators.required],
    licensing_required: [],
    ceiling_height: [],
    bolt_to_floor: [],
    sign_jacks: [],
    special_instruction: [],
    platform: [null, Validators.required],
    customer: ["", Validators.required],
    serial_number: "",
    token: "",
    created_date: "",
    'g-recaptcha-response': [""],
    sign_manufacture: ["", Validators.required],
    customer_product_number: [null],
    active: [1],
    site_survey_requested: [''],
    created_by: [''],
    lat: [''],
    lon: ['']
  })

  get f() {
    return this.form.controls
  }

  public resolved(captchaResponse: any): void {
    this.form
      .get('g-recaptcha-response')
      .setValue(captchaResponse, { emitEvent: false })
  }

  formatDate(value, format) {
    return value ? moment().format(format) : null
  }

  currentCompanySelection = null;

  getCompanyChange() {
    let currentValue = this.form.value.customer;
    for (let i = 0; i < this.customerOptions.length; i++) {
      if (this.customerOptions[i].name == currentValue) {
        this.currentCompanySelection = this.customerOptions[i].code;
      }
    }
  }

  addTag: AddTagFn | boolean = (e) => {
    let ee = validateEmail(e);

    if (!ee) {
      alert('Not valid email.')
      return false;
    }

    // var names = [];
    // let data = localStorage.getItem('fs-request-form-cc-em-emails')
    // if (data) names = JSON.parse(data);
    // names.push(e)

    // localStorage.setItem('fs-request-form-cc-em-emails', JSON.stringify(names))

    return validateEmail(e) ? e : false
  }

  listOfCCemails = []
  getItemsFromStorage() {
    let data = localStorage.getItem('fs-request-form-cc-em-emails')

    if (data)
      this.listOfCCemails = JSON.parse(data);

  }

  data$: Observable<any[]>;
  dataLoading = false;
  dataInput$ = new Subject<string>();
  debounceTime = 500;

  uploading = false;
  selectedFiles: File[] = [];
  uploadedAttachments: any[] = [];
  attachmentsLoading = false;

  private loadData() {

    this.data$ = concat(
      of([]), // default items
      this.dataInput$.pipe(
        debounceTime(this.debounceTime),
        distinctUntilChanged(),
        tap(() => {
          this.dataLoading = true
        }),
        switchMap(term => this.api.searchByQadPartNumber(term, this.currentCompanySelection, this.publicAddressSearch).pipe(
          catchError(() => of([])), // empty list on error
          tap((res) => {
            this.dataLoading = false
          })
        ))
      )
    );
  }

onAttachmentsAdded(files: File[]): void {
    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeAttachment(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  async uploadQueuedAttachments(): Promise<void> {
    if (!this.requestToken || !this.requestId || this.selectedFiles.length === 0) {
      return;
    }

    this.uploading = true;
    try {
      for (const file of this.selectedFiles) {
        await this.attachmentsService.uploadRequestAttachmentPublic(
          this.requestId,
          this.requestToken,
          file,
          this.authenticatedUserId
        );
      }
      this.selectedFiles = [];
      await this.loadUploadedAttachments();
      this.attachmentsUploaded.emit();
    } catch (error) {
      console.error('Error uploading attachments:', error);
      throw new Error('Failed to upload attachments');
    } finally {
      this.uploading = false;
    }
  }

  async loadUploadedAttachments(): Promise<void> {
    if (!this.requestToken || !this.requestId) {
      this.uploadedAttachments = [];
      return;
    }

    this.attachmentsLoading = true;
    try {
      const response = await this.attachmentsService.getAttachmentByRequestId(this.requestId, this.requestToken);
      this.uploadedAttachments = Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error loading uploaded attachments:', error);
      this.uploadedAttachments = [];
    } finally {
      this.attachmentsLoading = false;
    }
  }

  resolveUploadedAttachmentById = async (id: string | number): Promise<{ url: string; fileName?: string } | null> => {
    const attachment = this.uploadedAttachments.find((row) => String(row?.id) === String(id));
    if (!attachment) {
      return null;
    }

    return {
      url: String(attachment?.url || attachment?.link || attachment?.previewUrl || '').trim(),
      fileName: attachment?.fileName,
    };
  };

}