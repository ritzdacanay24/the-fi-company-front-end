import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { SerialNumberService } from '../services/serial-number.service';
import { ToastrService } from "ngx-toastr";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { AuthenticationService } from '@app/core/services/auth.service';
import { IgtHelpService } from '@app/shared/components/igt-help/igt-help.service';

// AG-Grid imports
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, CellClickedEvent, SelectionChangedEvent } from 'ag-grid-community';
import { ActionsCellRendererComponent } from './actions-cell-renderer.component';

interface ValidationResult {
  totalRecords?: number;
  validRecords?: number;
  invalidRecords?: number;
  duplicatesFound: number;
  duplicatesList: string[];
  activeDuplicates?: string[];
  softDeletedDuplicates?: string[];
  totalLines?: number;
  validSerials?: number;
  invalidSerials?: number;
  internalDuplicates?: number;
  internalDuplicatesList?: string[];
}

interface RangeValidationResult {
  total: number;
  duplicates: number;
  duplicatesList: string[];
  activeDuplicates?: string[];
  softDeletedDuplicates?: string[];
  newSerials: string[];  // Add this to track new serials
}

interface UploadResults {
  successful: number;
  duplicates: number;
  errors: number;
  total: number;
  errorDetails?: string[];
  duplicateSerials?: string[];
  errorSerials?: string[];
}

interface SerialNumber {
  id: string;
  serial_number: string;  // Changed from serialNumber to match backend
  category: string;
  status: 'available' | 'reserved' | 'used';
  manufacturer?: string;
  model?: string;
  notes?: string;
  created_at: string;  // Changed from createdAt to match backend
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  used_at?: string;
  used_by?: string;
  used_in_asset_id?: string;
  used_in_asset_number?: string;
  is_active: string;
  usedInTag?: string;  // Keep this for backward compatibility
}

@Component({
  standalone: true,
  imports: [SharedModule, AgGridAngular, ActionsCellRendererComponent],
  selector: 'app-serial-number-manager',
  templateUrl: './serial-number-manager.component.html',
  styleUrls: ['./serial-number-manager.component.scss']
})
export class SerialNumberManagerComponent implements OnInit, OnDestroy {
  @ViewChild('editSerialModal') editSerialModalRef!: TemplateRef<any>;

  private destroy$ = new Subject<void>();
  private manualValidationTimeout: any;
  private rangeValidationTimeout: any;
  private searchTimeout: any;
  private isValidatingFromCategoryChange = false;

  // Form groups
  uploadForm: FormGroup;
  manualForm: FormGroup;
  rangeForm: FormGroup;

  // State properties
  activeTab = 1;
  selectedFile: File | null = null;
  selectedUploadMethod = 'range';  // Default to range generator
  serialNumbers: SerialNumber[] = [];
  selectedSerials: string[] = [];
  statusFilter = '';
  categoryFilter = '';
  isActiveFilter = '';  // Add filter for is_active status
  searchTerm = '';
  serialToEdit: any = {};
  originalSerialToEdit: SerialNumber | null = null;
  editSerialValidation: { isDuplicate: boolean; message?: string } | null = null;

  // Error tracking properties
  duplicateSerials: string[] = [];
  errorSerials: string[] = [];

  // Loading states
  isUploading = false;
  isAdding = false;
  isGenerating = false;
  csvValidationInProgress = false;
  manualValidationInProgress = false;
  rangeValidationInProgress = false;

  // Validation results
  fileValidation: ValidationResult | null = null;
  manualValidation: ValidationResult | null = null;
  rangeValidation: RangeValidationResult | null = null;
  uploadResults: UploadResults | null = null;

  // AG-Grid properties
  @ViewChild('agGrid') agGrid!: AgGridAngular;
  private gridApi!: GridApi;
  rowData: SerialNumber[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100
  };
  rowSelection: 'single' | 'multiple' = 'multiple';
  paginationPageSize = 50;
  paginationPageSizeSelector = [25, 50, 100, 200];
  gridTheme = 'ag-theme-alpine';

  // UI state
  showDuplicateDetails = false;
  showRangeDuplicateDetails = false;
  showErrorDetails = false;
  showAllPreview = false; // Add toggle for showing all preview items
  showAllManualPreview = false; // Toggle for manual entry preview

  // Access control
  canCreateSerialNumbers = true;

  // Statistics
  statistics = {
    total: 0,
    available: 0,
    reserved: 0,
    used: 0
  };

  defaultValues = {
    prefix: 'Z',
    startNumber: null,
    endNumber: null,
    padding: 4,
    category: 'gaming',
    duplicateStrategy: 'skip'
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private serialNumberService: SerialNumberService,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private authenticationService: AuthenticationService,
    private helpService: IgtHelpService
  ) {

    console.log(this.authenticationService.currentUserValue.employeeType)

    // Check access permissions
    this.canCreateSerialNumbers = this.authenticationService.currentUserValue.employeeType !== 0;

    if (!this.canCreateSerialNumbers) {
      console.log('User access restricted: employeeType is 0, cannot create serial numbers');
    }

    // Initialize arrays to prevent filter errors
    this.serialNumbers = [];
    this.selectedSerials = [];
    this.duplicateSerials = [];
    this.errorSerials = [];

    this.uploadForm = this.fb.group({
      file: ['', Validators.required],
      category: [this.defaultValues.category, Validators.required],
      duplicateStrategy: [this.defaultValues.duplicateStrategy, Validators.required],
      created_by: [this.authenticationService.currentUserValue.id, Validators.required]
    });

    this.manualForm = this.fb.group({
      serialNumbers: ['', [Validators.required, Validators.minLength(1), this.serialFormatValidator.bind(this)]],
      category: [this.defaultValues.category, Validators.required],
      duplicateStrategy: [this.defaultValues.duplicateStrategy, Validators.required],
      created_by: [this.authenticationService.currentUserValue.id, Validators.required]
    });

    this.rangeForm = this.fb.group({
      prefix: [this.defaultValues.prefix],
      startNumber: [this.defaultValues.startNumber, [Validators.required, Validators.min(0)]],
      endNumber: [this.defaultValues.endNumber, [Validators.required, Validators.min(1)]],
      padding: [this.defaultValues.padding, Validators.required],
      category: [this.defaultValues.category, Validators.required],
      duplicateStrategy: [this.defaultValues.duplicateStrategy, Validators.required],
      created_by: [this.authenticationService.currentUserValue.id, Validators.required]
    });
  }

  // Validation methods
  private rangeValidator(group: FormGroup) {
    const start = group.get('startNumber')?.value;
    const end = group.get('endNumber')?.value;

    if (start && end && start > end) {
      return { invalidRange: true };
    }
    return null;
  }

  // Custom validator for serial number format in manual entry
  private serialFormatValidator(control: any): ValidationErrors | null {
    const value = control.value;
    if (!value || !value.trim()) {
      return null; // Let required validator handle empty values
    }

    const lines = value.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
    if (lines.length === 0) {
      return null;
    }

    const invalidSerials: string[] = [];
    for (const line of lines) {
      if (!this.isValidSerialFormat(line)) {
        invalidSerials.push(line);
      }
    }

    if (invalidSerials.length > 0) {
      return { 
        invalidFormat: { 
          invalidSerials: invalidSerials,
          count: invalidSerials.length 
        } 
      };
    }

    return null;
  }

  // Data loading methods
  async loadSerialNumbers(): Promise<void> {
    try {
      // If there's an is_active filter, we need to load all records (including soft-deleted)
      // Otherwise, load only active records for normal operation
      const includeInactive = this.isActiveFilter !== '';
      const data = await this.serialNumberService.getAll(includeInactive ? { includeInactive: true } : undefined);
      
      // Ensure we always have an array
      let allSerials: SerialNumber[] = [];
      if (Array.isArray(data)) {
        allSerials = data;
      } else if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
        // Handle cases where the response is wrapped in a data property
        allSerials = (data as any).data;
      } else {
        console.warn('Unexpected data format from getAll():', data);
        allSerials = [];
      }

      // Filter based on whether we want to include soft-deleted records
      if (includeInactive) {
        // When filtering by is_active, show all records (user will filter via dropdown)
        this.serialNumbers = allSerials;
        console.log('Total records loaded (including soft-deleted):', allSerials.length);
      } else {
        // Normal operation: only show active records
        this.serialNumbers = allSerials.filter(serial => 
          serial.is_active === '1'
        );
        console.log('Total records from API:', allSerials.length);
        console.log('Active records loaded:', this.serialNumbers.length);
        console.log('Soft-deleted records filtered out:', allSerials.length - this.serialNumbers.length);
      }
      
      // Debug: Log all serials with their statuses
      console.log('🔍 All serials loaded:', this.serialNumbers.map(s => ({
        id: s.id,
        serial_number: s.serial_number,
        status: s.status,
        is_active: s.is_active,
        category: s.category
      })));

      // Update statistics after loading data
      this.loadStatistics();

      // Update AG-Grid data
      this.updateGridData();

      // Re-validate range after loading serial numbers to update duplicate status
      if (this.getPreviewRange().length > 0) {
        await this.validateRange();
      }

      // Re-validate manual input if there's content
      if (this.manualForm.get('serialNumbers')?.value?.trim()) {
        await this.validateManualSerials();
      }

    } catch (error) {
      console.error('Error loading serial numbers:', error);
      this.toastr.error('Failed to load serial numbers from database.');
      this.serialNumbers = []; // Reset to empty array on error
      this.loadStatistics(); // Update statistics even on error (will show zeros)
    }
  }

  loadStatistics(): void {
    // Ensure serialNumbers is always an array
    const serials = Array.isArray(this.serialNumbers) ? this.serialNumbers : [];
    
    // Debug logging to help troubleshoot statistics
    console.log('📊 Calculating statistics from serial numbers:', serials.length);
    console.log('Serial statuses breakdown:', {
      available: serials.filter(s => s.status === 'available').map(s => ({ id: s.id, serial: s.serial_number, status: s.status, is_active: s.is_active })),
      reserved: serials.filter(s => s.status === 'reserved').map(s => ({ id: s.id, serial: s.serial_number, status: s.status, is_active: s.is_active })),
      used: serials.filter(s => s.status === 'used').map(s => ({ id: s.id, serial: s.serial_number, status: s.status, is_active: s.is_active }))
    });
    
    // Calculate statistics based on current filter state
    if (this.isActiveFilter !== '') {
      // When filtering by is_active, calculate stats from all loaded records
      this.statistics = {
        total: serials.length,
        available: serials.filter(s => s.status === 'available').length,
        reserved: serials.filter(s => s.status === 'reserved').length,
        used: serials.filter(s => s.status === 'used').length
      };
    } else {
      // Normal operation: only count active records
      const activeSerials = serials.filter(s => s.is_active === '1');
      this.statistics = {
        total: activeSerials.length,
        available: activeSerials.filter(s => s.status === 'available').length,
        reserved: activeSerials.filter(s => s.status === 'reserved').length,
        used: activeSerials.filter(s => s.status === 'used').length
      };
    }
    
    console.log('📊 Final statistics:', this.statistics);
    console.log('📊 Filter state - isActiveFilter:', this.isActiveFilter);
  }

  // Serial number operations
  async addSerialNumbers(serialNumbers: string[], category: string): Promise<UploadResults> {
    try {
      // Prepare the data for bulk upload
      const duplicateStrategy = this.manualForm.get('duplicateStrategy')?.value ||
        this.uploadForm.get('duplicateStrategy')?.value || 'skip';

      const serialData = serialNumbers.map(serialNumber => ({
        serial_number: serialNumber,  // Use database field name
        category,
        status: 'available',
        duplicateStrategy
      }));

      // Call the actual service to save serial numbers
      const response = await this.serialNumberService.bulkUpload(serialData);

      // Handle the response based on what the backend returns
      if (response && typeof response === 'object') {
        return {
          successful: response.successful || serialNumbers.length,
          duplicates: response.duplicates || 0,
          errors: response.errors || 0,
          total: serialNumbers.length,
          duplicateSerials: response.duplicateSerials || [],
          errorSerials: response.errorSerials || [],
          errorDetails: response.errorDetails || []
        };
      } else {
        // If response is simple success, assume all were successful
        return {
          successful: serialNumbers.length,
          duplicates: 0,
          errors: 0,
          total: serialNumbers.length,
          duplicateSerials: [],
          errorSerials: [],
          errorDetails: []
        };
      }
    } catch (error) {
      console.error('Error adding serial numbers:', error);
      this.toastr.error('Failed to save serial numbers to database.');

      // Return error result
      return {
        successful: 0,
        duplicates: 0,
        errors: serialNumbers.length,
        total: serialNumbers.length,
        duplicateSerials: [],
        errorSerials: serialNumbers,
        errorDetails: [error.message || 'Unknown error occurred']
      };
    }
  }

  ngOnInit(): void {
    // Read URL parameters and set initial state
    this.route.queryParams.subscribe(params => {
      // Set active tab from URL parameter
      if (params['tab']) {
        const tabId = parseInt(params['tab']);
        if (tabId === 1 || tabId === 2) {
          this.activeTab = tabId;
        }
      }
      
      // Set upload method from URL parameter
      if (params['method'] && ['range', 'manual', 'csv'].includes(params['method'])) {
        this.selectedUploadMethod = params['method'];
      }

      // Set filter states from URL parameters
      if (params['category']) {
        this.categoryFilter = params['category'];
      }
      if (params['status']) {
        this.statusFilter = params['status'];
      }
      if (params['active']) {
        this.isActiveFilter = params['active'];
      }
      if (params['search']) {
        this.searchTerm = params['search'];
      }
    });

    // Initialize AG-Grid column definitions
    this.initializeColumnDefs();
    
    // Load data first, then calculate statistics
    this.loadSerialNumbers().then(() => {
      this.loadStatistics();
    }).catch(error => {
      console.error('Error during initialization:', error);
      this.loadStatistics(); // Calculate stats even if loading fails (will show zeros)
    });

    // Set up form change listeners for range validation
    this.rangeForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500)
      )
      .subscribe(() => {
        this.validateRange();
      });

    // Set up form change listeners for manual validation
    this.manualForm.get('serialNumbers')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500)
      )
      .subscribe(() => {
        // Skip validation if it's already being triggered by category change
        if (!this.isValidatingFromCategoryChange) {
          this.validateManualSerials();
        }
      });

    // Set up category change listener for manual form to re-validate duplicates
    this.manualForm.get('category')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(() => {
        // Set flag to prevent double validation
        this.isValidatingFromCategoryChange = true;

        // Re-validate manual serials when category changes
        if (this.manualForm.get('serialNumbers')?.value?.trim()) {
          this.validateManualSerials();
        }
        // Re-validate range when category changes (since range uses manual form category)
        if (this.getPreviewRange().length > 0) {
          this.validateRange();
        }

        // Reset flag after a short delay
        setTimeout(() => {
          this.isValidatingFromCategoryChange = false;
        }, 100);
      });

    // Set up category change listener for range form to re-validate duplicates
    this.rangeForm.get('category')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(() => {
        // Re-validate range when category changes
        if (this.getPreviewRange().length > 0) {
          this.validateRange();
        }
      });

    // Set up category change listener for upload form to re-validate CSV
    this.uploadForm.get('category')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(() => {
        // Re-validate CSV file when category changes
        if (this.selectedFile && this.fileValidation) {
          this.validateFile(this.selectedFile);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.manualValidationTimeout) {
      clearTimeout(this.manualValidationTimeout);
    }
    if (this.rangeValidationTimeout) {
      clearTimeout(this.rangeValidationTimeout);
    }
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  async onManualAdd(): Promise<void> {
    if (!this.canCreateSerialNumbers) {
      this.toastr.error('You do not have permission to create serial numbers.', 'Access Denied');
      return;
    }

    if (this.manualForm.invalid) return;

    this.isAdding = true;
    try {
      const serialNumbers = this.manualForm.value.serialNumbers
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      // Final duplicate check before submission
      console.log('Performing final duplicate check before submission...');
      const duplicateResult = await this.checkSerialsAgainstDatabase(serialNumbers, this.manualForm.value.category);
      const finalDuplicates = duplicateResult.duplicates;

      if (finalDuplicates.length > 0) {
        const duplicateStrategy = this.manualForm.get('duplicateStrategy')?.value;

        let errorMessage = `Found ${finalDuplicates.length} duplicate serial numbers:\n`;
        if (duplicateResult.activeDuplicates.length > 0) {
          errorMessage += `• Active duplicates (${duplicateResult.activeDuplicates.length}): ${duplicateResult.activeDuplicates.slice(0, 3).join(', ')}${duplicateResult.activeDuplicates.length > 3 ? '...' : ''}\n`;
        }
        if (duplicateResult.softDeletedDuplicates.length > 0) {
          errorMessage += `• Soft-deleted duplicates (${duplicateResult.softDeletedDuplicates.length}): ${duplicateResult.softDeletedDuplicates.slice(0, 3).join(', ')}${duplicateResult.softDeletedDuplicates.length > 3 ? '...' : ''}\n`;
        }
        errorMessage += `\n✅ Note: Comprehensive duplicate detection includes both active and soft-deleted records.`;

        if (duplicateStrategy === 'error') {
          this.toastr.error(errorMessage + '\nPlease remove duplicates or change strategy.');
          return;
        } else if (duplicateStrategy === 'skip') {
          const proceed = confirm(errorMessage + '\n\nDo you want to proceed? Duplicates will be skipped.');
          if (!proceed) return;
        }
      }

      const results = await this.addSerialNumbers(serialNumbers, this.manualForm.value.category);
      this.uploadResults = results;
      this.duplicateSerials = results.duplicateSerials || [];
      this.errorSerials = results.errorSerials || [];
      if (results.successful > 0) {
        this.toastr.success(`${results.successful} serial number(s) created successfully.`);
      }
      if (this.duplicateSerials.length || this.errorSerials.length) {
        let msg = '';
        if (this.duplicateSerials.length) {
          msg += `Duplicate serial numbers: ${this.duplicateSerials.join(', ')}.\n`;
        }
        if (this.errorSerials.length) {
          msg += `Other errors for: ${this.errorSerials.join(', ')}.`;
        }
        alert(msg.trim());
      }
      this.manualForm.reset({
        serialNumbers: '',
        category: this.defaultValues.category,
        duplicateStrategy: this.defaultValues.duplicateStrategy,
        created_by: this.authenticationService.currentUserValue.id
      });
      await this.loadSerialNumbers();
    } catch (error) {
      console.error('Manual add failed:', error);
    } finally {
      this.isAdding = false;
    }
  }

  async onFileSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        this.toastr.error('Please select a valid CSV file.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.toastr.error('File size must be less than 10MB.');
        return;
      }

      this.selectedFile = file;
      this.uploadForm.patchValue({ file: file.name });

      // Validate file content
      await this.validateFile(file);
    }
  }

  private async validateFile(file: File): Promise<void> {
    this.csvValidationInProgress = true;
    this.fileValidation = null;

    try {
      const content = await this.readFileContent(file);
      const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      if (lines.length === 0) {
        this.fileValidation = {
          duplicatesFound: 0,
          duplicatesList: [],
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0
        };
        return;
      }

      // Parse CSV and validate
      const serials = this.parseCsvContent(content);
      const validSerials = serials.filter(serial => this.isValidSerialFormat(serial));

      // Check against database
      const duplicateResult = await this.checkSerialsAgainstDatabase(validSerials, this.uploadForm.get('category')?.value);

      this.fileValidation = {
        totalRecords: serials.length,
        validRecords: validSerials.length,
        invalidRecords: serials.length - validSerials.length,
        duplicatesFound: duplicateResult.duplicates.length,
        duplicatesList: duplicateResult.duplicates,
        activeDuplicates: duplicateResult.activeDuplicates,
        softDeletedDuplicates: duplicateResult.softDeletedDuplicates
      };
    } catch (error) {
      console.error('Error validating CSV file:', error);
    } finally {
      this.csvValidationInProgress = false;
    }
  }

  // Manual entry validation methods
  onManualInputChange(): void {
    // Form change listener is now handled in ngOnInit via reactive form subscription
    // This method is kept for backward compatibility but may not be needed
  }

  onManualPaste(event: ClipboardEvent): void {
    setTimeout(() => {
      this.validateManualSerials();
    }, 100);
  }

  async validateManualSerials(): Promise<void> {
    const serialNumbers = this.manualForm.get('serialNumbers')?.value || '';
    if (!serialNumbers.trim()) {
      this.manualValidation = null;
      return;
    }

    this.manualValidationInProgress = true;

    try {
      const lines = serialNumbers.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const validSerials = lines.filter(line => this.isValidSerialFormat(line));

      // Find internal duplicates
      const serialCounts = new Map();
      const internalDuplicates = new Set();

      validSerials.forEach(serial => {
        const count = (serialCounts.get(serial) || 0) + 1;
        serialCounts.set(serial, count);
        if (count > 1) {
          internalDuplicates.add(serial);
        }
      });

      // Check against database
      const duplicateResult = await this.checkSerialsAgainstDatabase(validSerials, this.manualForm.get('category')?.value);

      this.manualValidation = {
        totalLines: lines.length,
        validSerials: validSerials.length,
        invalidSerials: lines.length - validSerials.length,
        duplicatesFound: duplicateResult.duplicates.length,
        internalDuplicates: internalDuplicates.size,
        duplicatesList: duplicateResult.duplicates,
        activeDuplicates: duplicateResult.activeDuplicates,
        softDeletedDuplicates: duplicateResult.softDeletedDuplicates,
        internalDuplicatesList: Array.from(internalDuplicates) as string[]
      };
    } catch (error) {
      console.error('Error validating manual serials:', error);
    } finally {
      this.manualValidationInProgress = false;
    }
  }

  removeDuplicatesFromInput(): void {
    if (!this.manualValidation) return;

    const serialNumbers = this.manualForm.get('serialNumbers')?.value || '';
    const lines = serialNumbers.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Remove duplicates and existing serials
    const allDuplicates = new Set([
      ...(this.manualValidation.duplicatesList || []),
      ...(this.manualValidation.internalDuplicatesList || [])
    ]);

    const uniqueLines = lines.filter((line, index, arr) => {
      return !allDuplicates.has(line) && arr.indexOf(line) === index;
    });

    this.manualForm.patchValue({
      serialNumbers: uniqueLines.join('\n')
    });

    // Re-validate
    setTimeout(() => this.validateManualSerials(), 100);
  }

  // Range generation methods
  onRangeFormChange(): void {
    // Form change listener is now handled in ngOnInit via reactive form subscription
    // This method is kept for backward compatibility but may not be needed
  }

  async validateRange(): Promise<void> {
    const range = this.getPreviewRange();
    if (range.length === 0) {
      this.rangeValidation = null;
      return;
    }

    this.rangeValidationInProgress = true;

    try {
      const duplicateResult = await this.checkSerialsAgainstDatabase(range, this.rangeForm.get('category')?.value || 'gaming');
      const newSerials = range.filter(serial => !duplicateResult.duplicates.includes(serial));

      this.rangeValidation = {
        total: range.length,
        duplicates: duplicateResult.duplicates.length,
        duplicatesList: duplicateResult.duplicates,
        activeDuplicates: duplicateResult.activeDuplicates,
        softDeletedDuplicates: duplicateResult.softDeletedDuplicates,
        newSerials: newSerials
      };
    } catch (error) {
      console.error('Error validating range:', error);
    } finally {
      this.rangeValidationInProgress = false;
    }
  }

  getPreviewRange(): string[] {
    const prefix = this.rangeForm.get('prefix')?.value || '';
    const start = this.rangeForm.get('startNumber')?.value;
    const end = this.rangeForm.get('endNumber')?.value;
    const padding = parseInt(this.rangeForm.get('padding')?.value || '0');

    if (!start || !end || start > end || end - start > 10000) {
      return [];
    }

    const range: string[] = [];
    for (let i = start; i <= end; i++) {
      const number = padding > 0 ? i.toString().padStart(padding, '0') : i.toString();
      range.push(prefix + number);
    }

    return range;
  }

  getRangeValidation(): RangeValidationResult | null {
    return this.rangeValidation;
  }

  // Helper method to get the status of each serial in the preview
  getSerialStatus(serial: string): 'new' | 'duplicate' | 'invalid' | 'unknown' {
    // First check if the format is invalid
    if (!this.isValidSerialFormat(serial)) {
      return 'invalid';
    }

    // Check range validation first
    if (this.rangeValidation) {
      if (this.rangeValidation.duplicatesList.includes(serial)) {
        return 'duplicate';
      } else if (this.rangeValidation.newSerials.includes(serial)) {
        return 'new';
      }
    }
    
    // Check manual validation if range validation doesn't have results
    if (this.manualValidation) {
      if (this.manualValidation.activeDuplicates?.includes(serial) || 
          this.manualValidation.softDeletedDuplicates?.includes(serial) ||
          this.manualValidation.internalDuplicatesList?.includes(serial)) {
        return 'duplicate';
      }
      
      // Check if it's a valid serial that isn't a duplicate
      const manualSerials = this.getManualPreviewSerials();
      if (manualSerials.includes(serial)) {
        return 'new';
      }
    }
    
    return 'unknown';
  }

  // Helper method to get detailed duplicate status with color coding
  getSerialDuplicateStatus(serial: string): {
    status: 'new' | 'active-duplicate' | 'soft-deleted-duplicate' | 'both-duplicate' | 'invalid-format' | 'unknown';
    color: string;
    icon: string;
  } {
    // First check if the format is invalid
    if (!this.isValidSerialFormat(serial)) {
      return { status: 'invalid-format', color: 'bg-danger text-white fw-bold', icon: 'mdi-close-octagon' };
    }

    // Check range validation
    if (this.rangeValidation) {
      const isActiveDuplicate = this.rangeValidation.activeDuplicates?.includes(serial) || false;
      const isSoftDeletedDuplicate = this.rangeValidation.softDeletedDuplicates?.includes(serial) || false;

      if (isActiveDuplicate && isSoftDeletedDuplicate) {
        return { status: 'both-duplicate', color: 'bg-danger text-white fw-bold', icon: 'mdi-alert-circle' };
      } else if (isActiveDuplicate) {
        return { status: 'active-duplicate', color: 'bg-danger-subtle text-danger', icon: 'mdi-close-circle' };
      } else if (isSoftDeletedDuplicate) {
        return { status: 'soft-deleted-duplicate', color: 'bg-warning-subtle text-warning', icon: 'mdi-alert-circle-outline' };
      } else if (this.rangeValidation.newSerials.includes(serial)) {
        return { status: 'new', color: 'bg-success-subtle text-success', icon: 'mdi-check-circle' };
      }
    }

    // Check manual validation if range validation doesn't have results
    if (this.manualValidation) {
      const isActiveDuplicate = this.manualValidation.activeDuplicates?.includes(serial) || false;
      const isSoftDeletedDuplicate = this.manualValidation.softDeletedDuplicates?.includes(serial) || false;
      const isInternalDuplicate = this.manualValidation.internalDuplicatesList?.includes(serial) || false;

      if (isActiveDuplicate && isSoftDeletedDuplicate) {
        return { status: 'both-duplicate', color: 'bg-danger text-white fw-bold', icon: 'mdi-alert-circle' };
      } else if (isActiveDuplicate || isInternalDuplicate) {
        return { status: 'active-duplicate', color: 'bg-danger-subtle text-danger', icon: 'mdi-close-circle' };
      } else if (isSoftDeletedDuplicate) {
        return { status: 'soft-deleted-duplicate', color: 'bg-warning-subtle text-warning', icon: 'mdi-alert-circle-outline' };
      } else {
        // If it's a valid serial in the manual list and not a duplicate, it's new
        const manualSerials = this.getManualPreviewSerials();
        if (manualSerials.includes(serial)) {
          return { status: 'new', color: 'bg-success-subtle text-success', icon: 'mdi-check-circle' };
        }
      }
    }
    
    return { status: 'unknown', color: 'bg-secondary-subtle text-dark', icon: 'mdi-help-circle' };
  }

  // Helper method to get status description for tooltips
  getSerialStatusDescription(serial: string): string {
    const status = this.getSerialDuplicateStatus(serial);
    
    switch (status.status) {
      case 'new':
        return 'New serial number - ready to create';
      case 'active-duplicate':
        return 'Duplicate with active record in database';
      case 'soft-deleted-duplicate':
        return 'Duplicate with soft-deleted record in database';
      case 'both-duplicate':
        return 'Duplicate with both active and soft-deleted records';
      case 'invalid-format':
        return 'Invalid format - must be 3-50 characters, alphanumeric with dashes/underscores only';
      default:
        return 'Status unknown';
    }
  }

  // Get preview range with status information
  getPreviewRangeWithStatus(): Array<{ serial: string, status: 'new' | 'duplicate' | 'invalid' | 'unknown' }> {
    const range = this.getPreviewRange();
    return range.map(serial => ({
      serial,
      status: this.getSerialStatus(serial)
    }));
  }

  // Get limited preview range for display
  getDisplayPreviewRangeWithStatus(): Array<{ serial: string, status: 'new' | 'duplicate' | 'invalid' | 'unknown' }> {
    const fullRange = this.getPreviewRangeWithStatus();
    return this.showAllPreview ? fullRange : fullRange.slice(0, 10);
  }

  // Toggle preview display mode
  togglePreviewDisplay(): void {
    this.showAllPreview = !this.showAllPreview;
  }

  // Get remaining count for "show more" indicator
  getRemainingPreviewCount(): number {
    const total = this.getPreviewRange().length;
    return Math.max(0, total - 10);
  }

  // Manual Entry Preview Methods
  getManualPreviewSerials(): string[] {
    const serialNumbers = this.manualForm.get('serialNumbers')?.value || '';
    if (!serialNumbers.trim()) {
      return [];
    }
    const lines = serialNumbers.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    return lines.filter(line => this.isValidSerialFormat(line));
  }

  getManualPreviewWithStatus(): Array<{ serial: string, status: 'new' | 'duplicate' | 'invalid' | 'unknown' }> {
    const serials = this.getManualPreviewSerials();
    return serials.map(serial => ({
      serial,
      status: this.getSerialStatus(serial)
    }));
  }

  getDisplayManualPreviewWithStatus(): Array<{ serial: string, status: 'new' | 'duplicate' | 'invalid' | 'unknown' }> {
    const fullRange = this.getManualPreviewWithStatus();
    return this.showAllManualPreview ? fullRange : fullRange.slice(0, 10);
  }

  toggleManualPreviewDisplay(): void {
    this.showAllManualPreview = !this.showAllManualPreview;
  }

  getRemainingManualPreviewCount(): number {
    const total = this.getManualPreviewSerials().length;
    return Math.max(0, total - 10);
  }

  getNewManualsCount(): number {
    if (!this.manualValidation) return 0;
    const totalValid = this.manualValidation.validSerials || 0;
    const duplicates = (this.manualValidation.activeDuplicates?.length || 0) + 
                      (this.manualValidation.softDeletedDuplicates?.length || 0);
    return Math.max(0, totalValid - duplicates);
  }

  getInvalidFormatCount(): number {
    const allSerials = this.getManualPreviewSerials();
    const textarea = this.manualForm.get('serialNumbers')?.value || '';
    const lines = textarea.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
    
    let invalidCount = 0;
    for (const line of lines) {
      if (!this.isValidSerialFormat(line)) {
        invalidCount++;
      }
    }
    return invalidCount;
  }

  // URL Parameter Management
  updateUrlParams(): void {
    const queryParams: any = {};
    
    // Only add parameters that differ from defaults
    if (this.activeTab !== 1) {
      queryParams.tab = this.activeTab;
    }
    
    if (this.selectedUploadMethod !== 'range') {
      queryParams.method = this.selectedUploadMethod;
    }

    // Add filter states for manage tab (only if tab is 2 and filters are active)
    if (this.activeTab === 2) {
      if (this.categoryFilter) {
        queryParams.category = this.categoryFilter;
      }
      if (this.statusFilter) {
        queryParams.status = this.statusFilter;
      }
      if (this.isActiveFilter) {
        queryParams.active = this.isActiveFilter;
      }
      if (this.searchTerm) {
        queryParams.search = this.searchTerm;
      }
    }
    
    // Update URL without triggering navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : null,
      replaceUrl: true
    });
  }

  onTabChange(newTab: number): void {
    this.activeTab = newTab;
    this.updateUrlParams();
  }

  onUploadMethodChange(): void {
    this.updateUrlParams();
  }

  // Utility methods
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private parseCsvContent(content: string): string[] {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];

    // Skip header if it contains 'serial_number'
    const startIndex = lines[0].toLowerCase().includes('serial_number') ? 1 : 0;

    return lines.slice(startIndex).map(line => {
      const parts = line.split(',');
      return parts[0].trim().replace(/"/g, '');
    }).filter(serial => serial.length > 0);
  }

  private isValidSerialFormat(serial: string): boolean {
    // Basic validation - adjust regex as needed
    return /^[A-Za-z0-9-_]+$/.test(serial) && serial.length >= 3 && serial.length <= 50;
  }

  private async checkSerialsAgainstDatabase(serials: string[], category?: string): Promise<{
    duplicates: string[];
    activeDuplicates: string[];
    softDeletedDuplicates: string[];
  }> {
    try {
      // For duplicate checking, we want to check against ALL records (active + soft-deleted)
      // We'll call the API with active=0 parameter to get all records for duplicate checking
      console.log('🔍 Checking for duplicates against ALL records (active + soft-deleted)');
      
      // Always fetch fresh data for duplicate checking with includeInactive=true to include soft-deleted records
      console.log('Fetching ALL serial numbers from database for comprehensive duplicate checking...');
      const existingSerials = await this.serialNumberService.getAll({ includeInactive: true });

      // Ensure we have an array to work with
      let serialNumberList: Array<{ serial_number: string, category: string, is_active: string }> = [];
      if (Array.isArray(existingSerials)) {
        // Direct array format
        serialNumberList = existingSerials.map(s => ({
          serial_number: s.serial_number,
          category: s.category,
          is_active: s.is_active || '1' // Keep original is_active status
        }));
      } else if (existingSerials && typeof existingSerials === 'object') {
        if (Array.isArray((existingSerials as any).data)) {
          // Wrapped in data property (new format)
          serialNumberList = (existingSerials as any).data.map((s: any) => ({
            serial_number: s.serial_number,
            category: s.category,
            is_active: s.is_active || '1' // Keep original is_active status
          }));
        } else if (Array.isArray(existingSerials)) {
          // Old format fallback
          serialNumberList = (existingSerials as any).map((s: any) => ({
            serial_number: s.serial_number,
            category: s.category,
            is_active: s.is_active || '1' // Keep original is_active status
          }));
        }
      }

      // Check against ALL records (both active and soft-deleted)
      const activeCount = serialNumberList.filter(s => s.is_active === '1').length;
      const softDeletedCount = serialNumberList.filter(s => s.is_active === '0').length;
      console.log(`Database records - Active: ${activeCount}, Soft-deleted: ${softDeletedCount}, Total: ${serialNumberList.length}`);
      console.log('Checking serials:', serials, 'for category:', category);

      const activeDuplicates: string[] = [];
      const softDeletedDuplicates: string[] = [];

      // Return serials that already exist in ANY database records (active or soft-deleted) with the same category
      serials.forEach(serial => {
        const matchingRecords = serialNumberList.filter(existing => {
          const serialMatch = existing.serial_number === serial;
          const categoryMatch = category ? existing.category === category : true;
          return serialMatch && categoryMatch;
        });

        if (matchingRecords.length > 0) {
          // Check if there are active duplicates
          const hasActiveDuplicate = matchingRecords.some(record => record.is_active === '1');
          // Check if there are soft-deleted duplicates
          const hasSoftDeletedDuplicate = matchingRecords.some(record => record.is_active === '0');

          if (hasActiveDuplicate) {
            activeDuplicates.push(serial);
          }
          if (hasSoftDeletedDuplicate) {
            softDeletedDuplicates.push(serial);
          }

          // Debug logging for specific serials if needed
          if (serial.startsWith('Z')) {
            const statuses = matchingRecords.map(r => r.is_active === '1' ? 'ACTIVE' : 'SOFT-DELETED');
            console.log(`Found match for ${serial}:`, {
              statuses: statuses,
              hasActiveDuplicate,
              hasSoftDeletedDuplicate,
              existingCategory: matchingRecords[0].category,
              checkingCategory: category
            });
          }
        }
      });

      const allDuplicates = [...new Set([...activeDuplicates, ...softDeletedDuplicates])];

      console.log('Found duplicates:', {
        total: allDuplicates.length,
        active: activeDuplicates.length,
        softDeleted: softDeletedDuplicates.length,
        duplicates: allDuplicates
      });

      return {
        duplicates: allDuplicates,
        activeDuplicates,
        softDeletedDuplicates
      };
    } catch (error) {
      console.error('Error checking serials against database:', error);

      // Fallback mock implementation for testing
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
      const mockExisting = [
        { serial_number: 'Z001', category: 'gaming' },
        { serial_number: 'Z002', category: 'gaming' },
        { serial_number: 'SN001234567', category: 'industrial' }
      ];
      const mockDuplicates = serials.filter(serial =>
        mockExisting.some(existing =>
          existing.serial_number === serial &&
          (category ? existing.category === category : true)
        )
      );

      return {
        duplicates: mockDuplicates,
        activeDuplicates: mockDuplicates, // Mock all as active
        softDeletedDuplicates: []
      };
    }
  }

  // Button state methods
  isCsvUploadDisabled(): boolean {
    return !this.canCreateSerialNumbers || !this.selectedFile || this.csvValidationInProgress || this.isUploading;
  }

  isManualAddDisabled(): boolean {
    const hasFormatErrors = this.hasManualFormatErrors();
    return !this.canCreateSerialNumbers || this.manualForm.invalid || this.manualValidationInProgress || this.isAdding ||
      hasFormatErrors ||
      (this.manualForm.value.duplicateStrategy === 'error' &&
        this.manualValidation &&
        (this.manualValidation.duplicatesFound > 0 || this.manualValidation.internalDuplicates > 0));
  }

  // Helper method to check for format validation errors
  hasManualFormatErrors(): boolean {
    const serialNumbersControl = this.manualForm.get('serialNumbers');
    return !!(serialNumbersControl?.errors?.['invalidFormat']);
  }

  // Helper method to get format validation error details
  getManualFormatErrors(): string[] {
    const serialNumbersControl = this.manualForm.get('serialNumbers');
    const invalidFormat = serialNumbersControl?.errors?.['invalidFormat'];
    return invalidFormat?.invalidSerials || [];
  }

  isRangeGenerateDisabled(): boolean {
    return !this.canCreateSerialNumbers || this.rangeForm.invalid || this.rangeValidationInProgress || this.isGenerating;
  }

  isRangeGenerateAndAddDisabled(): boolean {
    return !this.canCreateSerialNumbers || this.rangeForm.invalid || this.rangeValidationInProgress || this.isGenerating ||
      (this.rangeForm.value.duplicateStrategy === 'error' &&
        this.rangeValidation &&
        this.rangeValidation.duplicates > 0);
  }

  getDisabledReason(type: string): string {
    if (!this.canCreateSerialNumbers) {
      return 'Insufficient permissions to create serial numbers';
    }

    switch (type) {
      case 'csv':
        if (!this.selectedFile) return 'Please select a CSV file';
        if (this.csvValidationInProgress) return 'Validating file...';;
        if (this.isUploading) return 'Upload in progress...';
        break;
      case 'manual':
        if (this.hasManualFormatErrors()) {
          const errorCount = this.getManualFormatErrors().length;
          return `Invalid format in ${errorCount} serial number${errorCount > 1 ? 's' : ''} - must be 3-50 characters, alphanumeric with dashes/underscores only`;
        }
        if (this.manualForm.invalid) return 'Please enter valid serial numbers';
        if (this.manualValidationInProgress) return 'Validating serials...';
        if (this.isAdding) return 'Adding to database...';
        if (this.manualForm.value.duplicateStrategy === 'error' &&
            this.manualValidation &&
            (this.manualValidation.duplicatesFound > 0 || this.manualValidation.internalDuplicates > 0)) {
          return 'Cannot proceed - duplicate serial numbers found';
        }
        break;
      case 'range':
      case 'rangeAdd':
        if (this.rangeForm.invalid) return 'Please enter valid range parameters';
        if (this.rangeValidationInProgress) return 'Validating range...';
        if (this.isGenerating) return 'Generating...';
        break;
    }
    return '';
  }

  // Action methods (implement these based on your backend)
  async onBulkUpload(): Promise<void> {
    if (!this.canCreateSerialNumbers) {
      this.toastr.error('You do not have permission to create serial numbers.', 'Access Denied');
      return;
    }

    if (!this.selectedFile || this.uploadForm.invalid) return;

    this.isUploading = true;
    try {
      const content = await this.readFileContent(this.selectedFile);
      const serials = this.parseCsvContent(content);
      const validSerials = serials.filter(serial => this.isValidSerialFormat(serial));

      if (validSerials.length === 0) {
        this.toastr.error('No valid serial numbers found in the CSV file.');
        return;
      }

      const category = this.uploadForm.get('category')?.value || 'gaming';

      // Final duplicate check before submission
      console.log('Performing final duplicate check before CSV upload...');
      const duplicateResult = await this.checkSerialsAgainstDatabase(validSerials, category);
      const finalDuplicates = duplicateResult.duplicates;

      if (finalDuplicates.length > 0) {
        const duplicateStrategy = this.uploadForm.get('duplicateStrategy')?.value;

        if (duplicateStrategy === 'error') {
          this.toastr.error(`Cannot proceed: Found ${finalDuplicates.length} duplicate serial numbers (including soft-deleted records) in CSV. Please remove duplicates or change strategy.`);
          return;
        } else if (duplicateStrategy === 'skip') {
          const proceed = confirm(
            `Found ${finalDuplicates.length} duplicate serial numbers (including soft-deleted records) in CSV that will be skipped:\n` +
            `${finalDuplicates.slice(0, 5).join(', ')}${finalDuplicates.length > 5 ? '...' : ''}\n\n` +
            `Do you want to proceed with upload?`
          );
          if (!proceed) return;
        }
      }

      const results = await this.addSerialNumbers(validSerials, category);

      this.uploadResults = results;
      this.duplicateSerials = results.duplicateSerials || [];
      this.errorSerials = results.errorSerials || [];

      if (results.successful > 0) {
        this.toastr.success(`${results.successful} serial number(s) uploaded successfully from CSV.`);
      }

      if (this.duplicateSerials.length || this.errorSerials.length) {
        let msg = '';
        if (this.duplicateSerials.length) {
          msg += `Duplicate serial numbers: ${this.duplicateSerials.join(', ')}.\n`;
        }
        if (this.errorSerials.length) {
          msg += `Other errors for: ${this.errorSerials.join(', ')}.`;
        }
        alert(msg.trim());
      }

      // Reset form and refresh data
      this.selectedFile = null;
      this.uploadForm.patchValue({
        file: '',
        category: this.defaultValues.category,
        duplicateStrategy: this.defaultValues.duplicateStrategy
      });
      this.fileValidation = null;

      await this.loadSerialNumbers();

    } catch (error) {
      console.error('CSV upload failed:', error);
      this.toastr.error('Failed to upload CSV file.');
    } finally {
      this.isUploading = false;
    }
  }

  generateToTextarea(): void {
    const range = this.getPreviewRange();
    const rangeCategory = this.rangeForm.get('category')?.value || 'gaming';

    this.manualForm.patchValue({
      serialNumbers: range.join('\n'),
      category: rangeCategory
    });
    setTimeout(() => this.validateManualSerials(), 100);
  }

  loadCsvToManualEntry(): void {
    if (!this.selectedFile) {
      this.toastr.warning('Please select a CSV file first.');
      return;
    }

    // Read the CSV file and transfer content to manual entry
    this.readFileContent(this.selectedFile).then(content => {
      const serials = this.parseCsvContent(content);
      const validSerials = serials.filter(serial => this.isValidSerialFormat(serial));

      if (validSerials.length === 0) {
        this.toastr.warning('No valid serial numbers found in the CSV file.');
        return;
      }

      // Temporarily disable form change listeners to prevent multiple API calls
      const serialNumbersControl = this.manualForm.get('serialNumbers');
      const categoryControl = this.manualForm.get('category');

      // Update form values without triggering reactive listeners
      serialNumbersControl?.setValue(validSerials.join('\n'), { emitEvent: false });
      categoryControl?.setValue(this.uploadForm.get('category')?.value || 'gaming', { emitEvent: false });

      // Trigger validation manually after a short delay (single API call)
      setTimeout(() => this.validateManualSerials(), 100);

      this.toastr.success(`${validSerials.length} serial numbers loaded to manual entry.`);
    }).catch(error => {
      console.error('Error reading CSV file:', error);
      this.toastr.error('Failed to read CSV file.');
    });
  }

  async generateAndAdd(): Promise<void> {
    if (!this.canCreateSerialNumbers) {
      this.toastr.error('You do not have permission to create serial numbers.', 'Access Denied');
      return;
    }

    if (this.rangeForm.invalid) return;

    this.isGenerating = true;
    try {
      const range = this.getPreviewRange();
      if (range.length === 0) {
        this.toastr.error('No valid range to generate.');
        return;
      }

      // Final duplicate check before submission
      console.log('Performing final duplicate check before range generation...');
      const category = this.rangeForm.get('category')?.value || 'gaming';
      const duplicateResult = await this.checkSerialsAgainstDatabase(range, category);
      const finalDuplicates = duplicateResult.duplicates;

      if (finalDuplicates.length > 0) {
        const duplicateStrategy = this.rangeForm.get('duplicateStrategy')?.value || 'skip';

        if (duplicateStrategy === 'error') {
          this.toastr.error(`Cannot proceed: Found ${finalDuplicates.length} duplicate serial numbers (including soft-deleted records) in range. Please adjust range or change strategy.`);
          return;
        } else if (duplicateStrategy === 'skip') {
          const proceed = confirm(
            `Found ${finalDuplicates.length} duplicate serial numbers (including soft-deleted records) in range that will be skipped:\n` +
            `${finalDuplicates.slice(0, 5).join(', ')}${finalDuplicates.length > 5 ? '...' : ''}\n\n` +
            `Do you want to proceed with generation?`
          );
          if (!proceed) return;
        }
      }

      const results = await this.addSerialNumbers(range, category);

      this.uploadResults = results;
      this.duplicateSerials = results.duplicateSerials || [];
      this.errorSerials = results.errorSerials || [];

      if (results.successful > 0) {
        this.toastr.success(`${results.successful} serial number(s) generated and saved successfully.`);
      }

      if (this.duplicateSerials.length || this.errorSerials.length) {
        let msg = '';
        if (this.duplicateSerials.length) {
          msg += `Duplicate serial numbers: ${this.duplicateSerials.join(', ')}.\n`;
        }
        if (this.errorSerials.length) {
          msg += `Other errors for: ${this.errorSerials.join(', ')}.`;
        }
        alert(msg.trim());
      }

      // Reset form and refresh data
      this.rangeForm.patchValue({
        prefix: this.defaultValues.prefix,
        startNumber: this.defaultValues.startNumber,
        endNumber: this.defaultValues.endNumber,
        padding: this.defaultValues.padding,
        category: this.defaultValues.category,
        duplicateStrategy: this.defaultValues.duplicateStrategy
      });

      await this.loadSerialNumbers();

    } catch (error) {
      console.error('Range generation and add failed:', error);
      this.toastr.error('Failed to generate and save serial numbers.');
    } finally {
      this.isGenerating = false;
    }
  }

  // Data management methods
  loadData(): void {
    // Implement data loading
  }

  refreshData(): void {
    this.loadSerialNumbers().then(() => {
      this.toastr.success('Data refreshed successfully.');
    }).catch(error => {
      console.error('Error refreshing data:', error);
      this.toastr.error('Failed to refresh data.');
    });
  }

  // Method to handle is_active filter changes
  onIsActiveFilterChange(): void {
    // Reload data when is_active filter changes to include/exclude soft-deleted records
    this.loadSerialNumbers();
    this.updateUrlParams();
  }

  // Handle filter changes for AG-Grid
  onFilterChange(): void {
    // Update the grid data with filtered results
    this.updateGridData();
    this.updateUrlParams();
  }

  // Handle search input with debouncing
  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      this.onFilterChange();
    }, 300); // 300ms debounce
  }

  // Clear all filters and update grid
  clearFilters(): void {
    this.categoryFilter = '';
    this.statusFilter = '';
    this.isActiveFilter = '';
    this.searchTerm = '';
    this.updateGridData();
    this.updateUrlParams();
  }

  exportFiltered(): void {
    const filteredData = this.filteredSerialNumbers();
    
    if (filteredData.length === 0) {
      this.toastr.warning('No data to export with current filters', 'Export Warning');
      return;
    }

    // Create CSV content
    const headers = ['Serial Number', 'Category', 'Status', 'Active Status', 'Date Added', 'Used In Tag'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(serial => [
        `"${serial.serial_number}"`,
        `"${serial.category}"`,
        `"${serial.status}"`,
        `"${serial.is_active === '1' ? 'Active' : 'Soft-Deleted'}"`,
        `"${serial.created_at}"`,
        `"${serial.usedInTag || ''}"`
      ].join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filterSuffix = this.categoryFilter || this.statusFilter || this.isActiveFilter || this.searchTerm ? '_filtered' : '';
    link.download = `serial_numbers_${timestamp}${filterSuffix}.csv`;
    
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.toastr.success(`Exported ${filteredData.length} serial numbers`, 'Export Complete');
  }

  filteredSerialNumbers(): SerialNumber[] {
    // Ensure serialNumbers is always an array
    const serials = Array.isArray(this.serialNumbers) ? this.serialNumbers : [];
    return serials.filter(serial => {
      const matchesStatus = !this.statusFilter || serial.status === this.statusFilter;
      const matchesCategory = !this.categoryFilter || serial.category === this.categoryFilter;
      const matchesIsActive = !this.isActiveFilter || serial.is_active === this.isActiveFilter;
      const matchesSearch = !this.searchTerm ||
        serial.serial_number.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesStatus && matchesCategory && matchesIsActive && matchesSearch;
    });
  }

  getAvailableCount(): number {
    // Ensure serialNumbers is always an array
    const serials = Array.isArray(this.serialNumbers) ? this.serialNumbers : [];
    
    // If filtering by is_active, count from all loaded records
    // Otherwise, only count active records
    if (this.isActiveFilter !== '') {
      return serials.filter(s => s.status === 'available').length;
    } else {
      return serials.filter(s => s.status === 'available' && s.is_active === '1').length;
    }
  }

  // Get count of currently filtered/displayed records
  getFilteredCount(): number {
    return this.filteredSerialNumbers().length;
  }

  // Check if any filters are active
  hasActiveFilters(): boolean {
    return !!(this.categoryFilter || this.statusFilter || this.isActiveFilter || this.searchTerm);
  }

  // Selection methods (updated for AG-Grid)
  toggleSelectAll(event: any): void {
    if (this.gridApi) {
      if (event.target.checked) {
        this.gridApi.selectAll();
      } else {
        this.gridApi.deselectAll();
      }
    } else {
      // Fallback for non-grid mode
      if (event.target.checked) {
        this.selectedSerials = this.filteredSerialNumbers().map(s => s.id);
      } else {
        this.selectedSerials = [];
      }
    }
  }

  toggleSelect(id: string, event: any): void {
    if (this.gridApi) {
      const rowNode = this.gridApi.getRowNode(id);
      if (rowNode) {
        rowNode.setSelected(event.target.checked);
      }
    } else {
      // Fallback for non-grid mode
      if (event.target.checked) {
        this.selectedSerials.push(id);
      } else {
        this.selectedSerials = this.selectedSerials.filter(s => s !== id);
      }
    }
  }

  isSelected(id: string): boolean {
    if (this.gridApi) {
      const rowNode = this.gridApi.getRowNode(id);
      return rowNode ? rowNode.isSelected() : false;
    }
    return this.selectedSerials.includes(id);
  }

  trackBySerial(index: number, serial: SerialNumber): string {
    return serial.id;
  }

  // Edit/Delete methods
  editSerial(serial: SerialNumber): void {
    this.serialToEdit = { ...serial };
    this.originalSerialToEdit = serial;
    this.editSerialValidation = null; // Reset validation state
    const modalRef = this.modalService.open(this.editSerialModalRef, { size: 'lg' });

    modalRef.result.then(async (result) => {
      if (result === 'save' && this.serialToEdit) {
        await this.saveSerialEdit(serial, modalRef);
      } else {
        this.serialToEdit = null;
        this.originalSerialToEdit = null;
        this.editSerialValidation = null;
      }
    }, () => {
      this.serialToEdit = null;
      this.originalSerialToEdit = null;
      this.editSerialValidation = null;
    });
  }

  private async saveSerialEdit(originalSerial: SerialNumber, modalRef: any): Promise<void> {
    try {
      // Check if the serial number has changed and validate for duplicates
      if (this.serialToEdit.serial_number !== originalSerial.serial_number) {
        console.log('Serial number changed, checking for duplicates against all records...');

        // Check for duplicates using comprehensive duplicate checking (includes soft-deleted records)
        const duplicateResult = await this.checkSerialsAgainstDatabase([this.serialToEdit.serial_number], this.serialToEdit.category);
        
        // Filter out the current record if it exists in the duplicates
        const relevantDuplicates = duplicateResult.duplicates.filter(duplicate => {
          // Check if this duplicate is the same record we're editing
          const currentRecord = this.serialNumbers.find(s => 
            s.id === originalSerial.id && 
            s.serial_number === duplicate
          );
          return !currentRecord; // Exclude if it's the same record
        });

        if (relevantDuplicates.length > 0) {
          this.toastr.error(`Serial number '${this.serialToEdit.serial_number}' already exists (including soft-deleted records) in the ${this.serialToEdit.category} category. Please choose a different serial number.`);
          // Don't close the dialog, allow user to fix the error
          return;
        }
      }

      // If validation passes, proceed with the update
      await this.serialNumberService.update(parseInt(originalSerial.id), this.serialToEdit);
      await this.loadSerialNumbers();
      this.toastr.success('Serial updated successfully.');

      // Close the dialog only on successful save
      modalRef.close('saved');
      this.serialToEdit = null;
      this.editSerialValidation = null;

    } catch (error) {
      console.error('Error updating serial:', error);
      this.toastr.error('Failed to update serial number.');
      // Don't close the dialog on API errors either
    }
  }

  // Real-time validation for edit serial modal
  async validateEditSerial(): Promise<void> {
    if (!this.originalSerialToEdit || !this.serialToEdit.serial_number || this.serialToEdit.serial_number.trim() === '') {
      this.editSerialValidation = null;
      return;
    }

    // If serial number hasn't changed, it's valid
    if (this.serialToEdit.serial_number === this.originalSerialToEdit.serial_number) {
      this.editSerialValidation = { isDuplicate: false };
      return;
    }

    // Check for format validation first
    if (!this.isValidSerialFormat(this.serialToEdit.serial_number)) {
      this.editSerialValidation = {
        isDuplicate: true,
        message: 'Invalid serial number format. Use alphanumeric characters, hyphens, and underscores only (3-50 characters).'
      };
      return;
    }

    try {
      // Check for duplicates using comprehensive duplicate checking (includes soft-deleted records)
      const duplicateResult = await this.checkSerialsAgainstDatabase([this.serialToEdit.serial_number], this.serialToEdit.category);
      
      // Filter out the current record if it exists in the duplicates
      const relevantDuplicates = duplicateResult.duplicates.filter(duplicate => {
        // Check if this duplicate is the same record we're editing
        const currentRecord = this.serialNumbers.find(s => 
          s.id === this.originalSerialToEdit!.id && 
          s.serial_number === duplicate
        );
        return !currentRecord; // Exclude if it's the same record
      });

      if (relevantDuplicates.length > 0) {
        this.editSerialValidation = {
          isDuplicate: true,
          message: `Serial number '${this.serialToEdit.serial_number}' already exists (including soft-deleted records) in the ${this.serialToEdit.category} category.`
        };
      } else {
        this.editSerialValidation = { 
          isDuplicate: false,
          message: '✅ Serial number validated against all records (active and soft-deleted).'
        };
      }
    } catch (error) {
      console.error('Error validating edit serial:', error);
      this.editSerialValidation = {
        isDuplicate: true,
        message: 'Error validating serial number. Please try again.'
      };
    }
  }

  // Helper method to check if save button should be disabled
  isEditSaveDisabled(): boolean {
    return !this.serialToEdit.serial_number ||
      this.serialToEdit.serial_number.trim() === '' ||
      (this.editSerialValidation && this.editSerialValidation.isDuplicate);
  }

  async deleteSerial(id: string): Promise<void> {
    if (!this.canCreateSerialNumbers) {
      this.toastr.error('You do not have permission to delete serial numbers.', 'Access Denied');
      return;
    }

    console.log('deleteSerial called with id:', id);

    if (confirm('Are you sure you want to delete this serial number? (This will be a soft delete - record will be marked inactive)')) {
      console.log('User confirmed deletion for id:', id);
      try {
        console.log('Calling serialNumberService.delete with:', parseInt(id));
        const result = await this.serialNumberService.delete(parseInt(id));
        console.log('Delete result:', result);

        await this.loadSerialNumbers();
        this.toastr.success('Serial number deleted successfully.');
      } catch (error) {
        console.error('Error deleting serial:', error);
        this.toastr.error('Failed to delete serial number.');
      }
    } else {
      console.log('User cancelled deletion for id:', id);
    }
  }

  async hardDeleteSerial(id: string): Promise<void> {
    if (!this.canCreateSerialNumbers) {
      this.toastr.error('You do not have permission to delete serial numbers.', 'Access Denied');
      return;
    }

    const serial = this.serialNumbers.find(s => s.id === id);
    if (!serial) {
      this.toastr.error('Serial number not found.');
      return;
    }

    // Additional restrictions for hard delete
    if (serial.status === 'used' || serial.status === 'reserved') {
      this.toastr.error('Cannot permanently delete serial numbers that are in use or reserved. Please set them to available first if this is really needed.');
      return;
    }

    // Double confirmation for hard delete
    const firstConfirm = confirm(
      `⚠️ PERMANENT DELETE WARNING ⚠️\n\n` +
      `You are about to PERMANENTLY delete serial number: ${serial.serial_number}\n\n` +
      `This action CANNOT be undone and will remove the record completely from the database.\n\n` +
      `Are you absolutely sure you want to proceed?`
    );

    if (!firstConfirm) {
      console.log('User cancelled hard deletion for id:', id);
      return;
    }

    const secondConfirm = confirm(
      `FINAL CONFIRMATION\n\n` +
      `Type "DELETE" in your mind to confirm permanent deletion of: ${serial.serial_number}\n\n` +
      `Click OK to permanently delete, or Cancel to abort.`
    );

    if (secondConfirm) {
      console.log('User confirmed hard deletion for id:', id);
      try {
        console.log('Calling serialNumberService.hardDelete with:', parseInt(id));
        const result = await this.serialNumberService.hardDelete(parseInt(id));
        console.log('Hard delete result:', result);

        await this.loadSerialNumbers();
        this.toastr.success('Serial number permanently deleted from database.');
      } catch (error) {
        console.error('Error hard deleting serial:', error);
        this.toastr.error('Failed to permanently delete serial number.');
      }
    } else {
      console.log('User cancelled final confirmation for hard deletion of id:', id);
    }
  }

  async bulkDelete(): Promise<void> {
    if (!this.canCreateSerialNumbers) {
      this.toastr.error('You do not have permission to delete serial numbers.', 'Access Denied');
      return;
    }

    if (this.selectedSerials.length === 0) {
      this.toastr.warning('Please select serial numbers to delete.');
      return;
    }

    if (confirm(`Are you sure you want to delete ${this.selectedSerials.length} selected serial numbers? (This will be a soft delete - records will be marked inactive)`)) {
      try {
        const idsToDelete = this.selectedSerials.map(id => parseInt(id));

        // Try bulk delete first, fall back to individual deletes if not supported
        try {
          await this.serialNumberService.bulkDelete(idsToDelete);
        } catch (bulkError) {
          console.warn('Bulk delete not supported, falling back to individual deletes:', bulkError);

          // Fallback to individual deletes
          const deletePromises = idsToDelete.map(id =>
            this.serialNumberService.delete(id)
          );
          await Promise.all(deletePromises);
        }

        // Clear selection and reload data
        this.selectedSerials = [];
        await this.loadSerialNumbers();

        this.toastr.success(`Successfully deleted ${idsToDelete.length} serial numbers.`);
      } catch (error) {
        console.error('Error deleting serials:', error);
        this.toastr.error('Failed to delete some serial numbers.');

        // Still refresh the data to see what was actually deleted
        this.selectedSerials = [];
        await this.loadSerialNumbers();
      }
    }
  }

  async bulkHardDelete(): Promise<void> {
    if (!this.canCreateSerialNumbers) {
      this.toastr.error('You do not have permission to delete serial numbers.', 'Access Denied');
      return;
    }

    if (this.selectedSerials.length === 0) {
      this.toastr.warning('Please select serial numbers to permanently delete.');
      return;
    }

    // Check for restrictions
    const selectedSerialsData = this.serialNumbers.filter(s => this.selectedSerials.includes(s.id));
    const restrictedSerials = selectedSerialsData.filter(s => s.status === 'used' || s.status === 'reserved');

    if (restrictedSerials.length > 0) {
      this.toastr.error(
        `Cannot permanently delete ${restrictedSerials.length} serial numbers that are in use or reserved:\n` +
        `${restrictedSerials.map(s => s.serial_number).slice(0, 5).join(', ')}${restrictedSerials.length > 5 ? '...' : ''}\n\n` +
        `Please change their status to available first if this is really needed.`
      );
      return;
    }

    // Double confirmation for bulk hard delete
    const serialNumbers = selectedSerialsData.map(s => s.serial_number).slice(0, 5).join(', ');
    const displayList = selectedSerialsData.length > 5 ? `${serialNumbers}... and ${selectedSerialsData.length - 5} more` : serialNumbers;

    const firstConfirm = confirm(
      `⚠️ PERMANENT BULK DELETE WARNING ⚠️\n\n` +
      `You are about to PERMANENTLY delete ${this.selectedSerials.length} serial numbers:\n` +
      `${displayList}\n\n` +
      `This action CANNOT be undone and will remove these records completely from the database.\n\n` +
      `Are you absolutely sure you want to proceed?`
    );

    if (!firstConfirm) {
      console.log('User cancelled bulk hard deletion');
      return;
    }

    const secondConfirm = confirm(
      `FINAL CONFIRMATION\n\n` +
      `You are about to permanently delete ${this.selectedSerials.length} serial numbers.\n\n` +
      `Click OK to permanently delete ALL selected records, or Cancel to abort.`
    );

    if (secondConfirm) {
      console.log('User confirmed bulk hard deletion');
      try {
        const idsToDelete = this.selectedSerials.map(id => parseInt(id));

        // Try bulk hard delete first, fall back to individual hard deletes if not supported
        try {
          await this.serialNumberService.bulkHardDelete(idsToDelete);
        } catch (bulkError) {
          console.warn('Bulk hard delete not supported, falling back to individual hard deletes:', bulkError);

          // Fallback to individual hard deletes
          const deletePromises = idsToDelete.map(id =>
            this.serialNumberService.hardDelete(id)
          );
          await Promise.all(deletePromises);
        }

        // Clear selection and reload data
        this.selectedSerials = [];
        await this.loadSerialNumbers();

        this.toastr.success(`Successfully permanently deleted ${idsToDelete.length} serial numbers from database.`);
      } catch (error) {
        console.error('Error hard deleting serials:', error);
        this.toastr.error('Failed to permanently delete some serial numbers.');

        // Still refresh the data to see what was actually deleted
        this.selectedSerials = [];
        await this.loadSerialNumbers();
      }
    } else {
      console.log('User cancelled final confirmation for bulk hard deletion');
    }
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/quality/igt']);
  }

  // Template helper methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  downloadTemplate(): void {
    // Create CSV template content
    const csvContent = 'serial_number\nSN001\nSN002\nSN003';

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      // Create object URL and trigger download
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'serial_numbers_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL
      URL.revokeObjectURL(url);

      this.toastr.success('Template downloaded successfully.');
    } else {
      this.toastr.error('Download not supported in this browser.');
    }
  }

  getUploadResultMessage(): string {
    if (!this.uploadResults) return '';
    if (this.uploadResults.errors > this.uploadResults.successful) return 'Failed';
    if (this.uploadResults.duplicates > 0 || this.uploadResults.errors > 0) return 'Completed with Issues';
    return 'Success';
  }

  getDuplicateAction(): string {
    const strategy = this.uploadForm.get('duplicateStrategy')?.value || 'skip';
    switch (strategy) {
      case 'skip': return 'Skipped';
      case 'replace': return 'Replaced';
      case 'error': return 'Caused Errors';
      default: return 'Handled';
    }
  }

  // AG-Grid Methods
  initializeColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: '',
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        pinned: 'left',
        sortable: false,
        filter: false,
        resizable: false
      },
      {
        headerName: 'Serial Number',
        field: 'serial_number',
        width: 180,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `<code class="text-primary">${params.value}</code>`;
        }
      },
      {
        headerName: 'Category',
        field: 'category',
        width: 150,
        cellRenderer: (params: any) => {
          return `<span class="badge bg-secondary-subtle text-dark">${params.value}</span>`;
        }
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: (params: any) => {
          const statusClass = {
            'available': 'bg-success',
            'reserved': 'bg-warning',
            'used': 'bg-danger'
          }[params.value] || 'bg-secondary';
          
          return `<span class="badge ${statusClass}">${params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}</span>`;
        }
      },
      {
        headerName: 'Active Status',
        field: 'is_active',
        width: 130,
        cellRenderer: (params: any) => {
          const isActive = params.value === '1';
          const badgeClass = isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
          const iconClass = isActive ? 'mdi-check-circle' : 'mdi-close-circle';
          const text = isActive ? 'Active' : 'Soft-Deleted';
          
          return `<span class="badge ${badgeClass}">
                    <i class="mdi ${iconClass} me-1"></i>
                    ${text}
                  </span>`;
        }
      },
      {
        headerName: 'Date Added',
        field: 'created_at',
        width: 150,
        cellRenderer: (params: any) => {
          return new Date(params.value).toLocaleDateString() + ' ' + new Date(params.value).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
      },
      {
        headerName: 'Used In Tag',
        field: 'used_in_asset_id',
        width: 150,
        cellRenderer: (params: any) => {
          return params.value ? `<span class="text-primary">${params.value}</span>` : '<span class="text-muted">-</span>';
        }
      },
      {
        headerName: 'Actions',
        field: 'actions',
        width: 180,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: ActionsCellRendererComponent,
        cellRendererParams: {
          onEdit: (data: any) => this.editSerial(data),
          onSoftDelete: (id: string) => this.deleteSerial(id),
          onHardDelete: (id: string) => this.hardDeleteSerial(id)
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.updateGridData();
    
    // Apply any existing filters
    if (this.categoryFilter || this.statusFilter || this.searchTerm) {
      this.onFilterChange();
    }
  }

  onSelectionChanged(event: SelectionChangedEvent): void {
    const selectedRows = event.api.getSelectedRows();
    this.selectedSerials = selectedRows.map(row => row.id);
    console.log('Selected serials:', this.selectedSerials);
  }

  // Batch operation methods for AG-Grid
  selectAllVisible(): void {
    if (this.gridApi) {
      this.gridApi.selectAll();
    }
  }

  clearSelection(): void {
    if (this.gridApi) {
      this.gridApi.deselectAll();
    } else {
      this.selectedSerials = [];
    }
  }

  updateGridData(): void {
    this.rowData = this.filteredSerialNumbers();
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
    }
  }

  getRowId = (params: any) => params.data.id;

  /**
   * Open help documentation
   */
  openHelp() {
    this.helpService.openSerialNumbersHelp();
  }

  /**
   * Open help for specific topic
   */
  openHelpTopic(categoryId: string, sectionId?: string) {
    this.helpService.openHelpSection('serial-numbers', categoryId, sectionId);
  }
}
