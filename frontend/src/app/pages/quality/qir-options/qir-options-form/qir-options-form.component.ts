import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';

export const QIR_CATEGORIES = [
  { id: null, slug: 'priority',      label: 'Priority' },
  { id: null, slug: 'status',        label: 'Status' },
  { id: null, slug: 'statusReason',  label: 'Status Reason' },
  { id: null, slug: 'type',          label: 'Incident Type' },
  { id: null, slug: 'typeSub',       label: 'Incident Sub-Type' },
  { id: null, slug: 'componentType', label: 'Component Type' },
  { id: null, slug: 'platformType',  label: 'Platform Type' },
  { id: null, slug: 'failureType',   label: 'Failure Type' },
  { id: null, slug: 'stakeholder',   label: 'Stakeholder' },
  { id: null, slug: 'customerName',  label: 'Customer Name' },
];

@Component({
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  selector: 'app-qir-options-form',
  templateUrl: './qir-options-form.component.html',
})
export class QirOptionsFormComponent implements OnInit {
  constructor(private fb: FormBuilder) {}

  @Output() setFormEmitter = new EventEmitter<any>();
  @Input() submitted = false;
  @Input() categories: any[] = QIR_CATEGORIES;

  get f() { return this.form.controls; }

  get selectedCategorySlug(): string | null {
    const catId = this.form.value.category_id;
    const found = this.categories.find(c => c.id === catId);
    return found?.slug ?? null;
  }

  form = this.fb.group({
    category_id:    [null as number | null, Validators.required],
    name:           ['', Validators.required],
    code:           [''],
    description:    [''],
    show_in_public: [1],
    sort_order:     [0],
    active:         [1],
  });

  ngOnInit() {
    this.setFormEmitter.emit(this.form);
  }
}
