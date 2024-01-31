import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import 'moment-timezone';

import { momentTimezone, createCustomTheme, MbscModule } from '@mobiscroll/angular';

import { FieldServiceMobileService } from '@app/core/api/field-service/field-service-mobile.service';
import { FormBuilder } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { timeZonesData } from '@app/core/data/time-zones';
import { AuthenticationService } from '@app/core/services/auth.service';
import { timeConvert, sumLaborAndBreakTimesAndConvert, sumLaborAndBreakTimes } from '@app/pages/field-service/shared/field-service-helpers.service';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { AutosizeModule } from 'ngx-autosize';

createCustomTheme('ios-custom', 'ios');

momentTimezone.moment = moment;

@Component({
  standalone: true,
  imports: [
    SharedModule,
    MbscModule,
    NgbDropdownModule,
    NgSelectModule,
    AutosizeModule
  ],
  selector: 'app-work-info',
  templateUrl: './work-info.component.html'
})
export class WorkInfoComponent implements OnInit {


  public momentPlugin = momentTimezone;

  timeConvert = timeConvert;
  timeZonesData = timeZonesData;

  @Input() public id: any = null;
  @Input() public workOrderId: any;
  @Input() public workOrderTypes: any;
  @Input() public startDate: any;

  tot: any
  showBreak: boolean;
  data: any;
  getEventType: any;

  hasChange: boolean = false;

  myDatepickerOptions: any = {
    controls: ['datetime'],
    timeFormat: "hh:mm A",
    headerText: "{value}",
    placeholder: "Please Select...",
    display: "anchored",
    returnFormat: "moment",
    stepMinute: 5,
    showOuterDays: false,
    dateFormat: "DDD, MMM DD, YYYY",
  }

  form: any = this.fb.group<any>({
    projectStart: null,
    projectFinish: null,
    projectStartTz: null,
    projectFinishTz: null,
    brStart: null,
    brEnd: null,
    proj_type: null,
    description: null,
    totalHours: null,
    flight_hrs_delay: null,
    seq: null,
    workOrderId: null,
    include_calculation: true,
    include_traveling: false,
    include_install: false,
    userId: null
  })

  get getForm() {
    return this.form['controls']
  }


  calculateTime() {
    if (this.getForm.include_calculation.value == 0) {
      this.tot = 0;
      return
    }
    this.tot = sumLaborAndBreakTimesAndConvert({
      start: this.formateDateToSave(this.getForm.projectStart.value),
      finish: this.formateDateToSave(this.getForm.projectFinish.value),
      start_tz: this.getForm.projectStartTz.value,
      finish_tz: this.getForm.projectFinishTz.value,
      brStart: this.formateDateToSave(this.getForm.brStart.value),
      brEnd: this.formateDateToSave(this.getForm.brEnd.value),
    })
  }

  constructor(
    private fb: FormBuilder,
    public ngbActiveModal: NgbActiveModal,
    private fieldServiceMobileService: FieldServiceMobileService,
    private authenticationService: AuthenticationService
  ) {
  }

  async getEvents() {
    this.getEventType = await this.fieldServiceMobileService.getEventType();
  }

  getTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  defaultSelection
  async getData() {
    this.data = await this.fieldServiceMobileService.getEventById(this.id);
    this.form.patchValue(this.data)
    if (this.getForm.brStart.value || this.getForm.brEnd.value) {
      this.showBreak = true;
    }


    if (!this.form.get('projectFinish').value)
      this.defaultSelection = this.form.get('projectStart').value

    this.calculateTime()
  }

  ngOnInit(): void {
    this.defaultSelection = this.startDate
    this.getEvents();

    if (this.id) {
      this.getData();
    } else {
      let tz = this.getTimeZone()

      this.form.patchValue({
        workOrderId: this.workOrderId,
        projectFinishTz: tz,
        projectStartTz: tz,
        projectStart: this.startDate,
        userId: this.authenticationService.currentUserValue.id
      })
    }

    this.form.get('projectStart').valueChanges.subscribe(value => {
      this.form
        .get('projectStart')
        .setValue(this.formateDateToSave(value) || null, { emitEvent: false })
    })
    this.form.get('projectFinish').valueChanges.subscribe(value => {
      this.form
        .get('projectFinish')
        .setValue(this.formateDateToSave(value) || null, { emitEvent: false })
    })
    this.form.get('brStart').valueChanges.subscribe(value => {
      this.form
        .get('brStart')
        .setValue(this.formateDateToSave(value) || null, { emitEvent: false })
    })
    this.form.get('brEnd').valueChanges.subscribe(value => {
      this.form
        .get('brEnd')
        .setValue(this.formateDateToSave(value) || null, { emitEvent: false })
    })


    this.form.get('proj_type').valueChanges.subscribe((val: any) => {


      if (val == 'Clock-In' || val == 'Clock-Out') {
        this.form.get('include_calculation').disable()
        this.form.get('include_traveling').disable()
        this.form.get('include_install').disable()

        this.form.get('include_calculation').setValue(0, { emitEvent: true })
        this.form.get('include_traveling').setValue(0, { emitEvent: true })
        this.form.get('include_install').setValue(0, { emitEvent: true })

      } else if (val == 'Break' || val == 'Lunch') {
        this.form.get('include_calculation').setValue(0, { emitEvent: true })
      } else {
        this.form.get('include_calculation').setValue(1, { emitEvent: true })
        this.form.get('include_calculation').enable()
        this.form.get('include_traveling').enable()
        this.form.get('include_install').enable()
      }

    })



  }

  clearBreak() {
    this.showBreak = !this.showBreak;

    this.form
      .get('brStart')
      .setValue(null, { emitEvent: false })
    this.form
      .get('brEnd')
      .setValue(null, { emitEvent: false });

    this.calculateTime()
  }

  clearBreakByKey(key) {

    this.defaultSelection = this.form.get('projectStart').value

    this.form
      .get(key)
      .setValue(null, { emitEvent: false })
    this.calculateTime()
  }

  dismiss() {
    if (this.hasChange && !confirm('You have unsaved data. Proceed to cancel?')) return;

    this.ngbActiveModal.dismiss()
  }

  async create() {
    let value = this.form.getRawValue();
    try {
      SweetAlert.loading()
      this.calculateWorkTimes();
      await this.fieldServiceMobileService.createEvent(value);
      await SweetAlert.close()
      this.ngbActiveModal.close(value)
    } catch (err) {
      SweetAlert.close(0)
    }
  }

  formateDateToSave(dateTime) {
    if (!dateTime) return null
    return moment(dateTime).format('YYYY-MM-DD HH:mm')
  }

  getDuration() {
    return sumLaborAndBreakTimes({
      start: this.getForm.projectStart.value,
      finish: this.getForm.projectFinish.value,
      start_tz: this.getForm.projectStartTz.value,
      finish_tz: this.getForm.projectFinishTz.value,
      brStart: this.getForm.brStart.value,
      brEnd: this.getForm.brEnd.value,
    });
  }

  setTimeZone(key, value) {
    this.form
      .get(key)
      .setValue(value, { emitEvent: false })

    this.calculateTime()
  }

  async validateTimes() {


    // if (this.getForm.brStart.value && this.getForm.brEnd.value) {
    //   let e = getDatetimeDuration(this.getForm.brStart.value, this.getForm.brEnd.value);

    //   if (e < 0) {
    //     alert('Break end time cannot be greater than the break start time.')
    //     return;
    //   }
    // }

    if (this.getForm.projectStart.value && this.getForm.projectFinish.value) {

      let duration = this.getDuration();

      if (duration < 0) {
        alert('End time cannot be greater than start time.')
        return
      }

      let e = this.timeConvert(duration, 'long');

      if ((duration / 60 > 12 || duration < 0) && this.getForm.include_calculation.value == 1) {
        let { value: isConfirmed } = await SweetAlert.fire({
          title: 'Total Time',
          text: `${e || 0}`,
          showCancelButton: true,
          denyButtonText: `Cancel`,
          confirmButtonText: `It is correct`,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
        });

        if (!isConfirmed) return;

        this.updateEvent()
      } else {
        this.updateEvent()
      }
    } else {
      this.updateEvent()
    }

  }

  onSubmit() {
    if (this.id) {
      if (this.getForm.proj_type.value != 'Clock-Out' && this.getForm.proj_type.value != 'Clock-In') {
        this.validateTimes();
      } else {
        this.updateEvent()
      }
    } else {
      this.create()
    }
  }

  async updateEvent() {
    let value = this.form.getRawValue();
    try {
      SweetAlert.loading()
      this.calculateWorkTimes();
      await this.fieldServiceMobileService.updateEventById(this.id, value);
      await SweetAlert.close()
      this.ngbActiveModal.close(value)
    } catch (err) {
      SweetAlert.close(0)
    }
  }

  async deleteWorkDetailsById() {

    const { value: accept } = await SweetAlert.confirm();

    if (!accept) return;

    try {
      SweetAlert.loading('Deleting. Please wait.')
      this.calculateWorkTimes();
      await this.fieldServiceMobileService.deleteEventById(this.id);
      await SweetAlert.close()
      this.ngbActiveModal.close(this.form.value)
    } catch (err) {
      SweetAlert.close(0)
    }

  }

  public calculateWorkTimes() {
    var startTime = moment(this.getForm.projectStart.value)
    var endTime = moment(this.getForm.projectFinish.value)

    if (this.getForm.projectStart.value && this.getForm.projectFinish.value) {
      this.getForm.totalHours.value = endTime.diff(startTime, 'minutes');
    } else {
      this.getForm.totalHours.value = 0;
    }
  }


}
