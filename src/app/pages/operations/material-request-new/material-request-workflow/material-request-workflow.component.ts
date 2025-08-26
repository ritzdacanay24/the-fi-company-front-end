import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { MaterialRequestService } from '@app/core/api/operations/material-request/material-request.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-material-request-workflow',
  templateUrl: './material-request-workflow.component.html',
  styleUrls: ['./material-request-workflow.component.scss']
})
export class MaterialRequestWorkflowComponent implements OnInit {
  // Review & Validation workflow properties
  reviewers: Array<any> = [];
  isAdminValidator: boolean = false;
  allReviewsComplete: boolean = false;

  
  // Workflow steps
  currentStep = 1;
  totalSteps = 4;
  
  // Forms for each step
  requestForm: FormGroup;
  isLoading = false;
  submitted = false;
  
  // Workflow data
  workflowData = {
    step1: null, // Request creation
    step2: null, // Admin validation
    step3: null, // Picking
    step4: null  // Completion
  };

  // Additional properties for enhanced functionality
  partSearchLoading = false;
  reasonCodes = [
    { value: 'Production', label: 'Production Use' },
    { value: 'Maintenance', label: 'Maintenance/Repair' },
    { value: 'Quality', label: 'Quality Control' },
    { value: 'Engineering', label: 'Engineering/R&D' },
    { value: 'Replacement', label: 'Replacement Part' },
    { value: 'Emergency', label: 'Emergency Repair' },
    { value: 'Other', label: 'Other' }
  ];

  // Bulk part entry functionality
  bulkPartEntry = '';
  showBulkEntry = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private api: MaterialRequestService,
    private authService: AuthenticationService,
    private toastr: ToastrService
  ) {
    this.initializeForm();
    // Example reviewers setup (replace with real data/fetch from API as needed)
    this.reviewers = [
      { name: 'Reviewer 1', status: 'pending', comment: '', canReview: false },
      { name: 'Reviewer 2', status: 'pending', comment: '', canReview: false },
      { name: 'Reviewer 3', status: 'pending', comment: '', canReview: false }
    ];
    // Set canReview for current user (for demo, first reviewer)
    // In real app, match current user to reviewer
    if (this.authService.currentUserValue?.full_name === 'Reviewer 1') {
      this.reviewers[0].canReview = true;
    }
    // Set admin validator (for demo, user named 'Admin Validator')
    this.isAdminValidator = this.authService.currentUserValue?.full_name === 'Admin Validator';
    this.updateAllReviewsComplete();
  }
  // Per-part validation logic
  approvePart(item: any) {
    item.validationStatus = 'approved';
    this.toastr.success(`Part ${item.partNumber} approved.`);
    this.updateAllPartsReviewed();
  }

  rejectPart(item: any) {
    item.validationStatus = 'rejected';
    this.toastr.error(`Part ${item.partNumber} rejected.`);
    this.updateAllPartsReviewed();
  }

  commentPart(item: any) {
    const comment = prompt('Enter comment for part:', item.validationComment || '');
    if (comment !== null) {
      item.validationComment = comment;
      this.toastr.info('Comment added.');
    }
  }

  updateAllPartsReviewed() {
    // All must be approved (no pending/rejected)
    const items = this.items.controls.map(ctrl => ctrl.value);
    this.allReviewsComplete = items.every(i => i.validationStatus === 'approved');
  }

  sendToPicking() {
    if (!this.allReviewsComplete) {
      this.toastr.error('All parts must be approved before sending to picking.');
      return;
    }
    this.toastr.success('Request sent to picking.');
    this.nextStep();
  }

  ngOnInit(): void {
    this.loadUserData();
    this.enableAutoSave();
    
    // Check for existing draft
    if (this.hasDraft()) {
      setTimeout(() => {
        if (confirm('A saved draft was found. Would you like to load it?')) {
          this.loadDraft();
        }
      }, 1000);
    }
  }

  initializeForm() {
    this.requestForm = this.fb.group({
      // Basic request information
      requestor: [this.authService.currentUserValue?.full_name || '', Validators.required],
      assemblyNumber: ['', Validators.required],
      lineNumber: ['', Validators.required],
      pickList: ['', Validators.required],
      dueDate: [moment().add(1, 'day').format('YYYY-MM-DD'), Validators.required],
      priority: ['Medium', Validators.required],
      specialInstructions: [''],
      
      // Line items
      items: this.fb.array([])
    });
  }

  loadUserData() {
    // Pre-fill user data and set defaults
    this.requestForm.patchValue({
      requestor: this.authService.currentUserValue?.full_name,
      createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
      createdBy: this.authService.currentUserValue?.id
    });
    
    this.addNewItem(); // Add first item row
  }

  get items() {
    return this.requestForm.get('items') as FormArray;
  }

  addNewItem() {
    const itemGroup = this.fb.group({
      partNumber: ['', Validators.required],
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reasonCode: ['', Validators.required],
      availableQty: [0],
      notes: [''],
      validationStatus: ['pending'], // 'approved', 'rejected', 'pending'
      validationComment: ['']
    });
    this.items.push(itemGroup);
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  // Step navigation
  nextStep() {
    if (this.validateCurrentStep()) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number) {
    this.currentStep = step;
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.validateRequestForm();
      default:
        return true;
    }
  }

  // Enhanced item management with part validation
  async onPartNumberChange(index: number, partNumber: string) {
    if (!partNumber || partNumber.length < 3) return;
    
    const item = this.items.at(index);
    this.partSearchLoading = true;
    
    try {
      // Simulate part lookup - replace with actual API call
      const partData = await this.lookupPartNumber(partNumber);
      
      if (partData) {
        item.patchValue({
          description: partData.description,
          availableQty: partData.availableQty
        });
        this.toastr.success(`Part found: ${partData.description}`);
      } else {
        item.patchValue({
          description: '',
          availableQty: 0
        });
        this.toastr.warning('Part not found in system');
      }
    } catch (error) {
      this.toastr.error('Error looking up part number');
    } finally {
      this.partSearchLoading = false;
    }
  }

  private async lookupPartNumber(partNumber: string): Promise<any> {
    // This would call your actual part lookup API
    // For now, simulate with a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock data - replace with actual API call
    const mockParts = {
      'EYE12794': { description: 'Display Panel Assembly', availableQty: 25 },
      'ELE-44581-424': { description: 'Power Supply Module', availableQty: 12 },
      'EYE12795': { description: 'Control Board', availableQty: 8 }
    };
    
    return mockParts[partNumber] || null;
  }

  toggleBulkEntry() {
    this.showBulkEntry = !this.showBulkEntry;
    this.bulkPartEntry = '';
  }

  async processBulkEntry() {
    if (!this.bulkPartEntry.trim()) return;
    
    const lines = this.bulkPartEntry.split('\n').filter(line => line.trim());
    
    // Clear existing items
    while (this.items.length > 0) {
      this.items.removeAt(0);
    }
    
    // Process each line
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const partNumber = parts[0];
        const quantity = parseInt(parts[1]) || 1;
        
        const itemGroup = this.fb.group({
          partNumber: [partNumber, Validators.required],
          description: [''],
          quantity: [quantity, [Validators.required, Validators.min(1)]],
          reasonCode: ['', Validators.required],
          availableQty: [0],
          notes: ['']
        });
        
        this.items.push(itemGroup);
        
        // Look up part description
        await this.onPartNumberChange(this.items.length - 1, partNumber);
      }
    }
    
    this.showBulkEntry = false;
    this.bulkPartEntry = '';
    this.toastr.success(`Added ${this.items.length} items from bulk entry`);
  }

  // Form validation helpers
  getFieldError(fieldName: string): string {
    const field = this.requestForm.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
    }
    return '';
  }

  getItemError(index: number, fieldName: string): string {
    const item = this.items.at(index);
    const field = item.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
    }
    return '';
  }

  // Enhanced validation
  validateRequestForm(): boolean {
    this.submitted = true;
    
    // Mark all fields as touched to show validation errors
    this.requestForm.markAllAsTouched();
    this.items.controls.forEach(item => item.markAllAsTouched());
    
    if (this.requestForm.invalid) {
      this.toastr.error('Please fill in all required fields');
      this.scrollToFirstError();
      return false;
    }
    
    if (this.items.length === 0) {
      this.toastr.error('Please add at least one item');
      return false;
    }
    
    // Check for duplicate part numbers
    const partNumbers = this.items.value.map(item => item.partNumber);
    const duplicates = partNumbers.filter((part, index) => partNumbers.indexOf(part) !== index);
    
    if (duplicates.length > 0) {
      this.toastr.error(`Duplicate part numbers found: ${duplicates.join(', ')}`);
      return false;
    }
    
    return true;
  }

  private scrollToFirstError() {
    setTimeout(() => {
      const firstError = document.querySelector('.is-invalid');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  // Auto-save functionality
  autoSaveEnabled = true;
  lastAutoSave: Date | null = null;

  enableAutoSave() {
    if (!this.autoSaveEnabled) return;
    
    this.requestForm.valueChanges.subscribe(() => {
      this.scheduleAutoSave();
    });
  }

  private autoSaveTimeout: any;
  
  private scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      this.autoSaveDraft();
    }, 5000); // Auto-save after 5 seconds of inactivity
  }

  private autoSaveDraft() {
    if (this.requestForm.valid && this.items.length > 0) {
      const draftData = {
        ...this.requestForm.value,
        items: this.items.value,
        lastSaved: new Date()
      };
      
      localStorage.setItem('materialRequestDraft', JSON.stringify(draftData));
      this.lastAutoSave = new Date();
      
      // Show subtle notification
      this.toastr.info('Draft saved automatically', '', {
        timeOut: 2000,
        positionClass: 'toast-bottom-right'
      });
    }
  }

  loadDraft() {
    const draftData = localStorage.getItem('materialRequestDraft');
    if (draftData) {
      try {
        const draft = JSON.parse(draftData);
        
        // Load main form data
        this.requestForm.patchValue({
          assemblyNumber: draft.assemblyNumber,
          lineNumber: draft.lineNumber,
          pickList: draft.pickList,
          dueDate: draft.dueDate,
          priority: draft.priority,
          specialInstructions: draft.specialInstructions
        });
        
        // Load items
        while (this.items.length > 0) {
          this.items.removeAt(0);
        }
        
        draft.items.forEach(item => {
          const itemGroup = this.fb.group({
            partNumber: [item.partNumber, Validators.required],
            description: [item.description],
            quantity: [item.quantity, [Validators.required, Validators.min(1)]],
            reasonCode: [item.reasonCode, Validators.required],
            availableQty: [item.availableQty],
            notes: [item.notes]
          });
          this.items.push(itemGroup);
        });
        
        this.toastr.success('Draft loaded successfully');
      } catch (error) {
        this.toastr.error('Error loading draft');
      }
    }
  }

  clearDraft() {
    localStorage.removeItem('materialRequestDraft');
    this.lastAutoSave = null;
    this.toastr.info('Draft cleared');
  }

  hasDraft(): boolean {
    return localStorage.getItem('materialRequestDraft') !== null;
  }

  async submitRequest() {
    if (!this.validateRequestForm()) {
      return;
    }

    try {
      this.isLoading = true;
      
      const requestData = {
        main: {
          requestor: this.requestForm.value.requestor,
          assemblyNumber: this.requestForm.value.assemblyNumber,
          lineNumber: this.requestForm.value.lineNumber,
          pickList: this.requestForm.value.pickList,
          dueDate: this.requestForm.value.dueDate,
          priority: this.requestForm.value.priority,
          specialInstructions: this.requestForm.value.specialInstructions,
          createdBy: this.authService.currentUserValue.id,
          createdDate: moment().format('YYYY-MM-DD HH:mm:ss'),
          active: 1
        },
        details: this.items.value.map(item => ({
          partNumber: item.partNumber,
          description: item.description,
          qty: item.quantity,
          reasonCode: item.reasonCode,
          availableQty: item.availableQty,
          notes: item.notes,
          createdBy: this.authService.currentUserValue.id,
          createdDate: moment().format('YYYY-MM-DD HH:mm:ss')
        }))
      };

      const result = await this.api.create(requestData);
      
      this.toastr.success('Material request created successfully!');
      this.workflowData.step1 = { id: result.insertId, ...requestData };
      
      // Clear draft after successful submission
      this.clearDraft();
      
      this.nextStep();
      
    } catch (error) {
      this.toastr.error('Error creating material request');
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  // Reviewer actions (for reviewer table, if you want to keep both workflows)
  approveReview(reviewer: any) {
    reviewer.status = 'approved';
    reviewer.canReview = false;
    this.toastr.success(`${reviewer.name} approved.`);
    this.updateAllReviewsComplete();
  }

  rejectReview(reviewer: any) {
    reviewer.status = 'rejected';
    reviewer.canReview = false;
    this.toastr.error(`${reviewer.name} rejected.`);
    this.updateAllReviewsComplete();
  }

  addComment(reviewer: any) {
    const comment = prompt('Enter your comment:', reviewer.comment || '');
    if (comment !== null) {
      reviewer.comment = comment;
      this.toastr.info('Comment added.');
    }
  }

  updateAllReviewsComplete() {
    // All must be approved (no pending/rejected)
    this.allReviewsComplete = this.reviewers.every(r => r.status === 'approved');
  }

  // Utility methods
  getStepTitle(step: number): string {
    const titles = {
      1: 'Create Request',
      2: 'Admin Validation',
      3: 'Material Picking', 
      4: 'Request Completed'
    };
    return titles[step] || '';
  }

  getStepIcon(step: number): string {
    const icons = {
      1: 'ri-file-add-line',
      2: 'ri-shield-check-line',
      3: 'ri-hand-heart-line',
      4: 'ri-checkbox-circle-line'
    };
    return icons[step] || '';
  }

  isStepCompleted(step: number): boolean {
    return this.currentStep > step;
  }

  isStepActive(step: number): boolean {
    return this.currentStep === step;
  }

  resetWorkflow() {
    this.currentStep = 1;
    this.workflowData = {
      step1: null,
      step2: null, 
      step3: null,
      step4: null
    };
    this.initializeForm();
    this.loadUserData();
  }

  goToList() {
    this.router.navigate(['/dashboard/operations/material-request/list']);
  }
}
