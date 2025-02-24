import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { TripExpenseService } from '@app/core/api/field-service/trip-expense.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import moment from 'moment';
import imageCompression from 'browser-image-compression';
import { LazyLoadImageModule } from 'ng-lazyload-image';

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
  })

  jobsToView = []
  onMaterialGroupChange(event) {
    this.jobsToView = event;

    console.log(event)

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

        let apiKey: any = await this.api.getPredictApi(data);
        let res: any = await this.api.predictApi(data, apiKey);

        let obj = res
        let prediction = obj.document.inference.prediction;

        this.predictInfo = obj.document;

        this.form.patchValue({
          cost: prediction.total_incl.value,
          vendor_name: prediction.supplier.value || '',
          date: prediction.date.value,
          locale: prediction.locale.value || '',
          time: prediction.time.value,
          name: prediction.category.value,
          fileName: compressedFile.name,
        })

        SweetAlert.close();
      }
    } catch (err) {
      this.receiptMessage = 'Unable to extract the data from the receipt but you can still enter the information manually.';
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
    Object.keys(this.form.value).map((key) => {
      if (key == 'jobs') {
        for (let i = 0; i < this.form.value[key]?.length; i++) {
          e.push(this.form.value[key][i].id)
        }
        formData.append(key, e?.toString());
      } else {
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
}
