import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule
  ],
  selector: 'app-customer-form',
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss']
})
export class CustomerFormComponent {

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
    name: [''],
    image: [''],
    active: [1],
    background_color: ''
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

}
