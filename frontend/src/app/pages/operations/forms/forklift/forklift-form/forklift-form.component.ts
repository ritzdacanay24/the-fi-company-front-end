import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { MyFormGroup } from 'src/assets/js/util/_formGroup';
import { IForkliftForm } from './forklift-form.type';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-forklift-form',
  templateUrl: './forklift-form.component.html',
})
export class ForkliftFormComponent {
  @Input() submitted = false;
  @Output() setFormEmitter = new EventEmitter<MyFormGroup<IForkliftForm>>();

  form: MyFormGroup<IForkliftForm>;

  constructor(private readonly fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      forklift_type: ['', [Validators.required, Validators.maxLength(120)]],
      unit_number: ['', [Validators.required, Validators.maxLength(60)]],
      model_name: ['', [Validators.maxLength(120)]],
      serial_number: ['', [Validators.maxLength(150)]],
      department: ['', [Validators.maxLength(60)]],
      fuel_type: ['', [Validators.maxLength(60)]],
      year: ['', [Validators.maxLength(10)]],
      created_by: [null],
      created_date: [''],
      active: [1],
      include_in_inspection_report: [1],
    }) as MyFormGroup<IForkliftForm>;

    this.setFormEmitter.emit(this.form);
  }

  get f() {
    return this.form?.controls;
  }
}
