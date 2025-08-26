import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../../../../shared/shared.module';
import { MaterialRequestPickingImprovedComponent } from '../material-request-picking-improved/material-request-picking-improved.component';

@Component({
  selector: 'app-material-request-picking-modal',
  standalone: true,
  imports: [SharedModule, MaterialRequestPickingImprovedComponent],
  templateUrl: './material-request-picking-modal.component.html',
  styleUrl: './material-request-picking-modal.component.scss'
})
export class MaterialRequestPickingModalComponent implements OnInit {
  @Input() request: any;
  @Input() viewMode: boolean = false; // Read-only mode
  @Input() editMode: boolean = true; // Enable editing by default
  @Input() focusOnQuantities: boolean = false; // Focus on qty entry
  @Input() showPickingProgress: boolean = false; // Show current progress
  @Input() showShortageEntry: boolean = false; // Enable shortage entry
  @Input() printMode: boolean = false; // Special flag for print mode
  @Input() autoStartPicking: boolean = false; // Flag to auto-transition
  
  @ViewChild('pickingComponent', { static: false }) pickingComponent!: MaterialRequestPickingImprovedComponent;

  constructor(
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit() {
    // Component initialization
  }

  onClose() {
    // Check if quantities were modified and return appropriate result
    if (this.focusOnQuantities) {
      this.activeModal.close('quantities_entered');
    } else {
      this.activeModal.close('closed');
    }
  }

  async onPrintPickingSheet() {
    if (this.request && this.pickingComponent) {
      // Wait a moment for the component to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use the picking component's selectedRequest data if available, otherwise use the request passed to modal
      const requestToPrint = this.pickingComponent.selectedRequest || this.request;
      
      // Ensure the request has the required properties
      if (!requestToPrint.details) {
        console.warn('Request details not loaded yet, trying to load...');
        // If details aren't loaded, wait a bit more for the component to finish loading
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Check if the print template exists
      const printElement = document.getElementById('pickSheet-' + requestToPrint.id);
      if (!printElement) {
        console.error('Print template not found for request:', requestToPrint.id);
        return;
      }
      
      // Call the print method from the picking component directly
      if (this.pickingComponent.selectedRequest) {
        this.pickingComponent.onPrint(this.pickingComponent.selectedRequest);
      } else {
        console.error('Picking component not ready for printing');
      }
    }
  }

  async onSaveQuantities() {
    if (this.request && this.pickingComponent) {
      try {
        // Call the save method on the picking component
        await this.pickingComponent.onSaveQuantities(this.pickingComponent.selectedRequest || this.request);
        // Close modal with success result
        this.activeModal.close('quantities_saved');
      } catch (error) {
        console.error('Error saving quantities from modal:', error);
        // Don't close modal on error - let user try again
      }
    }
  }
}
