import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule
  ],
  selector: 'app-ticket-event-form',
  templateUrl: './ticket-event-form.component.html',
  styleUrls: ['./ticket-event-form.component.scss']
})
export class TicketEventFormComponent {

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form)
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();


  @Input() submitted = false;

  title = 'Ticket Event Type'

  eventTypeOptions = [
    { name: 'Not applicable', value: 0 },
    { name: 'Service', value: 1 },
    { name: 'Travel', value: 2 },
    { name: 'Non-Service', value: 3 }
  ]

  get f() {
    return this.form.controls
  }

  form = this.fb.group({
    event_name: [],
    description: [],
    isEvent: [0],
    isTravel: [0],
    event_type: [],
    isBreak: [0],
    icon: [],
    active: [1],
    background_color: ''
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }
}
