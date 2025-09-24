import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { AuthenticationService } from '@app/core/services/auth.service';
import { THE_FI_COMPANY_CURRENT_USER } from '@app/core/guards/admin.guard';
import { QadWoSearchComponent } from '@app/shared/components/qad-wo-search/qad-wo-search.component';
import { ULLabelService } from '@app/features/ul-management/services/ul-label.service';
import { ULLabelUsage } from '@app/features/ul-management/models/ul-label.model';

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
    QadWoSearchComponent
  ],
  templateUrl: './ul-usage-form.component.html',
  styleUrls: ['./ul-usage-form.component.scss']
})
export class StandaloneULUsageFormComponent implements OnInit, OnDestroy, AfterViewInit {
  // Authentication state
  isAuthenticated = false;
  currentUser: any = null;
  sessionTimer: Subscription | null = null;
  sessionTimeRemaining = 0;

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

  // Bulk transaction mode (now automatic based on quantity)
  get isBulkMode(): boolean {
    return this.assignedULNumbers.length > 1;
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
  autoLogoutCountdown = 0; // Countdown timer for auto logout
  autoLogoutTimer: Subscription | null = null; // Timer subscription

  // Login modal state
  loginError: string = '';
  isLoggingIn = false;
  loginMethod: 'username' | 'cardNumber' = 'cardNumber'; // Default to cardNumber login

  // ViewChild references for login inputs
  @ViewChild('usernameInput') usernameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cardNumberInput') cardNumberInput!: ElementRef<HTMLInputElement>;

  // Session and inactivity timeouts
  readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes total session
  readonly INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute of inactivity

  // Inactivity tracking
  lastActivity = Date.now();
  inactivityTimer: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private router: Router,
    private ulLabelService: ULLabelService
  ) {
    this.initializeForm();
    this.setupActivityListeners();
  }

  ngOnInit() {
    this.initializeForm();
    this.checkAuthenticationStatus();
    
    // Only load UL data if user is already authenticated
    if (this.isAuthenticated) {
      this.loadAvailableULs();
    }
    
    // Initialize browser tab title
    this.resetBrowserTabTitle();
  }

  ngAfterViewInit() {
    // Focus the appropriate input if user is not authenticated
    if (!this.isAuthenticated) {
      this.focusLoginInput();
    }
  }

  ngOnDestroy() {
    this.clearSessionTimer();
    this.clearAutoLogoutTimer();
    this.clearInactivityTimer();
  }

  private initializeForm() {
    this.usageForm = this.fb.group({
      id: [''], // Hidden ID field for editing existing records
      work_order: [''], // Work order number from QAD search
      work_order_part: [''], // Part number from selected work order
      work_order_description: [''], // Description from selected work order
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

  private checkAuthenticationStatus() {
    // Check if user is already authenticated
    const user = this.authService.currentUserValue;
    if (user && user.id) {
      this.isAuthenticated = true;
      this.currentUser = user;
      this.startSessionTimer();
      this.updateLastActivity(); // Start inactivity tracking
    }
  }

  // Session and authentication management
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

  private startSessionTimer() {
    this.sessionTimeRemaining = this.SESSION_TIMEOUT / 1000; // Convert to seconds

    this.sessionTimer = timer(0, 1000).subscribe(() => {
      this.sessionTimeRemaining--;

      // Update browser tab title with remaining time
      this.updateBrowserTabTitle();

      if (this.sessionTimeRemaining <= 0) {
        this.logout();
      }
    });
  }

  private clearSessionTimer() {
    if (this.sessionTimer) {
      this.sessionTimer.unsubscribe();
      this.sessionTimer = null;
    }
    // Reset browser tab title when session ends
    this.resetBrowserTabTitle();
  }

  private updateBrowserTabTitle() {
    if (this.isAuthenticated && this.sessionTimeRemaining > 0) {
      const timeFormatted = this.getTimeRemainingFormatted();
      const inactivityTime = this.getInactivityTimeRemainingFormatted();

      // Show the shorter of the two timers
      const sessionMinutes = Math.floor(this.sessionTimeRemaining / 60);
      const inactivityMinutes = Math.floor((this.INACTIVITY_TIMEOUT - (Date.now() - this.lastActivity)) / 60000);

      const criticalTime = Math.min(sessionMinutes, inactivityMinutes);
      const timeDisplay = criticalTime <= 2 ? `⚠️ ${timeFormatted}` : timeFormatted;

      document.title = `UL Usage - ${timeDisplay} | The Fi Company`;
    } else {
      this.resetBrowserTabTitle();
    }
  }

  private resetBrowserTabTitle() {
    document.title = 'UL Usage Recording | The Fi Company';
  }

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

  private setupActivityListeners() {
    // Track user activity (mouse movement, keyboard, clicks, scrolling)
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    activityEvents.forEach(event => {
      document.addEventListener(event, () => this.updateLastActivity(), true);
    });
  }

  private updateLastActivity() {
    this.lastActivity = Date.now();

    if (this.isAuthenticated && !this.inactivityTimer) {
      this.startInactivityTimer();
    }
  }

  private startInactivityTimer() {
    this.inactivityTimer = timer(0, 1000).subscribe(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivity;

      // Update browser tab title (this will show the most critical timer)
      this.updateBrowserTabTitle();

      if (timeSinceLastActivity >= this.INACTIVITY_TIMEOUT) {
        // User has been inactive too long - force logout immediately
        this.logoutDueToInactivity();
      }
    });
  }

  private clearInactivityTimer() {
    if (this.inactivityTimer) {
      this.inactivityTimer.unsubscribe();
      this.inactivityTimer = null;
    }
  }

  private logoutDueToInactivity() {
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
    this.clearSessionTimer();
    this.clearAutoLogoutTimer();
    this.clearInactivityTimer();
    this.authService.logout();
    this.isAuthenticated = false;
    this.currentUser = null;
    this.usageForm.reset();
    this.assignedULNumbers = [];
    this.bulkTransactions = [];
    this.showSuccessMessage = false;
    this.lastSubmittedULs = [];
    this.initializeForm();
    
    // Reset to card number method and focus
    this.loginMethod = 'cardNumber';
    setTimeout(() => {
      this.focusLoginInput();
    }, 100);
  }

  extendSession() {
    this.clearSessionTimer();
    this.startSessionTimer();
    this.updateLastActivity(); // Reset inactivity timer
  }

  getTimeRemainingFormatted(): string {
    const minutes = Math.floor(this.sessionTimeRemaining / 60);
    const seconds = this.sessionTimeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getInactivityTimeRemaining(): number {
    if (!this.isAuthenticated) return 0;
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    const remaining = Math.max(0, this.INACTIVITY_TIMEOUT - timeSinceLastActivity);
    return Math.ceil(remaining / 1000); // Return seconds
  }

  getInactivityTimeRemainingFormatted(): string {
    const seconds = this.getInactivityTimeRemaining();
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Success card action methods
  startNewULUsage() {
    this.clearAutoLogoutTimer();
    this.showSuccessMessage = false;
    this.lastSubmittedULs = [];
    // Form is already reset, just need to hide success message
    // Refresh UL data to ensure latest usage status
    this.loadAvailableULs();
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
        return this.usageForm.valid;
      }

      // For bulk transactions, check each bulk transaction
      return this.bulkTransactions.every(transaction =>
        transaction.serial_number.trim() !== '' &&
        transaction.quantity > 0
      );
    } else {
      // For manual selection, check if we have manually selected ULs
      if (this.manuallySelectedULs.length === 0) {
        return false;
      }

      // Check bulk transactions for manual selection
      return this.bulkTransactions.every(transaction =>
        transaction.serial_number.trim() !== '' &&
        transaction.quantity > 0
      );
    }
  }

  getAvailableULOptions(): ULLabel[] {
    return this.filteredULs.filter(ul => ul.status === 'available');
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
      
      // Update bulk transactions for manual selection
      this.bulkTransactions = this.manuallySelectedULs.map(ulNumber => ({
        ul_number: ulNumber,
        serial_number: '',
        quantity: 1,
        work_order: ''
      }));
      
      // Clear the selection dropdown
      this.selectedManualUL = '';
      
      // Refresh UL ranges
      this.organizeULsByRange(this.filteredULs.length > 0 ? this.filteredULs : this.availableULs);
    }
  }

  // Remove manually selected UL
  removeManualUL(index: number) {
    if (index >= 0 && index < this.manuallySelectedULs.length) {
      this.manuallySelectedULs.splice(index, 1);
      
      // Update bulk transactions
      this.bulkTransactions = this.manuallySelectedULs.map(ulNumber => ({
        ul_number: ulNumber,
        serial_number: '',
        quantity: 1,
        work_order: ''
      }));
      
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
          
          this.startSessionTimer();
          this.updateLastActivity(); // Start inactivity tracking
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
    } else {
      // Clear work order data
      this.selectedWorkOrderData = null;
      
      this.usageForm.patchValue({
        work_order: '',
        work_order_part: '',
        work_order_description: ''
      });
    }
  }
}
