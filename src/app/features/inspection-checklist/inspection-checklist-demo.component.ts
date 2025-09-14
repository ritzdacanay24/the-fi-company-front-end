import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InspectionChecklistComponent, ChecklistConfig, ChecklistItem } from './inspection-checklist.component';
import { InspectionChecklistService } from './inspection-checklist.service';

@Component({
  selector: 'app-inspection-checklist-demo',
  standalone: true,
  imports: [CommonModule, InspectionChecklistComponent],
  template: `
    <div class="container-fluid py-4">
      <div class="row justify-content-center">
        <div class="col-12 col-xl-10">
          
          <!-- Header -->
          <div class="mb-4">
            <h2 class="text-primary mb-2">Inspection Checklist Demo</h2>
            <p class="text-muted">Test different checklist configurations</p>
          </div>

          <!-- Configuration Selector -->
          <div class="card mb-4">
            <div class="card-body">
              <h5 class="card-title">Select Checklist Type</h5>
              <div class="row g-3">
                <div class="col-md-6 col-lg-3">
                  <button class="btn btn-outline-primary w-100" 
                          [class.active]="activeConfig === 'photo'"
                          (click)="loadPhotoInspection()">
                    <i class="mdi mdi-camera me-2"></i>Photo Inspection
                  </button>
                </div>
                <div class="col-md-6 col-lg-3">
                  <button class="btn btn-outline-secondary w-100" 
                          [class.active]="activeConfig === 'shipping'"
                          (click)="loadShippingChecklist()">
                    <i class="mdi mdi-truck me-2"></i>Shipping
                  </button>
                </div>
                <div class="col-md-6 col-lg-3">
                  <button class="btn btn-outline-success w-100" 
                          [class.active]="activeConfig === 'quality'"
                          (click)="loadQualityControl()">
                    <i class="mdi mdi-shield-check me-2"></i>Quality Control
                  </button>
                </div>
                <div class="col-md-6 col-lg-3">
                  <button class="btn btn-outline-info w-100" 
                          [class.active]="activeConfig === 'custom'"
                          (click)="loadCustomChecklist()">
                    <i class="mdi mdi-cog me-2"></i>Custom
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Checklist Component -->
          <div class="row" *ngIf="currentChecklist">
            <div class="col-12">
              <div class="card">
                <div class="card-body">
                  <app-inspection-checklist 
                    [config]="currentChecklist"
                    [readonly]="false"
                    (completed)="onChecklistCompleted($event)"
                    (itemChanged)="onItemChanged($event)">
                  </app-inspection-checklist>
                </div>
              </div>
            </div>
          </div>

          <!-- Debug/Export Section -->
          <div class="card mt-4" *ngIf="currentChecklist">
            <div class="card-header">
              <h5 class="mb-0">Actions & Debug</h5>
            </div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <button class="btn btn-success w-100" 
                          (click)="validateChecklist()"
                          [disabled]="!currentChecklist">
                    <i class="mdi mdi-check-circle me-2"></i>Validate Checklist
                  </button>
                </div>
                <div class="col-md-6">
                  <button class="btn btn-primary w-100" 
                          (click)="exportData()"
                          [disabled]="!currentChecklist">
                    <i class="mdi mdi-download me-2"></i>Export Data
                  </button>
                </div>
              </div>
              
              <!-- Validation Results -->
              <div class="mt-3" *ngIf="validationResult">
                <div class="alert" 
                     [class.alert-success]="validationResult.isValid"
                     [class.alert-warning]="!validationResult.isValid">
                  <h6 class="alert-heading">
                    <i class="mdi" 
                       [class.mdi-check-circle]="validationResult.isValid"
                       [class.mdi-alert-circle]="!validationResult.isValid"></i>
                    Validation {{validationResult.isValid ? 'Passed' : 'Failed'}}
                  </h6>
                  <ul class="mb-0" *ngIf="validationResult.errors.length">
                    <li *ngFor="let error of validationResult.errors">{{error}}</li>
                  </ul>
                  <p class="mb-0" *ngIf="validationResult.isValid">
                    All checklist items are completed successfully!
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class InspectionChecklistDemoComponent {
  currentChecklist: ChecklistConfig | null = null;
  activeConfig: string = '';
  validationResult: { isValid: boolean; errors: string[] } | null = null;

  constructor(private checklistService: InspectionChecklistService) {}

  loadPhotoInspection(): void {
    this.activeConfig = 'photo';
    this.currentChecklist = this.checklistService.createPhotoInspectionChecklist();
    this.validationResult = null;
  }

  loadShippingChecklist(): void {
    this.activeConfig = 'shipping';
    this.currentChecklist = this.checklistService.createShippingChecklist();
    this.validationResult = null;
  }

  loadQualityControl(): void {
    this.activeConfig = 'quality';
    this.currentChecklist = this.checklistService.createQualityControlChecklist();
    this.validationResult = null;
  }

  loadCustomChecklist(): void {
    this.activeConfig = 'custom';
    this.currentChecklist = this.checklistService.createCustomChecklist(
      'Custom Inspection Checklist',
      'A simple custom checklist example',
      [
        {
          title: 'Check Item A',
          description: 'Verify item A meets requirements',
          instructions: ['Step 1: Do this', 'Step 2: Do that', 'Step 3: Verify result']
        },
        {
          title: 'Take Reference Photo',
          description: 'Capture reference photo for documentation',
          requiresPhoto: true,
          photoCount: 1,
          instructions: ['Position item clearly', 'Ensure good lighting', 'Take clear photo']
        },
        {
          title: 'Final Check',
          description: 'Complete final verification',
          instructions: ['Review all previous steps', 'Confirm completion']
        }
      ]
    );
    this.validationResult = null;
  }

  onChecklistCompleted(config: ChecklistConfig): void {
    console.log('Checklist completed!', config);
    alert('🎉 Checklist completed successfully!');
  }

  onItemChanged(event: { item: ChecklistItem; index: number }): void {
    console.log('Item changed:', event);
    this.validationResult = null; // Clear validation when items change
  }

  validateChecklist(): void {
    if (this.currentChecklist) {
      this.validationResult = this.checklistService.validateChecklist(this.currentChecklist);
    }
  }

  exportData(): void {
    if (this.currentChecklist) {
      const exportData = this.checklistService.exportChecklistData(this.currentChecklist);
      console.log('Export data:', exportData);
      
      // In a real app, you'd send this to your backend
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist-${this.activeConfig}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}