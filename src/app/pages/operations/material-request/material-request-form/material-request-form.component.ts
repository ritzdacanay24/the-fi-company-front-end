import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators, } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { QadPartSearchComponent } from '@app/shared/components/qad-part-search/qad-part-search.component';
import materialRequestFormJson from './material-request-form.json';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    QadPartSearchComponent
  ],
  selector: 'app-material-request-form',
  templateUrl: './material-request-form.component.html',
  styleUrls: ['./material-request-form.component.scss'],
})
export class MaterialRequestFormComponent {

  constructor(
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.setFormEmitter.emit(this.form);
  }

  @Output() setFormEmitter: EventEmitter<any> = new EventEmitter();

  @Input() submitted = false; disableValidation
  @Input() onDeleteItem: Function;
  @Input() onActiveChange: Function;


  @Input() addMoreItems: Function = () => {
    this.details = this.form.get('details') as FormArray;

    let lastIndex = this.details.value[this.details?.value?.length - 1];
    this.details.push(this.fb.group({
      partNumber: new FormControl(null, Validators.required),
      reasonCode: new FormControl(lastIndex?.reasonCode || null, Validators.required),
      qty: new FormControl(null, Validators.required),
      trType: new FormControl(null),
      ac_code: new FormControl(null),
      notes: new FormControl(''),
    }))
  };

  get f() {
    return this.form.get('main')['controls']
  }

  details: FormArray;

  get getDetails() {
    return this.form.get('details') as FormArray
  }

  materialRequestForm = materialRequestFormJson;

  form = this.fb.group({
    main: this.fb.group({
      active: new FormControl(1),
      assemblyNumber: new FormControl('', Validators.required),
      createdBy: new FormControl(null),
      createdDate: new FormControl(null),
      deleteReason: new FormControl(''),
      deleteReasonBy: new FormControl(null),
      deleteReasonDate: new FormControl(null),
      dueDate: new FormControl(null, Validators.required),
      info: new FormControl(''),
      isCableRequest: new FormControl(''),
      lineNumber: new FormControl('', Validators.required),
      pickList: new FormControl('', Validators.required),
      pickedCompletedDate: new FormControl(null),
      priority: new FormControl('Low'),
      requestor: new FormControl('', Validators.required),
      specialInstructions: new FormControl(''),
      validated: new FormControl(null),
    }),
    details: this.fb.array([
    ]),
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

  notifyParent($event, index, row) {
    row.patchValue({ partNumber: $event.pt_part });
  }

}
