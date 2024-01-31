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
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent {

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
    access: [''],
    active: [1],
    area: [''],
    attempts: [''],
    createdDate: [''],
    email: [''],
    first: [''],
    last: [''],
    leadInstaller: [0],
    title: [''],
    workPhone: [''],
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

}
