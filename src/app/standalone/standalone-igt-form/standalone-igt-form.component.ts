import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import moment from 'moment';
import { IgtFormComponent } from '../../pages/quality/igt/igt-form/igt-form.component';
import { SerialNumberService } from '../../pages/quality/igt/services/serial-number.service';
import { IgtAssetService } from '../../pages/quality/igt/services/igt-asset.service';
import { QadWoSearchComponent } from '@app/shared/components/qad-wo-search/qad-wo-search.component';
import { AuthenticationService } from '@app/core/services/auth.service';
import { PublicFormWrapperComponent } from '../public-form-wrapper/public-form-wrapper.component';

@Component({
  selector: 'app-standalone-igt-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    IgtFormComponent,
    QadWoSearchComponent,
    PublicFormWrapperComponent
  ],
  templateUrl: './standalone-igt-form.component.html'
})
export class StandaloneIgtFormComponent implements OnInit, OnDestroy {
  @ViewChild(IgtFormComponent) igtFormComponent!: IgtFormComponent;

  // Authentication state
  isAuthenticated = false;
  currentUser: any = null;
  hasValidUserImage = false;

  // Form state
  form: FormGroup;
  isLoading = false;
  submitted = false;
  showSuccessMessage = false;
  createdAssetId: number | string | null = null;
  assignedSerialNumber: string | null = null;
  createdAssetData: any = null;

  // Serial number statistics
  availableSerialCount = 0;
  totalSerialCount = 0;
  isLoadingSerialStats = true;

  // Work order functionality
  selectedWorkOrderData: any = null;

  constructor(
    private router: Router,
    private toastrService: ToastrService,
    private igtAssetService: IgtAssetService,
    private serialNumberService: SerialNumberService,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    // Authentication handled by wrapper component - no need to check here
    console.log('IGT Form component initialized - showSuccessMessage:', this.showSuccessMessage);
  }

  ngOnDestroy(): void {
    // Cleanup handled by wrapper component
  }

  // Wrapper component event handlers
  onAuthenticationComplete(user: any): void {
    this.isAuthenticated = true;
    this.currentUser = user;
    this.hasValidUserImage = !!(user?.image);
    
    console.log('Authentication successful for:', user);
    
    // Load statistics after successful authentication
    this.loadSerialNumberStatistics();
  }

  onUserLoggedOut(): void {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.hasValidUserImage = false;
    console.log('User logged out, resetting form state');
  }

  goToFormsMenu(): void {
    this.router.navigate(['/forms']);
  }

  setFormEmitter($event: FormGroup): void {
    this.form = $event;
    
    // Set default values for standalone form
    if (this.form && this.currentUser) {
      this.form.patchValue(
        {
          inspector_name: this.currentUser.full_name,
          time_stamp: moment().format('YYYY-MM-DD HH:mm:ss'),
          created_by: this.currentUser.id,
          last_update: moment().format('YYYY-MM-DD HH:mm:ss'),
        },
        { emitEvent: false }
      );
    }
  }

  async loadSerialNumberStatistics(): Promise<void> {
    try {
      this.isLoadingSerialStats = true;
      
      // Try to get statistics from stats endpoint first
      try {
        const stats = await this.serialNumberService.getUsageStatistics();
        if (stats && (stats.available !== undefined || stats.total !== undefined)) {
          this.availableSerialCount = stats.available || 0;
          this.totalSerialCount = stats.total || 0;
          return;
        }
      } catch (statsError) {
        console.warn('Stats endpoint failed, falling back to direct count:', statsError);
      }

      // Fallback: Get available serial numbers and count them
      const availableSerials = await this.serialNumberService.getAvailable('gaming', 5000);
      this.availableSerialCount = Array.isArray(availableSerials) ? availableSerials.length : 0;
      
      // Get all serial numbers to count total
      try {
        const allSerials = await this.serialNumberService.getAll({ includeInactive: true });
        this.totalSerialCount = Array.isArray(allSerials) ? allSerials.length : 0;
      } catch (totalError) {
        console.warn('Could not get total count:', totalError);
        this.totalSerialCount = this.availableSerialCount; // At least we know available count
      }

    } catch (error) {
      console.error('Error loading serial number statistics:', error);
      this.availableSerialCount = 0;
      this.totalSerialCount = 0;
    } finally {
      this.isLoadingSerialStats = false;
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    if (!this.form || this.form.invalid) {
      this.toastrService.warning('Please fill out all required fields correctly.', 'Form Validation');
      return;
    }

    // Check for available serial numbers
    if (this.availableSerialCount === 0) {
      this.toastrService.warning(
        'Cannot create IGT asset: No available serial numbers found. Please contact IT support.',
        'Serial Numbers Required',
        { timeOut: 8000 }
      );
      return;
    }

    try {
      this.isLoading = true;
      
      // Prepare form data with work order information
      const formData = { ...this.form.value };
      
      // Add work order data if selected
      if (this.selectedWorkOrderData) {
        formData.wo_number = this.selectedWorkOrderData.wo_nbr;
        formData.wo_part = this.selectedWorkOrderData.wo_part || '';
        formData.wo_description = this.selectedWorkOrderData.description || '';
      }
      
      const result = await this.igtAssetService.create(formData);
      console.log('IGT Asset creation result:', result);
      
      // Notify the form component that the asset was successfully created
      if (this.igtFormComponent) {
        this.igtFormComponent.onAssetCreated();
      }

      // Handle response - backend returns nested structure: { id: {...}, message: "..." }
      if (typeof result === 'object' && result !== null) {
        // Extract the nested asset data from result.id
        const assetData = result.id || result;
        
        // Set the asset ID from the nested structure
        this.createdAssetId = assetData.id || 'Generated';
        this.assignedSerialNumber = assetData.serial_number || result.serial_number || null;
        
        // Create a flattened object for display that combines nested and top-level data
        this.createdAssetData = {
          ...result, // Top-level data (message, etc.)
          ...assetData, // Nested asset data (id, serial_number, generated_IGT_asset)
          // Ensure we have the correct ID
          id: assetData.id || result.assetId || null
        };
        
        console.log('Processed asset data:', {
          originalResult: result,
          extractedAssetData: assetData,
          finalCreatedAssetData: this.createdAssetData,
          id: this.createdAssetId,
          serial: this.assignedSerialNumber
        });
      } else {
        // Fallback for unexpected response format
        this.createdAssetId = result;
        this.assignedSerialNumber = null;
        this.createdAssetData = null;
      }
      
      console.log('Setting showSuccessMessage to true after successful asset creation');
      this.showSuccessMessage = true;
      this.toastrService.success('IGT Serial Asset Created Successfully!', 'Success');
      
      // Reload statistics
      await this.loadSerialNumberStatistics();
      
    } catch (err) {
      console.error('Error creating IGT asset:', err);
      this.handleSubmissionError(err);
    } finally {
      this.isLoading = false;
    }
  }

  private handleSubmissionError(err: any): void {
    let errorMessage = 'Failed to create IGT asset.';
    
    if (err && typeof err === 'object') {
      if (err.error && typeof err.error === 'string') {
        errorMessage = err.error;
      } else if (err.error && err.error.error) {
        errorMessage = err.error.error;
      } else if (err.error && err.error.message) {
        errorMessage = err.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
    }

    // Show specific error messages for common scenarios
    if (errorMessage.toLowerCase().includes('no available serial numbers')) {
      this.toastrService.error(
        'Cannot create IGT asset: No available serial numbers found. Please contact IT support to upload more serial numbers.',
        'Serial Numbers Required',
        { timeOut: 8000 }
      );
    } else if (errorMessage.toLowerCase().includes('serial number')) {
      this.toastrService.error(
        `Serial Number Error: ${errorMessage}`,
        'Asset Creation Failed',
        { timeOut: 6000 }
      );
    } else {
      this.toastrService.error(errorMessage, 'Creation Failed', { timeOut: 5000 });
    }
  }

  resetForm(): void {
    console.log('Resetting form - setting showSuccessMessage to false');
    this.showSuccessMessage = false;
    this.createdAssetId = null;
    this.assignedSerialNumber = null;
    this.createdAssetData = null;
    this.submitted = false;
    
    if (this.form) {
      this.form.reset();
      // Reset default values
      this.setFormEmitter(this.form);
    }

    // Reload statistics
    this.loadSerialNumberStatistics();
  }

  createAnother(): void {
    this.resetForm();
    this.showSuccessMessage = false;
    this.selectedWorkOrderData = null;
  }

  getCurrentTimestamp(): string {
    return new Date().toLocaleString();
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    
    try {
      // Handle MySQL datetime format "2025-09-30 09:49:09"
      const date = new Date(timestamp.replace(' ', 'T'));
      return date.toLocaleString();
    } catch (error) {
      return timestamp; // Return original if parsing fails
    }
  }

  getDisplayAssetId(): string {
    if (!this.createdAssetId) return '';
    
    // If it's an object, try to extract the ID
    if (typeof this.createdAssetId === 'object' && this.createdAssetId !== null) {
      return (this.createdAssetId as any).id || JSON.stringify(this.createdAssetId);
    }
    
    // Otherwise return as string
    return this.createdAssetId.toString();
  }

  // Debug method to see what we're actually getting from the backend
  getDebugInfo(): string {
    if (!this.createdAssetData) return 'No data';
    
    return JSON.stringify(this.createdAssetData, null, 2);
  }

  logout(): void {
    // Clear authentication and navigate to forms menu
    this.isAuthenticated = false;
    this.currentUser = null;
    this.hasValidUserImage = false;
    this.router.navigate(['/forms']);
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  // Work order functionality
  onWorkOrderSelected(workOrder: any): void {
    if (workOrder) {
      // Store complete work order data
      this.selectedWorkOrderData = workOrder;
      
      // Update form with work order info if form exists
      if (this.form) {
        this.form.patchValue({
          wo_number: workOrder.wo_nbr
        });
      }
      
      console.log('Work order selected:', workOrder);
    } else {
      // Clear work order data
      this.selectedWorkOrderData = null;
      
      if (this.form) {
        this.form.patchValue({
          wo_number: ''
        });
      }
    }
  }
}
