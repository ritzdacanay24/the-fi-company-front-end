import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { WorkOrderService } from '@app/core/api/field-service/work-order.service';
import { SchedulerService } from '@app/core/api/field-service/scheduler.service';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

import moment from 'moment';
import { UserService } from '@app/core/api/field-service/user.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { MbscModule } from '@mobiscroll/angular';
import { Observable, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { PropertyService } from '@app/core/api/field-service/property.service';
import { AutosizeModule } from 'ngx-autosize';
import { NonBillableCodeService } from '@app/core/api/field-service/fs_non_billable_code.service';
import { ServiceTypeService } from '@app/core/api/field-service/service-type.service';
import { StatusCategoryService } from '@app/core/api/field-service/status-category.service';
import { CustomerService } from '@app/core/api/field-service/customer.service';
import { PropertySearchComponent } from '@app/shared/components/property-search/property-search.component';
import { PlatformService } from '@app/core/api/field-service/platform.service';
import { SharedModule } from '@app/shared/shared.module';
import { states } from '@app/core/data/states';

export const timeNow = () => {
  return moment().format('YYYY-MM-DD HH:mm:ss')
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbNavModule,
    NgSelectModule,
    MbscModule,
    NgbModule,
    AutosizeModule,
    PropertySearchComponent
  ],
  selector: 'app-job-form',
  templateUrl: `./job-form.component.html`,
  styleUrls: [`./job-form.component.scss`]
})
export class JobFormComponent implements OnInit {

  constructor(
    private fb: FormBuilder,
    public route: Router,
    public router: ActivatedRoute,
    public schedulerService: SchedulerService,
    public workOrderService: WorkOrderService,
    private userService: UserService,
    private propertyService: PropertyService,
    private nonBillableCodeService: NonBillableCodeService,
    private serviceTypeService: ServiceTypeService,
    private statusCategoryService: StatusCategoryService,
    private customerService: CustomerService,
    private platformService: PlatformService
  ) {
  }

  ngOnInit(): void {

    this.getUserService();
    this.getStatusType();
    this.getNonBillableCodeService()

    //default property settings
    this.form.get('job.property').valueChanges.subscribe((val: any) => {
      if (
        typeof val === 'object'
      ) val = val?.property;
      this.form
        .get('job.property')
        .setValue(val?.item?.property || val?.Property || val, { emitEvent: false })
    })

    this.form.get('job.request_date').valueChanges.subscribe((val: any) => {
      this.form
        .get('job.request_date')
        .setValue(val ? moment(val).format('YYYY-MM-DD') : null, { emitEvent: false })
      this.form
        .get('job.original_request_date')
        .setValue(val ? moment(val).format('YYYY-MM-DD') : null, { emitEvent: false })
    })

    this.form.get('job.start_time').valueChanges.subscribe((val: any) => {
      let isDateValid = moment(val).isValid()
      if (isDateValid)
        this.form
          .get('job.start_time')
          .setValue(moment(val, "HH:mm").format("HH:mm"), { emitEvent: false })
    })

    this.form.get('job.billable').valueChanges.subscribe(
      value => {
        if (value == 'No') {
          this.setValue('job.invoice_number', 'Non billable');
          this.form.get('job.non_billable_code').setValidators([Validators.required]);
          this.form.get('job.non_billable_code').updateValueAndValidity();
        } else if (value == 'Yes') {
          this.setValue('job.invoice_number', '')
          this.form.get('job.non_billable_code').setValidators(null);
          this.form.get('job.non_billable_code').updateValueAndValidity();
        }
      }
    );

    this.setFormElements?.emit(this.form);

  }

  @Output() setFormElements: EventEmitter<any> = new EventEmitter()
  @Output() setOnRemoveTech: EventEmitter<any> = new EventEmitter()

  @Input() public non_billable_code_options = []

  @Input() submitted = false;

  timeNow = timeNow();

  states = states;

  public setValue(column, value) {
    this.form.get(column).patchValue(value, { emitEvent: false })
  }

  resetForm = () => {
    this.submitted = false
    this.form.reset()
  }

  myDatepickerOptions = {
    controls: ['date'],
    dateFormat: "YYYY-MM-DD",
    headerText: "{value}",
    placeholder: "Please Select...",
    display: "anchored",
    returnFormat: "moment",
    theme: "ios",
    stepMinute: 5
  }

  myDatepickerOptionsTime = {
    controls: ['time'],
    timeFormat: "HH:mm",
    headerText: "{value}",
    placeholder: "Please Select...",
    display: "anchored",
    returnFormat: "moment",
    theme: "ios",
    stepMinute: 5
  }

  resource_code_options = [
    { name: 'Tech Not Licensed', value: 1 },
    { name: 'Techs fully booked', value: 2 },
    { name: 'Contractor cost effective', value: 3 }
  ]

  formClass(key: string | number) {
    return this.submitted && this.getJob[key]['errors'] ? 'is-invalid' : ''
  }
  formClass1(key: string | number) {
    return this.submitted && this.getResource[key]['errors'] ? 'is-invalid' : ''
  }

  formValidator(key: any) {
    if (this.getJob[key]?.validator === null) return '';
    const validator = this.getJob[key]?.validator({} as AbstractControl);
    if (validator && validator['required']) return 'required';
    return ''
  }
  formValidator1(key: any) {
    if (this.getResource[key]?.validator === null) return '';
    const validator = this.getResource[key]?.validator({} as AbstractControl);
    if (validator && validator['required']) return 'required';
    return ''
  }

  get f() {
    return this.form.controls
  }

  get getJob() {
    return this.form.get('job')['controls']
  }
  get getResource() {
    return this.form.get('resource')['controls']
  }

  formClassJob(key: string | number) {
    return this.submitted && this.getJob[key]['errors'] ? 'is-invalid' : ''
  }

  formValidatorJob(key: any) {
    if (this.getJob[key].validator === null) return '';
    const validator = this.getJob[key].validator({} as AbstractControl);
    if (validator && validator['required']) return 'required';
    return ''
  }

  inputFormatBandListValue = (e: any) => {
    let s = e?.property || e
    return s
  }

  remove(i, row) {
    let data = {
      index: i,
      row
    }
    this.setOnRemoveTech.emit(data)
  }

  teams: FormArray;
  addMoreTechs(n) {
    this.teams = this.form.get('resource') as FormArray;
    for (let i = 0; i < n; i++) {
      this.teams.push(this.fb.group({
        user: null,
        user_rate: 0,
        fs_det_id: "",
        lead_tech: 0,
        id: "",
        contractor_code: null
      }))
    }
  }

  get getTeams() {
    return this.form.get('resource') as FormArray
  }

  async onTechChange(e, i) {
    if (e.user_rate) {
      e.contractor_code = null;
    }
    //this.setOnRemoveTech.emit(e)
    this.teams = this.form.get('resource') as FormArray;
    ((this.form.get('resource') as FormArray).at(i) as FormGroup).patchValue({ ...e });
  }

  form = this.fb.group({
    job: this.fb.group({
      group_id: [null],
      connecting_jobs: [null],
      turnover_fsid: [null],
      request_date: ['', [Validators.required]],
      original_request_date: [''],
      start_time: ['', [Validators.required]],
      requested_by: [''],
      status: ['Pending'],
      sales_order_number: [''],
      service_type: [null],
      customer: [null, [Validators.required]],
      out_of_state: [''],
      sign_theme: [''],
      sign_type: [''],
      platform: [null, [Validators.required]],
      comments: [''],
      notes: [''],
      created_date: [''],
      created_by: [''],
      vendor_cost: [''],
      invoice: [''],
      invoice_date: [null],
      invoice_number: [''],
      invoice_notes: [''],
      vendor_inv_number: [''],
      billable_flat_rate_or_po: [''],
      paper_work_location: [''],
      acc_status: [''],
      contractor_inv_sent_to_ap: [''],
      period: [''],
      billable: [''],
      active: [1],
      co_number: [''],
      customer_cancelled: [''],
      cancellation_comments: [''],
      cancelled_type: [''],
      mark_up_percent: [30],
      ef_hourly_rate: [95],
      ef_overtime_hourly_rate: [142.50],
      compliance_license_notes: [''],
      published: [0],
      property_id: [null],
      queue: [null],
      queus_status: [null],
      title: [''],
      schedule_later: [''],
      non_billable_code: [null],
      property: [null],
      address1: [''],
      address2: [''],
      city: [''],
      state: [''],
      zip_code: [''],
      country: [''],
      property_phone: [''],
      request_id: [null],
      sign_responsibility: [''],
      fs_calendar_id: [null],
      onsite_customer_name: [''],
      onsite_customer_phone_number: [''],
      licensing_required: [''],
      ceiling_height: [''],
      bolt_to_floor: [''],
      sign_jacks: [''],
    }),
    resource: this.fb.array([]),
  })

  /**Api */
  statusType$: any[];
  getStatusType = async () => {
    try {
      this.statusType$ = await this.statusCategoryService.find({ active: 1 });
    } catch (err) { }
  }

  serviceTypes$: any[];
  getServiceTypes = async () => {
    try {
      this.serviceTypes$ = await this.serviceTypeService.find({ active: 1 });
    } catch (err) { }
  }

  company$: any[];
  getCompany = async () => {
    try {
      this.company$ = await this.customerService.find({ active: 1 });
    } catch (err) { }
  }

  platforms$: any[];
  getlatforms = async () => {
    try {
      this.platforms$ = await this.platformService.find({ active: 1 });
    } catch (err) { }
  }

  jobs$: any;
  getJobs = async () => {
    try {
      this.jobs$ = await this.schedulerService.getAll();
    } catch (err) { }
  }

  users$: any;
  getUserService = async () => {
    try {
      this.users$ = await this.userService.getUserWithTechRate();
    } catch (err) { }
  }

  async getNonBillableCodeService() {
    try {
      this.non_billable_code_options = await this.nonBillableCodeService.getAll()
    } catch (err) { }
  }

  selectedProperty: any
  selectAddress(e: any) {
    let item = e.item;
    this.selectedProperty = item;

    this.form.patchValue({
      job: {
        address1: item.address1,
        address2: item.address2,
        city: item.city,
        state: item.state,
        zip_code: item.zip_code,
        country: item.country,
        property_phone: item.property_phone
      }
    }, { emitEvent: true })
  }

  searchClientAddress = (text$: Observable<string>) => {
    return text$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(async (searchText: any) => {
        if (searchText.length >= 2) {
          let data: any = await this.propertyService.getAllPropertyByText(searchText.trim());
          return data;
        }
      })
    );
  }

  notifyParent($event) {
    this.form.patchValue({
      job: {
        property: $event.property,
        address1: $event.address1,
        address2: $event.address2,
        city: $event.city,
        state: $event.state,
        zip_code: $event.zip_code,
        onsite_customer_phone_number: $event.property_phone,
        country: $event.country,
        out_of_state: $event.out_of_town
      }
    }, { emitEvent: false })
  }
}
