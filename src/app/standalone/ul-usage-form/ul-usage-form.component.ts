import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { AuthenticationService } from '@app/core/services/auth.service';
import { THE_FI_COMPANY_CURRENT_USER } from '@app/core/guards/admin.guard';
import { QadWoSearchComponent } from '@app/shared/components/qad-wo-search/qad-wo-search.component';
import { EyefiSerialSearchNgSelectComponent } from '@app/shared/eyefi-serial-search/eyefi-serial-search-ng-select.component';
import { ULLabelService } from '@app/features/ul-management/services/ul-label.service';
import { ULLabelUsage } from '@app/features/ul-management/models/ul-label.model';
import { PublicFormWrapperComponent } from '../public-form-wrapper/public-form-wrapper.component';

export interface ULLabel {
  id: number;
  ul_number: string;
  prefix?: string;
  numeric_part: number;
  description?: string;
  category?: string;
  status: 'available' | 'used';
  dateCreated: Date;
  dateUsed?: Date;
}

export interface ULUsage {
  id: number;
  ul_number: string;
  serial_number: string;
  quantity: number;
  category: 'New' | 'Used'; // New or Used category
  description: string;
  date_used: Date;
  user_signature: string;
  customer: string;
  work_order?: string; // Optional work order number for tracking
  work_order_part?: string; // Part number from selected work order
  work_order_description?: string; // Description from selected work order
}

export interface BulkTransaction {
  ul_number: string;
  serial_number: string;
  quantity: number;
  work_order?: string; // Optional work order number for tracking
}

@Component({
  selector: 'app-standalone-ul-usage-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    QadWoSearchComponent,
    EyefiSerialSearchNgSelectComponent,
    PublicFormWrapperComponent
  ],
  templateUrl: './ul-usage-form.component.html',
  styleUrls: ['./ul-usage-form.component.scss']
})
export class StandaloneULUsageFormComponent implements OnInit, OnDestroy, AfterViewInit {
  // Authentication state (managed by wrapper component)
  isAuthenticated = false;
  currentUser: any = null;

  // UL Management
  availableULs: ULLabel[] = [];
  filteredULs: ULLabel[] = []; // ULs filtered by selected category
  usageForm: FormGroup;

  // UL Range display
  lastUsedULs: ULLabel[] = [];
  currentUL: ULLabel | null = null;
  nextULs: ULLabel[] = [];

  // New properties for the updated approach
  assignedULNumbers: string[] = []; // Automatically assigned UL numbers
  bulkTransactions: BulkTransaction[] = []; // For bulk mode form data

  // Manual UL selection properties
  selectionMethod: 'automatic' | 'manual' = 'automatic'; // Default to automatic
  manuallySelectedULs: string[] = []; // Manually selected UL numbers
  selectedManualUL: string = ''; // Currently selected UL in dropdown

  // Bulk helper properties
  bulkCustomer: string = '';
  bulkDescription: string = '';

  // Work order data storage
  selectedWorkOrderData: any = null; // Complete work order object

  // Work order validation
  workOrderValidationResults: any[] = []; // Existing usage records for selected work order
  showWorkOrderWarning = false; // Flag to show duplicate work order warning
  workOrderValidationLoading = false; // Loading state for validation check

  // Bulk transaction mode (now automatic based on quantity)
  get isBulkMode(): boolean {
    const ulNumbers = this.selectionMethod === 'automatic' ? this.assignedULNumbers : this.manuallySelectedULs;
    return ulNumbers.length > 1;
  }

  // Category options
  categoryOptions = [
    { value: 'New', label: 'New' },
    { value: 'Used', label: 'Used' }
  ];

  // UI State
  isSubmitting = false;
  showSuccessMessage = false;

  // Confirmation modal state
  showConfirmationModal = false;
  pendingSubmissionData: Partial<ULUsage>[] = [];

  // Success state
  lastSubmittedULs: string[] = []; // Track last submitted UL numbers for display
  lastSubmittedData: Partial<ULUsage>[] = []; // Store complete submission data for printing
  autoLogoutCountdown = 0; // Countdown timer for auto logout
  autoLogoutTimer: Subscription | null = null; // Timer subscription

  // Login modal state
  loginError: string = '';
  isLoggingIn = false;
  loginMethod: 'username' | 'cardNumber' = 'cardNumber'; // Default to cardNumber login

  // ViewChild references for login inputs
  @ViewChild('usernameInput') usernameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cardNumberInput') cardNumberInput!: ElementRef<HTMLInputElement>;
  @ViewChild(PublicFormWrapperComponent) wrapperComponent!: PublicFormWrapperComponent;

  // User image handling (managed by wrapper)
  hasValidUserImage = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private router: Router,
    private ulLabelService: ULLabelService
  ) {
    this.initializeForm();
    // Activity tracking handled by wrapper component
  }

  ngOnInit() {
    this.initializeForm();
    
    // Authentication and data loading handled by wrapper component
    // Browser title management handled by wrapper component
  }

  ngAfterViewInit() {
    // Focus the appropriate input if user is not authenticated
    if (!this.isAuthenticated) {
      this.focusLoginInput();
    }
  }

  ngOnDestroy() {
    // Session management handled by wrapper component
    if (this.usageForm && this.usageForm.value) {
      localStorage.setItem('ulUsageFormData', JSON.stringify(this.usageForm.value));
    }
  }

  private initializeForm() {
    this.usageForm = this.fb.group({
      id: [''], // Hidden ID field for editing existing records
      work_order: [''], // Work order number from QAD search
      work_order_part: [''], // Part number from selected work order
      work_order_description: [''], // Description from selected work order
      eyefi_serial_number: [''], // EyeFi device serial number from search
      category: [''], // Category comes first
      ul_quantity: ['', Validators.required], // How many UL numbers they need
      serial_number: ['', [Validators.required, Validators.minLength(3)]], // For single transactions
      quantity: [1, [Validators.required, Validators.min(1)]], // For single transactions
      customer: [''], // For single transactions
      description: [''], // For single transactions
      notes: [''] // For single transactions
    });

    // Subscribe to category changes to filter available ULs
    this.usageForm.get('category')?.valueChanges.subscribe(category => {
      this.filterULsByCategory(category);
      // Reset quantity and assigned ULs when category changes
      this.usageForm.get('ul_quantity')?.setValue('');
      this.assignedULNumbers = [];
      this.bulkTransactions = [];
    });

    // Subscribe to quantity changes to assign UL numbers
    this.usageForm.get('ul_quantity')?.valueChanges.subscribe(quantity => {
      if (quantity && this.usageForm.get('category')?.value) {
        this.assignNextAvailableULs(parseInt(quantity));
      }
    });
  }

  // Session and authentication management handled by wrapper component
  /*
  openLoginModal(loginModalTemplate: any) {
    // Clear any previous login errors
    this.loginError = '';
    this.isLoggingIn = false;
    
    const modalRef = this.modalService.open(loginModalTemplate, {
      size: 'md',
      backdrop: 'static',
      keyboard: false,
      centered: true
    });
    
    modalRef.result.then((result) => {
      if (result === 'authenticated') {
        this.isAuthenticated = true;
        this.currentUser = this.authService.currentUserValue;
        this.startSessionTimer();
        this.prefillUserData();
      }
    }).catch(() => {
      // Modal dismissed - clear any errors
      this.loginError = '';
      this.isLoggingIn = false;
    });
  }
  */

  // Session management methods removed - handled by wrapper component

  private startAutoLogoutTimer() {
    this.autoLogoutCountdown = 20; // 20 seconds countdown

    this.autoLogoutTimer = timer(0, 1000).subscribe(() => {
      if (this.autoLogoutCountdown > 0) {
        this.autoLogoutCountdown--;
        // Update browser tab title to show auto logout countdown
        document.title = `🚪 Auto Logout in ${this.autoLogoutCountdown}s | The Fi Company`;
      } else {
        this.logout();
      }
    });
  }

  private clearAutoLogoutTimer() {
    if (this.autoLogoutTimer) {
      this.autoLogoutTimer.unsubscribe();
      this.autoLogoutTimer = null;
      this.autoLogoutCountdown = 0;
    }
  }

  // Activity tracking methods removed - handled by wrapper component

  private logoutDueToInactivity() {
    // Close confirmation modal if it's open during session expiry
    this.showConfirmationModal = false;
    this.pendingSubmissionData = [];
    this.isSubmitting = false;
    
    // Silent logout due to inactivity - no alerts
    this.logout();
  }

  private prefillUserData() {
    if (this.currentUser) {
      this.usageForm.patchValue({
        // You can add user-specific defaults here if needed
      });
    }
  }

  private async loadAvailableULs() {
    // Only load UL data if user is authenticated
    if (!this.isAuthenticated) {
      console.warn('Cannot load UL data: User is not authenticated');
      return;
    }

    // Check if we have a valid authentication token
    const currentUser = this.authService.currentUserValue;
    if (!currentUser || !currentUser.access_token) {
      console.error('Cannot load UL data: No valid authentication token found');
      this.loginError = 'Session expired. Please login again.';
      this.isAuthenticated = false;
      return;
    }

    try {
      // Load available UL numbers and usage records in parallel
      const [ulResponse, usageResponse] = await Promise.all([
        this.ulLabelService.getAvailableULNumbers().toPromise(),
        this.ulLabelService.getAllULLabelUsages().toPromise()
      ]);

      if (ulResponse && ulResponse.success) {
        this.availableULs = ulResponse.data.map((ul: any) => ({
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

        // Update UL status based on usage records
        if (usageResponse && usageResponse.success && usageResponse.data) {
          const usageRecords = usageResponse.data;
          const usedULNumbers = new Set(usageRecords.map((usage: any) => usage.ul_number));

          // Mark ULs as used if they have usage records
          this.availableULs = this.availableULs.map(ul => {
            if (usedULNumbers.has(ul.ul_number)) {
              return {
                ...ul,
                status: 'used' as const,
                dateUsed: new Date() // You could get actual usage date from records if needed
              };
            }
            return ul;
          });
        }
      } else {
        console.error('Failed to load UL numbers:', ulResponse?.message);
        this.availableULs = [];
      }
    } catch (error) {
      console.error('Error loading UL numbers:', error);
      
      // Handle specific authentication errors
      if (error && (error as any).status === 900) {
        console.error('Authentication error (900): Invalid or missing JWT token');
        this.loginError = 'Session expired or invalid. Please login again.';
        this.isAuthenticated = false;
        this.currentUser = null;
      } else if (error && (error as any).status === 401) {
        console.error('Authentication error (401): Unauthorized');
        this.loginError = 'Authentication failed. Please login again.';
        this.isAuthenticated = false;
        this.currentUser = null;
      } else {
        console.error('General error loading UL data:', error);
      }
      
      this.availableULs = [];
    }

    this.organizeULsByRange(this.availableULs);
  }

  private filterULsByCategory(category: string) {
    if (!category) {
      this.filteredULs = [];
      this.organizeULsByRange([]);
      return;
    }

    // Filter ULs by the selected category
    this.filteredULs = this.availableULs.filter(ul => ul.category === category);
    this.organizeULsByRange(this.filteredULs);
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

  private organizeULsByRange(allULs: ULLabel[]) {
    // Sort by numeric part to ensure proper order
    const sortedULs = allULs.sort((a, b) => a.numeric_part - b.numeric_part);

    // Find last used index using reverse iteration
    let lastUsedIndex = -1;
    for (let i = sortedULs.length - 1; i >= 0; i--) {
      if (sortedULs[i].status === 'used') {
        lastUsedIndex = i;
        break;
      }
    }

    // Current index is one after the last used
    const currentIndex = lastUsedIndex + 1;

    // Last 5 used ULs
    this.lastUsedULs = lastUsedIndex >= 0 ? 
      sortedULs.slice(Math.max(0, lastUsedIndex - 4), lastUsedIndex + 1) : [];

    // Current UL (next to be used) - should be first available after used ones
    this.currentUL = sortedULs.find(ul => ul.status === 'available') || null;

    // Next 10 available ULs (excluding the current one)
    const availableULs = sortedULs.filter(ul => ul.status === 'available');
    this.nextULs = availableULs.slice(1, 11); // Skip first (current) and take next 10
  }

  // Load mock UL data - In real implementation, this would call an API

  async onSubmit() {
    if (!this.isFormValid()) {
      return;
    }

    // Prepare submission data for confirmation
    const category = this.usageForm.get('category')?.value;
    let usageRecords: Partial<ULUsage>[] = [];

    // Use appropriate UL numbers based on selection method
    const ulNumbers = this.selectionMethod === 'automatic' ? this.assignedULNumbers : this.manuallySelectedULs;

    if (ulNumbers.length === 1) {
      // Single transaction
      const formData = this.usageForm.value;
      usageRecords = [{
        ul_number: ulNumbers[0],
        serial_number: formData.serial_number,
        quantity: formData.quantity,
        work_order: formData.work_order,
        work_order_part: formData.work_order_part,
        work_order_description: formData.work_order_description,
        category: category,
        customer: formData.customer || '', // Add customer field
        date_used: new Date(),
        user_signature: this.currentUser?.full_name || this.currentUser?.username
      }];
    } else {
      // Bulk transactions - all transactions use the same work order
      const workOrder = this.usageForm.get('work_order')?.value;
      const workOrderPart = this.usageForm.get('work_order_part')?.value;
      const workOrderDescription = this.usageForm.get('work_order_description')?.value;
      usageRecords = this.bulkTransactions.map(transaction => ({
        ul_number: transaction.ul_number,
        serial_number: transaction.serial_number,
        quantity: transaction.quantity,
        work_order: workOrder,
        work_order_part: workOrderPart,
        work_order_description: workOrderDescription,
        category: category,
        customer: '', // Add customer field for bulk transactions
        date_used: new Date(),
        user_signature: this.currentUser?.full_name || this.currentUser?.username
      }));
    }

    // Store pending data and show confirmation modal
    this.pendingSubmissionData = usageRecords;
    this.showConfirmationModal = true;
  }

  // Confirm and proceed with submission
  async confirmSubmission() {
    this.showConfirmationModal = false;
    this.isSubmitting = true;

    try {
      // Submit UL usage records to the real API service

      // Submit each usage record to the API
      const submissionPromises = this.pendingSubmissionData.map(record => {
        // Find the UL label ID from available ULs
        const ulLabel = this.availableULs.find(ul => ul.ul_number === record.ul_number);
        
        // Get work order information from stored data
        const workOrderData = this.selectedWorkOrderData;
        
        // Map component data to API-expected format
        const apiUsageRecord: Partial<ULLabelUsage> = {
          ul_number: record.ul_number!,
          ul_label_id: ulLabel?.id || 0,
          eyefi_serial_number: record.serial_number!,
          quantity_used: record.quantity!,
          date_used: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
          user_signature: record.user_signature!,
          user_name: this.currentUser?.full_name || this.currentUser?.username || '',
          customer_name: record.customer || '',
          // Work Order Information (direct fields)
          wo_nbr: workOrderData?.wo_nbr || null,
          wo_due_date: workOrderData?.wo_due_date || null,
          wo_part: workOrderData?.wo_part || null,
          wo_qty_ord: workOrderData?.wo_qty_ord || null,
          wo_routing: workOrderData?.wo_routing || null,
          wo_line: workOrderData?.wo_line || null,
          wo_description: workOrderData?.description || null,
          // Also store as JSON in notes for backwards compatibility (optional)
          notes: workOrderData ? JSON.stringify({
            work_order: workOrderData,
            recorded_at: new Date().toISOString()
          }) : ''
        };
        
        return this.ulLabelService.recordULLabelUsage(apiUsageRecord as ULLabelUsage).toPromise();
      });

      const results = await Promise.all(submissionPromises);
      
      // Check if all submissions were successful
      const failedSubmissions = results.filter(result => !result?.success);
      if (failedSubmissions.length > 0) {
        throw new Error(`Failed to submit ${failedSubmissions.length} UL usage records`);
      }

      // Show success message and track submitted ULs
      this.lastSubmittedULs = [...this.assignedULNumbers]; // Store for display
      this.lastSubmittedData = [...this.pendingSubmissionData]; // Store complete data for printing
      this.showSuccessMessage = true;

      // Start auto logout countdown
      this.startAutoLogoutTimer();

      // Reset form and clear data
      this.usageForm.reset();
      this.assignedULNumbers = [];
      this.bulkTransactions = [];
      this.pendingSubmissionData = [];
      this.initializeForm();

      // Reload UL data to reflect usage changes
      await this.loadAvailableULs();

      // Reload UL data to reflect usage
      this.loadAvailableULs();

    } catch (error) {
      console.error('Error submitting UL usage:', error);
      // TODO: Show error message
    } finally {
      this.isSubmitting = false;
    }
  }

  // Cancel submission
  cancelSubmission() {
    this.showConfirmationModal = false;
    this.pendingSubmissionData = [];
  }

  // Get current date for display
  getCurrentDate(): Date {
    return new Date();
  }

  logout() {
    // Session management handled by wrapper component
    this.clearAutoLogoutTimer();
    
    // Use wrapper component's logout method for proper authentication clearing
    if (this.wrapperComponent) {
      this.wrapperComponent.logout();
    } else {
      // Fallback if wrapper is not available
      this.authService.logout();
      this.isAuthenticated = false;
      this.currentUser = null;
    }
    
    // Clear form state
    this.usageForm.reset();
    this.assignedULNumbers = [];
    this.bulkTransactions = [];
    this.showSuccessMessage = false;
    this.lastSubmittedULs = [];
    this.lastSubmittedData = [];
    
    // Close confirmation modal if it's open
    this.showConfirmationModal = false;
    this.pendingSubmissionData = [];
    this.isSubmitting = false;
    
    this.initializeForm();
    
    // Reset to card number method and focus
    this.loginMethod = 'cardNumber';
    setTimeout(() => {
      this.focusLoginInput();
    }, 100);
  }

  // Session timing methods removed - handled by wrapper component

  // Success card action methods
  startNewULUsage() {
    this.clearAutoLogoutTimer();
    this.showSuccessMessage = false;
    this.lastSubmittedULs = [];
    this.lastSubmittedData = [];
    // Form is already reset, just need to hide success message
    // Refresh UL data to ensure latest usage status
    this.loadAvailableULs();
  }

  printULUsageRecords() {
    if (this.lastSubmittedData.length === 0) {
      console.error('No data to print');
      return;
    }

    // Create print content
    const printWindow = window.open('', 'PRINT', 'height=600,width=800');
    
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }

    const currentDate = new Date().toLocaleString();
    const userName = this.currentUser?.full_name || this.currentUser?.username || 'Unknown User';
    
    // Build rows for each UL usage
    const rows = this.lastSubmittedData.map((record, index) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td><strong>${record.ul_number}</strong></td>
        <td>${record.serial_number || 'N/A'}</td>
        <td class="text-center">${record.quantity || 1}</td>
        <td>${record.category || 'N/A'}</td>
        <td>${record.work_order || 'N/A'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>UL Usage Records - ${currentDate}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20mm;
            margin: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
          }
          .header h1 {
            margin: 0;
            color: #2c3e50;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0;
            color: #7f8c8d;
          }
          .info-section {
            margin-bottom: 20px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .info-label {
            font-weight: bold;
            color: #2c3e50;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
          }
          th {
            background-color: #2c3e50;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 2px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
          }
          .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 45%;
            border-top: 2px solid #333;
            padding-top: 10px;
          }
          @media print {
            body {
              padding: 10mm;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>UL Label Usage Records</h1>
          <p>The Fi Company - Label Tracking System</p>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Recorded By:</span>
            <span>${userName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date & Time:</span>
            <span>${currentDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total UL Labels:</span>
            <span><strong>${this.lastSubmittedData.length}</strong></span>
          </div>
          ${this.lastSubmittedData[0]?.work_order ? `
          <div class="info-row">
            <span class="info-label">Work Order:</span>
            <span>${this.lastSubmittedData[0].work_order}</span>
          </div>
          ` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>UL Number</th>
              <th>Serial Number</th>
              <th style="width: 100px; text-align: center;">Quantity</th>
              <th style="width: 100px;">Category</th>
              <th>Work Order</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="signature-section">
          <div class="signature-box">
            <div><strong>Recorded By:</strong></div>
            <div>${userName}</div>
          </div>
          <div class="signature-box">
            <div><strong>Verified By:</strong></div>
            <div>_______________________</div>
          </div>
        </div>

        <div class="footer">
          <p>This is an automatically generated document from The Fi Company Label Tracking System</p>
          <p>Printed on: ${currentDate}</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
            Print Document
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Auto print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  cancelAutoLogout() {
    this.clearAutoLogoutTimer();
    // Keep the success message visible but stop the countdown
  }

  // Helper methods
  isFormValid(): boolean {
    if (!this.isAuthenticated) {
      return false;
    }

    // Check based on selection method
    if (this.selectionMethod === 'automatic') {
      // For automatic selection, check if we have assigned UL numbers
      if (this.assignedULNumbers.length === 0) {
        return false;
      }

      // For single transactions, check the reactive form
      if (this.assignedULNumbers.length === 1) {
        // Must have valid form and serial number must not be empty
        const serialNumber = this.usageForm.get('serial_number')?.value;
        return this.usageForm.valid && serialNumber && serialNumber.trim() !== '';
      }

      // For bulk transactions, check each bulk transaction has a valid serial number
      const allValid = this.bulkTransactions.every(transaction =>
        transaction.serial_number && 
        transaction.serial_number.trim() !== '' &&
        transaction.quantity > 0
      );

      // Check for duplicate serial numbers
      if (!allValid) return false;
      return !this.hasDuplicateSerialNumbers();
    } else {
      // For manual selection, check if we have manually selected ULs
      if (this.manuallySelectedULs.length === 0) {
        return false;
      }

      // For manual selection (single or multiple), always check bulk transactions
      // because each manually selected UL creates a bulk transaction entry
      const allValid = this.bulkTransactions.length === this.manuallySelectedULs.length &&
             this.bulkTransactions.every(transaction =>
               transaction.serial_number && 
               transaction.serial_number.trim() !== '' &&
               transaction.quantity > 0
             );

      // Check for duplicate serial numbers
      if (!allValid) return false;
      return !this.hasDuplicateSerialNumbers();
    }
  }

  // Check if there are duplicate serial numbers in bulk transactions
  hasDuplicateSerialNumbers(): boolean {
    const serialNumbers = this.bulkTransactions
      .map(t => t.serial_number?.trim())
      .filter(s => s && s !== '');
    
    const uniqueSerials = new Set(serialNumbers);
    return serialNumbers.length !== uniqueSerials.size;
  }

  // Check if a specific serial number is a duplicate
  isSerialNumberDuplicate(ulNumber: string, serialNumber: string): boolean {
    if (!serialNumber || serialNumber.trim() === '') {
      return false;
    }

    const trimmedSerial = serialNumber.trim();
    const duplicateCount = this.bulkTransactions.filter(
      t => t.ul_number !== ulNumber && t.serial_number?.trim() === trimmedSerial
    ).length;

    return duplicateCount > 0;
  }

  getAvailableULOptions(): ULLabel[] {
    return this.filteredULs.filter(ul => ul.status === 'available');
  }

  // Check if the selected category is "Used"
  isUsedCategory(): boolean {
    return this.usageForm.get('category')?.value === 'Used';
  }

  // New method to handle quantity change
  onQuantityChange(event: any) {
    const quantity = parseInt(event.target.value);
    if (quantity && this.usageForm.get('category')?.value && this.selectionMethod === 'automatic') {
      this.assignNextAvailableULs(quantity);
    }
  }

  // Handle selection method change
  onSelectionMethodChange() {
    // Clear any existing selections when switching methods
    this.assignedULNumbers = [];
    this.manuallySelectedULs = [];
    this.bulkTransactions = [];
    this.selectedManualUL = '';
    
    // Reset form quantity if switching away from automatic
    if (this.selectionMethod === 'manual') {
      this.usageForm.patchValue({ ul_quantity: '' });
    }
  }

  // Get available UL options for manual selection dropdown
  getAvailableULOptionsForManualSelection(): ULLabel[] {
    // Use filtered ULs if available, otherwise use all available ULs
    const ulsToFilter = this.filteredULs.length > 0 ? this.filteredULs : this.availableULs;
    const availableULs = ulsToFilter.filter(ul => ul.status === 'available');
    
    return availableULs;
  }

  // Add manually selected UL
  addManualUL() {
    if (this.selectedManualUL && !this.manuallySelectedULs.includes(this.selectedManualUL)) {
      this.manuallySelectedULs.push(this.selectedManualUL);
      
      // Update bulk transactions for manual selection - preserve existing serial numbers
      const existingTransactions = new Map(
        this.bulkTransactions.map(t => [t.ul_number, t])
      );
      
      this.bulkTransactions = this.manuallySelectedULs.map(ulNumber => {
        const existing = existingTransactions.get(ulNumber);
        return existing || {
          ul_number: ulNumber,
          serial_number: '',
          quantity: 1,
          work_order: ''
        };
      });
      
      // Clear the selection dropdown
      this.selectedManualUL = '';
      
      // Refresh UL ranges
      this.organizeULsByRange(this.filteredULs.length > 0 ? this.filteredULs : this.availableULs);
    }
  }

  // Remove manually selected UL
  removeManualUL(index: number) {
    if (index >= 0 && index < this.manuallySelectedULs.length) {
      const removedUL = this.manuallySelectedULs[index];
      this.manuallySelectedULs.splice(index, 1);
      
      // Update bulk transactions - preserve existing serial numbers for remaining ULs
      this.bulkTransactions = this.bulkTransactions.filter(transaction => 
        transaction.ul_number !== removedUL && 
        this.manuallySelectedULs.includes(transaction.ul_number)
      );
      
      // Refresh UL ranges
      this.organizeULsByRange(this.filteredULs.length > 0 ? this.filteredULs : this.availableULs);
    }
  }

  // Assign the next available UL numbers based on quantity
  assignNextAvailableULs(quantity: number) {
    const availableULs = this.getAvailableULOptions();

    if (availableULs.length < quantity) {
      // Not enough UL numbers available
      alert(`Only ${availableULs.length} UL numbers available for ${this.usageForm.get('category')?.value} category`);
      return;
    }

    // Get the next sequential UL numbers
    this.assignedULNumbers = availableULs
      .slice(0, quantity)
      .map(ul => ul.ul_number);

    // Initialize bulk transactions if more than one UL
    if (quantity > 1) {
      this.bulkTransactions = this.assignedULNumbers.map(ulNumber => ({
        ul_number: ulNumber,
        serial_number: '',
        quantity: 1,
        work_order: ''
      }));
    } else {
      this.bulkTransactions = [];
    }

    // Refresh the UL ranges to account for assigned ULs
    this.organizeULsByRange(this.filteredULs.length > 0 ? this.filteredULs : this.availableULs);
  }

  // Bulk helper methods
  applyBulkCustomer() {
    // if (this.bulkCustomer && this.bulkTransactions.length > 0) {
    //   this.bulkTransactions.forEach(transaction => {
    //     transaction.customer = this.bulkCustomer;
    //   });
    // }
  }

  applyBulkDescription() {
    // if (this.bulkDescription && this.bulkTransactions.length > 0) {
    //   this.bulkTransactions.forEach(transaction => {
    //     transaction.description = this.bulkDescription;
    //   });
    // }
  }

  applyAllBulkFields() {
    if (this.bulkTransactions.length > 0) {
      let applied = false;
      this.bulkTransactions.forEach(transaction => {
        // if (this.bulkCustomer) {
        //   transaction.customer = this.bulkCustomer;
        //   applied = true;
        // }
        // if (this.bulkDescription) {
        //   transaction.description = this.bulkDescription;
        //   applied = true;
        // }
      });

      if (applied) {
        // Bulk fields applied successfully
      }
    }
  }

  clearBulkFields() {
    this.bulkCustomer = '';
    this.bulkDescription = '';
    this.bulkTransactions.forEach(transaction => {
      transaction.serial_number = '';
      transaction.quantity = 1;
      transaction.work_order = ''
    });
  }

  // Get bulk transaction by UL number, create if not exists
  getBulkTransactionByUL(ulNumber: string): BulkTransaction {
    let transaction = this.bulkTransactions.find(t => t.ul_number === ulNumber);
    if (!transaction) {
      transaction = {
        ul_number: ulNumber,
        serial_number: '',
        quantity: 1,
        work_order: ''
      };
      this.bulkTransactions.push(transaction);
    }
    return transaction;
  }

  // Get already selected serial numbers to exclude from dropdown
  getExcludedSerialNumbers(currentUlNumber: string): string[] {
    // Get all selected serial numbers from bulk transactions except the current one
    const selectedSerials = this.bulkTransactions
      .filter(t => t.ul_number !== currentUlNumber && t.serial_number && t.serial_number.trim() !== '')
      .map(t => t.serial_number);
    
    // Also include the serial from single form if applicable
    const singleSerial = this.usageForm.get('serial_number')?.value;
    if (singleSerial && singleSerial.trim() !== '' && !selectedSerials.includes(singleSerial)) {
      selectedSerials.push(singleSerial);
    }
    
    return selectedSerials;
  }

  // Custom validation for login form based on selected method
  isLoginFormValid(loginForm: any): boolean {
    const formData = loginForm.value;

    if (this.loginMethod === 'username') {
      return !!(formData.username && formData.password);
    } else if (this.loginMethod === 'cardNumber') {
      return !!(formData.cardNumber);
    }

    return false;
  }

  // Authentication method for the inline login form
  authenticateUser(loginForm: any): void {
    const formData = loginForm.value;

    // Validate required fields based on login method
    if (this.loginMethod === 'username') {
      if (!formData.username || !formData.password) {
        this.loginError = 'Username and password are required';
        return;
      }
    } else if (this.loginMethod === 'cardNumber') {
      if (!formData.cardNumber) {
        this.loginError = 'Card number is required';
        return;
      }
    }

    // Clear previous errors and set loading state
    this.loginError = '';
    this.isLoggingIn = true;

    let loginCredential: string;

    if (this.loginMethod === 'username') {
      // Append @the-fi-company.com domain to username if not already included
      loginCredential = formData.username.includes('@') ?
        formData.username :
        `${formData.username}@the-fi-company.com`;
    } else {
      // Use card number as is for authentication
      loginCredential = formData.cardNumber;
    }

    // Subscribe to authentication service based on login method
    const authObservable = this.loginMethod === 'cardNumber' ?
      this.authService.loginWithCardNumber(loginCredential) :
      this.authService.login(loginCredential, formData.password);

    authObservable.subscribe({
      next: (result: any) => {
        this.isLoggingIn = false;

        if (result && result.access_token && result.access_token !== false) {
          // Store authentication data properly like the main login
          localStorage.setItem("token", result.access_token);
          
          // Create user object with token property for JWT interceptor
          const userWithToken = {
            ...result.user,
            token: result.access_token,
            access_token: result.access_token // Keep for compatibility
          };
          
          // Store user data in localStorage using the same key as main login
          localStorage.setItem(
            THE_FI_COMPANY_CURRENT_USER,
            JSON.stringify(userWithToken)
          );

          // Update component state
          this.isAuthenticated = true;
          this.currentUser = userWithToken;
          
          // Initialize user image validation
          this.hasValidUserImage = !!(this.currentUser?.image);
          
          // Session management handled by wrapper component
          this.prefillUserData();
          
          // Load UL data now that user is authenticated
          this.loadAvailableULs();
          
          // Authentication successful - form will now show
        } else {
          // Handle failed authentication
          this.loginError = result.message || `Authentication failed. Please check your ${this.loginMethod === 'username' ? 'username and password' : 'card number'}.`;
        }
      },
      error: (error: any) => {
        this.isLoggingIn = false;

        // Handle error response
        if (error.error && error.error.message) {
          this.loginError = error.error.message;
        } else if (error.message) {
          this.loginError = error.message;
        } else {
          this.loginError = `Authentication failed. Please check your ${this.loginMethod === 'username' ? 'username and password' : 'card number'}.`;
        }

        console.error('Authentication failed:', error);
      }
    });
  }

  // Focus the appropriate input based on login method
  private focusLoginInput(): void {
    // Use setTimeout to ensure the view has been updated
    setTimeout(() => {
      if (this.loginMethod === 'cardNumber' && this.cardNumberInput) {
        this.cardNumberInput.nativeElement.focus();
      } else if (this.loginMethod === 'username' && this.usernameInput) {
        this.usernameInput.nativeElement.focus();
      }
    }, 100);
  }

  // Handle login method change to focus appropriate input
  onLoginMethodChange(): void {
    this.focusLoginInput();
  }

  // Handle Enter key press on card number input (for card scanners)
  onCardNumberEnter(event: Event, loginForm: any): void {
    // Cast to KeyboardEvent to access keyboard-specific properties
    const keyboardEvent = event as KeyboardEvent;

    // Prevent default form submission behavior
    keyboardEvent.preventDefault();

    // Get the card number value from the input
    const cardNumberInput = keyboardEvent.target as HTMLInputElement;
    const cardNumber = cardNumberInput.value.trim();

    // Only proceed if card number has been entered
    if (cardNumber && cardNumber.length > 0) {
      // Small delay to ensure the ngModel has updated
      setTimeout(() => {
        // Trigger the authentication process
        this.authenticateUser(loginForm);
      }, 100);
    }
  }

  // Utility method to check if a form field is invalid
  isFieldInvalid(fieldName: string, form: any): boolean {
    const field = form.get(fieldName);
    return field && field.invalid && (field.dirty || field.touched);
  }

  // Navigate back to the dashboard or previous page
  goBack(): void {
    this.router.navigate(['/']);
  }

  // Handle work order selection from QAD search
  onWorkOrderSelected(workOrder: any): void {
    if (workOrder) {
      // Store complete work order data
      this.selectedWorkOrderData = workOrder;
      
      // Update form with basic work order info
      this.usageForm.patchValue({
        work_order: workOrder.wo_nbr,
        work_order_part: workOrder.wo_part || '',
        work_order_description: workOrder.description || ''
      });

      // Check if this work order is already used in other UL labels
      this.checkWorkOrderForDuplicates(workOrder.wo_nbr);
    } else {
      // Clear work order data
      this.selectedWorkOrderData = null;
      this.clearWorkOrderValidation();
      
      this.usageForm.patchValue({
        work_order: '',
        work_order_part: '',
        work_order_description: ''
      });
    }
  }

  // Check if work order is already used in other UL labels
  private checkWorkOrderForDuplicates(workOrderNumber: string | number): void {
    if (!workOrderNumber) {
      this.clearWorkOrderValidation();
      return;
    }

    this.workOrderValidationLoading = true;
    this.showWorkOrderWarning = false;

    this.ulLabelService.checkWorkOrderUsage(workOrderNumber).subscribe({
      next: (response) => {
        this.workOrderValidationLoading = false;
        
        if (response.success && response.data && response.data.length > 0) {
          // Work order is already used in other UL labels
          this.workOrderValidationResults = response.data;
          this.showWorkOrderWarning = true;
        } else {
          // Work order is not used elsewhere
          this.clearWorkOrderValidation();
        }
      },
      error: (error) => {
        console.error('Error validating work order:', error);
        this.workOrderValidationLoading = false;
        this.clearWorkOrderValidation();
        // Optionally show error message to user
      }
    });
  }

  // Clear work order validation state
  private clearWorkOrderValidation(): void {
    this.workOrderValidationResults = [];
    this.showWorkOrderWarning = false;
    this.workOrderValidationLoading = false;
  }

  // Handle EyeFi serial number selection
  onEyeFiSerialSelected(serialData: any): void {
    if (serialData) {
      // Check if this is a validated EyeFi device (has product_model) or manual entry
      const isValidatedEyeFi = serialData.product_model && serialData.status;
      
      // Update both eyefi_serial_number (for tracking) and serial_number (for the form)
      this.usageForm.patchValue({
        eyefi_serial_number: serialData.serial_number,
        serial_number: serialData.serial_number
      });
      
      if (isValidatedEyeFi) {
        console.log('✅ EyeFi Serial Selected:', serialData);
        console.log('Device Model:', serialData.product_model);
        console.log('Status:', serialData.status);
        
        // Show success feedback for validated EyeFi device
        // You could add a toast notification here if you have one
      } else {
        console.log('📝 Manual Serial Entered:', serialData.serial_number);
        console.log('Note: Not a validated EyeFi device - manual entry accepted');
      }
      
      console.log('Serial Number field updated to:', serialData.serial_number);
      
      // Update bulk transactions if they exist
      if (this.bulkTransactions.length > 0) {
        this.bulkTransactions.forEach(transaction => {
          transaction.serial_number = serialData.serial_number;
        });
        console.log('Bulk transactions updated with serial number');
      }
    } else {
      // Clear serial number data
      this.usageForm.patchValue({
        eyefi_serial_number: '',
        serial_number: ''
      });
      
      // Clear bulk transactions serial numbers
      if (this.bulkTransactions.length > 0) {
        this.bulkTransactions.forEach(transaction => {
          transaction.serial_number = '';
        });
      }
      
      console.log('Serial number cleared');
    }
  }

  // ============================================================================
  // Temporary Login Event Handlers
  // ============================================================================
  
  // Wrapper component event handlers
  onAuthenticationComplete(user: any): void {
    this.onLoginSuccess(user);
  }

  onUserLoggedOut(): void {
    this.logout();
  }

  /**
   * Handle successful login from temporary login component
   */
  onLoginSuccess(user: any): void {
    console.log('Login successful:', user);
    
    // Store authentication data properly like the main login
    localStorage.setItem("token", user.access_token || user.token);
    
    // Create user object with token property for JWT interceptor  
    const userWithToken = {
      ...user,
      token: user.access_token || user.token,
      access_token: user.access_token || user.token // Keep for compatibility
    };
    
    // Store user data in localStorage using the same key as main login
    localStorage.setItem(
      THE_FI_COMPANY_CURRENT_USER,
      JSON.stringify(userWithToken)
    );
    
    // Update component state
    this.isAuthenticated = true;
    this.currentUser = userWithToken;
    
    // Initialize user image validation
    this.hasValidUserImage = !!(this.currentUser?.image);
    
    // Session management handled by wrapper component
    this.prefillUserData();
    
    // Load UL data now that user is authenticated
    this.loadAvailableULs();
  }

  /**
   * Handle login error from temporary login component
   */
  onLoginError(error: string): void {
    console.error('Login error received:', error);
    this.loginError = error;
  }

  /**
   * Handle session expiration from temporary login component
   */
  onSessionExpired(): void {
    console.log('Session expired');
    this.logout();
  }

  // ============================================================================
  // User Image Methods
  // ============================================================================
  
  /**
   * Get the URL for the current user's image
   */
  getUserImageUrl(): string {
    if (this.currentUser?.image) {
      // If image path starts with http/https, use as is
      if (this.currentUser.image.startsWith('http')) {
        return this.currentUser.image;
      }
      // Otherwise, prepend the dashboard URL
      return `https://dashboard.eye-fi.com${this.currentUser.image}`;
    }
    // Return empty string to trigger error handler and show fallback
    return '';
  }

  /**
   * Handle user image load errors
   */
  onUserImageError(event: any): void {
    this.hasValidUserImage = false;
    // Hide the img element
    if (event.target) {
      event.target.style.display = 'none';
    }
  }

  /**
   * Navigate to public forms menu
   */
  goToFormsMenu(): void {
    this.router.navigate(['/forms']);
  }
}
