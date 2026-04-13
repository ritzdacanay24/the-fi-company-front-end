import { Component, Input, ViewChild, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@app/shared/shared.module';
import { MaterialRequestValidateComponent } from '../material-request-validate-v1/material-request-validate.component';

@Component({
  standalone: true,
  imports: [SharedModule, MaterialRequestValidateComponent],
  selector: 'app-material-request-validation-modal',
  templateUrl: './material-request-validation-modal.component.html',
  styleUrls: ['./material-request-validation-modal.component.scss']
})
export class MaterialRequestValidationModalComponent implements OnInit {
  @Input() request: any;
  
  @ViewChild('validateComponent') validateComponent!: MaterialRequestValidateComponent;

  // Flags to prevent duplicate operations
  isValidating = false;
  isSaving = false;

  // No-op function to prevent navigation from child component
  noOpFunction = () => {};

  // Computed property to get the correct request ID
  get requestId() {
    if (!this.request) return null;
    return this.request.id || 
           this.request.requestId || 
           this.request.materialRequestId || 
           this.request.request_id ||
           this.request.material_request_id ||
           null;
  }

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit() {
    console.log('Validation modal initialized with request:', this.request);
    console.log('Request ID candidates:', {
      id: this.request?.id,
      requestId: this.request?.requestId,
      materialRequestId: this.request?.materialRequestId,
      request_id: this.request?.request_id,
      material_request_id: this.request?.material_request_id
    });
    console.log('Final computed requestId:', this.requestId);
    
    if (!this.requestId) {
      console.error('No valid request ID found in request object:', this.request);
    }
  }

  onClose(result?: string) {
    this.activeModal.close(result || 'cancelled');
  }

  async onValidateRequest() {
    console.log('🎯 Modal: onValidateRequest called');
    
    // Prevent multiple concurrent validations
    if (this.isValidating || this.validateComponent?.isLoading) {
      console.log('🚫 Modal: Already validating, preventing duplicate');
      return;
    }

    this.isValidating = true;
    
    if (this.validateComponent) {
      try {
        // Call the validation method from the child component
        await this.validateComponent.onSubmitAndSendToPicking();
        console.log('✅ Modal: Validation completed successfully');
        this.activeModal.close('validated');
      } catch (error) {
        console.error('❌ Modal: Validation failed:', error);
        // Error handling is done in the child component
      } finally {
        this.isValidating = false;
      }
    } else {
      this.isValidating = false;
    }
  }

  async onSaveRequest() {
    console.log('💾 Modal: onSaveRequest called');
    
    // Prevent multiple concurrent saves
    if (this.isSaving || this.validateComponent?.isLoading) {
      console.log('🚫 Modal: Already saving, preventing duplicate');
      return;
    }

    this.isSaving = true;
    
    if (this.validateComponent) {
      try {
        // Call the bulk save method from the child component
        await this.validateComponent.onBulkSaveChanges();
        console.log('✅ Modal: Save completed successfully');
        this.activeModal.close('updated');
      } catch (error) {
        console.error('❌ Modal: Save failed:', error);
        // Error handling is done in the child component
      } finally {
        this.isSaving = false;
      }
    } else {
      this.isSaving = false;
    }
  }
}
