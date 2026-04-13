import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SerialNumberGeneratorComponent } from '../serial-number-generator/serial-number-generator.component';
import { SerialNumberService } from '@app/core/services/serial-number.service';
import { SharedModule } from '@app/shared/shared.module';
import { NgxBarcode6Module } from 'ngx-barcode6';

@Component({
  standalone: true,
  imports: [SharedModule, SerialNumberGeneratorComponent, NgxBarcode6Module],
  selector: 'app-serial-number-modal',
  templateUrl: './serial-number-modal.component.html',
  styleUrls: ['./serial-number-modal.component.scss']
})
export class SerialNumberModalComponent {
  @Input() title: string = 'Generate Serial Number';
  @Input() showForm: boolean = true;
  @Input() config: any = {};
  @Input() returnMultiple: boolean = false;
  @Input() batchCount: number = 1;

  generatedSerialNumber: string = '';
  generatedBatch: string[] = [];

  constructor(
    private ngbActiveModal: NgbActiveModal,
    private serialNumberService: SerialNumberService
  ) {}

  onSerialNumberGenerated(serialNumber: string) {
    this.generatedSerialNumber = serialNumber;
  }

  onConfigChanged(config: any) {
    this.config = config;
  }

  generateBatch() {
    if (this.batchCount > 1) {
      // Use template_id and prefix from config or fallback to defaults
      const template_id = this.config?.template_id || 'PROD_001';
      const prefix = this.config?.prefix || 'PRD';
      
      this.serialNumberService.generateBatch(template_id, prefix, this.batchCount)
        .subscribe({
          next: (response) => {
            if (response.success && response.serials) {
              // Extract serial_number from each object
              this.generatedBatch = response.serials.map((s: any) => s.serial_number || s);
            } else {
              console.error('Batch generation failed:', response.error);
              // Fallback to local generation
              this.generatedBatch = this.serialNumberService.generateBatchLocal(this.batchCount, this.config);
            }
          },
          error: (error) => {
            console.error('Batch generation failed:', error);
            // Fallback to local generation
            this.generatedBatch = this.serialNumberService.generateBatchLocal(this.batchCount, this.config);
          }
        });
    }
  }

  dismiss() {
    this.ngbActiveModal.dismiss('dismiss');
  }

  close() {
    if (this.returnMultiple && this.generatedBatch.length > 0) {
      this.ngbActiveModal.close(this.generatedBatch);
    } else {
      this.ngbActiveModal.close(this.generatedSerialNumber);
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Serial number copied to clipboard');
    });
  }
}
