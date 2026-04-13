import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SerialNumberService } from '@app/core/services/serial-number.service';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-quick-serial-generator',
  template: `
    <div class="btn-group btn-group-sm">
      <button type="button" class="btn btn-outline-primary" (click)="generateQuick('simple')" 
              title="Generate simple serial (YYMMDD + 3 digits)">
        <i class="mdi mdi-numeric me-1"></i>Simple
      </button>
      <button type="button" class="btn btn-outline-primary" (click)="generateQuick('standard')" 
              title="Generate standard serial (SN-YYYYMMDD-4 digits)">
        <i class="mdi mdi-barcode me-1"></i>Standard
      </button>
      <button type="button" class="btn btn-outline-primary" (click)="generateQuick('timestamp')" 
              title="Generate timestamp based serial">
        <i class="mdi mdi-clock me-1"></i>Timestamp
      </button>
    </div>
  `,
  styles: [`
    .btn-group-sm .btn {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }
  `]
})
export class QuickSerialGeneratorComponent {
  @Output() serialGenerated = new EventEmitter<string>();
  @Input() showLabels: boolean = true;

  constructor(private serialNumberService: SerialNumberService) {}

  generateQuick(type: 'simple' | 'standard' | 'detailed' | 'timestamp') {
    const serialNumber = this.serialNumberService.generateQuick(type);
    this.serialGenerated.emit(serialNumber);
  }
}
