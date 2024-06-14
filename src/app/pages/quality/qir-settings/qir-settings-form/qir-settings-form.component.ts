import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { QirSearchComponent } from '@app/shared/components/qir-search/qir-search.component';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    QirSearchComponent
  ],
  selector: 'app-qir-settings-form',
  templateUrl: './qir-settings-form.component.html',
  styleUrls: ['./qir-settings-form.component.scss']
})
export class QirSettingsFormComponent {

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form)
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls
  }

  form = this.fb.group({
    category: [null],
    name: [''],
    description: [''],
    active: [1],
    code: [''],
  })

  category = [
    { name: 'Priority', value: 'priority' },
    { name: 'Type', value: 'type' },
    { name: 'Type Sub', value: 'typeSub' },
    { name: 'Stakeholder', value: 'stakeholder' },
    { name: 'Failure Type', value: 'failureType' },
    { name: 'Component Type', value: 'componentType' },
    { name: 'Status', value: 'status' },
    { name: 'Platform Type', value: 'platformType' },
    { name: 'Customer', value: 'customerName' },
    { name: 'Status Reason', value: 'statusReason' }
  ]


}
