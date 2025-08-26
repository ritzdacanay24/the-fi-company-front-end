import { Component, Input, OnInit } from '@angular/core';

export interface HelpSection {
  id: string;
  title: string;
  content: string;
  icon: string;
  type: 'info' | 'warning' | 'success' | 'danger';
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: string;
  sections: HelpSection[];
}

@Component({
  selector: 'app-igt-help',
  templateUrl: './igt-help.component.html',
  styleUrls: ['./igt-help.component.scss']
})
export class IgtHelpComponent implements OnInit {
  @Input() helpType: 'serial-numbers' | 'loader' = 'serial-numbers';
  @Input() showInModal: boolean = false;
  @Input() initialCategory?: string;
  @Input() initialSection?: string;

  activeCategory: string = '';
  activeSection: string = '';
  searchTerm: string = '';

  helpCategories: HelpCategory[] = [];

  ngOnInit() {
    this.loadHelpContent();
    
    // Use setTimeout to ensure initialization happens after the component is fully rendered
    setTimeout(() => {
      this.initializeActiveState();
    }, 0);
  }

  private initializeActiveState() {
    // Set initial category
    if (this.initialCategory) {
      this.activeCategory = this.initialCategory;
    } else if (this.helpCategories.length > 0) {
      this.activeCategory = this.helpCategories[0].id;
    }
    
    // Set initial section
    if (this.initialSection) {
      this.activeSection = this.initialSection;
    } else {
      // Only set default section if no specific section was requested
      if (!this.initialCategory && this.helpCategories.length > 0 && this.helpCategories[0].sections.length > 0) {
        this.activeSection = this.helpCategories[0].sections[0].id;
      }
    }
  }

  getActiveCategoryTitle(): string {
    const category = this.helpCategories.find(cat => cat.id === this.activeCategory);
    return category ? category.title : '';
  }

  getActiveCategorySections(): HelpSection[] {
    const category = this.helpCategories.find(cat => cat.id === this.activeCategory);
    return category ? category.sections : [];
  }

  private loadHelpContent() {
    if (this.helpType === 'serial-numbers') {
      this.helpCategories = this.getSerialNumbersHelp();
    } else {
      this.helpCategories = this.getLoaderHelp();
    }
  }

  private getSerialNumbersHelp(): HelpCategory[] {
    return [
      {
        id: 'getting-started',
        title: 'Getting Started',
        icon: 'mdi mdi-rocket-launch',
        sections: [
          {
            id: 'overview',
            title: 'System Overview',
            type: 'info',
            icon: 'mdi mdi-information',
            content: `
              <h5>Serial Number Inventory Management</h5>
              <p>This system helps you manage IGT serial numbers efficiently with features for:</p>
              <ul>
                <li><strong>Bulk Upload:</strong> Import serial numbers from CSV files</li>
                <li><strong>Manual Entry:</strong> Add individual serial numbers with real-time validation</li>
                <li><strong>Range Generation:</strong> Create sequential serial number ranges</li>
                <li><strong>Inventory Management:</strong> Track, filter, and manage existing serial numbers</li>
                <li><strong>Duplicate Detection:</strong> Prevent conflicts with comprehensive duplicate checking</li>
              </ul>
              <div class="alert alert-info mt-3">
                <i class="mdi mdi-lightbulb-on me-2"></i>
                <strong>Pro Tip:</strong> Use the tabs to navigate between upload and management functions.
              </div>
            `
          },
          {
            id: 'permissions',
            title: 'Access Control',
            type: 'warning',
            icon: 'mdi mdi-shield-check',
            content: `
              <h5>Permission Requirements</h5>
              <p>To use this system effectively, you need appropriate permissions:</p>
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="card border-success">
                    <div class="card-body p-3">
                      <h6 class="text-success"><i class="mdi mdi-check-circle me-1"></i> Read Access</h6>
                      <ul class="small mb-0">
                        <li>View serial number inventory</li>
                        <li>Use filters and search</li>
                        <li>Export data</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="card border-warning">
                    <div class="card-body p-3">
                      <h6 class="text-warning"><i class="mdi mdi-shield-alert me-1"></i> Write Access</h6>
                      <ul class="small mb-0">
                        <li>Upload serial numbers</li>
                        <li>Create manual entries</li>
                        <li>Delete serial numbers</li>
                        <li>Edit existing records</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div class="alert alert-warning mt-3">
                <i class="mdi mdi-alert me-2"></i>
                If you see access restrictions, contact your administrator to request appropriate permissions.
              </div>
            `
          }
        ]
      },
      {
        id: 'upload-methods',
        title: 'Upload Methods',
        icon: 'mdi mdi-upload',
        sections: [
          {
            id: 'csv-upload',
            title: 'CSV Bulk Upload',
            type: 'success',
            icon: 'mdi mdi-file-upload',
            content: `
              <h5>CSV File Upload Process</h5>
              <div class="row g-3">
                <div class="col-md-8">
                  <h6>Required Format:</h6>
                  <div class="bg-light p-3 rounded font-monospace small">
                    serial_number,manufacturer,model<br>
                    Z001,Manufacturer1,Model1<br>
                    Z002,Manufacturer1,Model2<br>
                    Z003,Manufacturer2,Model3
                  </div>
                  <h6 class="mt-3">Column Requirements:</h6>
                  <ul>
                    <li><strong>serial_number</strong> - Required, unique identifier</li>
                    <li><strong>manufacturer</strong> - Optional, equipment manufacturer</li>
                    <li><strong>model</strong> - Optional, equipment model</li>
                    <li><strong>notes</strong> - Optional, additional information</li>
                  </ul>
                </div>
                <div class="col-md-4">
                  <div class="card border-info">
                    <div class="card-body p-3">
                      <h6 class="text-info"><i class="mdi mdi-download me-1"></i> Template</h6>
                      <p class="small mb-2">Download the CSV template to ensure proper formatting.</p>
                      <button class="btn btn-outline-info btn-sm w-100">
                        <i class="mdi mdi-download me-1"></i> Get Template
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <h6 class="mt-4">Upload Process:</h6>
              <ol>
                <li>Select your duplicate handling strategy</li>
                <li>Choose your CSV file (max 10MB)</li>
                <li>System validates file and checks for duplicates</li>
                <li>Review validation results</li>
                <li>Click "Load CSV to Manual Entry" to review before saving</li>
              </ol>
              
              <div class="alert alert-success mt-3">
                <i class="mdi mdi-check-circle me-2"></i>
                <strong>Best Practice:</strong> Always review data in manual entry before final submission.
              </div>
            `
          },
          {
            id: 'manual-entry',
            title: 'Manual Entry',
            type: 'info',
            icon: 'mdi mdi-pencil-plus',
            content: `
              <h5>Manual Serial Number Entry</h5>
              <p>Perfect for small batches or individual serial numbers.</p>
              
              <h6>How to Use:</h6>
              <ol>
                <li>Choose duplicate handling strategy</li>
                <li>Enter serial numbers (one per line)</li>
                <li>Select appropriate category</li>
                <li>System validates in real-time</li>
                <li>Click "Save Serial Numbers to Database"</li>
              </ol>
              
              <div class="row g-3 mt-3">
                <div class="col-md-6">
                  <div class="card border-success">
                    <div class="card-body p-3">
                      <h6 class="text-success"><i class="mdi mdi-check-circle me-1"></i> Valid Format</h6>
                      <div class="font-monospace small bg-light p-2 rounded">
                        SN001234567<br>
                        SN001234568<br>
                        Z0001<br>
                        IGT-ABC-123
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="card border-danger">
                    <div class="card-body p-3">
                      <h6 class="text-danger"><i class="mdi mdi-close-circle me-1"></i> Invalid Format</h6>
                      <div class="font-monospace small bg-light p-2 rounded">
                        <span class="text-danger">SN001, SN002</span> (commas)<br>
                        <span class="text-danger">SN001 SN002</span> (spaces)<br>
                        <span class="text-danger"></span> (empty lines)<br>
                        <span class="text-danger">SN-001*</span> (special chars)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="alert alert-info mt-3">
                <i class="mdi mdi-information me-2"></i>
                Real-time validation shows duplicates and validation errors as you type.
              </div>
            `
          },
          {
            id: 'range-generator',
            title: 'Range Generator',
            type: 'info',
            icon: 'mdi mdi-auto-fix',
            content: `
              <h5>Serial Number Range Generator</h5>
              <p>Efficiently create sequential serial number ranges with customizable formatting.</p>
              
              <h6>Configuration Options:</h6>
              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Description</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Prefix</strong></td>
                      <td>Optional text before numbers</td>
                      <td>SN, Z, IGT-</td>
                    </tr>
                    <tr>
                      <td><strong>Start Number</strong></td>
                      <td>First number in range</td>
                      <td>1, 100, 1001</td>
                    </tr>
                    <tr>
                      <td><strong>End Number</strong></td>
                      <td>Last number in range</td>
                      <td>100, 200, 2000</td>
                    </tr>
                    <tr>
                      <td><strong>Padding</strong></td>
                      <td>Zero-padding for numbers</td>
                      <td>001, 0001, 00001</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <h6>Example Configurations:</h6>
              <div class="row g-3">
                <div class="col-md-4">
                  <div class="card border-light">
                    <div class="card-body p-3">
                      <h6 class="text-primary">Basic Range</h6>
                      <div class="small">
                        <strong>Prefix:</strong> Z<br>
                        <strong>Start:</strong> 1<br>
                        <strong>End:</strong> 10<br>
                        <strong>Padding:</strong> 4 digits
                      </div>
                      <div class="mt-2 font-monospace small bg-light p-2 rounded">
                        Z0001, Z0002, Z0003...
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card border-light">
                    <div class="card-body p-3">
                      <h6 class="text-primary">No Padding</h6>
                      <div class="small">
                        <strong>Prefix:</strong> SN<br>
                        <strong>Start:</strong> 100<br>
                        <strong>End:</strong> 105<br>
                        <strong>Padding:</strong> None
                      </div>
                      <div class="mt-2 font-monospace small bg-light p-2 rounded">
                        SN100, SN101, SN102...
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card border-light">
                    <div class="card-body p-3">
                      <h6 class="text-primary">Complex Format</h6>
                      <div class="small">
                        <strong>Prefix:</strong> IGT-2024-<br>
                        <strong>Start:</strong> 1<br>
                        <strong>End:</strong> 50<br>
                        <strong>Padding:</strong> 3 digits
                      </div>
                      <div class="mt-2 font-monospace small bg-light p-2 rounded">
                        IGT-2024-001, IGT-2024-002...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="alert alert-warning mt-3">
                <i class="mdi mdi-alert me-2"></i>
                <strong>Important:</strong> Preview shows duplicate detection. Red badges indicate existing serial numbers.
              </div>
            `
          }
        ]
      },
      {
        id: 'duplicate-handling',
        title: 'Duplicate Handling',
        icon: 'mdi mdi-content-duplicate',
        sections: [
          {
            id: 'duplicate-strategies',
            title: 'Handling Strategies',
            type: 'warning',
            icon: 'mdi mdi-alert-circle',
            content: `
              <h5>Duplicate Handling Strategies</h5>
              <p>Choose how the system should handle serial numbers that already exist:</p>
              
              <div class="row g-3">
                <div class="col-md-4">
                  <div class="card border-success">
                    <div class="card-body p-3">
                      <h6 class="text-success"><i class="mdi mdi-check-circle me-1"></i> Skip Duplicates</h6>
                      <p class="small mb-2"><strong>Recommended for most cases</strong></p>
                      <ul class="small mb-0">
                        <li>Ignores existing serial numbers</li>
                        <li>Only adds new ones</li>
                        <li>Safe and non-destructive</li>
                        <li>Provides detailed report</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card border-warning">
                    <div class="card-body p-3">
                      <h6 class="text-warning"><i class="mdi mdi-refresh me-1"></i> Replace Existing</h6>
                      <p class="small mb-2"><strong>Use with caution</strong></p>
                      <ul class="small mb-0">
                        <li>Updates existing records</li>
                        <li>Overwrites current data</li>
                        <li>Useful for corrections</li>
                        <li>Cannot be undone</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card border-danger">
                    <div class="card-body p-3">
                      <h6 class="text-danger"><i class="mdi mdi-close-circle me-1"></i> Stop on Error</h6>
                      <p class="small mb-2"><strong>Strict validation</strong></p>
                      <ul class="small mb-0">
                        <li>Halts on first duplicate</li>
                        <li>No records added if any exist</li>
                        <li>Ensures complete uniqueness</li>
                        <li>Requires cleanup first</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="alert alert-info mt-3">
                <i class="mdi mdi-lightbulb-on me-2"></i>
                <strong>Tip:</strong> Start with "Skip Duplicates" to safely add new serial numbers without affecting existing data.
              </div>
            `
          },
          {
            id: 'duplicate-detection',
            title: 'Detection Types',
            type: 'info',
            icon: 'mdi mdi-magnify',
            content: `
              <h5>Duplicate Detection System</h5>
              <p>Our comprehensive system checks for multiple types of duplicates:</p>
              
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="card border-danger">
                    <div class="card-header bg-danger-subtle p-2">
                      <h6 class="mb-0 text-danger"><i class="mdi mdi-close-circle me-1"></i> Active Duplicates</h6>
                    </div>
                    <div class="card-body p-3">
                      <ul class="small mb-0">
                        <li>Serial numbers currently in use</li>
                        <li>Active in the system (is_active = 1)</li>
                        <li>Cannot be added again</li>
                        <li>Shown with red badges</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="card border-warning">
                    <div class="card-header bg-warning-subtle p-2">
                      <h6 class="mb-0 text-warning"><i class="mdi mdi-alert-circle me-1"></i> Soft-Deleted</h6>
                    </div>
                    <div class="card-body p-3">
                      <ul class="small mb-0">
                        <li>Previously deleted serial numbers</li>
                        <li>Inactive in system (is_active = 0)</li>
                        <li>May be reactivated instead</li>
                        <li>Shown with yellow badges</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mt-3">
                <h6>Internal Duplicates</h6>
                <p>The system also checks for duplicates within your upload:</p>
                <ul>
                  <li>Repeated serial numbers in the same batch</li>
                  <li>Helps identify data entry errors</li>
                  <li>Auto-removal tools available</li>
                  <li>Prevents database conflicts</li>
                </ul>
              </div>
              
              <div class="alert alert-success mt-3">
                <i class="mdi mdi-shield-check me-2"></i>
                All duplicate checking happens in real-time as you type or upload files.
              </div>
            `
          }
        ]
      },
      {
        id: 'inventory-management',
        title: 'Inventory Management',
        icon: 'mdi mdi-database',
        sections: [
          {
            id: 'filtering-searching',
            title: 'Filtering & Search',
            type: 'info',
            icon: 'mdi mdi-filter',
            content: `
              <h5>Advanced Filtering & Search</h5>
              <p>Find and manage serial numbers efficiently with multiple filter options:</p>
              
              <div class="row g-3">
                <div class="col-md-6">
                  <h6><i class="mdi mdi-tag me-1"></i> Category Filter</h6>
                  <ul class="small">
                    <li>Gaming Equipment</li>
                    <li>Peripheral Devices</li>
                    <li>System Components</li>
                    <li>Other Hardware</li>
                  </ul>
                </div>
                <div class="col-md-6">
                  <h6><i class="mdi mdi-circle-outline me-1"></i> Status Filter</h6>
                  <ul class="small">
                    <li><span class="badge bg-success">Available</span> - Ready for use</li>
                    <li><span class="badge bg-warning">Reserved</span> - Temporarily held</li>
                    <li><span class="badge bg-danger">Used</span> - Currently in use</li>
                  </ul>
                </div>
              </div>
              
              <div class="mt-3">
                <h6><i class="mdi mdi-check-circle me-1"></i> Active Status Filter</h6>
                <div class="row g-3">
                  <div class="col-md-4">
                    <div class="card border-success">
                      <div class="card-body p-2">
                        <h6 class="small text-success mb-1">Active Only</h6>
                        <p class="small mb-0">Shows only active serial numbers currently in the system</p>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="card border-danger">
                      <div class="card-body p-2">
                        <h6 class="small text-danger mb-1">Soft-Deleted Only</h6>
                        <p class="small mb-0">Shows only soft-deleted (inactive) serial numbers</p>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="card border-secondary">
                      <div class="card-body p-2">
                        <h6 class="small text-secondary mb-1">All Records</h6>
                        <p class="small mb-0">Shows both active and soft-deleted serial numbers</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mt-3">
                <h6><i class="mdi mdi-magnify me-1"></i> Text Search</h6>
                <p class="small">Search serial numbers by typing part of the serial number. Supports partial matches and is case-insensitive.</p>
              </div>
              
              <div class="alert alert-info mt-3">
                <i class="mdi mdi-lightbulb-on me-2"></i>
                <strong>Pro Tip:</strong> Combine multiple filters for precise results. Use "Clear Filters" to reset all options.
              </div>
            `
          },
          {
            id: 'bulk-operations',
            title: 'Bulk Operations',
            type: 'warning',
            icon: 'mdi mdi-select-multiple',
            content: `
              <h5>Bulk Operations</h5>
              <p>Efficiently manage multiple serial numbers at once:</p>
              
              <h6><i class="mdi mdi-checkbox-multiple-marked me-1"></i> Selection</h6>
              <ul>
                <li>Use checkboxes to select individual items</li>
                <li>Click header checkbox to select all visible items</li>
                <li>Selection count shown in bulk delete button</li>
                <li>Works with filtered results</li>
              </ul>
              
              <h6><i class="mdi mdi-delete me-1"></i> Bulk Delete Options</h6>
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="card border-warning">
                    <div class="card-body p-3">
                      <h6 class="text-warning"><i class="mdi mdi-delete-sweep me-1"></i> Soft Delete</h6>
                      <ul class="small mb-0">
                        <li>Marks records as inactive</li>
                        <li>Preserves data for audit</li>
                        <li>Can be filtered and viewed later</li>
                        <li>Recommended for most cases</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="card border-danger">
                    <div class="card-body p-3">
                      <h6 class="text-danger"><i class="mdi mdi-delete-forever me-1"></i> Permanent Delete</h6>
                      <ul class="small mb-0">
                        <li>Completely removes from database</li>
                        <li>Cannot be undone</li>
                        <li>Restricted for used/reserved items</li>
                        <li>Double confirmation required</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <h6 class="mt-3"><i class="mdi mdi-download me-1"></i> Export Functions</h6>
              <ul>
                <li><strong>Export Filtered:</strong> Downloads current filtered results as CSV</li>
                <li><strong>Automatic Naming:</strong> Files include timestamp and filter indicators</li>
                <li><strong>Complete Data:</strong> Includes all columns and metadata</li>
              </ul>
              
              <div class="alert alert-danger mt-3">
                <i class="mdi mdi-alert me-2"></i>
                <strong>Warning:</strong> Permanent deletion cannot be undone. Always use soft delete unless absolutely necessary.
              </div>
            `
          }
        ]
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        icon: 'mdi mdi-help-circle',
        sections: [
          {
            id: 'common-issues',
            title: 'Common Issues',
            type: 'danger',
            icon: 'mdi mdi-alert-circle',
            content: `
              <h5>Common Issues & Solutions</h5>
              
              <div class="accordion" id="troubleshootingAccordion">
                <div class="accordion-item">
                  <h6 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#csv-issues">
                      <i class="mdi mdi-file-alert me-2"></i> CSV Upload Problems
                    </button>
                  </h6>
                  <div id="csv-issues" class="accordion-collapse collapse">
                    <div class="accordion-body">
                      <strong>File not uploading:</strong>
                      <ul>
                        <li>Check file size (max 10MB)</li>
                        <li>Ensure .csv file extension</li>
                        <li>Verify file is not corrupted</li>
                      </ul>
                      <strong>Validation errors:</strong>
                      <ul>
                        <li>Check required 'serial_number' column exists</li>
                        <li>Remove empty rows</li>
                        <li>Ensure proper CSV formatting</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div class="accordion-item">
                  <h6 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#duplicate-issues">
                      <i class="mdi mdi-content-duplicate me-2"></i> Duplicate Detection Issues
                    </button>
                  </h6>
                  <div id="duplicate-issues" class="accordion-collapse collapse">
                    <div class="accordion-body">
                      <strong>False duplicates:</strong>
                      <ul>
                        <li>Check for leading/trailing spaces</li>
                        <li>Verify case sensitivity</li>
                        <li>Look for hidden characters</li>
                      </ul>
                      <strong>Missing duplicates:</strong>
                      <ul>
                        <li>Ensure includeInactive parameter is set</li>
                        <li>Check soft-deleted records</li>
                        <li>Verify database connection</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div class="accordion-item">
                  <h6 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#permission-issues">
                      <i class="mdi mdi-shield-alert me-2"></i> Permission Problems
                    </button>
                  </h6>
                  <div id="permission-issues" class="accordion-collapse collapse">
                    <div class="accordion-body">
                      <strong>Access denied messages:</strong>
                      <ul>
                        <li>Contact your system administrator</li>
                        <li>Request serial number management permissions</li>
                        <li>Verify your user role and access level</li>
                      </ul>
                      <strong>Limited functionality:</strong>
                      <ul>
                        <li>Read-only access allows viewing and exporting</li>
                        <li>Write access required for uploads and edits</li>
                        <li>Admin access needed for permanent deletions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            `
          },
          {
            id: 'error-codes',
            title: 'Error Codes',
            type: 'info',
            icon: 'mdi mdi-code-tags',
            content: `
              <h5>Error Code Reference</h5>
              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>Error Code</th>
                      <th>Description</th>
                      <th>Solution</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>DUPLICATE_SERIAL</code></td>
                      <td>Serial number already exists</td>
                      <td>Use different serial or change duplicate strategy</td>
                    </tr>
                    <tr>
                      <td><code>INVALID_FORMAT</code></td>
                      <td>Serial number format invalid</td>
                      <td>Check for special characters or invalid length</td>
                    </tr>
                    <tr>
                      <td><code>CSV_PARSE_ERROR</code></td>
                      <td>Cannot read CSV file</td>
                      <td>Verify CSV format and encoding</td>
                    </tr>
                    <tr>
                      <td><code>PERMISSION_DENIED</code></td>
                      <td>Insufficient permissions</td>
                      <td>Contact administrator for access</td>
                    </tr>
                    <tr>
                      <td><code>VALIDATION_FAILED</code></td>
                      <td>Data validation error</td>
                      <td>Check all required fields and formats</td>
                    </tr>
                    <tr>
                      <td><code>DATABASE_ERROR</code></td>
                      <td>Database connection issue</td>
                      <td>Try again or contact IT support</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="alert alert-info mt-3">
                <i class="mdi mdi-information me-2"></i>
                If you encounter an error not listed here, note the exact message and contact technical support.
              </div>
            `
          }
        ]
      }
    ];
  }

  private getLoaderHelp(): HelpCategory[] {
    return [
      {
        id: 'loader-overview',
        title: 'IGT Loader Overview',
        icon: 'mdi mdi-download',
        sections: [
          {
            id: 'loader-intro',
            title: 'System Introduction',
            type: 'info',
            icon: 'mdi mdi-information',
            content: `
              <h5>IGT Loader System</h5>
              <p>The IGT Loader facilitates efficient loading and management of IGT data with features for:</p>
              <ul>
                <li><strong>Data Import:</strong> Load IGT files and configurations</li>
                <li><strong>Validation:</strong> Real-time data verification and error checking</li>
                <li><strong>Processing:</strong> Automated data transformation and loading</li>
                <li><strong>Monitoring:</strong> Track load progress and status</li>
                <li><strong>Error Handling:</strong> Comprehensive error reporting and recovery</li>
              </ul>
              <div class="alert alert-info mt-3">
                <i class="mdi mdi-lightbulb-on me-2"></i>
                <strong>Pro Tip:</strong> Always validate your data before starting the load process.
              </div>
            `
          }
        ]
      },
      // Add more loader-specific help categories here
    ];
  }

  getFilteredSections(): HelpSection[] {
    if (!this.searchTerm) {
      const activeCategory = this.helpCategories.find(cat => cat.id === this.activeCategory);
      return activeCategory ? activeCategory.sections : [];
    }

    // Search across all sections
    const allSections = this.helpCategories.flatMap(cat => cat.sections);
    return allSections.filter(section => 
      section.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      section.content.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  selectCategory(categoryId: string) {
    this.activeCategory = categoryId;
    const category = this.helpCategories.find(cat => cat.id === categoryId);
    if (category && category.sections.length > 0) {
      this.activeSection = category.sections[0].id;
    }
    this.searchTerm = '';
  }

  selectSection(sectionId: string) {
    this.activeSection = sectionId;
  }

  getActiveSection(): HelpSection | undefined {
    const sections = this.getFilteredSections();
    return sections.find(section => section.id === this.activeSection);
  }

  clearSearch() {
    this.searchTerm = '';
  }

  printHelp() {
    window.print();
  }

  getPreviousSection(): HelpSection | undefined {
    const sections = this.getFilteredSections();
    const currentIndex = sections.findIndex(section => section.id === this.activeSection);
    return currentIndex > 0 ? sections[currentIndex - 1] : undefined;
  }

  getNextSection(): HelpSection | undefined {
    const sections = this.getFilteredSections();
    const currentIndex = sections.findIndex(section => section.id === this.activeSection);
    return currentIndex < sections.length - 1 ? sections[currentIndex + 1] : undefined;
  }
}
