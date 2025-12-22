import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { QRCodeComponent } from 'angularx-qrcode';
import { PublicFormWrapperComponent } from '../public-form-wrapper/public-form-wrapper.component';
import { EyefiSerialSearchNgSelectComponent } from '@app/shared/eyefi-serial-search/eyefi-serial-search-ng-select.component';
import { UlLabelSearchNgSelectComponent } from '@app/shared/ul-label-search/ul-label-search-ng-select.component';
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
import { MismatchReport } from './models/mismatch-report.model';
import { MismatchReportService } from './services/mismatch-report.service';
import { SerialSequenceDebugModalComponent } from '../serial-sequence-debug-modal/serial-sequence-debug-modal.component';
import { SerialAssignmentsService } from '@app/features/serial-assignments/services/serial-assignments.service';
import { SerialReportPrintService } from '@app/shared/services/serial-report-print.service';
import { interval, Subscription } from 'rxjs';

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

// Verification interfaces
interface VerificationSession {
  session_id: string;
  serial_assignment_id?: number;
  expected_serial: string;
  expected_ul?: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  created_at: string;
  expires_at: string;
}

interface VerificationResult {
  success: boolean;
  verified: boolean;
  matched: boolean;
  message?: string;
}

@Component({
  selector: 'app-eyefi-serial-workflow',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    QRCodeComponent,
    PublicFormWrapperComponent,
    EyefiSerialSearchNgSelectComponent,
    UlLabelSearchNgSelectComponent,
    QadWoSearchComponent,
    StandaloneIgtFormComponent,
    StandaloneSgAssetComponent,
    StandaloneAgsSerialComponent
  ],
  templateUrl: './eyefi-serial-workflow.component.html',
  styleUrls: ['./eyefi-serial-workflow.component.scss']
})
export class EyefiSerialWorkflowComponent implements OnInit, OnDestroy {
  @ViewChild(PublicFormWrapperComponent) wrapperComponent!: PublicFormWrapperComponent;
  @ViewChild('confirmationModal') confirmationModal!: TemplateRef<any>;
  @ViewChild('mismatchReportModal') mismatchReportModal!: TemplateRef<any>;

  // Workflow Session ID - links all serials in this workflow batch
  workflowSessionId: string = '';

  // Authentication state
  isAuthenticated = false;
  currentUser: any = null;

  // Mismatch Report
  mismatchReport: Partial<MismatchReport> = {
    rowIndex: null,
    contactMethod: 'workstation'
  };
  isSubmittingMismatch = false;

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
      title: 'Choose Asset Type',
      description: 'Select Serial Tag or Asset Number',
      completed: false,
      active: false
    },
    {
      id: 3,
      title: 'Select Customer',
      description: 'Choose the customer for this batch',
      completed: false,
      active: false
    },
    {
      id: 4,
      title: 'Configure Batch',
      description: 'Enter quantity and select category (New/Used)',
      completed: false,
      active: false
    },
    {
      id: 5,
      title: 'Assign Serials & UL Numbers',
      description: 'Select serial numbers and assign UL labels',
      completed: false,
      active: false
    },
    {
      id: 6,
      title: 'Generate Assets',
      description: 'Generate or select customer assets',
      completed: false,
      active: false
    }
  ];

  // Step 1: Work Order
  workOrderNumber: string | any = '';
  workOrderDetails: any = null; // Store full work order details (part #, description, etc.)

  // Step 2: Asset Type Selection
  assetType: 'serial' | 'asset_number' = 'serial'; // 'serial' = EYEFI Serial Tag, 'asset_number' = EYEFI Asset Number

  // Step 2: Batch Configuration
  quantity: number = 1;
  category: string = 'new'; // 'new' or 'used'
  ulRequired: boolean = true; // Toggle whether UL numbers are required
  verificationEnabled: boolean = false; // Toggle to enable/disable verification process (default: disabled)
  
  // Step 3: Serial and UL assignments
  serialAssignments: Array<{
    serial: any;
    ulNumber: any;
    isAutoPopulated: boolean; // Track if this was auto-populated
    manuallyChanged: boolean; // Track if user manually changed it
    isEditing: boolean; // Track if user is editing this row
    verified: boolean; // Track if this serial has been physically verified
    verificationStatus?: 'pending' | 'verified' | 'failed'; // Verification status
    verificationPhoto?: string; // Path to verification photo
    verifiedAt?: Date; // When verification completed
    verifiedBy?: string; // Who verified it
  }> = [];

  // Step 4: Customer selection
  selectedCustomer: string = '';
  customOtherCustomerName: string = ''; // For "Other" customer type - store custom name
  customerSearchFilter: string = ''; // Search filter for customer list

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
    'AINGAM',
    'AMEGAM',
    'ATI',
    'AVAGAM',
    'BalGam',
    'BALTEC',
    'BETRIT',
    'CHUGOL',
    'EVIGAM',
    'GAMART',
    'IGT_EUR',
    'INTGAM',
    'JACENT',
    'KONGAM',
    'MCBHOL',
    'MCBJOH',
    'NORPRE',
    'NOVAME',
    'PECRES',
    'SANMAN',
    'SIGCON',
    'SMSLLC',
    'STYGAM',
    'VegasSig',
    'YELFIS',
    'VGT',
    'MIAVAL',
    'ODACAS',
    'ABPRE',
    'CAEENT',
    'USARMY',
    'IGT_CAN',
    'GAMCAP',
    'VECGAM',
    'ARUGAM',
    'GTSOURCE',
    'A&WENT',
    'ADVGAM',
    'AEROSPAC',
    'MGM-BELL',
    'BOYGAM',
    'CENGAM-M',
    'CHINATRA',
    'COLEKEPR',
    'DIAGAM',
    'FLEXINT',
    'GOLDROUT',
    'GRANDVIS',
    'INTUICOD',
    'JPSLOT',
    'NEXGAM',
    'PARPRONV',
    'PERGAM',
    'SWSLOTCO',
    'TOVISCO',
    'VSRIND',
    'WINMARK',
    'WORLDWID',
    'METAGAM',
    'SANTFE',
    'QUICHA',
    'SYNBLUE',
    'ELDOREST',
    'CIRCCIRC',
    'SILVLEGC',
    'TURNSTON',
    'MGMINTL',
    'METSIG',
    'RAINROCK',
    'EPICTECH',
    'PROTO-A',
    'BVGA',
    'WESTGATE',
    'ELDORADO',
    'ZITROUSA',
    'BELLAGIO',
    'TREASURE',
    'BETRITE',
    'HILAND',
    'RAMPART',
    'BLUBERI',
    'AGLC',
    'MICCO',
    'MONROE',
    'HAAS',
    'OSPLLC',
    'AVI',
    'JRSHOS',
    'INCRED',
    'SONNY',
    'KIRON',
    'RHC',
    'RTSINC',
    'ECLIPSE',
    'GALAXY',
    'PLUSS',
    'EXCEED',
    'TIOLI',
    'INTERB',
    'Other'
  ];

  // UI state
  isLoading = false;
  autoSequenceInfoExpanded = false; // Track collapse/expand state for auto-sequence info
  mismatchReportExpanded = false; // Track collapse/expand state for mismatch reporting section
  
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
  private readonly USE_LAST_ITEMS_FOR_TESTING = false; // 🧪 CHANGE TO FALSE FOR PRODUCTION

  // Verification state
  currentVerificationSession: VerificationSession | null = null;
  currentVerificationIndex: number | null = null;
  verificationStatus: string = '';
  isVerifying: boolean = false;
  showVerificationModal: boolean = false;
  verificationPollingSubscription: Subscription | null = null;
  verificationSessionTimer: any = null;
  verificationSessionExpiry: Date | null = null;
  verificationProgress: { current: number; total: number } = { current: 0, total: 0 };

  constructor(
    private router: Router,
    private toastrService: ToastrService,
    private modalService: NgbModal,
    private ulLabelService: ULLabelService,
    private sgAssetService: SgAssetService,
    private igtAssetService: IgtAssetService,
    private agsSerialService: AgsSerialService,
    private serialNumberService: SerialNumberService,
    private zebraLabelPrintModalService: ZebraLabelPrintModalService,
    private authenticationService: AuthenticationService,
    private mismatchReportService: MismatchReportService,
    private serialAssignmentsService: SerialAssignmentsService,
    private serialReportPrintService: SerialReportPrintService
  ) {}

  ngOnInit(): void {
    // Generate workflow session ID for tracking this batch
    this.workflowSessionId = this.generateUUID();
    console.log('🔐 Workflow Session ID:', this.workflowSessionId);
    console.log('📊 Total Steps Defined:', this.steps.length);
    console.log('📋 Steps Array:', this.steps.map(s => `${s.id}: ${s.title}`));
    
    // Restore workflow state from sessionStorage if exists
    this.restoreWorkflowState();
    
    // Don't load UL numbers until user is authenticated
  }

  ngOnDestroy(): void {
    // Save workflow state before component is destroyed (refresh/navigation)
    this.saveWorkflowState();
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

  /**
   * Generate UUID v4 for workflow session tracking
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async loadAvailableULs(): Promise<void> {
    try {
      this.isLoadingULs = true;
      // Use NEW serial-availability API that excludes consumed ULs via LEFT JOIN to ul_label_usages
      const response = await this.serialNumberService.getAvailableUlLabelsFromAPI(1000); // Get next 1000 in sequence
      
      if (response && response.success && Array.isArray(response.data)) {
        // Map backend data with prefix and numeric_part extraction
        this.availableULs = response.data.map((ul: any) => ({
          id: ul.id,
          ul_number: ul.ul_number,
          prefix: this.extractPrefix(ul.ul_number),
          numeric_part: this.extractNumericPart(ul.ul_number),
          description: ul.description || '',
          category: ul.category || '',
          status: 'available', // Already filtered by API
          dateCreated: new Date(ul.created_at),
          dateUsed: undefined
        }));

        // Already ordered by ul_number from API - no need to sort again
        
        console.log('Loaded NEXT AVAILABLE UL numbers:', this.availableULs.length);
        console.log('- First UL:', this.availableULs[0]?.ul_number);
        console.log('- Category breakdown:');
        console.log('  - New ULs:', this.availableULs.filter((ul: any) => ul.category === 'New').length);
        console.log('  - Used ULs:', this.availableULs.filter((ul: any) => ul.category === 'Used').length);
        
        // Log samples for debugging
        const sampleNew = this.availableULs.filter((ul: any) => ul.category === 'New').slice(0, 10);
        console.log('First 10 New ULs (NEXT IN SEQUENCE):', sampleNew.map((ul: any) => `${ul.ul_number}`));
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
    
    // Restore workflow state if user refreshed while authenticated
    this.restoreWorkflowState();
  }

  onUserLoggedOut(): void {
    console.log('User logged out');
    this.isAuthenticated = false;
    this.currentUser = null;
    this.resetWorkflow();
    
    // Clear saved workflow state on logout
    this.clearWorkflowState();
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
      console.log('cp_cust:', workOrder.cp_cust);
      
      // Auto-select customer based on cp_cust if it matches our customer list
      if (workOrder.cp_cust) {
        const matchedCustomer = this.customerOptions.find(
          customer => customer.toUpperCase() === workOrder.cp_cust.toUpperCase()
        );
        
        if (matchedCustomer) {
          this.selectedCustomer = matchedCustomer;
          console.log('✅ Auto-selected customer:', matchedCustomer, 'from work order cp_cust:', workOrder.cp_cust);
          this.toastrService.info(`Customer auto-selected: ${matchedCustomer}`, 'Auto-Selection');
          
          // Scroll to selected customer when user navigates to step 2
          if (this.currentStep === 2) {
            this.scrollToSelectedCustomer();
          }
        } else {
          console.log('⚠️ Customer', workOrder.cp_cust, 'not found in customer options list. Will need manual selection.');
          // Optionally set to "Other" and pre-fill the custom name
          this.selectedCustomer = 'Other';
          this.customOtherCustomerName = workOrder.cp_cust;
          this.toastrService.info(`Customer set to "Other": ${workOrder.cp_cust}`, 'Auto-Selection');
        }
      } else {
        console.log('ℹ️ No cp_cust in work order. Customer selection required.');
      }
    } else {
      this.workOrderNumber = '';
      this.workOrderDetails = null;
      this.selectedCustomer = ''; // Reset customer selection
      this.customOtherCustomerName = ''; // Reset custom name
    }
  }

  // Getter for filtered customer options based on search
  get filteredCustomerOptions(): string[] {
    if (!this.customerSearchFilter || this.customerSearchFilter.trim() === '') {
      return this.customerOptions;
    }
    
    const searchTerm = this.customerSearchFilter.toLowerCase();
    return this.customerOptions.filter(customer => 
      customer.toLowerCase().includes(searchTerm)
    );
  }

  // Scroll to auto-selected customer in the list
  scrollToSelectedCustomer(): void {
    if (this.selectedCustomer) {
      // Use setTimeout to ensure DOM is rendered
      setTimeout(() => {
        const selectedElement = document.getElementById(`customer-${this.selectedCustomer}`);
        if (selectedElement) {
          selectedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          console.log('📍 Scrolled to customer:', this.selectedCustomer);
        }
      }, 100);
    }
  }

  // Step navigation
  goToStep(stepNumber: number): void {
    if (stepNumber <= this.currentStep + 1) {
      this.currentStep = stepNumber;
      this.updateStepStates();
      
      // If navigating to step 2 and customer is selected, scroll to it
      if (stepNumber === 2 && this.selectedCustomer) {
        this.scrollToSelectedCustomer();
      }
    }
  }

  async nextStep(): Promise<void> {
    if (this.canProceedToNextStep()) {
      this.completeCurrentStep();
      
      // Auto-populate serials when moving from Step 4 (Configure Batch) to Step 5 (Assign Serials)
      if (this.currentStep === 4) {
        this.currentStep++;
        this.updateStepStates();
        
        // 🔄 Refresh both EyeFi serials and UL numbers before auto-populating
        // This ensures we have the latest available sequences from the database
        // and prevents assigning already-consumed serials/ULs
        console.log('🔄 Refreshing EyeFi serials and UL numbers before auto-population...');
        await this.loadAvailableULs();
        // Note: EyeFi serials are fetched fresh in performAutoPopulation() via API call
        
        await this.autoPopulateSerials();
        this.saveWorkflowState(); // Save after populating
      }
      // Auto-generate/select assets when moving from Step 5 (Assign Serials) to Step 6 (Generate Assets)
      else if (this.currentStep === 5) {
        this.currentStep++;
        this.updateStepStates();
        
        // Set current form type based on selected customer
        this.currentFormType = this.getCustomerFormComponent();
        console.log('🎯 Setting currentFormType:', this.currentFormType, 'for customer:', this.selectedCustomer);
        
        // 🔄 Refresh customer-specific serials before asset generation
        // IGT, SG, and AGS assets are fetched fresh in handleAssetGeneration() via their respective API calls
        // This ensures we have the latest available customer serial numbers
        console.log('🔄 Refreshing customer assets for', this.selectedCustomer, '...');
        
        await this.handleAssetGeneration();
        this.saveWorkflowState(); // Save after generating assets
      }
      else {
        this.currentStep++;
        this.updateStepStates();
        this.saveWorkflowState(); // Save after each step
        
        // If moved to step 3 and customer is selected, scroll to it
        if (this.currentStep === 3 && this.selectedCustomer) {
          this.scrollToSelectedCustomer();
        }
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateStepStates();
      
      // If moved back to step 3 and customer is selected, scroll to it
      if (this.currentStep === 3 && this.selectedCustomer) {
        this.scrollToSelectedCustomer();
      }
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
        // Step 2: Asset Type selection required
        return !!this.assetType;
      case 3:
        // Step 3: Customer selected (and custom name if "Other" selected)
        if (this.selectedCustomer === 'Other') {
          return !!this.selectedCustomer && !!this.customOtherCustomerName && this.customOtherCustomerName.trim().length > 0;
        }
        return !!this.selectedCustomer;
      case 4:
        // Step 4: Quantity must be at least 1 and category selected
        // Also ensure serialAssignments array is initialized
        if (this.quantity >= 1 && !!this.category) {
          // Initialize serialAssignments if not already done
          if (this.serialAssignments.length !== this.quantity) {
            this.onQuantityChange();
          }
          return true;
        }
        return false;
      case 5:
        // Step 5: All serial assignments must be filled
        // Handle both object (new category) and string (used category) serial values
        // UL is optional based on ulRequired flag
        const allFilled = this.serialAssignments.length === this.quantity &&
               this.serialAssignments.every(a => {
                 // Extract serial number string from either object or string format
                 let serialValue = null;
                 if (typeof a.serial === 'string') {
                   serialValue = a.serial.trim();
                 } else if (a.serial && typeof a.serial === 'object' && a.serial.serial_number) {
                   serialValue = a.serial.serial_number.trim();
                 }
                 
                 const hasSerial = !!serialValue && serialValue.length > 0;
                 const hasUL = !!a.ulNumber;
                 
                 // If UL is required, check both serial and UL; otherwise just check serial
                 return this.ulRequired ? (hasSerial && hasUL) : hasSerial;
               });
        
        // For NEW category (pre-loaded serials), require verification for ALL customers
        // USED category doesn't require verification (manual entry)
        if (this.category === 'new') {
          return allFilled && this.allSerialsVerified();
        }
        
        return allFilled;
      case 6:
        // Step 6: For SG/Light and Wonder with USED category, ensure all asset numbers are manually entered
        const customerType = this.getCustomerFormComponent();
        if (customerType === 'sg' && this.category === 'used') {
          return this.generatedAssets.length === this.quantity &&
                 this.generatedAssets.every(asset => {
                   return !!asset.assetNumber && asset.assetNumber.trim().length > 0;
                 });
        }
        // For other customers (including SG with NEW category), allow proceeding
        return this.generatedAssets.length === this.quantity;
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
      verified: boolean;
      verificationStatus?: 'pending' | 'verified' | 'failed';
      verificationPhoto?: string;
      verifiedAt?: Date;
      verifiedBy?: string;
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
          isEditing: false,
          verified: false
        });
      }
    }
    
    this.serialAssignments = newAssignments;
    console.log('Serial assignments updated:', this.serialAssignments);
  }

  async autoPopulateSerials(): Promise<void> {
    // This will be called when moving from Step 3 to Step 4
    this.isLoading = true;
    try {
      await this.performAutoPopulation();
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

  /**
   * Refresh serials and ULs - useful if admin fixed sequence
   * Reloads from API and re-populates assignments
   */
  async refreshSerialAssignments(): Promise<void> {
    if (!confirm('Refresh serial and UL assignments? This will reload the latest available items from the database.')) {
      return;
    }

    this.isLoading = true;
    try {
      // Reload UL numbers first
      await this.loadAvailableULs();
      
      // Re-populate assignments with fresh data
      await this.performAutoPopulation();
      
      this.toastrService.success('Serial and UL assignments refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing assignments:', error);
      this.toastrService.error('Failed to refresh assignments. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Core auto-population logic - extracted for reuse by both autoPopulateSerials() and refreshSerialAssignments()
   */
  private async performAutoPopulation(): Promise<void> {
      // For USED category, only auto-populate UL numbers, NOT serials (user will enter manually)
      // For NEW category, auto-populate both serials and UL numbers
      let serials = [];
      
      if (this.category === 'new') {
        // Check asset type: 'serial' = traditional EyeFi serials, 'asset_number' = YYYYMMDDXXX format
        if (this.assetType === 'asset_number') {
          // EYEFI Asset Numbers - Show PREVIEW placeholders (actual generation happens on submit)
          console.log('🔢 Creating preview placeholders for EYEFI Asset Numbers (YYYYMMDDXXX format)...');
          serials = this.createAssetNumberPreviewPlaceholders(this.quantity);
        } else {
          // Traditional EyeFi Serial Tags
          // ✨ NEW: Use availability views that check BOTH serial_assignments AND legacy tables
          const serialsResponse = await this.serialNumberService.getAvailableSerialsFromViews(this.quantity * 2);
          
          console.log('🆕 Serials Response (from views):', serialsResponse);
          
          if (serialsResponse?.success && serialsResponse?.data && Array.isArray(serialsResponse.data)) {
            const allSerials = serialsResponse.data;
            
            // Use LAST or FIRST items based on testing mode
            serials = this.USE_LAST_ITEMS_FOR_TESTING 
              ? allSerials.slice(-this.quantity)  // Testing: LAST N items
              : allSerials.slice(0, this.quantity); // Production: FIRST N items
            
            if (this.USE_LAST_ITEMS_FOR_TESTING) {
              console.log(`🧪 TESTING MODE: Total serials: ${allSerials.length}, Using LAST ${this.quantity}`, serials.map(s => s.serial_number));
            }
          }
        }
      } else {
        console.log('USED category: Skipping serial auto-populate - user will enter manually');
      }

      console.log('Available ULs already loaded:', this.availableULs);
      
      // Process UL numbers only if required
      if (this.ulRequired && this.availableULs && this.availableULs.length > 0) {
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
            // Only assign serials for NEW category
            this.serialAssignments[i].serial = (this.category === 'new' && serials[i]) ? serials[i] : null;
            this.serialAssignments[i].ulNumber = uls[i] || null;
            this.serialAssignments[i].isAutoPopulated = true;
            this.serialAssignments[i].manuallyChanged = false;
            // For USED category, start in edit mode so user can enter serial manually
            this.serialAssignments[i].isEditing = (this.category === 'used');
            
            console.log(`Assignment ${i + 1}:`, {
              serial: this.serialAssignments[i].serial?.serial_number,
              ul: this.serialAssignments[i].ulNumber?.ul_number,
              category: this.category,
              isEditing: this.serialAssignments[i].isEditing
            });
          }
        }
        
        const modeText = this.USE_LAST_ITEMS_FOR_TESTING ? '🧪 TESTING: Using LAST' : 'Auto-populated';
        const serialMsg = this.category === 'new' ? 'serial numbers and' : '';
        this.toastrService.success(`${modeText} ${serialMsg} ${categoryValue} UL labels`);
      } else if (!this.ulRequired) {
        // UL not required - only populate serials for NEW category
        for (let i = 0; i < this.quantity; i++) {
          if (this.serialAssignments[i]) {
            // Only assign serials for NEW category
            this.serialAssignments[i].serial = (this.category === 'new' && serials[i]) ? serials[i] : null;
            this.serialAssignments[i].ulNumber = null; // No UL required
            this.serialAssignments[i].isAutoPopulated = true;
            this.serialAssignments[i].manuallyChanged = false;
            // For USED category, start in edit mode so user can enter serial manually
            this.serialAssignments[i].isEditing = (this.category === 'used');
          }
        }
        
        const serialMsg = this.category === 'new' ? 'serial numbers' : 'assignments';
        const modeText = this.USE_LAST_ITEMS_FOR_TESTING ? '🧪 TESTING: Using LAST' : 'Auto-populated';
        this.toastrService.success(`${modeText} ${serialMsg} (UL labels skipped - not required)`);
      } else {
        this.toastrService.warning('Could not auto-populate. Please select serial numbers manually.');
        // Set everything to manual mode
        for (let i = 0; i < this.quantity; i++) {
          if (this.serialAssignments[i]) {
            this.serialAssignments[i].isEditing = true;
          }
        }
      }
  }

  onSerialAssigned(index: number, serial: any): void {
    if (this.serialAssignments[index]) {
      const wasAutoPopulated = this.serialAssignments[index].isAutoPopulated;
      
      // Check for duplicate serial numbers
      if (serial) {
        // Get the serial number string for comparison (handle both object and string)
        const serialNumber = serial.serial_number || serial;
        
        const duplicateIndex = this.serialAssignments.findIndex((assignment, i) => {
          if (i === index) return false; // Skip self
          const assignedSerial = assignment.serial?.serial_number || assignment.serial;
          return assignedSerial === serialNumber;
        });
        
        if (duplicateIndex !== -1) {
          this.toastrService.error(
            `Serial number ${serialNumber} is already assigned to row ${duplicateIndex + 1}. Please select a different serial.`
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
      // Store as plain text string first (don't block typing)
      if (serialText && serialText.trim()) {
        this.serialAssignments[index].serial = serialText.trim();
        this.serialAssignments[index].manuallyChanged = true;
        console.log(`Manual serial entered at position ${index}:`, serialText);
      } else {
        this.serialAssignments[index].serial = null;
      }
    }
  }
  
  /**
   * Check for duplicate serial on blur (when user finishes typing)
   */
  onSerialBlur(index: number): void {
    if (this.serialAssignments[index]) {
      const serialText = this.serialAssignments[index].serial;
      
      // Only process if it's a string (manually entered)
      if (serialText && typeof serialText === 'string' && serialText.trim()) {
        // Check for duplicate serial text within this batch
        const duplicateIndex = this.serialAssignments.findIndex((assignment, i) => 
          i !== index && (
            (typeof assignment.serial === 'string' && assignment.serial === serialText.trim()) ||
            (typeof assignment.serial === 'object' && assignment.serial?.serial_number === serialText.trim())
          )
        );
        
        if (duplicateIndex !== -1) {
          this.toastrService.error(
            `Serial number ${serialText} is already assigned to row ${duplicateIndex + 1}. Please enter a different serial.`,
            'Duplicate Serial'
          );
          // Clear the duplicate
          this.serialAssignments[index].serial = '';
          this.serialAssignments[index].manuallyChanged = false;
        } else {
          // Mark as manually changed
          this.serialAssignments[index].manuallyChanged = true;
        }
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
        isEditing: false,
        verified: false
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

  /**
   * Handle manual asset number input for SG/Light and Wonder
   */
  onAssetNumberInput(index: number, assetNumberText: string): void {
    if (this.generatedAssets[index]) {
      // Store the manually entered asset number
      if (assetNumberText && assetNumberText.trim()) {
        this.generatedAssets[index].assetNumber = assetNumberText.trim();
        console.log(`Manual asset number entered at position ${index}:`, assetNumberText);
      } else {
        this.generatedAssets[index].assetNumber = null;
      }
    }
  }

  /**
   * Check for duplicate asset numbers on blur
   */
  onAssetNumberBlur(index: number): void {
    if (this.generatedAssets[index]) {
      const assetNumber = this.generatedAssets[index].assetNumber;
      
      if (assetNumber && assetNumber.trim()) {
        // Check for duplicate asset numbers within this batch
        const duplicateIndex = this.generatedAssets.findIndex((asset, i) => 
          i !== index && asset.assetNumber === assetNumber.trim()
        );
        
        if (duplicateIndex !== -1) {
          this.toastrService.error(
            `Asset number ${assetNumber} is already assigned to row ${duplicateIndex + 1}. Please enter a different asset number.`,
            'Duplicate Asset Number'
          );
          // Clear the duplicate
          this.generatedAssets[index].assetNumber = null;
        }
      }
    }
  }

  /**
   * Get count of completed asset number entries (for SG/Light and Wonder)
   */
  getCompletedAssetNumbersCount(): number {
    return this.generatedAssets.filter(a => a.assetNumber && a.assetNumber.trim().length > 0).length;
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
    
    // Clear saved workflow state
    this.clearWorkflowState();
    
    // 🔄 REFRESH UL numbers to get latest available sequence
    // This ensures we don't use stale/consumed ULs from previous batch
    if (this.isAuthenticated) {
      console.log('🔄 Refreshing UL numbers for new batch...');
      this.loadAvailableULs();
    }
    
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
        // Use customOtherCustomerName if "Other" was selected and custom name was entered
        // Otherwise use the selected customer name directly (e.g., CHUGOL, KONGAM, etc.)
        const customerName = this.selectedCustomer === 'Other' ? this.customOtherCustomerName : this.selectedCustomer;
        console.log('➡️ Other customer - no asset generation needed');
        console.log('👤 Customer Name:', customerName);
        this.generatedAssets = this.serialAssignments.map((a, i) => ({
          index: i,
          serial: a.serial,
          ulNumber: a.ulNumber,
          assetNumber: 'N/A', // No asset number for Other
          asset: null,
          customerName: customerName
        }));
      } else if (customerType === 'sg') {
        // SG (Light and Wonder) - Manual entry for USED, auto-generate for NEW
        if (this.category === 'used') {
          console.log('➡️ SG assets require manual entry (USED category)');
          this.generatedAssets = this.serialAssignments.map((a, i) => ({
            index: i,
            serial: a.serial,
            ulNumber: a.ulNumber,
            assetNumber: null, // Will be manually entered by user
            asset: null,
            isEditing: true, // Enable editing mode
            needsManualEntry: true // Flag for manual entry requirement
          }));
        } else {
          console.log('➡️ SG assets will be auto-generated on submit (NEW category)');
          this.generatedAssets = this.serialAssignments.map((a, i) => ({
            index: i,
            serial: a.serial,
            ulNumber: a.ulNumber,
            assetNumber: '(Will be generated on submit)',
            asset: null
          }));
        }
      } else {
        // AGS - Will auto-generate on submit
        console.log('➡️ AGS assets will be generated on form submit');
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
   * For USED category: Uses manually entered asset numbers from generatedAssets array
   * For NEW category: Auto-generates asset numbers in backend
   */
  async generateSGAssets(): Promise<void> {
    try {
      // Get current user info
      const currentUser = this.authenticationService.currentUserValue;
      const userFullName = currentUser?.full_name || 'System';

      // Prepare bulk assignments array
      // For USED category, include manually entered asset numbers
      // For NEW category, backend will auto-generate asset numbers
      const assignments = this.category === 'used'
        ? this.generatedAssets.map((generated, index) => ({
            serialNumber: typeof generated.serial === 'string' ? generated.serial : generated.serial.serial_number,
            eyefi_serial_id: typeof generated.serial === 'string' ? null : generated.serial.id,
            ulNumber: generated.ulNumber?.ul_number || '',
            ul_label_id: generated.ulNumber?.id || null,
            sgAssetNumber: generated.assetNumber, // Use manually entered asset number for USED
            sgPartNumber: this.workOrderDetails?.cp_cust_part || '',
            poNumber: this.workOrderNumber,
            property_site: '',
            active: 1,
            inspector_name: userFullName,
            consumed_by: userFullName,
            asset_type: this.assetType,
            wo_number: this.workOrderNumber,
            wo_part: this.workOrderDetails?.wo_part || null,
            wo_description: this.workOrderDetails?.description || null,
            wo_qty_ord: this.workOrderDetails?.wo_qty_ord || null,
            wo_due_date: this.workOrderDetails?.wo_due_date || null,
            wo_routing: this.workOrderDetails?.wo_routing || null,
            wo_line: this.workOrderDetails?.wo_line || null,
            cp_cust_part: this.workOrderDetails?.cp_cust_part || null,
            cp_cust: this.workOrderDetails?.cp_cust || null
          }))
        : this.serialAssignments.map((assignment) => ({
            serialNumber: typeof assignment.serial === 'string' ? assignment.serial : assignment.serial.serial_number,
            eyefi_serial_id: typeof assignment.serial === 'string' ? null : assignment.serial.id,
            ulNumber: assignment.ulNumber?.ul_number || '',
            ul_label_id: assignment.ulNumber?.id || null,
            sgPartNumber: this.workOrderDetails?.cp_cust_part || '', //this is a customer field for sg
        poNumber: this.workOrderNumber,
        property_site: '', // Add if needed
        active: 1,
        inspector_name: userFullName,
        consumed_by: userFullName,
        asset_type: this.assetType, // 'serial' or 'asset_number'
        // Work Order Information
        wo_number: this.workOrderNumber,
        wo_part: this.workOrderDetails?.wo_part || null,
        wo_description: this.workOrderDetails?.description || null,
        wo_qty_ord: this.workOrderDetails?.wo_qty_ord || null,
        wo_due_date: this.workOrderDetails?.wo_due_date || null,
        wo_routing: this.workOrderDetails?.wo_routing || null,
        wo_line: this.workOrderDetails?.wo_line || null,
        cp_cust_part: this.workOrderDetails?.cp_cust_part || null,
        cp_cust: this.workOrderDetails?.cp_cust || null
      }));

      console.log('📦 Bulk creating SG assets:', assignments);
      console.log('👤 Created by:', userFullName);
      console.log('🔍 First assignment inspector_name:', assignments[0]?.inspector_name);
      console.log('🔍 First assignment consumed_by:', assignments[0]?.consumed_by);

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

      // Prepare bulk assignments array with work order info
      const assignments = this.serialAssignments.map((assignment) => ({
        serialNumber: typeof assignment.serial === 'string' ? assignment.serial : assignment.serial.serial_number,
        eyefi_serial_id: typeof assignment.serial === 'string' ? null : assignment.serial.id,
        ulNumber: assignment.ulNumber?.ul_number || '',
        ul_label_id: assignment.ulNumber?.id || null,
        sgPartNumber: this.workOrderDetails?.cp_cust_part || '',
        poNumber: this.workOrderNumber,
        property_site: '', // Add if needed
        active: 1,
        inspector_name: userFullName,
        consumed_by: userFullName,
        asset_type: this.assetType, // 'serial' or 'asset_number'
        // Work Order Information
        wo_number: this.workOrderNumber,
        wo_part: this.workOrderDetails?.wo_part || null,
        wo_description: this.workOrderDetails?.description || null,
        wo_qty_ord: this.workOrderDetails?.wo_qty_ord || null,
        wo_due_date: this.workOrderDetails?.wo_due_date || null,
        wo_routing: this.workOrderDetails?.wo_routing || null,
        wo_line: this.workOrderDetails?.wo_line || null,
        cp_cust_part: this.workOrderDetails?.cp_cust_part || null,
        cp_cust: this.workOrderDetails?.cp_cust || null
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

      // Prepare bulk assignments array with pre-selected IGT assets and work order info
      const assignments = this.generatedAssets.map((generated) => ({
        igt_serial_number: generated.assetNumber, // Pre-selected IGT serial
        igt_asset_id: generated.asset?.id || null, // IGT asset ID if available
        eyefi_serial_number: typeof generated.serial === 'string' ? generated.serial : generated.serial.serial_number,
        eyefi_serial_id: typeof generated.serial === 'string' ? null : generated.serial.id,
        ulNumber: generated.ulNumber?.ul_number || '',
        ul_label_id: generated.ulNumber?.id || null,
        partNumber: this.workOrderDetails?.wo_part || '',
        poNumber: this.workOrderNumber,
        active: 1,
        inspector_name: userFullName,
        consumed_by: userFullName,
        asset_type: this.assetType, // 'serial' or 'asset_number'
        // Work Order Information
        wo_number: this.workOrderNumber,
        wo_part: this.workOrderDetails?.wo_part || null,
        wo_description: this.workOrderDetails?.description || null,
        wo_qty_ord: this.workOrderDetails?.wo_qty_ord || null,
        wo_due_date: this.workOrderDetails?.wo_due_date || null,
        wo_routing: this.workOrderDetails?.wo_routing || null,
        wo_line: this.workOrderDetails?.wo_line || null,
        cp_cust_part: this.workOrderDetails?.cp_cust_part || null,
        cp_cust: this.workOrderDetails?.cp_cust || null
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

      // Determine the actual customer name to use
      // If "Other" was selected explicitly, use the custom name input
      // Otherwise, use the selected customer name directly (e.g., CHUGOL, KONGAM)
      const customerName = this.selectedCustomer === 'Other' ? this.customOtherCustomerName : this.selectedCustomer;

      // For "Other" customer, we create assignment records with no customer asset
      // This will mark EyeFi serials and UL labels as consumed/used
      const assignments = this.serialAssignments.map((assignment) => ({
        eyefi_serial_number: typeof assignment.serial === 'string' ? assignment.serial : assignment.serial.serial_number,
        eyefi_serial_id: typeof assignment.serial === 'string' ? null : assignment.serial.id,
        ulNumber: assignment.ulNumber?.ul_number || '',
        ul_label_id: assignment.ulNumber?.id || null,
        partNumber: this.workOrderDetails?.wo_part || '',
        poNumber: this.workOrderNumber,
        customer_name: customerName, // Use determined customer name
        customer_type: 'Other',
        customer_type_id: null, // No specific customer type
        inspector_name: userFullName,
        consumed_by: userFullName,
        status: 'consumed',
        active: 1,
        asset_type: this.assetType, // 'serial' or 'asset_number'
        // Work Order Information
        wo_number: this.workOrderNumber,
        wo_part: this.workOrderDetails?.wo_part || null,
        wo_description: this.workOrderDetails?.description || null,
        wo_qty_ord: this.workOrderDetails?.wo_qty_ord || null,
        wo_due_date: this.workOrderDetails?.wo_due_date || null,
        wo_routing: this.workOrderDetails?.wo_routing || null,
        wo_line: this.workOrderDetails?.wo_line || null,
        cp_cust_part: this.workOrderDetails?.cp_cust_part || null,
        cp_cust: this.workOrderDetails?.cp_cust || null
      }));

      console.log('📦 Creating Other customer assignments:', assignments);
      console.log('👤 Customer Name:', customerName);
      console.log('👤 Created by:', userFullName);

      // Call the backend API to create the assignments
      const response: any = await this.serialAssignmentsService.bulkCreateOther(assignments, userFullName);
      
      console.log('✅ Bulk Other response:', response);

      if (response?.success && response?.data && Array.isArray(response.data)) {
        // Map response data to generatedAssets for display
        this.generatedAssets = this.serialAssignments.map((assignment, index) => {
          const createdAssignment = response.data[index];
          return {
            index,
            serial: assignment.serial,
            ulNumber: assignment.ulNumber,
            asset: null,
            assetNumber: 'N/A', // No asset number for Other customer
            customerName: customerName,
            assignmentId: createdAssignment?.assignment_id
          };
        });

        this.toastrService.success(`Created ${response.count} assignments for ${customerName}`);
        console.log('✨ Created Other Assignments:', this.generatedAssets);
      } else {
        throw new Error('Invalid response from bulk create API');
      }
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
      console.log('📊 Category:', this.category);
      
      // For USED category, don't auto-fetch assets - let user enter manually
      if (this.category === 'used') {
        console.log('USED category: Skipping IGT asset auto-populate - user will enter manually');
        this.generatedAssets = this.serialAssignments.map((assignment, index) => ({
          index,
          serial: assignment.serial,
          ulNumber: assignment.ulNumber,
          asset: null,
          assetNumber: null, // Will be entered manually
          needsForm: true,
          isEditing: true // Enable editing for manual entry
        }));
        this.toastrService.info('IGT assets will be entered manually for USED category');
        return;
      }
      
      // For NEW category, fetch and auto-populate
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
      case 'INTGAM':
      case 'IGT_EUR':
      case 'IGT_CAN':
        return 'igt';
      case 'Light and Wonder':
      case 'BALTEC':
      case 'BalGam':
        return 'sg';
      case 'AGS':
      case 'AMEGAM':
        return 'ags';
      case 'Other':
        return 'other'; // Just assignment, no asset generation
      default:
        return 'other';
    }
  }

  /**
   * Get the display name for the customer type used in asset generation
   * Maps subsidiary/alias customers to their parent company name
   */
  getCustomerDisplayName(): string {
    switch (this.selectedCustomer) {
      case 'IGT':
      case 'INTGAM':
      case 'IGT_EUR':
      case 'IGT_CAN':
        return 'IGT';
      case 'Light and Wonder':
      case 'BALTEC':
      case 'BalGam':
        return 'Light and Wonder';
      case 'AGS':
      case 'AMEGAM':
        return 'AGS';
      case 'Other':
        return 'Other';
      default:
        return this.selectedCustomer || 'Other';
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
        description: this.workOrderDetails?.description || 'N/A',
        cp_cust_part: this.workOrderDetails?.cp_cust_part || 'N/A',
        qty_ord: this.workOrderDetails?.wo_qty_ord || 'N/A',
        due_date: this.workOrderDetails?.wo_due_date || 'N/A',
        routing: this.workOrderDetails?.wo_routing || 'N/A',
        line: this.workOrderDetails?.wo_line || 'N/A'
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

    // Open modal using NgbModal
    this.modalService.open(this.confirmationModal, { 
      size: 'xl', 
      scrollable: true,
      backdrop: 'static' // Prevent closing on backdrop click
    });
  }

  /**
   * User confirmed - proceed with actual submission
   */
  async confirmAndSubmit(): Promise<void> {
    // Close the modal
    this.modalService.dismissAll();

    try {
      this.isLoading = true;

      // ✅ GENERATE ASSET NUMBERS NOW (only if using asset_number type and they're still previews)
      if (this.assetType === 'asset_number' && this.category === 'new') {
        await this.generateActualAssetNumbers();
      }

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
    this.modalService.dismissAll();
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
      description: this.workOrderDetails?.description || 'N/A',
      cp_cust_part: this.workOrderDetails?.cp_cust_part || 'N/A',
      qty_ord: this.workOrderDetails?.wo_qty_ord || 'N/A',
      due_date: this.workOrderDetails?.wo_due_date || 'N/A',
      routing: this.workOrderDetails?.wo_routing || 'N/A',
      line: this.workOrderDetails?.wo_line || 'N/A'
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
   * Generate EYEFI Asset Numbers in format YYYYMMDDXXX
   * Fetches next available sequence number from backend for today's date
   */
  private async generateEyefiAssetNumbers(count: number): Promise<any[]> {
    try {
      // Call backend API to get next available asset numbers for today
      const response = await this.serialNumberService.generateEyefiAssetNumbers(count, this.category === 'new' ? 'New' : 'Used');
      
      if (response?.success && Array.isArray(response.data)) {
        console.log('✅ Generated EYEFI Asset Numbers:', response.data);
        // Map the response to match the expected format
        return response.data.map((asset: any) => ({
          serial_number: asset.asset_number,
          id: asset.id,
          generation_date: asset.generation_date,
          daily_sequence: asset.daily_sequence,
          is_asset_number: true // Flag to indicate this is an asset number, not traditional serial
        }));
      } else {
        throw new Error('Failed to generate asset numbers from backend');
      }
    } catch (error) {
      console.error('❌ Error generating EYEFI Asset Numbers:', error);
      this.toastrService.error('Failed to generate asset numbers. Please try again.');
      return [];
    }
  }

  /**
   * Create preview placeholders for EYEFI Asset Numbers
   * These are NOT generated in the database yet - only visual previews
   * Actual generation happens on submit to prevent orphaned numbers
   */
  private createAssetNumberPreviewPlaceholders(count: number): any[] {
    const today = new Date();
    const datePrefix = today.getFullYear().toString() + 
                      String(today.getMonth() + 1).padStart(2, '0') + 
                      String(today.getDate()).padStart(2, '0');
    
    const placeholders = [];
    for (let i = 1; i <= count; i++) {
      const sequenceStr = String(i).padStart(3, '0');
      placeholders.push({
        serial_number: `${datePrefix}${sequenceStr}`,
        id: null, // No ID yet - will be generated on submit
        is_asset_number: true,
        is_preview: true // Flag to indicate this is a preview placeholder
      });
    }
    
    console.log('📋 Created preview placeholders:', placeholders);
    return placeholders;
  }

  /**
   * Generate actual asset numbers in database (called on submit)
   * Replaces preview placeholders with real database-generated asset numbers
   */
  private async generateActualAssetNumbers(): Promise<void> {
    try {
      console.log('🔢 Generating ACTUAL EYEFI Asset Numbers in database...');
      
      // Check if we have preview placeholders
      const hasPreviewPlaceholders = this.serialAssignments.some((a: any) => 
        a.serial?.is_preview === true
      );
      
      if (!hasPreviewPlaceholders) {
        console.log('ℹ️ Asset numbers already generated, skipping...');
        return;
      }

      // Generate actual asset numbers from backend
      const actualAssetNumbers = await this.generateEyefiAssetNumbers(this.quantity);
      
      if (actualAssetNumbers.length !== this.quantity) {
        throw new Error(`Expected ${this.quantity} asset numbers but got ${actualAssetNumbers.length}`);
      }

      // Replace preview placeholders with actual generated asset numbers
      for (let i = 0; i < this.serialAssignments.length; i++) {
        if (this.serialAssignments[i].serial?.is_preview) {
          this.serialAssignments[i].serial = actualAssetNumbers[i];
          console.log(`✅ Replaced placeholder ${i + 1} with actual asset number:`, actualAssetNumbers[i].serial_number);
        }
      }

      // Update generatedAssets if needed
      if (this.generatedAssets.length > 0) {
        for (let i = 0; i < this.generatedAssets.length; i++) {
          if (this.generatedAssets[i].serial?.is_preview) {
            this.generatedAssets[i].serial = actualAssetNumbers[i];
          }
        }
      }

      console.log('✅ All asset numbers generated successfully');
      this.toastrService.success(`Generated ${actualAssetNumbers.length} EYEFI Asset Numbers`, 'Asset Generation');
      
    } catch (error) {
      console.error('❌ Error generating actual asset numbers:', error);
      this.toastrService.error('Failed to generate asset numbers. Please try again.');
      throw error; // Re-throw to prevent submission
    }
  }

  /**
   * Print Serial Number Report
   */
  printSerialReport(): void {
    if (!this.successSummary) return;

    // Get current user info
    const currentUser = this.authenticationService.currentUserValue;
    const userFullName = currentUser?.full_name || 'System';

    // Use the shared service to print
    this.serialReportPrintService.printSerialReport({
      workOrder: this.successSummary.workOrder,
      batch: this.successSummary.batch,
      customer: this.successSummary.customer,
      assets: this.successSummary.createdAssets,
      timestamp: this.successSummary.timestamp,
      createdBy: userFullName
    });
  }

  /**
   * Print Labels - Opens zebra label print modal for each asset
   */
  async printLabels(): Promise<void> {
    if (!this.successSummary || !this.successSummary.createdAssets) {
      this.toastrService.warning('No assets found to print labels');
      return;
    }

    const customerType = this.successSummary.customerType;
    
    // All customer types now support label printing
    if (!customerType) {
      this.toastrService.warning('Customer type not found');
      return;
    }

    // Open modal to get print settings
    const modalRef = this.modalService.open(NgbdModalContent, { centered: true });
    modalRef.componentInstance.title = 'Print Label Options';
    modalRef.componentInstance.totalAssets = this.successSummary.createdAssets.length;
    
    try {
      const result = await modalRef.result;
      
      if (result) {
        const { copiesPerLabel, numberOfLabels } = result;
        
        // Print specified number of labels
        const assetsToPrint = this.successSummary.createdAssets.slice(0, numberOfLabels);
        
        assetsToPrint.forEach((asset, index) => {
          setTimeout(() => {
            // Call appropriate print method based on customer type
            if (customerType === 'sg') {
              this.printSGLabel(asset, copiesPerLabel);
            } else if (customerType === 'ags') {
              this.printAGSLabel(asset, copiesPerLabel);
            } else if (customerType === 'igt') {
              this.printIGTLabel(asset, copiesPerLabel);
            } else if (customerType === 'other') {
              this.printOtherLabel(asset, copiesPerLabel);
            }
          }, index * 500); // Delay between each label
        });

        this.toastrService.info(
          `Printing ${numberOfLabels} label(s), ${copiesPerLabel} cop${copiesPerLabel > 1 ? 'ies' : 'y'} each`,
          'Print Labels'
        );
      }
    } catch (error) {
      // Modal dismissed - do nothing
    }
  }

  /**
   * Print Zebra label for SG (Light and Wonder) asset
   * Uses ZPL commands to format and print asset label
   * @param asset Asset data to print
   * @param copies Number of copies to print (default: 1)
   */
  private printSGLabel(asset: any, copies: number = 1): void {
    // Use customer part number (cp_cust_part) instead of wo_part
    const partNumber = this.workOrderDetails?.cp_cust_part || '';
    const assetNumber = asset.assetNumber || '';
    
    // Zebra ZPL commands for SG asset label - matches sg-asset-edit component exactly
    const cmds = `
^XA
^PQ${copies},0,1,Y

^FO40,100^GFA,1896,1896,24,,::::K0FCI0F8001FC001F001F1KFI03E,K0FCI0FC00IF801F001F9KFI0FFC,K0FCI0FC03IFE01F001F9KF001FFE,
K0FCI0FC07JF01F001F9KF003FFE,K0FCI0FC0KF81F001F9KF003E3F,K0FCI0FC1FE07F81F001F801FJ03C1F,K0FCI0FC1FC01FC1F001F801FJ03C0F,
K0FCI0FC3F800FC1F001F801FJ03C1F,K0FCI0FC3FI0FC1F001F801FJ03E1F,K0FCI0FC3EI07C1F001F801FJ03E3F,K0FCI0FC7EK01F001F801FJ01FFE,
K0FCI0FC7EK01KF801FJ01FFC,K0FCI0FC7EK01KF801FJ01FF8,K0FCI0FC7C01FF81KF801FJ03FF00C,K0FCI0FC7E01FFC1KF801FJ07FE01C,
K0FCI0FC7E01FFC1KF801FJ0IF03C,K0FCI0FC7E01FFC1F001F801FJ0FCF87C,K0FCI0FC3EI07C1F001F801FI01F8FCFC,
K0FCI0FC3FI07C1F001F801FI01F07FF8,K0FCI0FC3FI07C1F001F801FI01F03FF,K0FCI0FC1F800FC1F001F801FI01F01FE,
K0FCI0FC1FC01FC1F001F801FI01F80FC,K0JFCFC0FF07FC1F001F801FJ0FC3FE,K0JFCFC07JFC1F001F801FJ0KF,K0JFCFC03IF7C1F001F801FJ07JF,
K0JFCFC01IF7C1F001F801FJ03FFCF8,K0JFCFC007FC7C1F001F801FJ01FF87C,,::::::::03E003E003E00FFC003F001F07FFC001JF87FFE,
03E003E007C03IF003F801F07IF001JF87IF8,01F003E007C07IF803F801F07IFC01JF87IFC,01F007E007C0JFC03FC01F07IFE01JF87IFE,
01F007F00781FE1FE03FE01F07E1FF01JF87IFE,01F007F00F83F007F03FE01F07C03F81FJ07E07F,00F807F00F87E001F03FF01F07C01FC1FJ07E01F,
00F80FF00F87C001F83FF01F07C00FC1FJ07E00F8,00F80FF80F0F8I0F83FF81F07C007E1FJ07E00F8,00F80FF81F0F8I07C3EFC1F07C007E1FJ07E00F8,
007C0F781F0F8I07C3E7C1F07C003E1F8I07E00F8,007C1F7C1F0FJ07C3E3E1F07C003E1FFC007E00F8,007C1E7C3E0FJ07C3E3F1F07C003E1IFC07E00F8,
007C1E3C3E0FJ07C3E1F1F07C003E1IFC07E01F,003C1E3C3E0FJ07C3E0F9F07C003E1IFC07FC3F,003E3E3E3C0F8I07C3E0F9F07C003E1IFC07IFE,
003E3C3E7C0F8I07C3E07DF07C003E1F80407IFC,003E3C1E7C0FCI0F83E07FF07C007E1F8I07IFC,001E3C1E7C07C001F83E03FF07C00FC1F8I07IFE,
001F7C1F7807E003F03E01FF07C01FC1F8I07E7FE,001F781FF803F807F03E01FF07C03F81F8I07E03F,001FF80FF801FE3FE03E00FF07E1FF81F8I07E01F,
I0FF80FF800JFC03E007F07JF01F8I07E01F,I0FF80FFI07IF803E007F07IFE01FF8007E00F8,I0FF007FI03FFE003E003F07IF801JF87E00F8,
I0FF007FJ07F8P0FFC001JF83E00F8,I07F007EgH01JF83E00F8,I07F007EgI01IF83E00F8,I07E003EgK01F83E00F8,I07EgR03E00F8,I07EgS0400F81A4,
I03gW0F8024,hG07803C,hJ028,,:::^FS

^FX Top section with logo, name and address.
^CF0,25
^FS^FO35,190^FDLight & Wonder Inc.^FS
^FS^FO28,220^FDGlobal Service Center^FS
^FO50,250^FD(877) 748-3387^FS

^CF0,20^FS
^FS^FO260,25^FDPart Number :^FS
^CF0,50^FS
^FO260,60^FD${partNumber}^FS
^FS^FO260,120^BY2,1.5^B3A,N,80,N,N,N,A^FD${partNumber}^FS^
^CF0,20^FS
^FO260,220^FDAsset Number: ^FS
^FS^FO260,250^B3A,N,80,N,N,N,A^FD${assetNumber}^FS^
^CF0,50^FS
^FO260,350^FD${assetNumber}^FS
^FO50,420^GB700,3,3^FS
^FX
^BY5,2,270
^XZ
EOL
`;

    // Open print window with Zebra ZPL commands
    const printWindow = window.open('', 'PRINT', 'height=500,width=600');
    if (printWindow) {
      printWindow.document.write(cmds.replace(/(.{80})/g, "$1<br>"));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }

  /**
   * Print Zebra label for AGS asset
   * Uses ZPL commands to format and print AGS asset label
   * @param asset Asset data to print
   * @param copies Number of copies to print (default: 1)
   */
  private printAGSLabel(asset: any, copies: number = 1): void {
    const partNumber = this.workOrderDetails?.wo_part || '';
    const assetNumber = asset.assetNumber || '';
    
    // Zebra ZPL commands for AGS asset label
    // ^PQ command specifies quantity (number of copies)
    const cmds = `
^XA
^PQ${copies},0,1,Y

^FX AGS Logo section
^FO50,50^GFA,1620,1620,20,,::::::P0FFN01FEL01MF8,O07FFEM0IFCK07MF8,N01JF8K03JFK0NF8,N03JFC
K07JF8I01NF8,N07JFEK0KFCI03NF8,N0LFJ01KFEI07NF8,M01LF8I03LFI0OF8,M03LFCI07LF800OF8,01EJ07L
FEI0MFC00OF8,03F8I07MFI0MFC01OF8,07FCI0IF00IF001FFE01FFE01FF,07FFI0FFC003FF803FF8007FF01FE
,07FF800FF8001FF803FFI03FF01FE,07FFE007FJ0FFC07FEI01FF81FC,07IF001EJ07FC07FCJ0FF83FC,07IFC
00EJ03FC07FCJ0FF81FC,07IFEM03FE0FF8J07FC1FE,07JF8L01FE0FF8J07FC1FE,07JFCL01FE0FFK03FC1FF,0
7KFL01FE0FFK03FC1LFE,07KF8L0FE0FFK03FC0MFC,07KFEL0FE0FEK01FC0NF,07LFL0FF0FEK01FC0NF8,07LF8
K0FF0FEK01FC07MFC,07LF8K0FF0FEK01FC03MFE,07LF8K0FF0FEK01FC01MFE,07LF8K0FF0FEK01FC00NF,07KF
EL0FF0FFK03FC007MF,07KFCK01FF0FFK03FC001MF8,07KFL01FF0FFK03FCM01FF8,07JFEL01FF0FFK03FCN07F
8,07JF8L03FF0FF8J07FCN07F8,07JFM03FF07F8J07FCN03F8,07IFC006J07FF07FCJ0FFCN03F8,07IF800FJ0I
F07FEI01FFCN03F8,07FFE003F8I0IF03FFI03FFCN03F8,07FFC007FC003IF03FF8007FFCN07F8,07FFI0FFE00
7IF01FFC00IFCN0FF8,07FEI0IFC1JF01IF87IFCM01FF8,07F8I07NF00NFC1OF8,03FJ03NF007MFC3OF,00CJ03
NF007MFC3OF,M01NF003MFC3NFE,N0NF001MFC3NFE,N07JFEFFI0KFDFC3NFC,N01JFCFFI03JF1FC3NF8,O0JF0F
FI01IFE1FC3NF1,O01FFC0FFJ03FF03FC3MFC,gJ03FC,:gJ07FC,gJ07F8,gJ0FF8,:gI01FF,gI03FF,gI07FF,g
H01FFE,gG01IFC,:gG01IF8,gG01IF,gG01FFE,gG01FFC,gG01FF8,gG01FE,gG01F8,gG01C,,:::::^FS

^FX AGS label content
^FWN
^CFA,25
^FS^FO50,135^FDPart Number^FS
^FS^FO50,170^FD${partNumber}^FS
^FS^FO50,200^BY2,2.5^B3,N,42,N,N,N,A^FD${partNumber}^FS
^FS^FO50,260^FDSerial Number^FS
^FS^FO50,295^FD${assetNumber}^FS
^FS^FO50,330^BY2,2.5^B3,N,42,N,N,N,A^FD${assetNumber}^FS
^CFA,15
^XZ
`;

    // Open print window with Zebra ZPL commands
    const printWindow = window.open('', 'PRINT', 'height=500,width=600');
    if (printWindow) {
      printWindow.document.write(cmds);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }

  /**
   * Print Zebra label for IGT asset
   * Simple label with asset number and customer part number
   * @param asset Asset data to print
   * @param copies Number of copies to print (default: 1)
   */
  private printIGTLabel(asset: any, copies: number = 1): void {
    const customerPartNumber = this.workOrderDetails?.cp_cust_part || '';
    const assetNumber = asset.assetNumber || '';
    
    // Zebra ZPL commands for IGT asset label - Simple format
    const cmds = `
^XA
^PQ${copies},0,1,Y

^FX IGT Asset Label
^CF0,60
^FO50,50^FDIGT Asset^FS

^CF0,30
^FO50,150^FDAsset Number:^FS
^CF0,50
^FO50,190^FD${assetNumber}^FS
^FO50,250^BY3,2.5^B3N,N,100,N,N^FD${assetNumber}^FS

^CF0,30
^FO50,380^FDCustomer Part:^FS
^CF0,40
^FO50,420^FD${customerPartNumber}^FS
^FO50,470^BY2,2^B3N,N,80,N,N^FD${customerPartNumber}^FS

^XZ
`;

    // Open print window with Zebra ZPL commands
    const printWindow = window.open('', 'PRINT', 'height=500,width=600');
    if (printWindow) {
      printWindow.document.write(cmds);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }

  /**
   * Print Zebra label for Other customer type
   * Basic label with EyeFi serial and UL number
   * @param asset Asset data to print
   * @param copies Number of copies to print (default: 1)
   */
  private printOtherLabel(asset: any, copies: number = 1): void {
    const eyefiSerial = asset.eyefiSerial || '';
    const ulNumber = asset.ulNumber || '';
    const customerName = this.customOtherCustomerName || 'Customer';
    
    // Zebra ZPL commands for Other customer label - Basic format
    const cmds = `
^XA
^PQ${copies},0,1,Y

^FX Basic Asset Label
^CF0,50
^FO50,50^FD${customerName}^FS

^CF0,30
^FO50,130^FDEyeFi Serial:^FS
^CF0,45
^FO50,170^FD${eyefiSerial}^FS
^FO50,225^BY2,2^B3N,N,80,N,N^FD${eyefiSerial}^FS

^CF0,30
^FO50,330^FDUL Number:^FS
^CF0,45
^FO50,370^FD${ulNumber}^FS
^FO50,425^BY2,2^B3N,N,80,N,N^FD${ulNumber}^FS

^XZ
`;

    // Open print window with Zebra ZPL commands
    const printWindow = window.open('', 'PRINT', 'height=500,width=600');
    if (printWindow) {
      printWindow.document.write(cmds);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }

  /**
   * Print label for a single asset from the success table
   * Allows printing individual labels instead of entire batch
   */
  printSingleLabel(asset: any): void {
    const customerType = this.successSummary?.customerType;
    
    if (!customerType) {
      this.toastrService.warning('Customer type not found');
      return;
    }

    // Call appropriate print method based on customer type
    if (customerType === 'sg') {
      this.printSGLabel(asset);
    } else if (customerType === 'ags') {
      this.printAGSLabel(asset);
    } else if (customerType === 'igt') {
      this.printIGTLabel(asset);
    } else if (customerType === 'other') {
      this.printOtherLabel(asset);
    }
    
    this.toastrService.success(`Opening print dialog for asset ${asset.assetNumber}`);
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

  // ============================
  // MISMATCH REPORT METHODS
  // ============================

  /**
   * Opens the mismatch report modal
   * @param step - Which step/context: 'step4' (EyeFi/UL) or 'step5-igt' (IGT assets)
   */
  openMismatchReportModal(step: 'step4' | 'step5-igt' | 'step5-sg' | 'step5-ags'): void {
    // Initialize mismatch report with context
    this.mismatchReport = {
      step: step,
      category: this.category as 'new' | 'used',
      workOrderNumber: this.workOrderNumber,
      reportedBy: this.currentUser?.name || 'Unknown User',
      reportedByUserId: this.currentUser?.id,
      timestamp: new Date(),
      rowIndex: null,
      contactMethod: 'workstation',
      status: 'reported'
    };

    // Extract customer type from step for Step 5
    if (step.startsWith('step5-')) {
      const customerCode = step.replace('step5-', '');
      this.mismatchReport.customerType = customerCode as 'igt' | 'sg' | 'ags';
    }

    // Open modal
    this.modalService.open(this.mismatchReportModal, { 
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
  }

  /**
   * When user selects a row, auto-populate expected values
   */
  onMismatchRowSelected(): void {
    const rowIndex = this.mismatchReport.rowIndex;
    
    if (rowIndex === null || rowIndex === undefined || rowIndex < 0) {
      return;
    }

    // Step 4: EyeFi + UL (Universal serials)
    if (this.mismatchReport.step === 'step4') {
      const assignment = this.serialAssignments[rowIndex];
      if (assignment) {
        this.mismatchReport.expectedEyefiSerial = assignment.serial?.serial_number || assignment.serial;
        this.mismatchReport.expectedUlNumber = assignment.ulNumber?.ul_number || '';
      }
    }
    
    // Step 5: Customer Serial Numbers (IGT, SG, AGS have their OWN serial sequences)
    else if (this.mismatchReport.step?.startsWith('step5')) {
      const asset = this.generatedAssets[rowIndex];
      if (asset) {
        // Primary: Customer's own serial number (e.g., IGT-2024-00015)
        this.mismatchReport.expectedCustomerSerial = asset.assetNumber || '';
        
        // Reference: Associated EyeFi serial and UL label (for tracking only)
        this.mismatchReport.referenceEyefiSerial = asset.serial?.serial_number || asset.serial || '';
        this.mismatchReport.referenceUlNumber = asset.ulNumber?.ul_number || '';
      }
    }
  }

  /**
   * When user selects a photo, convert to base64
   */
  onMismatchPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastrService.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastrService.error('Image file size must be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.mismatchReport.photoBase64 = base64;
      this.mismatchReport.photoPreview = base64;
    };
    reader.onerror = () => {
      this.toastrService.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Submit mismatch report
   */
  submitMismatchReport(): void {
    // Validation
    if (this.mismatchReport.rowIndex === null || this.mismatchReport.rowIndex === undefined) {
      this.toastrService.error('Please select a row number');
      return;
    }

    // Step 4: Validate EyeFi serial (required) and optionally UL
    if (this.mismatchReport.step === 'step4') {
      if (!this.mismatchReport.physicalEyefiSerial) {
        this.toastrService.error('Please enter the physical EyeFi serial number');
        return;
      }
    } 
    // Step 5: Validate customer serial number (IGT, SG, AGS serial)
    else if (this.mismatchReport.step?.startsWith('step5')) {
      if (!this.mismatchReport.physicalCustomerSerial) {
        const customerName = this.mismatchReport.step === 'step5-igt' ? 'IGT' :
                            this.mismatchReport.step === 'step5-sg' ? 'Light & Wonder' :
                            this.mismatchReport.step === 'step5-ags' ? 'AGS' : 'customer';
        this.toastrService.error(`Please enter the physical ${customerName} serial number`);
        return;
      }
    }

    if (this.mismatchReport.contactMethod === 'phone' && !this.mismatchReport.contactInfo) {
      this.toastrService.error('Please enter phone number');
      return;
    }

    // Set display row number
    this.mismatchReport.rowNumber = (this.mismatchReport.rowIndex || 0) + 1;

    // Submit
    this.isSubmittingMismatch = true;
    this.mismatchReportService.submitReport(this.mismatchReport as MismatchReport)
      .subscribe({
        next: (response) => {
          this.toastrService.success(
            'Mismatch report submitted successfully. Admin team has been notified.',
            'Report Submitted',
            { timeOut: 5000 }
          );
          
          // Close modal
          this.modalService.dismissAll();
          
          // Reset form
          this.mismatchReport = {
            rowIndex: null,
            contactMethod: 'workstation'
          };
          this.isSubmittingMismatch = false;
        },
        error: (error) => {
          console.error('Failed to submit mismatch report:', error);
          this.toastrService.error(
            'Failed to submit mismatch report. Please try again or contact admin.',
            'Submission Failed'
          );
          this.isSubmittingMismatch = false;
        }
      });
  }

  /**
   * Open the Serial Sequence Debug Modal
   * Shows raw data from availability API for EyeFi, UL, and IGT serials
   */
  openSequenceDebugModal(): void {
    const modalRef = this.modalService.open(SerialSequenceDebugModalComponent, {
      size: 'xl',
      backdrop: 'static',
      scrollable: true
    });

    // Pass currently selected serials to the modal
    const componentInstance = modalRef.componentInstance;
    
    // Extract EyeFi serial numbers from current assignments
    componentInstance.currentlySelectedEyefi = this.serialAssignments
      .map(a => a.serial?.serial_number || a.serial)
      .filter(s => s);
    
    // Extract UL numbers from current assignments
    componentInstance.currentlySelectedUl = this.serialAssignments
      .map(a => a.ulNumber?.ul_number || a.ulNumber)
      .filter(ul => ul);
    
    // Extract IGT/SG/AGS serials from generated assets (if any)
    componentInstance.currentlySelectedIgt = this.generatedAssets
      .map(a => a.serial_number)
      .filter(s => s);
  }

  /**
   * Save workflow state to sessionStorage
   * Called on component destroy (refresh/navigation) and after key changes
   */
  private saveWorkflowState(): void {
    // Only save if user is authenticated and has started the workflow
    if (!this.isAuthenticated || this.currentStep === 1) {
      return;
    }

    const workflowState = {
      currentStep: this.currentStep,
      workOrderNumber: this.workOrderNumber,
      workOrderDetails: this.workOrderDetails,
      assetType: this.assetType, // Save asset type selection ('serial' or 'asset_number')
      selectedCustomer: this.selectedCustomer,
      customOtherCustomerName: this.customOtherCustomerName,
      quantity: this.quantity,
      category: this.category,
      ulRequired: this.ulRequired,
      serialAssignments: this.serialAssignments,
      generatedAssets: this.generatedAssets,
      currentFormType: this.currentFormType,
      steps: this.steps,
      timestamp: Date.now()
    };

    try {
      sessionStorage.setItem('eyefi_workflow_state', JSON.stringify(workflowState));
      console.log('💾 Workflow state saved to sessionStorage');
    } catch (error) {
      console.error('Failed to save workflow state:', error);
    }
  }

  /**
   * Restore workflow state from sessionStorage
   * Called on component init and after authentication
   */
  private restoreWorkflowState(): void {
    // Only restore if user is authenticated
    if (!this.isAuthenticated) {
      return;
    }

    try {
      const savedState = sessionStorage.getItem('eyefi_workflow_state');
      if (!savedState) {
        return;
      }

      const workflowState = JSON.parse(savedState);
      
      // Check if state is recent (within last 24 hours)
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (Date.now() - workflowState.timestamp > ONE_DAY) {
        console.log('⏰ Workflow state expired, clearing...');
        this.clearWorkflowState();
        return;
      }

      // Restore workflow state
      this.currentStep = workflowState.currentStep || 1;
      this.workOrderNumber = workflowState.workOrderNumber || '';
      this.workOrderDetails = workflowState.workOrderDetails || null;
      this.assetType = workflowState.assetType || 'serial'; // Restore asset type ('serial' or 'asset_number')
      this.selectedCustomer = workflowState.selectedCustomer || '';
      this.customOtherCustomerName = workflowState.customOtherCustomerName || '';
      this.quantity = workflowState.quantity || 1;
      this.category = workflowState.category || 'new';
      this.ulRequired = workflowState.ulRequired !== undefined ? workflowState.ulRequired : true;
      this.serialAssignments = workflowState.serialAssignments || [];
      this.generatedAssets = workflowState.generatedAssets || [];
      this.currentFormType = workflowState.currentFormType || '';
      this.steps = workflowState.steps || this.steps;

      console.log('✅ Workflow state restored from sessionStorage');
      console.log('📍 Current Step:', this.currentStep);
      console.log('🏷️ Asset Type:', this.assetType);
      console.log('🔢 Quantity:', this.quantity);
      console.log('📋 Serial Assignments:', this.serialAssignments.length);

      this.toastrService.info('Previous workflow session restored', 'Welcome Back');
    } catch (error) {
      console.error('Failed to restore workflow state:', error);
      this.clearWorkflowState();
    }
  }

  /**
   * Clear workflow state from sessionStorage
   * Called on logout or when starting a new workflow
   */
  private clearWorkflowState(): void {
    try {
      sessionStorage.removeItem('eyefi_workflow_state');
      console.log('🗑️ Workflow state cleared from sessionStorage');
    } catch (error) {
      console.error('Failed to clear workflow state:', error);
    }
  }

  // ============================
  // SERIAL VERIFICATION METHODS
  // ============================

  /**
   * Check if verification is required
   * Verification only happens in NEW category when enabled
   * USED category doesn't require verification (manual entry)
   */
  requiresVerification(): boolean {
    // Verification is available for both NEW and USED categories when toggle is enabled
    // NEW: Verifies both EyeFi serials and UL labels
    // USED: Verifies only UL labels (EyeFi serials are manually entered)
    return this.verificationEnabled;
  }

  /**
   * Check if all required serials have been verified
   */
  allSerialsVerified(): boolean {
    if (!this.requiresVerification()) {
      return true; // No verification required
    }
    return this.serialAssignments.every(a => a.verified === true);
  }

  /**
   * Get count of verified serials
   */
  getVerifiedCount(): number {
    return this.serialAssignments.filter(a => a.verified).length;
  }

  /**
   * Check if any serials have been verified (for showing "Continue" button)
   */
  hasSomeVerified(): boolean {
    return this.serialAssignments.some(a => a.verified);
  }

  /**
   * Start batch verification process - send ALL serials at once for multi-photo capture
   */
  async startBatchVerification(): Promise<void> {
    if (this.serialAssignments.length === 0) {
      this.toastrService.warning('No serials to verify');
      return;
    }

    // Get all unverified serials
    const unverifiedAssignments = this.serialAssignments.filter(a => !a.verified);
    const unverifiedSerials: string[] = [];
    
    // Collect serials based on category
    // NEW: Verify both EyeFi serials and UL numbers
    // USED: Verify only UL numbers (EyeFi serials are manually entered)
    unverifiedAssignments.forEach(assignment => {
      if (this.category === 'new') {
        // NEW category: Add EyeFi serial
        const eyefiSerial = assignment.serial?.serial_number || assignment.serial;
        if (eyefiSerial) {
          unverifiedSerials.push(eyefiSerial);
        }
      }
      
      // Both categories: Add UL serial if present
      const ulSerial = assignment.ulNumber?.ul_number;
      if (ulSerial) {
        unverifiedSerials.push(ulSerial);
      }
    });

    if (unverifiedSerials.length === 0) {
      this.toastrService.info('All serials already verified');
      return;
    }

    this.isVerifying = true;
    this.showVerificationModal = true;
    this.verificationStatus = 'Creating batch verification session...';
    this.verificationProgress = {
      current: 0,
      total: unverifiedSerials.length
    };

    try {
      console.log(`🔐 Starting BATCH verification for ${unverifiedSerials.length} serials:`, unverifiedSerials);

      // Get UL number (assuming all serials in batch have same UL)
      const ulNumber = this.serialAssignments[0]?.ulNumber?.ul_number || '';
      const createdBy = this.currentUser?.name || 'User';

      // Create ONE session with ALL serials
      const sessionResponse = await this.serialAssignmentsService.createVerificationSession(
        0, // Workflow mode (no DB ID yet)
        unverifiedSerials, // Send array of serials
        createdBy,
        ulNumber,
        this.workflowSessionId // Pass workflow session ID for tracking
      );

      if (!sessionResponse?.success || !sessionResponse?.session) {
        throw new Error('Failed to create batch verification session');
      }

      this.currentVerificationSession = sessionResponse.session;
      this.verificationSessionExpiry = new Date(sessionResponse.session.expires_at);
      
      // Update status
      this.verificationStatus = `Waiting for tablet to capture ${unverifiedSerials.length} serial(s)...`;

      console.log('✅ Batch verification session created:', this.currentVerificationSession);

      // Start polling for verification result
      this.startVerificationPolling();

      // Start session timer
      this.startSessionTimer();

    } catch (error) {
      console.error('❌ Error starting batch verification:', error);
      this.toastrService.error('Failed to start batch verification');
      this.isVerifying = false;
      this.showVerificationModal = false;
      this.currentVerificationSession = null;
    }
  }

  /**
   * Verify a single serial at the given index
   */
  async verifySerial(index: number): Promise<void> {
    const assignment = this.serialAssignments[index];
    if (!assignment) {
      console.error('No assignment at index', index);
      return;
    }

    // Check if already verified
    if (assignment.verified) {
      console.log(`Assignment ${index + 1} already verified, skipping`);
      // Move to next unverified serial
      const nextIndex = this.serialAssignments.findIndex((a, i) => i > index && !a.verified);
      if (nextIndex !== -1) {
        await this.verifySerial(nextIndex);
      } else {
        this.toastrService.success('All serials verified!');
        this.showVerificationModal = false;
      }
      return;
    }

    this.currentVerificationIndex = index;
    this.isVerifying = true;
    this.showVerificationModal = true;
    this.verificationStatus = 'Creating verification session...';

    try {
      // Extract serial number and UL number
      const serialNumber = assignment.serial?.serial_number || assignment.serial;
      const ulNumber = assignment.ulNumber?.ul_number || '';

      console.log(`🔐 Starting verification for row ${index + 1}:`, {
        serial: serialNumber,
        ul: ulNumber
      });

      // Create verification session
      // Note: assignment_id can be 0 or null for workflow verification (before DB save)
      const createdBy = this.currentUser?.name || 'User';
      const sessionResponse = await this.serialAssignmentsService.createVerificationSession(
        index, // Temporary ID (0-based index) - backend will handle NULL/0 for workflow mode
        serialNumber,
        createdBy,
        ulNumber // Also pass UL number for reference
      );

      if (!sessionResponse?.success || !sessionResponse?.session) {
        throw new Error('Failed to create verification session');
      }

      this.currentVerificationSession = sessionResponse.session;
      this.verificationSessionExpiry = new Date(sessionResponse.session.expires_at);
      
      // Update status
      this.verificationStatus = 'Waiting for tablet verification...';
      this.verificationProgress.current = index + 1;

      console.log('✅ Verification session created:', this.currentVerificationSession);

      // Start polling for verification result
      this.startVerificationPolling();

      // Start session timer
      this.startSessionTimer();

    } catch (error) {
      console.error('❌ Error starting verification:', error);
      this.toastrService.error('Failed to start verification');
      this.isVerifying = false;
      this.showVerificationModal = false;
      this.currentVerificationSession = null;
      this.currentVerificationIndex = null;
    }
  }

  /**
   * Start polling to check verification status
   */
  private startVerificationPolling(): void {
    // Clear any existing polling
    this.stopVerificationPolling();

    // Poll every 1 second
    this.verificationPollingSubscription = interval(1000).subscribe(() => {
      this.checkVerificationStatus();
    });
  }

  /**
   * Stop polling
   */
  private stopVerificationPolling(): void {
    if (this.verificationPollingSubscription) {
      this.verificationPollingSubscription.unsubscribe();
      this.verificationPollingSubscription = null;
    }
  }

  /**
   * Check current verification session status
   */
  private async checkVerificationStatus(): Promise<void> {
    if (!this.currentVerificationSession) {
      return;
    }

    try {
      const response = await this.serialAssignmentsService.getVerificationSession(
        this.currentVerificationSession.session_id
      );

      if (!response?.success || !response?.session) {
        console.warn('Invalid session response');
        return;
      }

      const session = response.session;
      
      // Update progress display
      if (response.progress) {
        this.verificationProgress = response.progress;
        const { found, expected } = response.progress;
        this.verificationStatus = `Captured ${found} of ${expected} serial(s)...`;
      }

      // Check if batch verification is complete (match_result === 'complete')
      if (session.match_result === 'complete' && session.session_status === 'completed') {
        this.stopVerificationPolling();
        this.stopSessionTimer();
        
        // SUCCESS - All serials verified
        this.handleBatchVerificationSuccess(session);
      } 
      // Check for expired session
      else if (session.session_status === 'expired' || response.is_expired) {
        this.stopVerificationPolling();
        this.stopSessionTimer();
        this.handleVerificationExpired();
      }
      // Check for partial matches - update UI but keep polling
      else if (session.match_result === 'partial' && session.serials_found > 0) {
        const { found, expected } = response.progress;
        this.verificationStatus = `📸 Found ${found} of ${expected} serials. Take another photo for remaining serial(s)...`;
      }

    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  }
  
  /**
   * Handle successful batch verification
   */
  private handleBatchVerificationSuccess(session: any): void {
    console.log('✅ Batch verification complete!', session);
    
    // Mark all unverified assignments as verified
    this.serialAssignments.forEach(assignment => {
      if (!assignment.verified) {
        const eyefiSerial = assignment.serial?.serial_number || assignment.serial;
        const ulSerial = assignment.ulNumber?.ul_number;
        
        // Check if this assignment's serials were captured
        const captured = session.captured_serials || [];
        if ((eyefiSerial && captured.includes(eyefiSerial)) || (ulSerial && captured.includes(ulSerial))) {
          assignment.verified = true;
          assignment.verificationStatus = 'verified';
          assignment.verifiedAt = new Date();
          assignment.verifiedBy = this.currentUser?.name || 'User';
        }
      }
    });

    this.verificationStatus = `✅ Verified ${session.serials_found} serial(s)!`;
    
    this.toastrService.success(`All ${session.serials_found} serials verified successfully!`, 'Verification Complete');
    
    // Keep modal open briefly to show success
    setTimeout(() => {
      this.isVerifying = false;
      this.showVerificationModal = false;
      this.currentVerificationSession = null;
    }, 2000);
  }

  /**
   * Handle verification mismatch
   */
  private handleVerificationMismatch(session: any): void {
    this.verificationStatus = 'Mismatch detected ✗';
    
    // Play error sound (optional)
    this.playErrorSound();

    // Show error message
    this.toastrService.error(
      `Physical serial does not match expected serial. Please check and report mismatch.`,
      'Verification Failed',
      { timeOut: 8000 }
    );

    console.error('❌ Verification mismatch:', session);

    // Keep modal open so user can review and report mismatch
    this.isVerifying = false;
  }

  /**
   * Handle verification failure
   */
  private handleVerificationFailure(session: any): void {
    this.verificationStatus = 'Verification failed ✗';
    
    this.toastrService.error(
      session.message || 'Verification failed. Please try again.',
      'Verification Failed'
    );

    console.error('❌ Verification failed:', session);
    
    this.isVerifying = false;
  }

  /**
   * Handle session expiration
   */
  private handleVerificationExpired(): void {
    this.verificationStatus = 'Session expired ⏱';
    
    this.toastrService.warning(
      'Verification session expired (5 minutes). Please try again.',
      'Session Expired'
    );

    console.warn('⏱ Verification session expired');
    
    this.isVerifying = false;
  }

  /**
   * Retry verification for current assignment
   */
  async retryVerification(): Promise<void> {
    if (this.currentVerificationIndex !== null) {
      this.closeVerificationModal();
      
      // Wait a moment then restart
      setTimeout(() => {
        this.verifySerial(this.currentVerificationIndex!);
      }, 500);
    }
  }

  /**
   * Skip verification for current assignment (not recommended)
   */
  skipVerification(): void {
    if (confirm('Are you sure you want to skip verification for this serial? This is not recommended for IGT/ATI customers.')) {
      this.closeVerificationModal();
      
      // Find next unverified serial
      const nextIndex = this.serialAssignments.findIndex((a, i) => i > (this.currentVerificationIndex || 0) && !a.verified);
      
      if (nextIndex !== -1) {
        setTimeout(() => {
          this.verifySerial(nextIndex);
        }, 500);
      } else {
        this.isVerifying = false;
        this.toastrService.info('Verification process paused');
      }
    }
  }

  /**
   * Close verification modal
   */
  closeVerificationModal(): void {
    this.showVerificationModal = false;
    this.stopVerificationPolling();
    this.stopSessionTimer();
    this.currentVerificationSession = null;
    this.verificationStatus = '';
  }

  /**
   * Start session expiry timer
   */
  private startSessionTimer(): void {
    this.stopSessionTimer();
    
    // Update timer every second
    this.verificationSessionTimer = setInterval(() => {
      if (!this.verificationSessionExpiry) {
        this.stopSessionTimer();
        return;
      }

      const now = new Date().getTime();
      const expiry = new Date(this.verificationSessionExpiry).getTime();
      const remaining = expiry - now;

      if (remaining <= 0) {
        this.stopSessionTimer();
        this.handleVerificationExpired();
      }
    }, 1000);
  }

  /**
   * Stop session timer
   */
  private stopSessionTimer(): void {
    if (this.verificationSessionTimer) {
      clearInterval(this.verificationSessionTimer);
      this.verificationSessionTimer = null;
    }
  }

  /**
   * Get remaining time for verification session
   */
  getVerificationTimeRemaining(): string {
    if (!this.verificationSessionExpiry) {
      return '0:00';
    }

    const now = new Date().getTime();
    const expiry = new Date(this.verificationSessionExpiry).getTime();
    const remaining = Math.max(0, expiry - now);

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Generate QR code URL for tablet connection
   */
  getVerificationQRCodeUrl(): string {
    if (!this.currentVerificationSession) {
      return '';
    }

    const sessionId = this.currentVerificationSession.session_id;
    
    // Point to the tablet companion page
    const tabletUrl = `https://dashboard.eye-fi.com/tasks/tablet-companion.html?session=${sessionId}`;
    
    return tabletUrl;
  }

  /**
   * Play success sound
   */
  private playSuccessSound(): void {
    try {
      const audio = new Audio('/assets/sounds/success.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors if sound file doesn't exist
      });
    } catch (error) {
      // Ignore sound errors
    }
  }

  /**
   * Play error sound
   */
  private playErrorSound(): void {
    try {
      const audio = new Audio('/assets/sounds/error.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors if sound file doesn't exist
      });
    } catch (error) {
      // Ignore sound errors
    }
  }
}

/**
 * Modal component for print label options
 */
@Component({
  selector: 'ngbd-modal-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-header bg-primary text-white">
      <h5 class="modal-title">
        <i class="mdi mdi-printer-settings me-2"></i>{{ title }}
      </h5>
      <button type="button" class="btn-close btn-close-white" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <div class="mb-4">
        <p class="text-muted mb-3">
          <i class="mdi mdi-information-outline me-2"></i>
          Configure how many labels to print and how many copies of each label.
        </p>
        
        <div class="alert alert-info mb-4">
          <strong>Total Assets Created:</strong> {{ totalAssets }}
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">
            <i class="mdi mdi-numeric me-2"></i>Number of Labels to Print
          </label>
          <input 
            type="number" 
            class="form-control form-control-lg" 
            [(ngModel)]="numberOfLabels"
            [max]="totalAssets"
            min="1"
            placeholder="Enter number of labels">
          <small class="text-muted">Maximum: {{ totalAssets }} (total assets created)</small>
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">
            <i class="mdi mdi-content-copy me-2"></i>Copies Per Label
          </label>
          <input 
            type="number" 
            class="form-control form-control-lg" 
            [(ngModel)]="copiesPerLabel"
            min="1"
            max="10"
            placeholder="Enter copies per label">
          <small class="text-muted">Print 1-10 copies of each label</small>
        </div>
        
        <div class="alert alert-success" *ngIf="numberOfLabels > 0 && copiesPerLabel > 0">
          <i class="mdi mdi-check-circle me-2"></i>
          <strong>Total prints:</strong> {{ numberOfLabels * copiesPerLabel }} 
          ({{ numberOfLabels }} label{{ numberOfLabels > 1 ? 's' : '' }} × {{ copiesPerLabel }} cop{{ copiesPerLabel > 1 ? 'ies' : 'y' }})
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-outline-secondary" (click)="activeModal.dismiss()">
        <i class="mdi mdi-close me-1"></i>Cancel
      </button>
      <button 
        type="button" 
        class="btn btn-primary" 
        [disabled]="!numberOfLabels || !copiesPerLabel || numberOfLabels < 1 || copiesPerLabel < 1"
        (click)="confirm()">
        <i class="mdi mdi-printer me-1"></i>Print Labels
      </button>
    </div>
  `
})
export class NgbdModalContent {
  title = 'Print Label Options';
  totalAssets = 0;
  numberOfLabels = 1;
  copiesPerLabel = 1;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit() {
    // Set default to print all assets
    this.numberOfLabels = this.totalAssets;
  }

  confirm() {
    this.activeModal.close({
      numberOfLabels: this.numberOfLabels,
      copiesPerLabel: this.copiesPerLabel
    });
  }
}
