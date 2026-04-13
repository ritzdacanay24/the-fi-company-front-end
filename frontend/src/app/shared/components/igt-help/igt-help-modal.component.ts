import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-igt-help-modal',
  template: `
    <div class="modal-header border-0 p-3">
      <h5 class="modal-title d-flex align-items-center">
        <i class="mdi" [ngClass]="helpType === 'serial-numbers' ? 'mdi-database' : 'mdi-download'" class="me-2 text-primary"></i>
        {{helpType === 'serial-numbers' ? 'Serial Numbers' : 'IGT Loader'}} Help & Documentation
      </h5>
      <button type="button" class="btn-close" (click)="activeModal.dismiss()" aria-label="Close"></button>
    </div>
    <div class="modal-body p-0">
      <app-igt-help 
        [helpType]="helpType" 
        [showInModal]="true"
        [initialCategory]="initialCategory"
        [initialSection]="initialSection"
        #helpComponent>
      </app-igt-help>
    </div>
    <div class="modal-footer border-0 p-3 bg-light">
      <div class="d-flex justify-content-between w-100 align-items-center">
        <div class="text-muted small d-flex align-items-center">
          <i class="mdi mdi-information-outline me-1"></i>
          Use <kbd>Ctrl+P</kbd> to print this help documentation
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-primary btn-sm" (click)="helpComponent.printHelp()">
            <i class="mdi mdi-printer me-1"></i>
            Print
          </button>
          <button type="button" class="btn btn-secondary btn-sm" (click)="activeModal.dismiss()">
            <i class="mdi mdi-close me-1"></i>
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    ::ng-deep .modal-dialog {
      max-width: 95vw;
      height: 90vh;
    }
    
    ::ng-deep .modal-content {
      height: 100%;
      border: none;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      border-radius: 12px;
    }
    
    ::ng-deep .modal-body {
      height: calc(100% - 120px);
      overflow: hidden;
    }
    
    .modal-header {
      flex-shrink: 0;
    }
    
    .modal-footer {
      flex-shrink: 0;
    }
    
    kbd {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 3px;
      padding: 2px 4px;
      font-size: 0.75rem;
    }
  `]
})
export class IgtHelpModalComponent implements OnInit {
  @Input() helpType: 'serial-numbers' | 'loader' = 'serial-numbers';
  @Input() initialCategory?: string;
  @Input() initialSection?: string;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit() {
    // Handle initial navigation if specified
    if (this.initialCategory || this.initialSection) {
      // Will be handled by the help component after it initializes
    }
  }
}
