import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PublicFormWrapperComponent } from '../public-form-wrapper/public-form-wrapper.component';
import { EyefiSerialSearchNgSelectComponent } from '@app/shared/eyefi-serial-search/eyefi-serial-search-ng-select.component';
import { QadWoSearchComponent } from '@app/shared/components/qad-wo-search/qad-wo-search.component';
import { ULLabelService } from '@app/features/ul-management/services/ul-label.service';
import { StandaloneIgtFormComponent } from '../standalone-igt-form/standalone-igt-form.component';
import { StandaloneSgAssetComponent } from '../standalone-sg-asset/standalone-sg-asset.component';
import { StandaloneAgsSerialComponent } from '../standalone-ags-serial/standalone-ags-serial.component';
import { SgAssetService } from '@app/core/api/quality/sg-asset.service';
import { IgtAssetService } from '@app/pages/quality/igt/services/igt-asset.service';
import { AgsSerialService } from '@app/core/api/quality/ags-serial.service';
import { SerialNumberService } from '@app/features/serial-number-management/services/serial-number.service';
import { ZebraLabelPrintModalService } from '@app/shared/components/zebra-label-print-modal/zebra-label-print-modal.service';
import { AuthenticationService } from '@app/core/services/auth.service';

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

@Component({
  selector: 'app-eyefi-serial-workflow',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PublicFormWrapperComponent,
    EyefiSerialSearchNgSelectComponent,
    QadWoSearchComponent,
    StandaloneIgtFormComponent,
    StandaloneSgAssetComponent,
    StandaloneAgsSerialComponent
  ],
  templateUrl: './eyefi-serial-workflow.component.html',
  styleUrls: ['./eyefi-serial-workflow.component.scss']
})
export class EyefiSerialWorkflowComponent implements OnInit {
  @ViewChild(PublicFormWrapperComponent) wrapperComponent!: PublicFormWrapperComponent;

  // Authentication state
  isAuthenticated = false;
  currentUser: any = null;

  // Workflow state
  currentStep = 1;
  steps: WorkflowStep[] = [
    {
      id: 1,
      title: 'Enter Work Order',
      description: 'Enter the work order number for this batch',
      completed: false,
      active: true
    },
    {
      id: 2,
      title: 'Configure Batch',
      description: 'Enter quantity and select category (New/Used)',
      completed: false,
      active: false
    },
    {
      id: 3,
      title: 'Assign Serials & UL Numbers',
      description: 'Select serial numbers and assign UL labels',
      completed: false,
      active: false
    },
    {
      id: 4,
      title: 'Select Customer',
      description: 'Assign the serial numbers to a customer',
      completed: false,
      active: false
    },
    {
      id: 5,
      title: 'Generate Assets',
      description: 'Generate or select customer assets',
      completed: false,
      active: false
    }
  ];

  // Step 1: Work Order
  workOrderNumber: string | any = '';
  workOrderDetails: any = null; // Store full work order details (part #, description, etc.)

  // Step 2: Batch Configuration
  quantity: number = 1;
  category: string = 'new'; // 'new' or 'used'
  
  // Step 3: Serial and UL assignments
  serialAssignments: Array<{
    serial: any;
    ulNumber: any;
    isAutoPopulated: boolean; // Track if this was auto-populated
    manuallyChanged: boolean; // Track if user manually changed it
    isEditing: boolean; // Track if user is editing this row
  }> = [];

  // Step 4: Customer selection
  selectedCustomer: string = '';
  customOtherCustomerName: string = ''; // For "Other" customer type - store custom name

  // Step 5: Generated Assets
  generatedAssets: any[] = []; // Store generated SG/AGS assets or selected IGT assets
  isGeneratingAssets = false;

  // Legacy selected data (for backward compatibility)
  selectedSerial: any = null;
  selectedUL: any = null;
  selectedULNumber: string = '';

  // UL Numbers data
  availableULs: any[] = [];
  isLoadingULs = false;

  // Customer options
  customerOptions: string[] = [
    'IGT',
    'Light and Wonder',
    'AGS',
    'Other'
  ];

  // UI state
  isLoading = false;
  
  // Form submission state
  pendingFormData: any = null;
  currentFormType: string = '';
  
  // Confirmation modal state
  showConfirmationModal = false;
  confirmationSummary: any = null;
  
  // Success state (on-page display)
  submissionComplete = false;
  successSummary: any = null;
  isTestMode = false; // Track if current success is from test

  // ⚠️⚠️⚠️ TESTING MODE TOGGLE ⚠️⚠️⚠️
  // Set to FALSE before production to use FIRST serials/ULs (normal behavior)
  // Set to TRUE for testing to use LAST serials/ULs
  private readonly USE_LAST_ITEMS_FOR_TESTING = true; // 🧪 CHANGE TO FALSE FOR PRODUCTION

  constructor(
    private router: Router,
    private toastrService: ToastrService,
    private ulLabelService: ULLabelService,
    private sgAssetService: SgAssetService,
    private igtAssetService: IgtAssetService,
    private agsSerialService: AgsSerialService,
    private serialNumberService: SerialNumberService,
    private zebraLabelPrintModalService: ZebraLabelPrintModalService,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    // Don't load UL numbers until user is authenticated
  }

  // Helper methods to extract prefix and numeric parts from UL numbers
  private extractPrefix(ulNumber: string): string {
    const match = ulNumber.match(/^([A-Za-z]+)/);
    return match ? match[1] : '';
  }

  private extractNumericPart(ulNumber: string): number {
    const match = ulNumber.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async loadAvailableULs(): Promise<void> {
    try {
      this.isLoadingULs = true;
      // Use getAvailableULNumbers like UL Usage Form does
      const response = await this.ulLabelService.getAvailableULNumbers().toPromise();
      
      if (response && response.success && Array.isArray(response.data)) {
        // EXACT SAME MAPPING AS UL USAGE FORM - Map backend data with prefix and numeric_part extraction
        this.availableULs = response.data.map((ul: any) => ({
          id: ul.id,
          ul_number: ul.ul_number,
          prefix: this.extractPrefix(ul.ul_number),
          numeric_part: this.extractNumericPart(ul.ul_number),
          description: ul.description || '',
          category: ul.category || '',
          status: ul.is_used ? 'used' : 'available',
          dateCreated: new Date(ul.created_at),
          dateUsed: ul.last_used_date ? new Date(ul.last_used_date) : undefined
        }));

        // CRITICAL: Sort by numeric_part to ensure sequential order - EXACTLY like UL Usage Form
        this.availableULs.sort((a, b) => a.numeric_part - b.numeric_part);
        
        console.log('Loaded ALL UL numbers (SORTED):', this.availableULs.length);
        console.log('- Available (not used):', this.availableULs.filter((ul: any) => ul.status === 'available').length);
        console.log('- New ULs (available):', this.availableULs.filter((ul: any) => ul.category === 'New' && ul.status === 'available').length);
        console.log('- Used ULs (available):', this.availableULs.filter((ul: any) => ul.category === 'Used' && ul.status === 'available').length);
        
        // Log samples for debugging - should be SEQUENTIAL now
        const sampleNew = this.availableULs.filter((ul: any) => ul.category === 'New' && ul.status === 'available').slice(0, 10);
        console.log('Sample New ULs (SEQUENTIAL):', sampleNew.map((ul: any) => `${ul.ul_number} (numeric: ${ul.numeric_part})`));
      } else {
        console.warn('Invalid response format:', response);
        this.availableULs = [];
      }
    } catch (error) {
      console.error('Error loading UL numbers:', error);
      this.toastrService.error('Failed to load UL numbers');
      this.availableULs = [];
    } finally {
      this.isLoadingULs = false;
    }
  }

  onAuthenticationComplete(user: any): void {
    console.log('User authenticated:', user);
    this.isAuthenticated = true;
    this.currentUser = user;
    
    // Load UL numbers after authentication
    this.loadAvailableULs();
  }

  onUserLoggedOut(): void {
    console.log('User logged out');
    this.isAuthenticated = false;
    this.currentUser = null;
    this.resetWorkflow();
  }

  // Serial number selection
  onSerialSelected(serial: any): void {
    console.log('Serial selected:', serial);
    this.selectedSerial = serial;
  }

  getWorkOrderNumber(workOrder: any): void {
    console.log('Work Order selected:', workOrder);
    console.log('Available fields:', workOrder ? Object.keys(workOrder) : 'none');
    if (workOrder) {
      this.workOrderNumber = workOrder.wo_nbr ? workOrder.wo_nbr.toString() : '';
      this.workOrderDetails = workOrder; // Store full work order details
      console.log('Work Order Details STORED:', this.workOrderDetails);
      console.log('wo_part:', workOrder.wo_part);
      console.log('wo_description:', workOrder.wo_description);
      console.log('pt_desc1:', workOrder.pt_desc1);
      console.log('pt_desc2:', workOrder.pt_desc2);
      console.log('description:', workOrder.description);
      console.log('pt_part:', workOrder.pt_part);
    } else {
      this.workOrderNumber = '';
      this.workOrderDetails = null;
    }
  }

  // Step navigation
  goToStep(stepNumber: number): void {
    if (stepNumber <= this.currentStep + 1) {
      this.currentStep = stepNumber;
      this.updateStepStates();
    }
  }

  async nextStep(): Promise<void> {
    if (this.canProceedToNextStep()) {
      this.completeCurrentStep();
      
      // Auto-populate when moving from Step 2 to Step 3
      if (this.currentStep === 2) {
        this.currentStep++;
        this.updateStepStates();
        await this.autoPopulateSerials();
      }
      // Auto-generate/select assets when moving from Step 4 to Step 5
      else if (this.currentStep === 4) {
        this.currentStep++;
        this.updateStepStates();
        await this.handleAssetGeneration();
      }
      else {
        this.currentStep++;
        this.updateStepStates();
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateStepStates();
    }
  }

  completeCurrentStep(): void {
    const step = this.steps.find(s => s.id === this.currentStep);
    if (step) {
      step.completed = true;
    }
  }

  updateStepStates(): void {
    this.steps.forEach(step => {
      step.active = step.id === this.currentStep;
    });
  }

  canProceedToNextStep(): boolean {
    switch (this.currentStep) {
      case 1:
        // Step 1: Work Order Number is required
        return !!this.workOrderNumber && this.workOrderNumber.toString().trim().length > 0;
      case 2:
        // Step 2: Quantity must be at least 1 and category selected
        // Also ensure serialAssignments array is initialized
        if (this.quantity >= 1 && !!this.category) {
          // Initialize serialAssignments if not already done
          if (this.serialAssignments.length !== this.quantity) {
            this.onQuantityChange();
          }
          return true;
        }
        return false;
      case 3:
        // Step 3: All serial assignments must be filled
        // Handle both object (new category) and string (used category) serial values
        return this.serialAssignments.length === this.quantity &&
               this.serialAssignments.every(a => {
                 const hasSerial = typeof a.serial === 'string' ? a.serial.trim().length > 0 : !!a.serial;
                 const hasUL = !!a.ulNumber;
                 return hasSerial && hasUL;
               });
      case 4:
        // Step 4: Customer selected (and custom name if "Other" selected)
        if (this.selectedCustomer === 'Other') {
          return !!this.selectedCustomer && !!this.customOtherCustomerName && this.customOtherCustomerName.trim().length > 0;
        }
        return !!this.selectedCustomer;
      default:
        return false;
    }
  }

  onQuantityChange(): void {
    // Initialize or resize serial assignments array based on quantity
    const newAssignments: Array<{ 
      serial: any; 
      ulNumber: any; 
      isAutoPopulated: boolean; 
      manuallyChanged: boolean;
      isEditing: boolean;
    }> = [];
    
    for (let i = 0; i < this.quantity; i++) {
      // Keep existing assignments if they exist
      if (this.serialAssignments[i]) {
        newAssignments.push(this.serialAssignments[i]);
      } else {
        // Create new empty assignment
        newAssignments.push({ 
          serial: null, 
          ulNumber: null,
          isAutoPopulated: false,
          manuallyChanged: false,
          isEditing: false
        });
      }
    }
    
    this.serialAssignments = newAssignments;
    console.log('Serial assignments updated:', this.serialAssignments);
  }

  async autoPopulateSerials(): Promise<void> {
    // This will be called when moving from Step 2 to Step 3
    this.isLoading = true;
    try {
      // Fetch serials - if testing mode, fetch ALL to get last ones
      const status = this.category === 'new' ? 'available' : 'used';
      const serialsResponse = await this.serialNumberService.getAllSerialNumbers({
        status: status,
        ...(this.USE_LAST_ITEMS_FOR_TESTING ? {} : { limit: this.quantity })
      });

      console.log('Serials Response:', serialsResponse);
      console.log('Available ULs already loaded:', this.availableULs);
      
      if (serialsResponse?.success && serialsResponse?.data && Array.isArray(serialsResponse.data)) {
        const allSerials = serialsResponse.data;
        
        // Use LAST or FIRST items based on testing mode
        const serials = this.USE_LAST_ITEMS_FOR_TESTING 
          ? allSerials.slice(-this.quantity)  // Testing: LAST N items
          : allSerials.slice(0, this.quantity); // Production: FIRST N items
        
        if (this.USE_LAST_ITEMS_FOR_TESTING) {
          console.log(`🧪 TESTING MODE: Total serials: ${allSerials.length}, Using LAST ${this.quantity}`, serials.map(s => s.serial_number));
        }
        
        // Use already loaded UL numbers (loaded on authentication)
        if (this.availableULs && this.availableULs.length > 0) {
          // Filter ULs by category - same logic as UL Usage Form
          // 'new' category → 'New' ULs, 'used' category → 'Used' ULs
          const categoryValue = this.category === 'new' ? 'New' : 'Used';
          
          // Filter by category AND status='available' (not is_used)
          const filteredULs = this.availableULs
            .filter(ul => ul.category === categoryValue && ul.status === 'available')
            .sort((a, b) => a.numeric_part - b.numeric_part);
          
          console.log(`Filtering for category "${categoryValue}":`, {
            total_loaded: this.availableULs.length,
            filtered_by_category: filteredULs.length,
            sample_first_5: filteredULs.slice(0, 5).map(ul => ul.ul_number),
            sample_last_5: filteredULs.slice(-5).map(ul => ul.ul_number)
          });
          
          if (filteredULs.length < this.quantity) {
            this.toastrService.warning(
              `Only ${filteredULs.length} UL numbers available for ${categoryValue} category. Need ${this.quantity}.`
            );
          }
          
          // Use LAST or FIRST items based on testing mode
          const uls = this.USE_LAST_ITEMS_FOR_TESTING
            ? filteredULs.slice(-this.quantity)  // Testing: LAST N items
            : filteredULs.slice(0, this.quantity); // Production: FIRST N items
          
          if (this.USE_LAST_ITEMS_FOR_TESTING) {
            console.log(`🧪 TESTING MODE: Total ULs: ${filteredULs.length}, Using LAST ${this.quantity}`, uls.map(ul => ul.ul_number));
          }
          
          console.log('Sequential ULs assigned:', uls.map(ul => ul.ul_number));
          
          // Auto-populate assignments
          for (let i = 0; i < this.quantity; i++) {
            if (this.serialAssignments[i]) {
              this.serialAssignments[i].serial = serials[i] || null;
              this.serialAssignments[i].ulNumber = uls[i] || null;
              this.serialAssignments[i].isAutoPopulated = true;
              this.serialAssignments[i].manuallyChanged = false;
              this.serialAssignments[i].isEditing = false; // Start in read-only mode
              
              console.log(`Assignment ${i + 1}:`, {
                serial: this.serialAssignments[i].serial?.serial_number,
                ul: this.serialAssignments[i].ulNumber?.ul_number
              });
            }
          }
          
          const modeText = this.USE_LAST_ITEMS_FOR_TESTING ? '🧪 TESTING: Using LAST' : 'Auto-populated';
          this.toastrService.success(`${modeText} ${this.quantity} serial numbers and ${categoryValue} UL labels`);
        } else {
          this.toastrService.warning('Serial numbers loaded, but UL numbers unavailable. Please select manually.');
          // Set serial only, UL will be manual
          for (let i = 0; i < this.quantity; i++) {
            if (this.serialAssignments[i]) {
              this.serialAssignments[i].serial = serials[i] || null;
              this.serialAssignments[i].ulNumber = null;
              this.serialAssignments[i].isAutoPopulated = false;
              this.serialAssignments[i].manuallyChanged = false;
              this.serialAssignments[i].isEditing = !this.serialAssignments[i].serial; // Edit if no serial
            }
          }
        }
      } else {
        this.toastrService.warning('Could not auto-populate. Please select serial numbers manually.');
        // Set everything to manual mode
        for (let i = 0; i < this.quantity; i++) {
          if (this.serialAssignments[i]) {
            this.serialAssignments[i].isEditing = true;
          }
        }
      }
    } catch (error) {
      console.error('Error auto-populating serials:', error);
      this.toastrService.error('Failed to auto-populate. Please select manually.');
      // Set to manual mode on error
      for (let i = 0; i < this.quantity; i++) {
        if (this.serialAssignments[i]) {
          this.serialAssignments[i].isEditing = true;
        }
      }
    } finally {
      this.isLoading = false;
    }
  }

  onSerialAssigned(index: number, serial: any): void {
    if (this.serialAssignments[index]) {
      const wasAutoPopulated = this.serialAssignments[index].isAutoPopulated;
      
      // Check for duplicate serial numbers
      if (serial) {
        const duplicateIndex = this.serialAssignments.findIndex((assignment, i) => 
          i !== index && assignment.serial?.id === serial.id
        );
        
        if (duplicateIndex !== -1) {
          this.toastrService.error(
            `Serial number ${serial.serial_number} is already assigned to row ${duplicateIndex + 1}. Please select a different serial.`
          );
          // Clear the duplicate
          this.serialAssignments[index].serial = null;
          return;
        }
      }
      
      this.serialAssignments[index].serial = serial;
      
      // If cleared and was auto-populated, trigger reset to get new auto-populated value
      if (!serial && wasAutoPopulated && !this.serialAssignments[index].manuallyChanged) {
        console.log(`Serial cleared at position ${index}, auto-resetting...`);
        this.resetAssignmentToAuto(index);
        return;
      }
      
      // Mark as manually changed if user changed an auto-populated value
      if (wasAutoPopulated && serial) {
        this.serialAssignments[index].manuallyChanged = true;
      }
      
      console.log(`Serial assigned to position ${index}:`, serial);
    }
  }

  /**
   * Handle manual text input for EyeFi serial number (used for "Used" category)
   * When using Used UL numbers, EyeFi serials are entered as plain text since UL tracking is primary
   */
  onSerialManualInput(index: number, serialText: string): void {
    if (this.serialAssignments[index]) {
      // Check for duplicate serial text
      if (serialText && serialText.trim()) {
        const duplicateIndex = this.serialAssignments.findIndex((assignment, i) => 
          i !== index && assignment.serial === serialText.trim()
        );
        
        if (duplicateIndex !== -1) {
          this.toastrService.error(
            `Serial number ${serialText} is already assigned to row ${duplicateIndex + 1}. Please enter a different serial.`
          );
          // Clear the duplicate
          this.serialAssignments[index].serial = '';
          return;
        }
        
        // Store as plain text string
        this.serialAssignments[index].serial = serialText.trim();
        this.serialAssignments[index].manuallyChanged = true;
        console.log(`Manual serial entered at position ${index}:`, serialText);
      } else {
        this.serialAssignments[index].serial = null;
      }
    }
  }

  onULAssigned(index: number, ulNumber: any): void {
    if (this.serialAssignments[index]) {
      const wasAutoPopulated = this.serialAssignments[index].isAutoPopulated;
      
      // Check for duplicate UL numbers
      if (ulNumber) {
        const duplicateIndex = this.serialAssignments.findIndex((assignment, i) => 
          i !== index && assignment.ulNumber?.id === ulNumber.id
        );
        
        if (duplicateIndex !== -1) {
          this.toastrService.error(
            `UL number ${ulNumber.ul_number} is already assigned to row ${duplicateIndex + 1}. Please select a different UL.`
          );
          // Clear the duplicate
          this.serialAssignments[index].ulNumber = null;
          return;
        }
      }
      
      this.serialAssignments[index].ulNumber = ulNumber;
      
      // If cleared and was auto-populated, trigger reset to get new auto-populated value
      if (!ulNumber && wasAutoPopulated && !this.serialAssignments[index].manuallyChanged) {
        console.log(`UL cleared at position ${index}, auto-resetting...`);
        this.resetAssignmentToAuto(index);
        return;
      }
      
      // Mark as manually changed if user changed an auto-populated value
      if (wasAutoPopulated && ulNumber) {
        this.serialAssignments[index].manuallyChanged = true;
      }
      
      console.log(`UL assigned to position ${index}:`, ulNumber);
    }
  }

  async resetAssignmentToAuto(index: number): Promise<void> {
    // Reset a specific assignment back to auto-populated values
    if (!this.serialAssignments[index]) {
      return;
    }

    try {
      this.isLoading = true;

      // Fetch ONE available serial number (not already assigned to other rows)
      const status = this.category === 'new' ? 'available' : 'used';
      const serialsResponse = await this.serialNumberService.getAllSerialNumbers({
        status: status,
        limit: this.quantity + 10 // Get extra to find one not already assigned
      });

      if (!serialsResponse?.success || !serialsResponse?.data || !Array.isArray(serialsResponse.data)) {
        this.toastrService.warning('No available serial numbers found');
        return;
      }

      // Find a serial that's not already assigned to another row
      const assignedSerialIds = this.serialAssignments
        .map((a, i) => i !== index ? a.serial?.id : null)
        .filter(id => id !== null);
      
      const availableSerial = serialsResponse.data.find(s => !assignedSerialIds.includes(s.id));

      if (!availableSerial) {
        this.toastrService.warning('No available serial numbers to assign');
        return;
      }

      // Get the next available UL number for this category (not already assigned)
      const categoryValue = this.category === 'new' ? 'New' : 'Used';
      const assignedULIds = this.serialAssignments
        .map((a, i) => i !== index ? a.ulNumber?.id : null)
        .filter(id => id !== null);

      const availableUL = this.availableULs.find(ul => 
        ul.category === categoryValue && 
        ul.status === 'available' &&
        !assignedULIds.includes(ul.id)
      );

      if (!availableUL) {
        this.toastrService.warning(`No available UL numbers for ${categoryValue} category`);
        return;
      }

      // Reset to next available values
      this.serialAssignments[index] = {
        serial: availableSerial,
        ulNumber: availableUL,
        isAutoPopulated: true,
        manuallyChanged: false,
        isEditing: false
      };

      this.toastrService.success('Reset to auto-selected values');
    } catch (error) {
      console.error('Error resetting assignment:', error);
      this.toastrService.error('Failed to reset assignment');
    } finally {
      this.isLoading = false;
    }
  }

  toggleEditMode(index: number): void {
    if (this.serialAssignments[index]) {
      this.serialAssignments[index].isEditing = !this.serialAssignments[index].isEditing;
    }
  }

  saveEdit(index: number): void {
    if (this.serialAssignments[index]) {
      this.serialAssignments[index].isEditing = false;
      
      // If values changed from auto-populated, mark as manual
      if (this.serialAssignments[index].isAutoPopulated) {
        this.serialAssignments[index].manuallyChanged = true;
      }
    }
  }

  cancelEdit(index: number): void {
    if (this.serialAssignments[index]) {
      // If was auto-populated and no manual changes, revert
      if (this.serialAssignments[index].isAutoPopulated && !this.serialAssignments[index].manuallyChanged) {
        // Values are still auto-populated, just cancel edit mode
      }
      this.serialAssignments[index].isEditing = false;
    }
  }

  getCompletedAssignmentsCount(): number {
    return this.serialAssignments.filter(a => a.serial && a.ulNumber).length;
  }

  resetWorkflow(): void {
    // Reset step navigation
    this.currentStep = 1;
    
    // Reset work order
    this.workOrderNumber = '';
    this.workOrderDetails = null;
    
    // Reset batch configuration
    this.quantity = 1;
    this.category = 'new';
    
    // Reset serial assignments
    this.serialAssignments = [];
    this.selectedSerial = null;
    this.selectedUL = null;
    this.selectedULNumber = '';
    
    // Reset customer selection
    this.selectedCustomer = '';
    this.customOtherCustomerName = '';
    this.currentFormType = '';
    
    // Reset generated assets
    this.generatedAssets = [];
    
    // Reset submission state
    this.submissionComplete = false;
    this.successSummary = null;
    this.isTestMode = false;
    this.confirmationSummary = null;
    this.showConfirmationModal = false;
    
    // Reset loading states
    this.isLoading = false;
    this.isGeneratingAssets = false;
    
    // Reset pending form data
    this.pendingFormData = null;
    
    // Reset step states
    this.steps.forEach(step => {
      step.completed = false;
      step.active = step.id === 1;
    });
    
    console.log('🔄 Workflow reset - ready for new batch');
  }

  onULSelected(): void {
    if (this.selectedUL) {
      this.selectedULNumber = this.selectedUL.ul_number;
      console.log('Selected UL:', this.selectedUL);
    }
  }

  proceedToCustomerForm(): void {
    console.log('Proceeding to customer form:', {
      serial: this.selectedSerial,
      ul: this.selectedUL,
      customer: this.selectedCustomer
    });
    
    // Set current form type based on selected customer
    this.currentFormType = this.getCustomerFormComponent();
    console.log('🎯 Setting currentFormType:', this.currentFormType);
    
    // Store workflow data in sessionStorage for the embedded form to use
    const workflowData = {
      serialNumber: this.selectedSerial?.serial_number,
      serialId: this.selectedSerial?.id,
      ulNumber: this.selectedUL?.ul_number,
      ulId: this.selectedUL?.id,
      ulCategory: this.selectedUL?.category,
      customer: this.selectedCustomer,
      timestamp: new Date().toISOString()
    };
    
    sessionStorage.setItem('eyefiWorkflowData', JSON.stringify(workflowData));
    
    // Move to step 4 to show the customer form
    this.toastrService.success(`Loading ${this.selectedCustomer} form...`);
    this.nextStep();
  }

  /**
   * Handle asset generation/selection based on customer type
   */
  async handleAssetGeneration(): Promise<void> {
    console.log('🚀 handleAssetGeneration() called');
    console.log('📋 Selected Customer:', this.selectedCustomer);
    
    this.isGeneratingAssets = true;
    this.generatedAssets = [];

    try {
      const customerType = this.getCustomerFormComponent();
      console.log('🎯 Customer Type Mapping:', this.selectedCustomer, '→', customerType);

      // For all customer types, just pre-select/preview assets
      // Actual database creation happens on form submit
      if (customerType === 'igt') {
        console.log('➡️ Calling preselectIGTAssets()');
        console.log('📊 Serial Assignments Count:', this.serialAssignments.length);
        console.log('🔢 Quantity:', this.quantity);
        // IGT - Pre-select next available assets in sequence
        await this.preselectIGTAssets();
        console.log('✅ preselectIGTAssets() completed');
        console.log('📦 Generated Assets:', this.generatedAssets);
      } else if (customerType === 'other') {
        // Other - No asset generation, just show assignments
        console.log('➡️ Other customer - no asset generation needed');
        this.generatedAssets = this.serialAssignments.map((a, i) => ({
          index: i,
          serial: a.serial,
          ulNumber: a.ulNumber,
          assetNumber: 'N/A', // No asset number for Other
          asset: null
        }));
      } else {
        // SG & AGS - Just show preview message, will generate on submit
        console.log('➡️ SG/AGS assets will be generated on form submit');
        this.generatedAssets = this.serialAssignments.map((a, i) => ({
          serial: a.serial,
          ulNumber: a.ulNumber,
          assetNumber: '(Will be generated on submit)',
          asset: null
        }));
      }
    } catch (error) {
      console.error('💥 Error handling asset generation:', error);
      this.toastrService.error('Failed to generate/select assets');
    } finally {
      this.isGeneratingAssets = false;
      console.log('🏁 handleAssetGeneration() finished, isGeneratingAssets:', this.isGeneratingAssets);
    }
  }

  /**
   * Generate SG Assets (Light and Wonder) via backend - BULK TRANSACTION
   */
  async generateSGAssets(): Promise<void> {
    try {
      // Get current user info
      const currentUser = this.authenticationService.currentUserValue;
      const userFullName = currentUser?.full_name || 'System';

      // Prepare bulk assignments array
      const assignments = this.serialAssignments.map((assignment) => ({
        serialNumber: typeof assignment.serial === 'string' ? assignment.serial : assignment.serial.serial_number,
        eyefi_serial_id: typeof assignment.serial === 'string' ? null : assignment.serial.id,
        ulNumber: assignment.ulNumber?.ul_number || '',
        ul_label_id: assignment.ulNumber?.id || null,
        sgPartNumber: this.workOrderDetails?.wo_part || '',
        poNumber: this.workOrderNumber,
        property_site: '', // Add if needed
        active: 1
      }));

      console.log('📦 Bulk creating SG assets:', assignments);
      console.log('👤 Created by:', userFullName);

      // Call bulk create API - single transaction with user info
      const response: any = await this.sgAssetService.bulkCreate(assignments, userFullName);
      
      console.log('✅ Bulk SG response:', response);

      // Map response data to generatedAssets for display
      // response.data = [{ generated_asset_number: "US14432505", customer_asset_id: "5522", serialNumber: "147398", ... }, ...]
      if (response?.success && response?.data && Array.isArray(response.data)) {
        this.generatedAssets = this.serialAssignments.map((assignment, index) => {
          const createdAsset = response.data[index];
          return {
            index,
            serial: assignment.serial,
            ulNumber: assignment.ulNumber,
            asset: createdAsset,
            assetNumber: createdAsset?.generated_asset_number || 'Generated'
          };
        });

        this.toastrService.success(`Generated ${response.count} Light and Wonder assets in bulk`);
        console.log('✨ Generated SG Assets (BULK):', this.generatedAssets);
      } else {
        throw new Error('Invalid bulk create response');
      }
    } catch (error) {
      console.error('💥 Error generating SG assets:', error);
      throw error;
    }
  }

  /**
   * Generate AGS Assets via backend - BULK TRANSACTION
   */
  async generateAGSAssets(): Promise<void> {
    try {
      // Get current user info
      const currentUser = this.authenticationService.currentUserValue;
      const userFullName = currentUser?.full_name || 'System';

      // Prepare bulk assignments array
      const assignments = this.serialAssignments.map((assignment) => ({
        serialNumber: typeof assignment.serial === 'string' ? assignment.serial : assignment.serial.serial_number,
        eyefi_serial_id: typeof assignment.serial === 'string' ? null : assignment.serial.id,
        ulNumber: assignment.ulNumber?.ul_number || '',
        ul_label_id: assignment.ulNumber?.id || null,
        sgPartNumber: this.workOrderDetails?.wo_part || '',
        poNumber: this.workOrderNumber,
        property_site: '', // Add if needed
        active: 1
      }));

      console.log('📦 Bulk creating AGS assets:', assignments);
      console.log('👤 Created by:', userFullName);

      // Call bulk create API - single transaction with user info
      const response: any = await this.agsSerialService.bulkCreate(assignments, userFullName);
      
      console.log('✅ Bulk AGS response:', response);

      // Map response data to generatedAssets for display
      if (response?.success && response?.data && Array.isArray(response.data)) {
        this.generatedAssets = this.serialAssignments.map((assignment, index) => {
          const createdAsset = response.data[index];
          return {
            index,
            serial: assignment.serial,
            ulNumber: assignment.ulNumber,
            asset: createdAsset,
            assetNumber: createdAsset?.generated_asset_number || 'Generated'
          };
        });

        this.toastrService.success(`Generated ${response.count} AGS assets in bulk`);
        console.log('✨ Generated AGS Assets (BULK):', this.generatedAssets);
      } else {
        throw new Error('Invalid bulk create response');
      }
    } catch (error) {
      console.error('💥 Error generating AGS assets:', error);
      throw error;
    }
  }

  /**
   * Generate IGT assets using pre-selected IGT serials
   */
  async generateIGTAssets(): Promise<void> {
    try {
      // Get current user info
      const currentUser = this.authenticationService.currentUserValue;
      const userFullName = currentUser?.full_name || 'System';

      // Prepare bulk assignments array with pre-selected IGT assets
      const assignments = this.generatedAssets.map((generated) => ({
        igt_serial_number: generated.assetNumber, // Pre-selected IGT serial
        igt_asset_id: generated.asset?.id || null, // IGT asset ID if available
        eyefi_serial_number: typeof generated.serial === 'string' ? generated.serial : generated.serial.serial_number,
        eyefi_serial_id: typeof generated.serial === 'string' ? null : generated.serial.id,
        ulNumber: generated.ulNumber?.ul_number || '',
        ul_label_id: generated.ulNumber?.id || null,
        partNumber: this.workOrderDetails?.wo_part || '',
        poNumber: this.workOrderNumber,
        active: 1
      }));

      console.log('📦 Bulk creating IGT assets:', assignments);
      console.log('👤 Created by:', userFullName);

      // Call bulk create API - single transaction with user info
      const response: any = await this.igtAssetService.bulkCreate(assignments, userFullName);
      
      console.log('✅ Bulk IGT response:', response);

      // Map response data to generatedAssets for display
      if (response?.success && response?.data && Array.isArray(response.data)) {
        this.generatedAssets = this.generatedAssets.map((generated, index) => {
          const createdAsset = response.data[index];
          return {
            ...generated,
            asset: createdAsset,
            assetNumber: createdAsset?.generated_asset_number || generated.assetNumber
          };
        });

        this.toastrService.success(`Generated ${response.count} IGT assets in bulk`);
        console.log('✨ Generated IGT Assets (BULK):', this.generatedAssets);
      } else {
        throw new Error('Invalid bulk create response');
      }
    } catch (error) {
      console.error('💥 Error generating IGT assets:', error);
      throw error;
    }
  }

  /**
   * Create "Other" customer assignments without asset generation
   * Just links EyeFi serial + UL label with custom customer name
   */
  async createOtherAssignments(): Promise<void> {
    try {
      // Get current user info
      const currentUser = this.authenticationService.currentUserValue;
      const userFullName = currentUser?.full_name || 'System';

      // For "Other" customer, we just create assignment records with no customer asset
      // This will mark EyeFi serials and UL labels as consumed/used
      const assignments = this.serialAssignments.map((assignment) => ({
        eyefi_serial_number: typeof assignment.serial === 'string' ? assignment.serial : assignment.serial.serial_number,
        eyefi_serial_id: typeof assignment.serial === 'string' ? null : assignment.serial.id,
        ulNumber: assignment.ulNumber?.ul_number || '',
        ul_label_id: assignment.ulNumber?.id || null,
        partNumber: this.workOrderDetails?.wo_part || '',
        poNumber: this.workOrderNumber,
        customer_name: this.customOtherCustomerName, // Custom customer name from input
        customer_type: 'Other',
        customer_type_id: null, // No specific customer type
        inspector_name: userFullName,
        consumed_by: userFullName,
        status: 'consumed',
        active: 1
      }));

      console.log('📦 Creating Other customer assignments:', assignments);
      console.log('👤 Customer Name:', this.customOtherCustomerName);
      console.log('👤 Created by:', userFullName);

      // For now, just mark as successful locally
      // TODO: Create backend API endpoint if needed to store these assignments
      this.generatedAssets = this.serialAssignments.map((assignment, index) => ({
        index,
        serial: assignment.serial,
        ulNumber: assignment.ulNumber,
        asset: null,
        assetNumber: 'N/A', // No asset number for Other customer
        customerName: this.customOtherCustomerName
      }));

      this.toastrService.success(`Created ${assignments.length} assignments for ${this.customOtherCustomerName}`);
      console.log('✨ Created Other Assignments:', this.generatedAssets);
    } catch (error) {
      console.error('💥 Error creating Other assignments:', error);
      throw error;
    }
  }

  /**
   * Pre-select next available IGT assets in sequence based on quantity
   */
  async preselectIGTAssets(): Promise<void> {
    try {
      console.log('🔍 Fetching IGT assets...');
      
      // Fetch all IGT assets and find available ones
      const response: any = await this.igtAssetService.getAll();
      
      console.log('📦 Raw IGT Assets Response:', response);
      console.log('📊 Response Type:', typeof response);
      console.log('📊 Is Array?:', Array.isArray(response));
      
      // Handle both wrapped ({data: [...]}) and unwrapped ([...]) responses
      let allAssets: any[] = [];
      if (Array.isArray(response)) {
        allAssets = response;
        console.log('✅ Direct array response');
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        allAssets = response.data;
        console.log('✅ Wrapped response.data array');
      } else {
        console.error('❌ Unexpected response format:', response);
        throw new Error('Invalid response format');
      }
      
      console.log('📊 Total IGT assets:', allAssets.length);
      console.log('📋 Sample asset:', allAssets[0]);
      
      if (allAssets && allAssets.length > 0) {
        // Filter for available IGT assets (status === 'available')
        // Based on your data structure: {id, serial_number, category, status: "available", ...}
        const availableAssets = allAssets
          .filter(asset => {
            const isAvailable = asset.status === 'available';
            if (!isAvailable) {
              console.log('❌ Filtered out (not available):', asset.serial_number, '- Status:', asset.status);
            }
            return isAvailable;
          })
          .sort((a, b) => {
            // Sort by serial number to get sequential order
            // Extract numeric portion from serial_number (e.g., "Z7935" -> 7935)
            const aSerial = a.serial_number || '';
            const bSerial = b.serial_number || '';
            
            // Extract numbers from serial
            const aNum = parseInt(aSerial.replace(/\D/g, '') || '0');
            const bNum = parseInt(bSerial.replace(/\D/g, '') || '0');
            
            console.log(`🔢 Comparing: ${aSerial} (${aNum}) vs ${bSerial} (${bNum})`);
            return aNum - bNum;
          })
          .slice(0, this.quantity); // Take first N available

        console.log('✅ Available IGT assets after filter/sort:', availableAssets.length);
        console.log('📋 First 5 available:', availableAssets.slice(0, 5).map(a => a.serial_number));
        console.log('🎯 Quantity needed:', this.quantity);
        console.log('📊 Serial Assignments:', this.serialAssignments);

        if (availableAssets.length >= this.quantity) {
          this.generatedAssets = this.serialAssignments.map((assignment, index) => {
            const asset = availableAssets[index];
            const mapped = {
              index,
              serial: assignment.serial,
              ulNumber: assignment.ulNumber,
              asset: asset,
              assetNumber: asset?.serial_number, // Use serial_number field from your data
              needsForm: true // IGT requires form completion
            };
            console.log(`🔗 Mapping assignment ${index + 1}:`, {
              eyefi_serial: assignment.serial?.serial_number,
              ul_number: assignment.ulNumber?.ul_number,
              igt_serial: asset?.serial_number
            });
            return mapped;
          });

          this.toastrService.success(`Pre-selected ${availableAssets.length} IGT assets in sequence`);
          console.log('✨ Pre-selected IGT Assets (FINAL):', this.generatedAssets);
          console.log('✨ Generated Assets Length:', this.generatedAssets.length);
        } else {
          this.toastrService.warning(`Only ${availableAssets.length} IGT assets available. Need ${this.quantity}.`);
          this.generatedAssets = this.serialAssignments.map((assignment, index) => ({
            index,
            serial: assignment.serial,
            ulNumber: assignment.ulNumber,
            asset: availableAssets[index] || null,
            assetNumber: availableAssets[index]?.serial_number || null, // Use serial_number field
            needsForm: true
          }));
        }
      } else {
        console.error('❌ Invalid response format - not an array:', allAssets);
        throw new Error('No IGT assets data received');
      }
    } catch (error) {
      console.error('💥 Error pre-selecting IGT assets:', error);
      this.toastrService.warning('Could not pre-select IGT assets. Please fill the form manually.');
      this.generatedAssets = this.serialAssignments.map((assignment, index) => ({
        index,
        serial: assignment.serial,
        ulNumber: assignment.ulNumber,
        asset: null,
        assetNumber: null,
        needsForm: true
      }));
    }
  }

  getCustomerFormComponent(): string {
    switch (this.selectedCustomer) {
      case 'IGT':
        return 'igt';
      case 'Light and Wonder':
        return 'sg';
      case 'AGS':
        return 'ags';
      case 'Other':
        return 'other'; // Just assignment, no asset generation
      default:
        return 'other';
    }
  }

  /**
   * Handle form submission event from embedded form components
   */
  onFormSubmit(event: any, formType: string): void {
    console.log(`Form submission received from ${formType}:`, event);
    this.pendingFormData = event;
    this.currentFormType = formType;
  }

  /**
   * Trigger the embedded form to submit (called by submit button)
   * First shows confirmation modal with summary
   */
  async submitEmbeddedForm(): Promise<void> {
    // if (!this.pendingFormData) {
    //   this.toastrService.warning('Please fill out the form before submitting');
    //   return;
    // }

    // if (!this.pendingFormData.formValid) {
    //   this.toastrService.warning('Please fill in all required fields correctly');
    //   return;
    // }

    // Show confirmation modal instead of submitting directly
    this.showConfirmationSummary();
  }

  /**
   * Prepare and show confirmation modal with complete summary
   */
  showConfirmationSummary(): void {
    console.log('Preparing confirmation summary...', this.workOrderDetails);
    
    this.confirmationSummary = {
      workOrder: {
        number: this.workOrderNumber,
        part: this.workOrderDetails?.wo_part || 'N/A',
        description: this.workOrderDetails?.description || 'N/A'
      },
      batch: {
        quantity: this.quantity,
        category: this.category === 'new' ? 'New' : 'Used'
      },
      customer: this.selectedCustomer === 'Other' ? this.customOtherCustomerName : this.selectedCustomer,
      assignments: this.serialAssignments.map((assignment, index) => ({
        index: index + 1,
        eyefiSerial: typeof assignment.serial === 'string' 
          ? assignment.serial 
          : assignment.serial?.serial_number || 'N/A',
        ulNumber: assignment.ulNumber?.ul_number || 'N/A',
        ulCategory: assignment.ulNumber?.category || 'N/A'
      })),
      assets: this.generatedAssets.map((asset, index) => ({
        index: index + 1,
        assetNumber: asset.assetNumber || '(Will be generated)',
        eyefiSerial: typeof asset.serial === 'string' 
          ? asset.serial 
          : asset.serial?.serial_number || 'N/A',
        ulNumber: asset.ulNumber?.ul_number || 'N/A'
      }))
    };

    this.showConfirmationModal = true;
  }

  /**
   * User confirmed - proceed with actual submission
   */
  async confirmAndSubmit(): Promise<void> {
    this.showConfirmationModal = false;

    try {
      this.isLoading = true;

      let result: any;
      switch (this.currentFormType) {
        case 'sg':
          // Light and Wonder - Generate assets directly (no embedded form)
          result = await this.generateSGAssets();
          break;
        case 'igt':
          // IGT - Generate assets directly using pre-selected serials
          result = await this.generateIGTAssets();
          break;
        case 'ags':
          // AGS - Generate assets directly (no embedded form)
          result = await this.generateAGSAssets();
          break;
        case 'other':
          // Other - Just create assignments without asset generation
          result = await this.createOtherAssignments();
          break;
        default:
          throw new Error('Unknown form type: ' + this.currentFormType);
      }

      this.isLoading = false;
      
      // Prepare success summary with all created information
      this.successSummary = {
        workOrder: this.confirmationSummary.workOrder,
        batch: this.confirmationSummary.batch,
        customer: this.selectedCustomer === 'Other' ? this.customOtherCustomerName : this.selectedCustomer,
        customerType: this.currentFormType,
        createdAssets: this.generatedAssets.map((asset, index) => ({
          index: index + 1,
          assetNumber: asset.assetNumber,
          eyefiSerial: typeof asset.serial === 'string' 
            ? asset.serial 
            : asset.serial?.serial_number || 'N/A',
          ulNumber: asset.ulNumber?.ul_number || 'N/A',
          ulCategory: asset.ulNumber?.category || 'N/A'
        })),
        timestamp: new Date(),
        result: result
      };
      
      // Mark submission as complete (shows success on page)
      this.submissionComplete = true;
      
      // Scroll to top to see success banner
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error) {
      this.isLoading = false;
      console.error('Form submission error:', error);
      
      let errorMessage = 'An error occurred while creating the asset';
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      this.toastrService.error(errorMessage, 'Submission Error');
    }
  }

  /**
   * User canceled confirmation modal
   */
  cancelConfirmation(): void {
    this.showConfirmationModal = false;
  }

  /**
   * Test Submit - Simulate submission without database changes
   * Generates random asset numbers for preview
   */
  testSubmit(): void {
    this.isTestMode = true;

    // Generate random test asset numbers based on customer type
    const testAssets = this.generateTestAssetNumbers();

    // Build work order and batch info (same as confirmation modal)
    const workOrder = {
      number: this.workOrderNumber,
      part: this.workOrderDetails?.wo_part || 'N/A',
      description: this.workOrderDetails?.description || 'N/A'
    };
    
    console.log('🔍 TEST SUBMIT - workOrder object:', workOrder);

    const batch = {
      quantity: this.quantity,
      category: this.category === 'new' ? 'New' : 'Used',
      serialsUsed: this.serialAssignments.length,
      ulsUsed: this.serialAssignments.filter(a => a.ulNumber).length
    };

    // Prepare success summary with test data
    this.successSummary = {
      workOrder: workOrder,
      batch: batch,
      customer: this.selectedCustomer,
      customerType: this.currentFormType,
      createdAssets: this.serialAssignments.map((assignment, index) => ({
        index: index + 1,
        assetNumber: testAssets[index],
        eyefiSerial: typeof assignment.serial === 'string' 
          ? assignment.serial 
          : assignment.serial?.serial_number || 'N/A',
        ulNumber: assignment.ulNumber?.ul_number || 'N/A',
        ulCategory: assignment.ulNumber?.category || 'N/A'
      })),
      timestamp: new Date(),
      result: { success: true, test: true }
    };

    // Mark submission as complete (shows success on page)
    this.submissionComplete = true;

    // Scroll to top to see success banner
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.toastrService.info('🧪 Test Mode: No database changes made. Asset numbers are randomly generated for preview.', 'Test Submission');
  }

  /**
   * Generate random test asset numbers based on customer type
   */
  private generateTestAssetNumbers(): string[] {
    const testNumbers: string[] = [];
    
    for (let i = 0; i < this.quantity; i++) {
      let assetNumber = '';
      
      switch (this.currentFormType) {
        case 'sg': // Light and Wonder
          // Format: US + 8 random digits (e.g., US14421701)
          assetNumber = 'US' + this.randomDigits(8);
          break;
          
        case 'ags': // AGS
          // Format: AGS + 6 random digits (e.g., AGS123456)
          assetNumber = 'AGS' + this.randomDigits(6);
          break;
          
        case 'igt': // IGT
          // Format: Z + 4 random digits (e.g., Z7935)
          assetNumber = 'Z' + this.randomDigits(4);
          break;
          
        default:
          assetNumber = 'TEST' + this.randomDigits(6);
      }
      
      testNumbers.push(assetNumber);
    }
    
    return testNumbers;
  }

  /**
   * Generate random digits
   */
  private randomDigits(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  /**
   * Print Serial Number Report
   */
  printSerialReport(): void {
    if (!this.successSummary) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastrService.error('Please allow pop-ups to print the report');
      return;
    }

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Serial Number Report - WO ${this.successSummary.workOrder.number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          .section { margin: 20px 0; }
          .section-title { font-weight: bold; color: #555; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #007bff; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()" style="margin-bottom: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer;">
          Print Report
        </button>
        
        <h1>Serial Number Assignment Report</h1>
        
        <div class="section">
          <div class="section-title">Work Order Information</div>
          <table>
            <tr><th>Work Order #</th><td>${this.successSummary.workOrder.number || 'N/A'}</td></tr>
            <tr><th>Part Number</th><td>${this.successSummary.workOrder.part || 'N/A'}</td></tr>
            <tr><th>Description</th><td>${this.successSummary.workOrder.description || 'N/A'}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Batch Details</div>
          <table>
            <tr><th>Quantity</th><td>${this.successSummary.batch.quantity}</td></tr>
            <tr><th>Category</th><td>${this.successSummary.batch.category}</td></tr>
            <tr><th>Customer</th><td>${this.successSummary.customer}</td></tr>
            <tr><th>Date/Time</th><td>${this.successSummary.timestamp.toLocaleString()}</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Created Assets (${this.successSummary.createdAssets.length})</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>${this.successSummary.customer} Asset Number</th>
                <th>EyeFi Serial Number</th>
                <th>UL Number</th>
                <th>UL Category</th>
              </tr>
            </thead>
            <tbody>
              ${this.successSummary.createdAssets.map(asset => `
                <tr>
                  <td>${asset.index}</td>
                  <td><strong>${asset.assetNumber}</strong></td>
                  <td>${asset.eyefiSerial}</td>
                  <td>${asset.ulNumber}</td>
                  <td>${asset.ulCategory}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          Generated on ${new Date().toLocaleString()} | EyeFi Serial Workflow System
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  }

  /**
   * Print Labels - Opens zebra label print modal for each asset
   */
  printLabels(): void {
    if (!this.successSummary || !this.successSummary.createdAssets) {
      this.toastrService.warning('No assets found to print labels');
      return;
    }

    // Print labels for each created asset using the proper Zebra label service
    this.successSummary.createdAssets.forEach((asset, index) => {
      const customerType = this.successSummary.customerType;
      let title = '';
      
      // Set title based on customer type
      if (customerType === 'sg') {
        title = 'Print Light and Wonder Asset Label';
      } else if (customerType === 'ags') {
        title = 'Print AGS Asset Label';
      } else if (customerType === 'igt') {
        title = 'Print IGT Asset Label';
      } else {
        title = 'Print Asset Label';
      }

      // Open zebra label print modal for each asset
      setTimeout(() => {
        this.zebraLabelPrintModalService.open({
          serialNumber: asset.eyefiSerial,
          title: `${title} (${index + 1} of ${this.successSummary.createdAssets.length})`,
          partNumber: asset.assetNumber
        });
      }, index * 300); // Slight delay between modals
    });

    this.toastrService.info(
      `Opening ${this.successSummary.createdAssets.length} label print dialog(s)`,
      'Print Labels'
    );
  }

  /**
   * Submit SG Asset (Light and Wonder) form
   * Generates assets in bulk THEN submits the form
   */
  private async submitSgAssetForm(formValue: any): Promise<any> {
    console.log('🚀 Starting SG Asset bulk generation and submission');
    
    // Step 1: Generate all SG assets in bulk (creates database records)
    await this.generateSGAssets();
    console.log('✅ SG Assets generated:', this.generatedAssets);
    
    // Step 2: Submit form with the generated assets
    // (If your form needs the generated asset numbers, you can pass them here)
    console.log('📝 Submitting SG Asset form:', formValue);
    return await this.sgAssetService.create(formValue);
  }

  /**
   * Submit IGT form
   */
  private async submitIgtForm(formValue: any): Promise<any> {
    console.log('📝 Submitting IGT form:', formValue);
    return await this.igtAssetService.create(formValue);
  }

  /**
   * Submit AGS Serial form
   * Generates assets in bulk THEN submits the form
   */
  private async submitAgsSerialForm(formValue: any): Promise<any> {
    console.log('🚀 Starting AGS Serial bulk generation and submission');
    
    // Step 1: Generate all AGS serials in bulk (creates database records)
    await this.generateAGSAssets();
    console.log('✅ AGS Serials generated:', this.generatedAssets);
    
    // Step 2: Submit form with the generated serials
    console.log('📝 Submitting AGS Serial form:', formValue);
    return await this.agsSerialService.create(formValue);
  }

  submitWorkflow(): void {
    // This method is no longer used for routing
    // Keep for backward compatibility or remove if not needed
    console.log('Workflow completed');
    this.toastrService.success('Form submitted successfully!');
  }

  logout(): void {
    if (this.wrapperComponent) {
      this.wrapperComponent.logout();
    }
  }
}
