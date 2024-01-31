import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '@app/core/api/field-service/user.service';
import { cpPresetColors, cpPresetColorsText } from '@app/core/data/scheduler';
import { SharedModule } from '@app/shared/shared.module';
import { MbscModule } from '@mobiscroll/angular';
import { NgSelectModule } from '@ng-select/ng-select';
import moment from 'moment';
import { ColorPickerModule } from 'ngx-color-picker';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    MbscModule,
    ColorPickerModule,
    NgSelectModule
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

  ngOnInit(): void {

    this.setFormEmitter.emit(this.form)

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

  }

  onTechRelatedChange(){
    this.form.get('title').patchValue(null, { emitEvent: false })
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
    start: [''],
    end: [''],
    description: [''],
    allDay: [''],
    backgroundColor: [''],
    borderColor: [''],
    textColor: [''],
    type: [''],
    techRelated: [''],
    active: [1],
  })

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
