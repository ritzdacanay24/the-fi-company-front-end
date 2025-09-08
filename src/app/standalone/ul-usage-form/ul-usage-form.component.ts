import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subscription, timer } from 'rxjs';
import { AuthenticationService } from '@app/core/services/auth.service';

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
}

export interface BulkTransaction {
  ul_number: string;
  serial_number: string;
  quantity: number;
  customer: string;
  description: string;
  notes?: string;
}

@Component({
  selector: 'app-standalone-ul-usage-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule
  ],
  templateUrl: './ul-usage-form.component.html',
  styleUrls: ['./ul-usage-form.component.scss']
})
export class StandaloneULUsageFormComponent implements OnInit, OnDestroy {
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
  
  // Bulk helper properties
  bulkCustomer: string = '';
  bulkDescription: string = '';
  
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
  
  // ViewChild reference for card number input
  @ViewChild('cardNumberInput') cardNumberInput!: ElementRef<HTMLInputElement>;
  
  // Session and inactivity timeouts
  readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes total session
  readonly INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute of inactivity
  
  // Inactivity tracking
  lastActivity = Date.now();
  inactivityTimer: Subscription | null = null;
  
  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private authService: AuthenticationService,
    private router: Router
  ) {
    this.initializeForm();
    this.setupActivityListeners();
  }

  ngOnInit() {
    this.checkAuthenticationStatus();
    this.loadAvailableULs();
    // Initialize browser tab title
    this.resetBrowserTabTitle();
  }

  ngOnDestroy() {
    this.clearSessionTimer();
    this.clearAutoLogoutTimer();
    this.clearInactivityTimer();
  }

  private initializeForm() {
    this.usageForm = this.fb.group({
      category: ['', Validators.required], // Category comes first
      ul_quantity: ['', Validators.required], // How many UL numbers they need
      serial_number: ['', [Validators.required, Validators.minLength(3)]], // For single transactions
      quantity: [1, [Validators.required, Validators.min(1)]], // For single transactions
      customer: ['', Validators.required], // For single transactions
      description: ['', Validators.required], // For single transactions
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
    
    // Handle modal shown event for autofocus
    modalRef.shown.subscribe(() => {
      this.focusCardNumberIfSelected();
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

  /*
   * ALTERNATIVE: Modal-based Login Method (Keep for potential revert)
   * To use this instead of inline login:
   * 1. Add NgbModal import: import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
   * 2. Add NgbModule to imports array
   * 3. Add modalService to constructor: private modalService: NgbModal
   * 4. Uncomment this method
   * 5. Update authenticateUser method to call modalService.dismissAll() on success
   */
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

  private loadAvailableULs() {
    // Mock data representing UL number progression - replace with actual service call
    const allULs: ULLabel[] = [];
    
    // Generate a range of UL numbers to simulate real data
    const baseNumbers = [
      { base: 73908490, prefix: '', category: 'New', description: 'New condition UL labels' },
      { base: 73908510, prefix: '', category: 'Used', description: 'Used condition UL labels' },
      { base: 75100000, prefix: 'ATM', category: 'New', description: 'New ATM machine labels' },
      { base: 75100020, prefix: 'ATM', category: 'Used', description: 'Used ATM machine labels' }
    ];

    let currentULIndex = 5; // Simulate we're currently on the 6th UL number

    baseNumbers.forEach(({ base, prefix, category, description }) => {
      for (let i = 0; i < 20; i++) {
        const ulNumber = prefix ? `${prefix}${base + i}` : `${base + i}`;
        const status = i < currentULIndex ? 'used' : 'available';
        
        allULs.push({
          id: allULs.length + 1,
          ul_number: ulNumber,
          prefix: prefix,
          numeric_part: base + i,
          description: description,
          category: category,
          status: status,
          dateCreated: new Date(),
          dateUsed: i < currentULIndex ? new Date(Date.now() - (currentULIndex - i) * 24 * 60 * 60 * 1000) : undefined
        });
      }
    });

    this.availableULs = allULs;
    this.organizeULsByRange(allULs);
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

  private organizeULsByRange(allULs: ULLabel[]) {
    // Sort by numeric part to ensure proper order
    const sortedULs = allULs.sort((a, b) => a.numeric_part - b.numeric_part);
    
    // Group by category/prefix for better organization
    const groupedULs = sortedULs.reduce((groups, ul) => {
      const key = ul.prefix || 'default';
      if (!groups[key]) groups[key] = [];
      groups[key].push(ul);
      return groups;
    }, {} as { [key: string]: ULLabel[] });

    // For each group, find the current position and organize ranges
    Object.keys(groupedULs).forEach(key => {
      const uls = groupedULs[key];
      // Find last used index using reverse iteration
      let lastUsedIndex = -1;
      for (let i = uls.length - 1; i >= 0; i--) {
        if (uls[i].status === 'used') {
          lastUsedIndex = i;
          break;
        }
      }
      const currentIndex = lastUsedIndex + 1;

      // Last 5 used ULs
      const lastUsed = lastUsedIndex >= 0 ? uls.slice(Math.max(0, lastUsedIndex - 4), lastUsedIndex + 1) : [];
      
      // Current UL (next to be used)
      const current = uls[currentIndex] || null;
      
      // Next 10 available ULs
      const next = uls.slice(currentIndex + 1, currentIndex + 11);

      // Combine for this category
      if (key === Object.keys(groupedULs)[0]) { // Use first category as primary
        this.lastUsedULs = lastUsed;
        this.currentUL = current;
        this.nextULs = next;
      }
    });
  }

  // Load mock UL data - In real implementation, this would call an API

  async onSubmit() {
    if (!this.isFormValid()) {
      return;
    }

    // Prepare submission data for confirmation
    const category = this.usageForm.get('category')?.value;
    let usageRecords: Partial<ULUsage>[] = [];

    if (this.assignedULNumbers.length === 1) {
      // Single transaction
      const formData = this.usageForm.value;
      usageRecords = [{
        ul_number: this.assignedULNumbers[0],
        serial_number: formData.serial_number,
        quantity: formData.quantity,
        customer: formData.customer,
        description: formData.description,
        category: category,
        date_used: new Date(),
        user_signature: this.currentUser?.full_name || this.currentUser?.username
      }];
    } else {
      // Bulk transactions
      usageRecords = this.bulkTransactions.map(transaction => ({
        ul_number: transaction.ul_number,
        serial_number: transaction.serial_number,
        quantity: transaction.quantity,
        customer: transaction.customer,
        description: transaction.description,
        category: category,
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
      // TODO: Call actual API service to submit usage
      console.log('Submitting UL usage:', this.pendingSubmissionData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

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
  }

  cancelAutoLogout() {
    this.clearAutoLogoutTimer();
    // Keep the success message visible but stop the countdown
  }

  // Helper methods
  isFormValid(): boolean {
    if (!this.isAuthenticated || this.assignedULNumbers.length === 0) {
      return false;
    }

    // For single transactions, check the reactive form
    if (this.assignedULNumbers.length === 1) {
      return this.usageForm.valid;
    }

    // For bulk transactions, check each bulk transaction
    return this.bulkTransactions.every(transaction => 
      transaction.serial_number.trim() !== '' && 
      transaction.customer.trim() !== '' &&
      transaction.description.trim() !== '' &&
      transaction.quantity > 0
    );
  }

  getAvailableULOptions(): ULLabel[] {
    return this.filteredULs.filter(ul => ul.status === 'available');
  }

  // New method to handle quantity change
  onQuantityChange(event: any) {
    const quantity = parseInt(event.target.value);
    if (quantity && this.usageForm.get('category')?.value) {
      this.assignNextAvailableULs(quantity);
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
        customer: '',
        description: '',
        notes: ''
      }));
    } else {
      this.bulkTransactions = [];
    }
  }

  // Bulk helper methods
  applyBulkCustomer() {
    if (this.bulkCustomer && this.bulkTransactions.length > 0) {
      this.bulkTransactions.forEach(transaction => {
        transaction.customer = this.bulkCustomer;
      });
    }
  }

  applyBulkDescription() {
    if (this.bulkDescription && this.bulkTransactions.length > 0) {
      this.bulkTransactions.forEach(transaction => {
        transaction.description = this.bulkDescription;
      });
    }
  }

  applyAllBulkFields() {
    if (this.bulkTransactions.length > 0) {
      let applied = false;
      this.bulkTransactions.forEach(transaction => {
        if (this.bulkCustomer) {
          transaction.customer = this.bulkCustomer;
          applied = true;
        }
        if (this.bulkDescription) {
          transaction.description = this.bulkDescription;
          applied = true;
        }
      });
      
      if (applied) {
        // Optional: Show success feedback
        console.log('Bulk fields applied to all forms');
      }
    }
  }

  clearBulkFields() {
    this.bulkCustomer = '';
    this.bulkDescription = '';
    this.bulkTransactions.forEach(transaction => {
      transaction.customer = '';
      transaction.description = '';
      transaction.serial_number = '';
      transaction.quantity = 1;
      transaction.notes = '';
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
          this.isAuthenticated = true;
          this.currentUser = result.user || { 
            username: this.loginMethod === 'username' ? formData.username : result.user?.username,
            card_number: this.loginMethod === 'cardNumber' ? formData.cardNumber : result.user?.card_number
          };
          this.startSessionTimer();
          this.updateLastActivity(); // Start inactivity tracking
          this.prefillUserData();
          // Close modal on successful authentication
          this.modalService.dismissAll();
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

  // Focus the card number input if card number login method is selected
  private focusCardNumberIfSelected(): void {
    // Use setTimeout to ensure the view has been updated
    setTimeout(() => {
      if (this.loginMethod === 'cardNumber' && this.cardNumberInput) {
        this.cardNumberInput.nativeElement.focus();
      }
    }, 100);
  }

  // Handle login method change to focus appropriate input
  onLoginMethodChange(): void {
    if (this.loginMethod === 'cardNumber') {
      this.focusCardNumberIfSelected();
    }
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
}
