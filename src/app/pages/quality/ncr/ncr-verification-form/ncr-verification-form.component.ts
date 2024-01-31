import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
  ],
  selector: 'app-ncr-verification-form',
  templateUrl: './ncr-verification-form.component.html',
  styleUrls: []
})
export class NcrVerificationFormComponent {

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form)
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  formData

  get f() {
    return this.form.controls
  }

  form = this.fb.group({
    //qa only
    verif_of_ca_by: [''],
    verif_of_ca_dt: [null],
    eff_verif_of_ca_by: [''],
    eff_verif_of_ca_dt: [null],
    cmt_cls_by: [''],
    cmt_cls_dt: [null],
  })

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }


}
