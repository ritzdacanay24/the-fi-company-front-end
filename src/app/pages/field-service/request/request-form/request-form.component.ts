import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { SharedModule } from '@app/shared/shared.module';
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
  ],
  selector: 'app-request-form',
  templateUrl: './request-form.component.html',
  styleUrls: ['./request-form.component.scss'],
  providers: [RecaptchaProviders]
})
export class RequestFormComponent {

  constructor(
    private fb: FormBuilder,
    private api: SchedulerService,
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

  myLabels = [];
  myInvalid = [];
  
  @Input() showCaptcha = true
  
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

  states = states

  @Input() submitted = false;


  notifyParent($event) {
    this.form.patchValue({
      address1: $event?.fullStreetName,
      city: $event?.address?.municipality,
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
    { name: "Casino", code: "" },
    { name: "EpicTech", code: "" },
    { name: "Everi", code: "EVIGAM" },
    { name: "IGT", code: "INTGAM" },
    { name: "Konami", code: "KONGAM" },
    { name: "L&W", code: "" },
    { name: "Synergy Blue", code: "" },
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
    'g-recaptcha-response': ["", Validators.required],
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

    var names = [];
    let data = localStorage.getItem('fs-request-form-cc-em-emails')
    if (data) names = JSON.parse(data);
    names.push(e)

    localStorage.setItem('fs-request-form-cc-em-emails', JSON.stringify(names))

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

  private loadData() {

    this.data$ = concat(
      of([]), // default items
      this.dataInput$.pipe(
        debounceTime(this.debounceTime),
        distinctUntilChanged(),
        tap(() => {
          this.dataLoading = true
        }),
        switchMap(term => this.api.searchByQadPartNumber(term, this.currentCompanySelection).pipe(
          catchError(() => of([])), // empty list on error
          tap((res) => {
            this.dataLoading = false
          })
        ))
      )
    );
  }

}
