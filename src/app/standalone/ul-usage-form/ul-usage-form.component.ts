import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';
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
  date_used: Date;
  user_signature: string;
  customer: string;
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
  selectedUL: ULLabel | null = null;
  usageForm: FormGroup;
  
  // UI State
  isSubmitting = false;
  showSuccessMessage = false;
  
  // Login modal state
  loginError: string = '';
  isLoggingIn = false;
  
  // Session timeout (30 minutes)
  readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
  
  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private authService: AuthenticationService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.checkAuthenticationStatus();
    this.loadAvailableULs();
  }

  ngOnDestroy() {
    this.clearSessionTimer();
  }

  private initializeForm() {
    this.usageForm = this.fb.group({
      ul_number: ['', Validators.required],
      serial_number: ['', [Validators.required, Validators.minLength(3)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      customer: ['', Validators.required],
      notes: ['']
    });

    // Subscribe to UL number changes
    this.usageForm.get('ul_number')?.valueChanges.subscribe(value => {
      if (value) {
        this.onULNumberChange(value);
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

  private startSessionTimer() {
    this.sessionTimeRemaining = this.SESSION_TIMEOUT / 1000; // Convert to seconds
    
    this.sessionTimer = timer(0, 1000).subscribe(() => {
      this.sessionTimeRemaining--;
      
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
  }

  private prefillUserData() {
    if (this.currentUser) {
      this.usageForm.patchValue({
        // You can add user-specific defaults here if needed
      });
    }
  }

  private loadAvailableULs() {
    // Mock data for now - replace with actual service call
    this.availableULs = [
      {
        id: 1,
        ul_number: '73908498',
        prefix: '',
        numeric_part: 73908498,
        description: 'Gaming machine UL labels',
        category: 'Gaming',
        status: 'available',
        dateCreated: new Date()
      },
      {
        id: 2,
        ul_number: '73908499',
        prefix: '',
        numeric_part: 73908499,
        description: 'Gaming machine UL labels',
        category: 'Gaming',
        status: 'available',
        dateCreated: new Date()
      },
      {
        id: 3,
        ul_number: 'ATM75100001',
        prefix: 'ATM',
        numeric_part: 75100001,
        description: 'ATM machine labels',
        category: 'ATM',
        status: 'available',
        dateCreated: new Date()
      }
    ];
  }

  onULNumberChange(ulNumber: string) {
    this.selectedUL = this.availableULs.find(ul => ul.ul_number === ulNumber) || null;
  }

  async onSubmit() {
    if (!this.usageForm.valid || !this.selectedUL || !this.isAuthenticated) {
      return;
    }

    this.isSubmitting = true;

    try {
      const formData = this.usageForm.value;
      
      // Create usage record
      const usageData: Partial<ULUsage> = {
        ul_number: formData.ul_number,
        serial_number: formData.serial_number,
        quantity: formData.quantity,
        customer: formData.customer,
        date_used: new Date(),
        user_signature: this.currentUser?.full_name || this.currentUser?.username
      };

      // TODO: Call actual API service to submit usage
      console.log('Submitting UL usage:', usageData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Show success message
      this.showSuccessMessage = true;
      
      // Reset form and clear selection
      this.usageForm.reset();
      this.selectedUL = null;
      this.initializeForm();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        this.showSuccessMessage = false;
      }, 5000);

    } catch (error) {
      console.error('Error submitting UL usage:', error);
      // TODO: Show error message
    } finally {
      this.isSubmitting = false;
    }
  }

  logout() {
    this.clearSessionTimer();
    this.authService.logout();
    this.isAuthenticated = false;
    this.currentUser = null;
    this.usageForm.reset();
    this.selectedUL = null;
    this.showSuccessMessage = false;
    this.initializeForm();
  }

  extendSession() {
    this.clearSessionTimer();
    this.startSessionTimer();
  }

  getTimeRemainingFormatted(): string {
    const minutes = Math.floor(this.sessionTimeRemaining / 60);
    const seconds = this.sessionTimeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Helper methods
  isFormValid(): boolean {
    return this.usageForm.valid && this.selectedUL !== null && this.isAuthenticated;
  }

  getAvailableULOptions(): ULLabel[] {
    return this.availableULs.filter(ul => ul.status === 'available');
  }

  // Authentication method for the login modal
  authenticateUser(loginForm: any): void {
    const formData = loginForm.value;
    
    if (!formData.username || !formData.password) {
      this.loginError = 'Username and password are required';
      return;
    }
    
    // Clear previous errors and set loading state
    this.loginError = '';
    this.isLoggingIn = true;
    
    // Subscribe to authentication service
    this.authService.login(formData.username, formData.password).subscribe({
      next: (result: any) => {
        this.isLoggingIn = false;
        
        if (result && result.access_token && result.access_token !== false) {
          this.isAuthenticated = true;
          this.currentUser = result.user || { username: formData.username };
          this.startSessionTimer();
          this.prefillUserData();
          
          // Close modal
          this.modalService.dismissAll();
        } else {
          // Handle failed authentication
          this.loginError = result.message || 'Authentication failed. Please check your credentials.';
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
          this.loginError = 'Authentication failed. Please try again.';
        }
        
        console.error('Authentication failed:', error);
      }
    });
  }
}
