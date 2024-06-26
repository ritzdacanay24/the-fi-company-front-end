import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import moment from 'moment';
import { MbscModule, setOptions } from '@mobiscroll/angular';
import { Store } from '@ngrx/store';
import { RootReducerState } from 'src/app/store';
import { EventService } from 'src/app/core/services/event.service';
import { getLayoutMode } from 'src/app/store/layouts/layout-selector';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    MbscModule
  ],
  selector: 'app-date-range',
  templateUrl: `./date-range.component.html`,
})
export class DateRangeComponent implements OnInit {

  dateFrom = moment().subtract(12, 'months').startOf('month').format('YYYY-MM-DD');;
  dateTo = moment().endOf('month').format('YYYY-MM-DD');

  @Input() value: any = [this.dateFrom, this.dateTo];
  @Input() displayOptions: boolean = false;
  @Input() disabled: boolean = false;
  @Output() setDateRange: EventEmitter<any> = new EventEmitter();

  myDatepickerOptions = {
    theme: 'ios',
    select: 'range',
    controls: ['calendar'],
    showRangeLabels: true,
    rangeHighlight: true,
    touchUi: true,
    pages: 2,
    calendarType: 'month',
    returnFormat: 'moment',
    display: "anchored",
    showOuterDays: true,
    dateFormat: "MM-DD-YYYY",
  };

  @Input() optionValue: any = 'custom'

  @Input() isOptionsCustom = false

  @Input() options = [{
    value: 'custom',
    text: 'Custom'
  }, {
    value: [moment().format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')],
    text: 'Today'
  }, {
    value: [moment().subtract(1, 'days').format('YYYY-MM-DD'), moment().subtract(1, 'days').format('YYYY-MM-DD')],
    text: 'Yesterday'
  }, {
    value: [moment().subtract(1, 'weeks').startOf('week').format('YYYY-MM-DD'), moment().subtract(1, 'weeks').endOf('week').format('YYYY-MM-DD')],
    text: 'Last week'
  }, {
    value: [moment().subtract(1, 'months').startOf('month').format('YYYY-MM-DD'), moment().subtract(1, 'months').endOf('month').format('YYYY-MM-DD')],
    text: 'Last month'
  }, {
    value: [moment().subtract(1, 'weeks').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')],
    text: 'Last 7 days'
  }, {
    value: [moment().subtract(30, 'days').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')],
    text: 'Last 30 days'
  }, {
    value: [moment().startOf('year').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')],
    text: 'YTD'
  }];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']?.currentValue && !this.isOptionsCustom) {
      this.optionValue = 'custom'
      for (let i = 0; i < this.options.length; i++) {
        if (this.options[i].value.toString() == changes['value']?.currentValue.toString()) {
          this.optionValue = this.options[i].value
        }
      }
    }
  }

  onChangeOption() {
    if (this.optionValue == 'custom') return;

    let e = this.optionValue.split(',')
    let dateFrom = e[0];
    let dateTo = e[1];

    this.value = [dateFrom, dateTo]
    this.setDateRange.emit({
      dateFrom,
      dateTo,
      optionValue: this.optionValue
    })

  }

  onChangeDate(value?: any) {
    if (value)
      this.optionValue = 'custom';

    let dateFrom = moment(this.value[0]).format('YYYY-MM-DD');
    let dateTo = moment(this.value[1]).format('YYYY-MM-DD');
    this.setDateRange.emit({
      dateFrom,
      dateTo
    })

  }

  constructor(
    private store: Store<RootReducerState>,
    private eventService: EventService
  ) {

    this.eventService.subscribe('changeMode', (mode) => {
      setOptions({ themeVariant: mode })
    })
    this.store.select(getLayoutMode).subscribe((mode) => {
      setOptions({ themeVariant: mode })
    })
  }

  ngOnInit() {
  }


}
