import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { states } from '@app/core/data/states';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule
  ],
  selector: 'app-service-type-form',
  templateUrl: './service-type-form.component.html',
  styleUrls: ['./service-type-form.component.scss']
})
export class ServiceTypeFormComponent {

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form)
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  states = states

  priceTables: any = []

  @Input() submitted = false;

  get f() {
    return this.form.controls
  }

  form = this.fb.group({
    name: [''],
    description: [''],
    font_color: [''],
    background_color: [''],
    active: [1],
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

}
