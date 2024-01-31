import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule
  ],
  selector: 'app-non-billable-code-form',
  templateUrl: './non-billable-code-form.component.html',
  styleUrls: ['./non-billable-code-form.component.scss']
})
export class NonBillableCodeFormComponent {

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
    name: [],
    description: [''],
    code: [''],
    active: [1],
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }
}
