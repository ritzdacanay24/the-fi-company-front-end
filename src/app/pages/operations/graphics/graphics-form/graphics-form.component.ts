import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { AddTagFn } from '@ng-select/ng-select/lib/ng-select.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { IGraphicsForm } from './graphics-form.type';
import { ControlsOf } from 'src/assets/js/util/_formGroup';
import { validateEmail } from 'src/assets/js/util/validateEmail';
import { states } from '@app/core/data/states';
import { SoSearchComponent } from '@app/shared/components/so-search/so-search.component';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    SoSearchComponent
  ],
  selector: 'app-graphics-form',
  templateUrl: './graphics-form.component.html',
})
export class GraphicsFormComponent {

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false;

  get f() {
    return this.form.controls
  }

  states = states;

  form = new FormGroup<ControlsOf<IGraphicsForm>>({
    customer: new FormControl(null),
    customerPartNumber: new FormControl(''),
    description: new FormControl(''),
    dueDate: new FormControl(null),
    graphicsWorkOrder: new FormControl(null),
    itemNumber: new FormControl(''),
    ordered_date: new FormControl(null),
    qty: new FormControl(''),
    active: new FormControl(1),
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

  addTag: AddTagFn | boolean = (e) => {
    let ee = validateEmail(e);

    if (!ee) {
      alert('Not valid email.')
      return false;
    }
    return validateEmail(e) ? e : false
  }

  formValidator(key: any) {
    if (this.form.get(key)?.validator === null) return '';
    const validator = this.form.get(key)?.validator({} as AbstractControl);
    if (validator && validator['required']) return 'required';
    return ''
  }

}
