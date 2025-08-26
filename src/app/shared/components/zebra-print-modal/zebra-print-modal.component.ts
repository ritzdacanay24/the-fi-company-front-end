import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { ZebraLabelService, ZebraLabelTemplate } from '@app/shared/services/zebra-label.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-zebra-print-modal',
  template: `
    <div class="modal-header">
      <h5 class="modal-title">
        <i class="mdi mdi-printer-settings me-2"></i>Advanced Zebra Label Printing
      </h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="dismiss()"></button>
    </div>

    <div class="modal-body">
      <form [formGroup]="printForm">
        <!-- Serial Number Display -->
        <div class="row mb-3">
          <div class="col-12">
            <div class="card bg-light">
              <div class="card-body">
                <h6 class="card-title">Serial Number</h6>
                <div class="h5 text-primary mb-0">{{ serialNumber }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Template Selection -->
        <div class="row mb-3">
          <div class="col-12">
            <label class="form-label">Label Template</label>
            <select class="form-select" formControlName="templateId" (ngModelChange)="onTemplateChange($event)">
              <option *ngFor="let template of templates" [value]="template.id">
                {{ template.name }} - {{ template.size }} ({{ template.orientation }})
              </option>
            </select>
            <div class="form-text">
              {{ getSelectedTemplate()?.description }}
            </div>
          </div>
        </div>

        <!-- Print Quantity -->
        <div class="row mb-3">
          <div class="col-md-6">
            <label class="form-label">Quantity</label>
            <input type="number" class="form-control" formControlName="quantity" min="1" max="100">
          </div>
          <div class="col-md-6">
            <label class="form-label">Starting Number (if sequential)</label>
            <input type="number" class="form-control" formControlName="startingNumber" min="1">
            <div class="form-text">Leave blank for identical labels</div>
          </div>
        </div>

        <!-- Additional Fields -->
        <div class="row mb-3">
          <div class="col-md-6">
            <label class="form-label">Part Number (Optional)</label>
            <input type="text" class="form-control" formControlName="partNumber" placeholder="e.g., PART123">
          </div>
          <div class="col-md-6">
            <label class="form-label">Batch/Lot Number (Optional)</label>
            <input type="text" class="form-control" formControlName="batchNumber" placeholder="e.g., LOT001">
          </div>
        </div>

        <!-- Print Options -->
        <div class="row mb-3">
          <div class="col-12">
            <div class="card">
              <div class="card-header">
                <h6 class="card-title mb-0">Print Options</h6>
              </div>
              <div class="card-body">
                <div class="form-check mb-2">
                  <input class="form-check-input" type="checkbox" formControlName="includeDate" id="includeDate">
                  <label class="form-check-label" for="includeDate">
                    Include current date/time on label
                  </label>
                </div>
                <div class="form-check mb-2">
                  <input class="form-check-input" type="checkbox" formControlName="printPreview" id="printPreview">
                  <label class="form-check-label" for="printPreview">
                    Show print preview before sending to printer
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ZPL Preview -->
        <div class="row mb-3" *ngIf="showPreview">
          <div class="col-12">
            <div class="card border-info">
              <div class="card-header bg-light">
                <h6 class="card-title mb-0 text-info">ZPL Preview</h6>
              </div>
              <div class="card-body">
                <pre class="bg-light p-3 rounded small"><code>{{ getZplPreview() }}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>

    <div class="modal-footer">
      <div class="me-auto">
        <button type="button" class="btn btn-outline-info btn-sm" (click)="togglePreview()">
          <i class="mdi mdi-eye me-1"></i>{{ showPreview ? 'Hide' : 'Show' }} Preview
        </button>
      </div>
      <button type="button" class="btn btn-outline-secondary" (click)="dismiss()">
        <i class="mdi mdi-close me-1"></i>Cancel
      </button>
      <button type="button" class="btn btn-success" (click)="downloadZpl()" [disabled]="!printForm.valid">
        <i class="mdi mdi-download me-1"></i>Download ZPL
      </button>
      <button type="button" class="btn btn-primary" (click)="printLabels()" [disabled]="!printForm.valid">
        <i class="mdi mdi-printer me-1"></i>Print {{ printForm.get('quantity')?.value || 1 }} Label(s)
      </button>
    </div>
  `,
  styleUrls: []
})
export class ZebraPrintModalComponent {
  @Input() serialNumber: string = '';
  @Input() selectedTemplateId: string = 'serial-number-standard';

  printForm: FormGroup;
  templates: ZebraLabelTemplate[] = [];
  showPreview: boolean = false;

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private fb: FormBuilder,
    private zebraLabelService: ZebraLabelService,
    private toastrService: ToastrService
  ) {
    this.templates = this.zebraLabelService.getTemplates();
    this.initializeForm();
  }

  ngOnInit() {
    if (this.selectedTemplateId) {
      this.printForm.patchValue({ templateId: this.selectedTemplateId });
    }
  }

  private initializeForm() {
    this.printForm = this.fb.group({
      templateId: [this.selectedTemplateId, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      startingNumber: [null],
      partNumber: [''],
      batchNumber: [''],
      includeDate: [true],
      printPreview: [false]
    });
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close(result?: any) {
    this.ngbActiveModal.close(result);
  }

  onTemplateChange(templateId: string) {
    // Template changed, could update preview here
  }

  getSelectedTemplate(): ZebraLabelTemplate | undefined {
    const templateId = this.printForm.get('templateId')?.value;
    return this.templates.find(t => t.id === templateId);
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  getZplPreview(): string {
    const formValue = this.printForm.value;
    if (!formValue.templateId || !this.serialNumber) {
      return 'No template selected or serial number missing';
    }

    try {
      return this.zebraLabelService.previewLabel(formValue.templateId, this.serialNumber, {
        quantity: formValue.quantity,
        partNumber: formValue.partNumber,
        batchNumber: formValue.batchNumber,
        includeDate: formValue.includeDate
      });
    } catch (error) {
      return `Error generating preview: ${error.message}`;
    }
  }

  printLabels() {
    const formValue = this.printForm.value;
    
    if (!this.serialNumber) {
      this.toastrService.error('Serial number is required');
      return;
    }

    const quantity = formValue.quantity;
    const startingNumber = formValue.startingNumber;

    // If starting number is provided, generate sequential labels
    if (startingNumber && quantity > 1) {
      for (let i = 0; i < quantity; i++) {
        const sequentialSerialNumber = this.serialNumber.replace(/\d+$/, (startingNumber + i).toString());
        this.zebraLabelService.printLabel(formValue.templateId, sequentialSerialNumber, {
          quantity: 1,
          partNumber: formValue.partNumber,
          batchNumber: formValue.batchNumber,
          includeDate: formValue.includeDate
        });
      }
    } else {
      // Print identical labels
      this.zebraLabelService.printLabel(formValue.templateId, this.serialNumber, {
        quantity: quantity,
        partNumber: formValue.partNumber,
        batchNumber: formValue.batchNumber,
        includeDate: formValue.includeDate
      });
    }

    this.close({ printed: true, quantity: quantity });
  }

  downloadZpl() {
    const formValue = this.printForm.value;
    
    if (!this.serialNumber) {
      this.toastrService.error('Serial number is required');
      return;
    }

    this.zebraLabelService.downloadZplFile(formValue.templateId, this.serialNumber, {
      quantity: formValue.quantity,
      partNumber: formValue.partNumber,
      batchNumber: formValue.batchNumber,
      includeDate: formValue.includeDate
    });
  }
}
