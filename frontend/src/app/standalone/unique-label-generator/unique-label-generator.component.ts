import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UniqueLabelGeneratorApiService } from './unique-label-generator-api.service';

@Component({
  selector: 'app-unique-label-generator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './unique-label-generator.component.html',
  styleUrl: './unique-label-generator.component.scss',
})
export class UniqueLabelGeneratorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UniqueLabelGeneratorApiService);
  private readonly toastr = inject(ToastrService);

  readonly sourceTypes = [
    { label: 'Work Order', value: 'WO' },
    { label: 'Manual', value: 'MANUAL' },
  ];

  readonly form = this.fb.group({
    source_type: this.fb.nonNullable.control<'WO' | 'MANUAL'>('WO'),
    work_order_number: this.fb.nonNullable.control('', [Validators.maxLength(64)]),
    part_number: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(128)]),
    quantity: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1), Validators.max(200)]),
    created_by_name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(128)]),
  });

  isLoadingWo = false;
  isGenerating = false;
  generatedBatchId: number | null = null;
  generatedIdentifiers: Array<{
    unique_identifier: string;
    part_number: string;
    work_order_number: string | null;
    quantity_printed: number;
  }> = [];

  constructor() {
    this.form.controls.source_type.valueChanges.subscribe((value) => {
      if (value === 'MANUAL') {
        this.form.controls.work_order_number.setValue('');
      }
    });

  }

  get isWorkOrderMode(): boolean {
    return this.form.controls.source_type.value === 'WO';
  }

  async lookupWorkOrder(): Promise<void> {
    const woNumber = this.form.controls.work_order_number.value.trim();
    if (!woNumber) {
      this.toastr.warning('Enter a work order number first.');
      return;
    }

    this.isLoadingWo = true;
    try {
      const response = await this.api.lookupWorkOrder(woNumber);

      if (!response.success || !response.data) {
        this.toastr.error(response.message || 'Work order not found.');
        return;
      }

      this.form.patchValue({
        part_number: response.data.part_number || '',
        quantity: Math.max(1, Number(response.data.quantity || 1)),
      });

      this.toastr.success('Work order loaded.');
    } catch (error) {
      this.toastr.error('Failed to lookup work order.');
      console.error(error);
    } finally {
      this.isLoadingWo = false;
    }
  }

  async generateBatch(): Promise<void> {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.toastr.warning('Please complete all required fields.');
      return;
    }

    if (this.isWorkOrderMode && !this.form.controls.work_order_number.value.trim()) {
      this.toastr.warning('Work order number is required in WO mode.');
      return;
    }

    const payload = {
      source_type: this.form.controls.source_type.value,
      work_order_number: this.form.controls.work_order_number.value.trim() || null,
      part_number: this.form.controls.part_number.value.trim(),
      quantity: this.form.controls.quantity.value,
      created_by_name: this.form.controls.created_by_name.value.trim(),
    };

    this.isGenerating = true;
    try {
      const response = await this.api.createBatch(payload);

      if (!response.success || !response.data) {
        this.toastr.error(response.message || 'Failed to generate labels.');
        return;
      }

      this.generatedBatchId = response.data.batch_id;
      this.generatedIdentifiers = response.data.identifiers || [];
      this.toastr.success(`Generated ${this.generatedIdentifiers.length} unique labels.`);
    } catch (error) {
      this.toastr.error('Failed to generate labels.');
      console.error(error);
    } finally {
      this.isGenerating = false;
    }
  }

  printGenerated(): void {
    if (!this.generatedIdentifiers.length) {
      return;
    }

    const printableRows = this.generatedIdentifiers
      .map((item) => {
        return `
          <div class="label-card">
            <div class="label-title">Unique Label</div>
            <div class="label-id">${item.unique_identifier}</div>
            <div class="label-line"><strong>Part:</strong> ${item.part_number}</div>
            <div class="label-line"><strong>Qty Printed:</strong> ${item.quantity_printed}</div>
          </div>
        `;
      })
      .join('');

    const popup = window.open('', '_blank', 'width=1000,height=760');
    if (!popup) {
      this.toastr.warning('Allow popups to print labels.');
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Unique Label Batch ${this.generatedBatchId ?? ''}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 16px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
            .label-card { border: 1px solid #111; border-radius: 8px; padding: 12px; min-height: 150px; }
            .label-title { font-size: 14px; color: #444; margin-bottom: 10px; }
            .label-id { font-size: 32px; font-weight: 700; margin-bottom: 10px; letter-spacing: 1px; }
            .label-line { font-size: 16px; margin-bottom: 6px; }
          </style>
        </head>
        <body>
          <h2>Unique Label Generator</h2>
          <p>Batch ID: ${this.generatedBatchId ?? '-'}</p>
          <div class="grid">${printableRows}</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    popup.document.close();
  }
}
