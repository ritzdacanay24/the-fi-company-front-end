import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  NgbModule,
  NgbNavModule,
  NgbScrollSpyModule,
} from "@ng-bootstrap/ng-bootstrap";
import { WorkOrderService } from "@app/core/api/field-service/work-order.service";
import { SchedulerService } from "@app/core/api/field-service/scheduler.service";
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";

import moment from "moment";
import { UserService } from "@app/core/api/field-service/user.service";
import { NgSelectModule } from "@ng-select/ng-select";
import { MbscModule } from "@mobiscroll/angular";
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from "rxjs";
import { PropertyService } from "@app/core/api/field-service/property.service";
import { AutosizeModule } from "ngx-autosize";
import { NonBillableCodeService } from "@app/core/api/field-service/fs_non_billable_code.service";
import { ServiceTypeService } from "@app/core/api/field-service/service-type.service";
import { StatusCategoryService } from "@app/core/api/field-service/status-category.service";
import { CustomerService } from "@app/core/api/field-service/customer.service";
import { PropertySearchComponent } from "@app/shared/components/property-search/property-search.component";
import { PlatformService } from "@app/core/api/field-service/platform.service";
import { SharedModule } from "@app/shared/shared.module";
import { states } from "@app/core/data/states";
import { AttachmentsService as PublicAttachment } from "@app/core/api/attachments/attachments.service";
import { AttachmentService } from "@app/core/api/field-service/attachment.service";
import { DatePickerService } from "@app/shared/date-picker/date-picker.component";
import { JobSearchComponent } from "@app/shared/components/job-search/job-search.component";
import { JobTripDetailModalService } from "../job-trip-detail-modal/job-trip-detail-modal.component";
import { SortBydatePipe } from "@app/shared/pipes/sort-by-date.pipe";
import { time_now } from "src/assets/js/util/time-now";
import { TripDetailsSummaryComponent } from "../../trip-details/trip-details-summary/trip-details-summary.component";
import { TripDetailsModalService } from "../../trip-details/trip-details-modal/trip-details-modal.component";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbNavModule,
    NgSelectModule,
    MbscModule,
    NgbModule,
    AutosizeModule,
    PropertySearchComponent,
    NgbScrollSpyModule,
    DatePickerService,
    JobSearchComponent,
    SortBydatePipe,
    TripDetailsSummaryComponent,
  ],
  selector: "app-job-form",
  templateUrl: `./job-form.component.html`,
  styleUrls: [`./job-form.component.scss`],
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
    private platformService: PlatformService,
    private publicAttachment: PublicAttachment,
    private attachmentService: AttachmentService,
    private jobTripDetailModalService: JobTripDetailModalService,
    private tripDetailsModalService: TripDetailsModalService
  ) {}

  @Input() ngStyle = { height: "calc(100vh - 262px)" };

  currentSection = "item-3";

  trip_selection = "";

  listOptions: any = [
    {
      name: "Request Date",
      ngbScrollSpyItem: "items-1",
      icon: "mdi-calendar",
      active: true,
    },
    {
      name: "Techs",
      ngbScrollSpyItem: "items-2",
      icon: "mdi-account-plus-outline",
      active: true,
    },
    {
      name: "Job Info",
      ngbScrollSpyItem: "items-3",
      icon: "mdi-folder-information-outline",
      active: true,
    },
    {
      name: "Address",
      ngbScrollSpyItem: "items-4",
      icon: "mdi-map-marker-multiple-outline",
      active: true,
    },
    {
      name: "Additional Info",
      ngbScrollSpyItem: "items-5",
      icon: "mdi-layers-outline",
      active: true,
    },
    {
      name: "Rates",
      ngbScrollSpyItem: "items-6",
      icon: "mdi-account-cash-outline",
      active: true,
    },
    {
      name: "Invoice",
      ngbScrollSpyItem: "items-7",
      icon: "mdi-clipboard-text-play-outline",
      active: true,
    },
    {
      name: "Attachments",
      ngbScrollSpyItem: "items-8",
      icon: "mdi-paperclip",
      active: true,
    },
    {
      name: "Receipts",
      ngbScrollSpyItem: "items-9",
      icon: "mdi-receipt",
      active: true,
    },
    {
      name: "Trip Details",
      ngbScrollSpyItem: "items-trip-details",
      icon: "mdi-receipt",
      active: true,
    },
    {
      name: "Activate/Publish",
      ngbScrollSpyItem: "items-10",
      icon: "mdi-shield-lock-outline",
      active: true,
    },
  ];

  ngOnInit(): void {
    this.getUserService();
    this.getStatusType();
    this.getNonBillableCodeService();

    //default property settings
    this.form.get("job.property").valueChanges.subscribe((val: any) => {
      if (typeof val === "object") val = val?.property;
      this.form
        .get("job.property")
        .setValue(val?.item?.property || val?.Property || val, {
          emitEvent: false,
        });
    });

    this.form.get("job.request_date").valueChanges.subscribe((val: any) => {
      this.form
        .get("job.request_date")
        .setValue(val ? moment(val).format("YYYY-MM-DD") : null, {
          emitEvent: false,
        });
      this.form
        .get("job.original_request_date")
        .setValue(val ? moment(val).format("YYYY-MM-DD") : null, {
          emitEvent: false,
        });
    });

    this.form.get("job.start_time").valueChanges.subscribe((val: any) => {
      let isDateValid = moment(val).isValid();
      if (isDateValid)
        this.form
          .get("job.start_time")
          .setValue(moment(val, "HH:mm").format("HH:mm"), { emitEvent: false });
    });

    this.form.get("job.billable").valueChanges.subscribe((value) => {
      if (value == "No") {
        this.setValue("job.invoice_number", "Non billable");
        this.form
          .get("job.non_billable_code")
          .setValidators([Validators.required]);
        this.form.get("job.non_billable_code").updateValueAndValidity();
      } else if (value == "Yes") {
        this.setValue("job.invoice_number", "");
        this.form.get("job.non_billable_code").setValidators(null);
        this.form.get("job.non_billable_code").updateValueAndValidity();
      }
    });

    this.setFormElements?.emit(this.form);

    if (this.id) {
      this.getAttachments();
    } else {
      for (let i = 0; i < this.listOptions.length; i++) {
        if (
          this.listOptions[i].name == "Attachments" ||
          this.listOptions[i].name == "Receipts" ||
          this.listOptions[i].name == "Invoice"
        ) {
          this.listOptions[i].active = false;
        }
      }
    }
  }

  @Output() setFormElements: EventEmitter<any> = new EventEmitter();
  @Output() setOnRemoveTech: EventEmitter<any> = new EventEmitter();
  @Output() setAttachments: EventEmitter<any> = new EventEmitter();
  @Output() setReceipts: EventEmitter<any> = new EventEmitter();

  @Input() public non_billable_code_options = [];

  @Input() submitted = false;
  @Input() removeTech: Function = ($event, value) => {
    this.teams.removeAt($event.index);
  };

  @Input() scrollToItem: Function;

  @Input() id = null;

  viewAttachment(url) {
    window.open(url, "_blank");
  }

  timeNow = time_now();

  states = states;

  public setValue(column, value) {
    this.form.get(column).patchValue(value, { emitEvent: false });
  }

  setDatData;
  
  viewTripDetailById = (id) => {
    let modalRef = this.tripDetailsModalService.open(id);
    modalRef.result.then(
      (result: Comment) => {
        this.setDatData();
      },
      () => {}
    );
  };

  resetForm = () => {
    this.submitted = false;
    this.form.reset();
  };

  myDatepickerOptions = {
    controls: ["calendar"],
    dateFormat: "YYYY-MM-DD",
    placeholder: "Please Select...",
    display: "anchored",
    returnFormat: "moment",
    theme: "ios",
    stepMinute: 5,
  };

  myDatepickerOptionsTime = {
    controls: ["time"],
    timeFormat: "HH:mm",
    headerText: "{value}",
    placeholder: "Please Select...",
    display: "anchored",
    returnFormat: "moment",
    theme: "ios",
    stepMinute: 5,
  };

  resource_code_options = [
    { name: "Tech Not Licensed", value: 1 },
    { name: "Techs fully booked", value: 2 },
    { name: "Contractor cost effective", value: 3 },
  ];

  formClass(key: string | number) {
    return this.submitted && this.getJob[key]["errors"] ? "is-invalid" : "";
  }
  formClass1(key: string | number) {
    return this.submitted && this.getResource[key]["errors"]
      ? "is-invalid"
      : "";
  }

  formValidator(key: any) {
    if (this.getJob[key]?.validator === null) return "";
    const validator = this.getJob[key]?.validator({} as AbstractControl);
    if (validator && validator["required"]) return "required";
    return "";
  }
  formValidator1(key: any) {
    if (this.getResource[key]?.validator === null) return "";
    const validator = this.getResource[key]?.validator({} as AbstractControl);
    if (validator && validator["required"]) return "required";
    return "";
  }

  get f() {
    return this.form.controls;
  }

  get getJob() {
    return this.form.get("job")["controls"];
  }
  get getResource() {
    return this.form.get("resource")["controls"];
  }

  formClassJob(key: string | number) {
    return this.submitted && this.getJob[key]["errors"] ? "is-invalid" : "";
  }

  formValidatorJob(key: any) {
    if (this.getJob[key].validator === null) return "";
    const validator = this.getJob[key].validator({} as AbstractControl);
    if (validator && validator["required"]) return "required";
    return "";
  }

  inputFormatBandListValue = (e: any) => {
    let s = e?.property || e;
    return s;
  };

  remove(i, row) {
    let data = {
      index: i,
      row,
    };
    this.setOnRemoveTech.emit(data);
  }

  getTurnover($event) {}

  disableTechs() {
    this.teams = this.form.get("resource") as FormArray;
    //check if tech not in list already
    this.inList = [];
    for (let i = 0; i < this.teams.controls.length; i++) {
      this.inList.push(this.teams.controls[i]["controls"].user.value);
    }

    for (let i = 0; i < this.users$.length; i++) {
      this.users$[i].disabled = false;
      if (this.inList.indexOf(this.users$[i].user) !== -1) {
        this.users$[i].disabled = true;
      }
    }
  }

  teams: FormArray;
  addMoreTechs(n) {
    this.teams = this.form.get("resource") as FormArray;

    for (let i = 0; i < n; i++) {
      this.teams.push(
        this.fb.group({
          user: null,
          fs_det_id: "",
          lead_tech: 0,
          id: null,
          contractor_code: null,
          title: null,
          user_id: null,
        })
      );
    }
  }

  get getTeams() {
    return this.form.get("resource") as FormArray;
  }

  inList = [];

  async onTechChange(e, i) {
    this.teams = this.form.get("resource") as FormArray;

    if (e.user_rate) {
      e.contractor_code = null;
    }

    if (this.inList) {
      if (this.inList.indexOf(e.user) !== -1) {
        alert("User already in list");
        this.teams.controls[i]["controls"]["user"].patchValue(null);
        return;
      }
    }

    ((this.form.get("resource") as FormArray).at(i) as FormGroup).patchValue({
      ...e,
      user_id: e.id,
    });

    this.setOnRemoveTech.emit(e);
  }

  form = this.fb.group({
    job: this.fb.group({
      group_id: [null],
      connecting_jobs: [null],
      turnover_fsid: [null],
      request_date: ["", [Validators.required]],
      original_request_date: [""],
      start_time: ["", [Validators.required]],
      requested_by: [""],
      status: ["Pending"],
      sales_order_number: [""],
      service_type: [null, [Validators.required]],
      customer: [null, [Validators.required]],
      out_of_state: [""],
      sign_theme: [""],
      sign_type: [""],
      platform: [null, [Validators.required]],
      comments: [""],
      notes: [""],
      created_date: [moment().format("YYYY-MM-DD HH:mm:ss")],
      created_by: [""],
      vendor_cost: [""],
      invoice: [""],
      invoice_date: [null],
      invoice_number: [""],
      invoice_notes: [""],
      vendor_inv_number: [""],
      billable_flat_rate_or_po: [""],
      paper_work_location: [""],
      acc_status: [""],
      contractor_inv_sent_to_ap: [""],
      period: [""],
      billable: [""],
      active: [1],
      co_number: [""],
      customer_cancelled: [""],
      cancellation_comments: [""],
      cancelled_type: [""],
      mark_up_percent: [30],
      ef_hourly_rate: [47.5],
      ef_overtime_hourly_rate: [71.25],
      compliance_license_notes: [""],
      published: [null],
      property_id: [null],
      queue: [null],
      queus_status: [null],
      title: [""],
      schedule_later: [""],
      non_billable_code: [null],
      property: [null, [Validators.required]],
      address1: [""],
      address2: [""],
      city: [""],
      state: [""],
      zip_code: [""],
      country: [""],
      property_phone: [""],
      request_id: [null],
      sign_responsibility: [""],
      fs_calendar_id: [null],
      onsite_customer_name: [""],
      onsite_customer_phone_number: [""],
      licensing_required: [""],
      ceiling_height: [""],
      bolt_to_floor: [""],
      sign_jacks: [""],
      site_survey_requested: [""],
      per_tech_rate: [33.5],
      per_tech_rate_ot: [49.6],
      fs_lat: [""],
      fs_lon: [""],
    }),
    trip_details: this.fb.group({
      vendor: [null],
    }),
    resource: this.fb.array([]),
  });

  summaryUpdated = false;
  addTripDetails(rowId?) {
    let modalRef = this.jobTripDetailModalService.open(this.id, rowId);
    modalRef.result.then(
      (result: Comment) => {
        // this.summaryUpdated = true;
      },
      () => {}
    );
  }

  setGetSummaryData;

  /**Api */
  statusType$: any[];
  getStatusType = async () => {
    try {
      this.statusType$ = await this.statusCategoryService.find({ active: 1 });
    } catch (err) {}
  };

  serviceTypes$: any[];
  getServiceTypes = async () => {
    try {
      this.serviceTypes$ = await this.serviceTypeService.find({ active: 1 });
    } catch (err) {}
  };

  company$: any[];
  getCompany = async () => {
    try {
      this.company$ = await this.customerService.find({ active: 1 });
    } catch (err) {}
  };

  platforms$: any[];
  getlatforms = async () => {
    try {
      this.platforms$ = await this.platformService.find({ active: 1 });
    } catch (err) {}
  };

  jobs$: any;
  getJobs = async () => {
    try {
      this.jobs$ = await this.schedulerService.getAll();
    } catch (err) {}
  };

  users$: any;
  getUserService = async () => {
    try {
      this.users$ = await this.userService.getUserWithTechRate();
    } catch (err) {}
  };

  async getNonBillableCodeService() {
    try {
      this.non_billable_code_options =
        await this.nonBillableCodeService.getAll();
    } catch (err) {}
  }

  selectedProperty: any;
  selectAddress(e: any) {
    let item = e.item;
    this.selectedProperty = item;

    this.form.patchValue(
      {
        job: {
          address1: item.address1,
          address2: item.address2,
          city: item.city,
          state: item.state,
          zip_code: item.zip_code,
          country: item.country,
          property_phone: item.property_phone,
        },
      },
      { emitEvent: true }
    );
  }

  searchClientAddress = (text$: Observable<string>) => {
    return text$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(async (searchText: any) => {
        if (searchText.length >= 2) {
          let data: any = await this.propertyService.getAllPropertyByText(
            searchText.trim()
          );
          return data;
        }
      })
    );
  };

  notifyParent($event) {
    this.form.patchValue(
      {
        job: {
          property: $event.property,
          address1: $event.address1,
          address2: $event.address2,
          city: $event.city,
          state: $event.state,
          zip_code: $event.zip_code,
          onsite_customer_phone_number: $event.property_phone,
          country: $event.country,
          out_of_state: $event.out_of_town,
        },
      },
      { emitEvent: false }
    );
  }

  @ViewChild("myInput")
  myInputVariable: ElementRef;

  resetInput() {
    this.myInputVariable.nativeElement.value = "";
  }

  /**attachments */
  file: File = null;

  myFiles: string[] = [];

  onFilechange(event: any) {
    this.myFiles = [];
    for (var i = 0; i < event.target.files.length; i++) {
      this.myFiles.push(event.target.files[i]);
      this.onUploadAttachments();
    }

    this.setAttachments.emit(this.myFiles);
    event.target.value = null;
  }

  attachments: any = [];
  receipts: any = [];
  async getAttachments() {
    this.attachments = [];
    this.receipts = [];
    let data: any = await this.attachmentService.getAllRelatedAttachments(
      this.id
    );
    for (let i = 0; i < data.length; i++) {
      let row = data[i];
      if (row.field == "Field Service Receipts") {
        this.receipts.push(row);
      } else {
        this.attachments.push(row);
      }
    }
  }

  async onUploadAttachments() {
    if (this.myFiles && this.id) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();
      for (var i = 0; i < this.myFiles.length; i++) {
        formData.append("file", this.myFiles[i]);
        formData.append("field", "Field Service Scheduler");
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", "fieldService");
        try {
          await this.publicAttachment.uploadfile(formData);
          totalAttachments++;
        } catch (err) {}
      }
      this.resetInput();
      this.getAttachments();
      this.isLoading = false;
    }
  }

  async onDeleteAttachment(id, index, array) {
    if (!confirm("Are you sure you want to delete?")) return;
    await this.publicAttachment.delete(id);
    array.splice(index, 1);
  }

  /**receipts */
  isLoading;
  myReceiptFiles: string[] = [];
  onReceiptchange(event: any) {
    for (var i = 0; i < event.target.files.length; i++) {
      this.myReceiptFiles.push(event.target.files[i]);
      this.onUploadReceipts();
    }
    event.target.value = null;
  }

  async onUploadReceipts() {
    if (this.myReceiptFiles && this.id) {
      let totalAttachments = 0;
      this.isLoading = true;
      const formData = new FormData();
      for (var i = 0; i < this.myReceiptFiles.length; i++) {
        formData.append("file", this.myReceiptFiles[i]);
        formData.append("field", "Field Service Receipts");
        formData.append("uniqueData", `${this.id}`);
        formData.append("folderName", "fieldService");
        try {
          await this.publicAttachment.uploadfile(formData);
          totalAttachments++;
        } catch (err) {}
      }
      this.resetInput();
      this.getAttachments();
      this.isLoading = false;
    }
  }
}
