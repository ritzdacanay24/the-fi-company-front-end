import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-ul-generator',
  templateUrl: './ul-generator.component.html',
  styleUrls: ['./ul-generator.component.scss']
})
export class ULGeneratorComponent {
  @Output() labelsGenerated = new EventEmitter<number>();
  @Output() manualLabelAdded = new EventEmitter<{ulNumber: string, description: string}>();

  addForm: FormGroup;
  showAddForm = false;

  constructor(private fb: FormBuilder) {
    this.addForm = this.fb.group({
      ulNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      description: ['', Validators.required]
    });
  }

  generateLabels(count: number) {
    this.labelsGenerated.emit(count);
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.addForm.reset();
    }
  }

  addManualLabel() {
    if (this.addForm.valid) {
      const formValue = this.addForm.value;
      this.manualLabelAdded.emit({
        ulNumber: formValue.ulNumber,
        description: formValue.description
      });
      this.addForm.reset();
      this.showAddForm = false;
    }
  }
}
