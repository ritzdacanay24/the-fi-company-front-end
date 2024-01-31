import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { NgSelectModule } from '@ng-select/ng-select';
import { IShortagesForm } from './shortages-form.type';
import { QadPartSearchComponent } from '@app/shared/components/qad-part-search/qad-part-search.component';
import { states } from '@app/core/data/states';
import { SharedModule } from '@app/shared/shared.module';
import { ControlsOf } from 'src/assets/js/util/_formGroup';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    QadPartSearchComponent
  ],
  selector: 'app-shortages-form',
  templateUrl: './shortages-form.component.html',
})
export class ShortagesFormComponent {

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

  form = new FormGroup<ControlsOf<IShortagesForm>>({
    jobNumber: new FormControl(''),
    woNumber: new FormControl(''),
    lineNumber: new FormControl(''),
    dueDate: new FormControl(''),
    reasonPartNeeded: new FormControl(null),
    priority: new FormControl(null),
    partNumber: new FormControl(null),
    qty: new FormControl(''),
    createdBy: new FormControl(''),
    createdDate: new FormControl(''),
    active: new FormControl(1),
    status: new FormControl(''),
    deleted_main_date: new FormControl(null),
    deleted_main_user: new FormControl(null),
    active_line: new FormControl(1),
    comments: new FormControl(''),
    partDesc: new FormControl(''),
    buyer: new FormControl(''),
    assemblyNumber: new FormControl(''),
    supplyCompleted: new FormControl(null),
    receivingCompleted: new FormControl(null),
    deliveredCompleted: new FormControl(null),
    supplyCompletedBy: new FormControl(null),
    receivingCompletedBy: new FormControl(null),
    deliveredCompletedBy: new FormControl(null),
    productionIssuedDate: new FormControl(null),
    productionIssuedBy: new FormControl(null),
    graphicsShortage: new FormControl(false),
    poNumber: new FormControl(''),
    supplier: new FormControl(''),
    mrfId: new FormControl(null),
    mrf_line: new FormControl(null),
  });

  setBooleanToNumber(key) {
    let e = this.form.value[key]
    this.form.get(key).patchValue(e ? 1 : 0)
  }

  formValidator(key: any) {
    if (this.form.get(key)?.validator === null) return '';
    const validator = this.form.get(key)?.validator({} as AbstractControl);
    if (validator && validator['required']) return 'required';
    return ''
  }

  priorityOptions = ['Low', 'Medium', 'High']
  reasonCodeOptions = ['Service', 'MRB Replacement', 'Item Not On Bom', 'Proto', 'Shortages', 'Inventory Discrepancy', 'Material request shortages']

  notifyParent($event) {
    this.form.patchValue({ partDesc: $event.description, partNumber: $event.pt_part })
  }

}
