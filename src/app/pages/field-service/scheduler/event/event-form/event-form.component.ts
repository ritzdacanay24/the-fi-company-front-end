import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { UserService } from '@app/core/api/field-service/user.service';
import { cpPresetColors, cpPresetColorsText } from '@app/core/data/scheduler';
import { SharedModule } from '@app/shared/shared.module';
import { MbscModule } from '@mobiscroll/angular';
import { NgSelectModule } from '@ng-select/ng-select';
import moment from 'moment';
import { AutosizeModule } from 'ngx-autosize';
import { ColorPickerModule } from 'ngx-color-picker';

export const dateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const start = control.get('start');
  const end = control.get('end');

  if (moment(start.value).format('YYYY-MM-DD') > moment(end.value).format('YYYY-MM-DD')) {
    start.setErrors({ 'invalid': true });
  } else {
    start.setErrors(null);
  }
  return null
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    MbscModule,
    ColorPickerModule,
    NgSelectModule,
    AutosizeModule,
  ],
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.scss']
})
export class EventFormComponent {

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
  ) { }

  techChange($event) {
  }

  ngOnInit(): void {

    this.form.get('allDay').valueChanges.subscribe(val => {
      if (val) {
        this.myDatepickerOptions = {
          ...this.myDatepickerOptions,
          controls: ['date'],
        }
      } else {
        this.myDatepickerOptions = {
          ...this.myDatepickerOptions,
          controls: ['datetime'],
        }
      }
    });

    this.form.get('start').valueChanges.subscribe(val => {
      if (val) {
        this.form.get('start').patchValue(moment(val).format('YYYY-MM-DD HH:mm'), { emitEvent: false })
      } else {
        this.form.get('start').patchValue(null, { emitEvent: false })
      }
    });

    this.form.get('end').valueChanges.subscribe(val => {
      if (val) {
        this.form.get('end').patchValue(moment(val).format('YYYY-MM-DD HH:mm'), { emitEvent: false })
      } else {
        this.form.get('end').patchValue(null, { emitEvent: false })
      }
    });

    this.setFormEmitter.emit(this.form);
    this.getUserService()

  }

  onTechRelatedChange() {
    //this.form.get('title').patchValue(null, { emitEvent: false })
    this.form.get('type').patchValue(null, { emitEvent: false })
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls
  }

  @Input() public cpPresetColors = cpPresetColors
  @Input() public cpPresetColorsText = cpPresetColorsText

  form = this.fb.group({
    title: [''],
    start: ['', Validators.required],
    end: ['', Validators.required],
    description: [''],
    allDay: [''],
    backgroundColor: ['#fff078'],
    borderColor: ['#fff078'],
    textColor: ['#000'],
    type: [''],
    techRelated: [''],
    active: [1],
    resource_id: [],
    created_date: '',
    created_by: ''
  }, { validators: dateValidator })

  myDatepickerOptions = {
    controls: ['datetime'],
    dateFormat: "YYYY-MM-DD",
    timeFormat: "HH:mm",
    headerText: "{value}",
    placeholder: "Please Select...",
    display: "anchored",
    returnFormat: "moment",
    theme: "ios",
    stepMinute: 5
  }

  public setValue(column, value) {
    this.form.get(column).patchValue(value, { emitEvent: false })
  }

  onRemove(event: any) {
  }

  onTechSelectChange($event) {
    let resource_ids = []
    for (let i = 0; i < $event.length; i++) {
      resource_ids.push($event[i].id)
    }
    this.setValue('resource_id', resource_ids)
  }

  users$: any;
  getUserService = async () => {
    try {
      this.users$ = await this.userService.getUserWithTechRate();
    } catch (err) { }
  }

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

}
