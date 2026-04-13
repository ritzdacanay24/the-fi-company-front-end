import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { SerialAssignmentsService } from './services/serial-assignments.service';
import { SerialReportPrintService } from '@app/shared/services/serial-report-print.service';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { ActionCellRendererComponent } from './action-cell-renderer/action-cell-renderer.component';

interface SerialAssignment {
  // Common fields
  unique_id: string;
  source_table: string;
  source_type: string;
  source_id: number;

  // Serial IDs and Numbers (from all sources)
  eyefi_serial_id?: number;
  eyefi_serial_number?: string;
  ul_label_id?: number;
  ul_number?: string;
  igt_serial_id?: number;
  igt_serial_number?: string;
  ags_serial_id?: number;
  ags_serial_number?: string;
  sg_asset_id?: number;
  sg_asset_number?: string;

  // Customer asset tracking
  customer_type_id?: number;
  customer_asset_id?: number;
  generated_asset_number?: string;

  // Work order / PO
  wo_number?: string;
  po_number?: string;

  // Batch tracking
  batch_id?: string;

  // Usage tracking
  used_date: string;
  used_by: string;
  status: string;

  // Void tracking
  is_voided?: number;
  voided_at?: string;
  voided_by?: string;
  void_reason?: string;

  // Verification tracking (NEW)
  requires_verification?: boolean;
  verification_status?: 'pending' | 'verified' | 'failed' | 'skipped';
  verification_photo?: string;
  verified_at?: string;
  verified_by?: string;
  verification_session_id?: string;

  // Additional details
  created_at: string;
  part_number?: string;
  customer_part_number?: string;
  wo_description?: string;
  property_site?: string;
  inspector_name?: string;
  customer_name?: string;

  // Legacy field mappings for backward compatibility
  id?: number;
  consumed_at?: string;
  consumed_by?: string;
}

interface VerificationSession {
  id: string;
  assignment_id: number;
  expected_serial: string;
  qr_data: string;
  expires_at: string;
  session_status: 'active' | 'completed' | 'expired';
  captured_serial?: string;
  match_result?: 'match' | 'mismatch' | 'pending';
  photo_path?: string;
}

interface VerificationResult {
  session_id: string;
  expected_serial: string;
  captured_serial: string;
  match_result: 'match' | 'mismatch' | 'pending';
  is_match: boolean;
  photo_path: string;
  ocr_confidence?: number;
}

interface FilterOptions {
  source_table?: string;
  search?: string;
  status?: string;
  wo_number?: string;
  eyefi_serial_number?: string;
  ul_number?: string;
  consumed_by?: string;
  used_by?: string;
  date_from?: string;
  date_to?: string;
  include_voided?: boolean;
}

interface AuditEntry {
  id: number;
  assignment_id: number;
  action: string;
  serial_type: string;
  serial_number: string;
  work_order_number?: string;
  assigned_by?: string;
  reason?: string;
  performed_by: string;
  performed_at: string;
}

@Component({
  selector: 'app-serial-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule, AgGridAngular, ActionCellRendererComponent],
  templateUrl: './serial-assignments.component.html',
  styleUrls: ['./serial-assignments.component.scss']
})
export class SerialAssignmentsComponent implements OnInit, OnDestroy {

  assignments: SerialAssignment[] = [];
  filteredAssignments: SerialAssignment[] = [];

  loading: boolean = false;
  error: string | null = null;

  // Verification state (NEW)
  currentVerificationSession: VerificationSession | null = null;
  currentVerificationAssignment: SerialAssignment | null = null;
  verificationStatus: 'idle' | 'active' | 'verified' | 'failed' = 'idle';
  verificationPolling: Subscription | null = null;
  verificationResult: VerificationResult | null = null;
  showVerificationModal = false;
  verificationQRData: string = '';
  verificationSessionTimer: any = null;
  verificationSecondsRemaining: number = 0;

  // AG Grid
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 100
  };
  gridOptions: GridOptions = {
    pagination: false,
    animateRows: true,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    groupDefaultExpanded: 1,
    autoGroupColumnDef: {
      headerName: 'Batch Group',
      minWidth: 250,
      cellRendererParams: {
        suppressCount: false,
        checkbox: false
      }
    },
    groupDisplayType: 'singleColumn'
  };

  // Pagination - removed, showing all records
  currentPage: number = 1;
  itemsPerPage: number = 999999; // Large number to get all records
  totalItems: number = 0;
  totalPages: number = 1;

  // Filters
  filters: FilterOptions = {};
  serialTypes = ['eyefi', 'ul', 'igt', 'sg', 'ags'];
  includeVoided: boolean = false;

  // View mode
  viewMode: 'table' | 'cards' = 'table';

  // Statistics
  stats = {
    total: 0,
    eyefi: 0,
    ul: 0,
    igt: 0,
    ags: 0,
    sg: 0,
    today: 0,
    thisWeek: 0,
    serialAssignments: 0,
    ulLabelUsages: 0,
    agsSerialGenerator: 0,
    sgAssetGenerator: 0,
    igtSerialNumbers: 0
  };

  // Selection
  selectedAssignments: Set<number> = new Set();

  // Audit trail
  showAuditModal: boolean = false;
  auditTrail: AuditEntry[] = [];
  auditLoading: boolean = false;
  selectedAssignmentForAudit?: SerialAssignment;

  // Action modals
  showVoidModal: boolean = false;
  showDeleteModal: boolean = false;
  voidReason: string = '';
  deleteReason: string = '';
  assignmentToVoid?: SerialAssignment;
  assignmentToDelete?: SerialAssignment;

  // Current user (get from your auth service)
  currentUser: string = 'current_user'; // TODO: Replace with actual user from auth service

  Math = Math;

  constructor(
    private serialAssignmentsService: SerialAssignmentsService,
    private serialReportPrintService: SerialReportPrintService
  ) {
    this.initializeGrid();
  }

  ngOnInit(): void {
    this.loadAssignments();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    // Clean up verification polling
    this.stopVerificationPolling();
    if (this.verificationSessionTimer) {
      clearInterval(this.verificationSessionTimer);
    }
  }

  initializeGrid(): void {
    this.columnDefs = [
      {
        headerName: 'ID',
        field: 'unique_id',
        width: 120,
        pinned: 'left'
      },
      {
        headerName: 'Source',
        field: 'source_type',
        width: 140,
        cellRenderer: (params: any) => {
          if (!params.data) return '';
          const badgeClass = this.getSourceBadgeClass(params.data.source_table);
          return `<span class="badge ${badgeClass}">${params.value}</span>`;
        }
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: (params: any) => {
          if (!params.data) return '';
          if (params.data.is_voided == 1 || params.data.is_voided === true) {
            return '<span class="badge bg-warning text-dark"><i class="mdi mdi-cancel"></i> VOIDED</span>';
          }
          const badgeClass = this.getSerialTypeBadgeClass(params.value);
          const icon = this.getSerialTypeIcon(params.value);
          return `<span class="badge ${badgeClass}"><i class="mdi ${icon}"></i> ${params.value?.toUpperCase()}</span>`;
        }
      },
      {
        headerName: 'EyeFi Serial',
        field: 'eyefi_serial_number',
        width: 150
      },
      {
        headerName: 'UL Label',
        field: 'ul_number',
        width: 140
      },
      {
        headerName: 'IGT Serial',
        field: 'igt_serial_number',
        width: 140,
        hide: true,
      },
      {
        headerName: 'AGS Asset',
        field: 'ags_serial_number',
        width: 140,
        hide: true,
      },
      {
        headerName: 'SG Asset',
        field: 'sg_asset_number',
        width: 140,
        hide: true,
      },
      {
        headerName: 'Asset Number',
        field: 'part_number',
        width: 150
      },
      {
        headerName: 'Customer Part #',
        field: 'customer_part_number',
        width: 150
      },
      {
        headerName: 'Customer Name',
        field: 'customer_name',
        width: 180
      },
      {
        headerName: 'Description',
        field: 'wo_description',
        width: 200
      },
      {
        headerName: 'Work Order / PO',
        field: 'wo_number',
        width: 150,
        valueGetter: (params: any) => {
          if (!params.data) return '';
          return params.data.wo_number || params.data.po_number || '-';
        }
      },
      {
        headerName: 'Batch ID',
        field: 'batch_id',
        width: 140,
        rowGroup: true,
        hide: true,
        valueFormatter: (params: any) => params.value || '-'
      },
      {
        headerName: 'Used Date',
        field: 'used_date',
        width: 160,
        valueFormatter: (params: any) => {
          if (!params.value) return '-';
          return new Date(params.value).toLocaleString();
        }
      },
      {
        headerName: 'Used By',
        field: 'used_by',
        width: 180
      },
      {
        headerName: 'Verification',
        field: 'verification_status',
        width: 140,
        cellRenderer: (params: any) => {
          if (!params.data) return '';
          const status = params.value;
          const requiresVerif = this.requiresVerification(params.data);
          
          if (!requiresVerif && !status) {
            return '<span class="text-muted small">N/A</span>';
          }
          
          if (status === 'verified') {
            return '<span class="badge bg-success"><i class="mdi mdi-check-circle"></i> Verified</span>';
          } else if (status === 'failed') {
            return '<span class="badge bg-danger"><i class="mdi mdi-alert-circle"></i> Failed</span>';
          } else if (status === 'pending' || requiresVerif) {
            return '<span class="badge bg-warning text-dark"><i class="mdi mdi-clock-outline"></i> Pending</span>';
          } else if (status === 'skipped') {
            return '<span class="badge bg-secondary"><i class="mdi mdi-minus-circle"></i> Skipped</span>';
          }
          
          return '<span class="text-muted small">-</span>';
        }
      },
      {
        headerName: 'Actions',
        width: 220,
        pinned: 'right',
        cellStyle: { 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '4px',
          overflow: 'visible'
        },
        cellRenderer: ActionCellRendererComponent,
        cellRendererParams: {
          onPrint: (data: any) => this.printSingleAssignment(data),
          onVoid: (data: any) => this.openVoidModal(data),
          onDelete: (data: any) => this.openDeleteModal(data),
          onRestore: (data: any) => this.restoreAssignment(data),
          onVerify: (data: any) => this.startSerialVerification(data),
          requiresVerification: (data: any) => this.requiresVerification(data)
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }

  async loadAssignments(page: number = 1): Promise<void> {
    this.loading = true;
    this.error = null;
    this.currentPage = page;

    try {
      // Load ALL records without pagination
      const response = await this.serialAssignmentsService.getAllConsumedSerials({
        ...this.filters,
        page: 1,
        limit: this.itemsPerPage // Very large limit to get all records
      });

      if (response.success) {
        this.assignments = response.data || [];
        this.filteredAssignments = [...this.assignments];
        this.totalItems = response.total || this.assignments.length;
        this.totalPages = 1; // Single page with all records
      } else {
        this.error = response.error || 'Failed to load assignments';
      }
    } catch (error: any) {
      this.error = error.message || 'An error occurred while loading assignments';
      console.error('Error loading assignments:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadStatistics(): Promise<void> {
    try {
      // Load summary from the comprehensive view
      const response = await this.serialAssignmentsService.getConsumedSerialsSummary();

      if (response.success && response.data) {
        // Initialize stats
        let total = 0;
        let eyefi = 0;
        let ul = 0;
        let igt = 0;
        let ags = 0;
        let sg = 0;
        let today = 0;
        let thisWeek = 0;
        let serialAssignments = 0;
        let ulLabelUsages = 0;
        let agsSerialGenerator = 0;
        let sgAssetGenerator = 0;
        let igtSerialNumbers = 0;

        // Aggregate data from all sources
        response.data.forEach((source: any) => {
          total += source.total_consumed || 0;
          eyefi += source.unique_eyefi_serials || 0;
          ul += source.unique_ul_labels || 0;
          igt += source.unique_igt_serials || 0;
          ags += source.unique_ags_serials || 0;
          sg += source.unique_sg_assets || 0;
          today += source.consumed_today || 0;
          thisWeek += source.consumed_this_week || 0;

          // Track by source table
          if (source.source_table === 'serial_assignments') {
            serialAssignments = source.total_consumed || 0;
          } else if (source.source_table === 'ul_label_usages') {
            ulLabelUsages = source.total_consumed || 0;
          } else if (source.source_table === 'agsSerialGenerator') {
            agsSerialGenerator = source.total_consumed || 0;
          } else if (source.source_table === 'sgAssetGenerator') {
            sgAssetGenerator = source.total_consumed || 0;
          } else if (source.source_table === 'igt_serial_numbers') {
            igtSerialNumbers = source.total_consumed || 0;
          }
        });

        this.stats = {
          total,
          eyefi,
          ul,
          igt,
          ags,
          sg,
          today,
          thisWeek,
          serialAssignments,
          ulLabelUsages,
          agsSerialGenerator,
          sgAssetGenerator,
          igtSerialNumbers
        };
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }

  applyFilters(): void {
    this.filters.include_voided = this.includeVoided;
    this.loadAssignments(); // Load all records with filters
  }

  clearFilters(): void {
    this.filters = {};
    this.includeVoided = false;
    this.loadAssignments(); // Load all records
  }

  onPageChange(page: number): void {
    // Page change removed - showing all records
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
  }

  toggleSelection(assignmentId: number): void {
    if (this.selectedAssignments.has(assignmentId)) {
      this.selectedAssignments.delete(assignmentId);
    } else {
      this.selectedAssignments.add(assignmentId);
    }
  }

  selectAll(): void {
    if (this.selectedAssignments.size === this.assignments.length) {
      this.selectedAssignments.clear();
    } else {
      this.assignments.forEach(a => {
        // Use source_id for selection
        if (a.source_id) {
          this.selectedAssignments.add(a.source_id);
        }
      });
    }
  }

  isSelected(assignmentId: number): boolean {
    return this.selectedAssignments.has(assignmentId);
  }

  // Get the ID to use for operations (source_id or id for backward compatibility)
  getAssignmentId(assignment: SerialAssignment): number {
    return assignment.source_id || assignment.id || 0;
  }

  // Get display serial number (prioritize eyefi, then others)
  getDisplaySerial(assignment: SerialAssignment): string {
    return assignment.eyefi_serial_number
      || assignment.ul_number
      || assignment.igt_serial_number
      || assignment.ags_serial_number
      || assignment.sg_asset_number
      || 'N/A';
  }

  // Get source badge class
  getSourceBadgeClass(sourceTable: string): string {
    const badges: { [key: string]: string } = {
      'serial_assignments': 'bg-primary',
      'ul_label_usages': 'bg-info',
      'agsSerialGenerator': 'bg-warning text-dark',
      'sgAssetGenerator': 'bg-success',
      'igt_serial_numbers': 'bg-secondary'
    };
    return badges[sourceTable] || 'bg-secondary';
  }

  // Get source display name
  getSourceDisplayName(sourceTable: string): string {
    const names: { [key: string]: string } = {
      'serial_assignments': 'New System',
      'ul_label_usages': 'UL Legacy',
      'agsSerialGenerator': 'AGS',
      'sgAssetGenerator': 'SG',
      'igt_serial_numbers': 'IGT'
    };
    return names[sourceTable] || sourceTable;
  }

  // Void operations
  openVoidModal(assignment: SerialAssignment): void {
    this.assignmentToVoid = assignment;
    this.voidReason = '';
    this.showVoidModal = true;
  }

  closeVoidModal(): void {
    this.showVoidModal = false;
    this.assignmentToVoid = undefined;
    this.voidReason = '';
  }

  async confirmVoid(): Promise<void> {
    if (!this.assignmentToVoid || !this.voidReason.trim()) {
      alert('Please provide a reason for voiding this assignment');
      return;
    }

    // Only allow voiding from serial_assignments (new system)
    if (this.assignmentToVoid.source_table !== 'serial_assignments') {
      alert('Can only void assignments from the new system. Legacy data cannot be voided.');
      return;
    }

    this.loading = true;
    try {
      const response = await this.serialAssignmentsService.voidAssignment(
        this.getAssignmentId(this.assignmentToVoid),
        this.voidReason,
        this.currentUser
      );

      if (response.success) {
        alert('Assignment voided successfully');
        this.closeVoidModal();
        this.refresh();
      } else {
        alert('Error: ' + response.error);
      }
    } catch (error: any) {
      alert('Error voiding assignment: ' + error.message);
    } finally {
      this.loading = false;
    }
  }

  async bulkVoid(): Promise<void> {
    if (this.selectedAssignments.size === 0) {
      alert('Please select assignments to void');
      return;
    }

    const reason = prompt('Enter reason for voiding selected assignments:');
    if (!reason) return;

    this.loading = true;
    try {
      const response = await this.serialAssignmentsService.bulkVoidAssignments(
        Array.from(this.selectedAssignments),
        reason,
        this.currentUser
      );

      if (response.success) {
        alert(response.message);
        this.selectedAssignments.clear();
        this.refresh();
      } else {
        alert('Error: ' + response.error);
      }
    } catch (error: any) {
      alert('Error voiding assignments: ' + error.message);
    } finally {
      this.loading = false;
    }
  }

  // Delete operations
  openDeleteModal(assignment: SerialAssignment): void {
    this.assignmentToDelete = assignment;
    this.deleteReason = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.assignmentToDelete = undefined;
    this.deleteReason = '';
  }

  async confirmDelete(): Promise<void> {
    if (!this.assignmentToDelete || !this.deleteReason.trim()) {
      alert('Please provide a reason for deleting this assignment');
      return;
    }

    // Only allow deleting from serial_assignments (new system)
    if (this.assignmentToDelete.source_table !== 'serial_assignments') {
      alert('Can only delete assignments from the new system. Legacy data cannot be deleted.');
      return;
    }

    if (!confirm('Are you sure you want to permanently delete this assignment? This cannot be undone.')) {
      return;
    }

    this.loading = true;
    try {
      const response = await this.serialAssignmentsService.deleteAssignment(
        this.getAssignmentId(this.assignmentToDelete),
        this.deleteReason,
        this.currentUser
      );

      if (response.success) {
        alert('Assignment deleted successfully');
        this.closeDeleteModal();
        this.refresh();
      } else {
        alert('Error: ' + response.error);
      }
    } catch (error: any) {
      alert('Error deleting assignment: ' + error.message);
    } finally {
      this.loading = false;
    }
  }

  // Restore operation
  async restoreAssignment(assignment: SerialAssignment): Promise<void> {
    // Only allow restoring from serial_assignments (new system)
    if (assignment.source_table !== 'serial_assignments') {
      alert('Can only restore assignments from the new system. Legacy data cannot be restored.');
      return;
    }

    const displaySerial = this.getDisplaySerial(assignment);
    if (!confirm(`Restore assignment for serial ${displaySerial}?`)) {
      return;
    }

    this.loading = true;
    try {
      const response = await this.serialAssignmentsService.restoreAssignment(
        this.getAssignmentId(assignment),
        this.currentUser
      );

      if (response.success) {
        alert('Assignment restored successfully');
        this.refresh();
      } else {
        alert('Error: ' + response.error);
      }
    } catch (error: any) {
      alert('Error restoring assignment: ' + error.message);
    } finally {
      this.loading = false;
    }
  }

  // Audit trail
  async openAuditModal(assignment?: SerialAssignment): Promise<void> {
    this.selectedAssignmentForAudit = assignment;
    this.showAuditModal = true;
    await this.loadAuditTrail(this.getAssignmentId(assignment) || undefined);
  }

  closeAuditModal(): void {
    this.showAuditModal = false;
    this.selectedAssignmentForAudit = undefined;
    this.auditTrail = [];
  }

  async loadAuditTrail(assignmentId?: number): Promise<void> {
    this.auditLoading = true;
    try {
      const response = await this.serialAssignmentsService.getAuditTrail(assignmentId);

      if (response.success) {
        this.auditTrail = response.data || [];
      } else {
        this.error = response.error || 'Failed to load audit trail';
      }
    } catch (error: any) {
      this.error = error.message || 'An error occurred while loading audit trail';
      console.error('Error loading audit trail:', error);
    } finally {
      this.auditLoading = false;
    }
  }

  getActionBadgeClass(action: string): string {
    switch (action.toLowerCase()) {
      case 'created': return 'bg-success';
      case 'voided': return 'bg-warning';
      case 'deleted': return 'bg-danger';
      case 'restored': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  getActionIcon(action: string): string {
    switch (action.toLowerCase()) {
      case 'created': return 'mdi-plus-circle';
      case 'voided': return 'mdi-cancel';
      case 'deleted': return 'mdi-delete';
      case 'restored': return 'mdi-restore';
      default: return 'mdi-help-circle';
    }
  }

  exportToCSV(): void {
    const headers = ['ID', 'Status', 'Serial Number', 'Work Order', 'Consumed Date', 'Consumed By'];
    const csvData = this.filteredAssignments.map(a => [
      a.id,
      a.status,
      a.eyefi_serial_number,
      a.wo_number || '',
      a.consumed_at,
      a.consumed_by
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `serial-assignments-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getSerialTypeBadgeClass(status: string): string {
    if (!status) return 'bg-secondary';
    switch (status.toLowerCase()) {
      case 'active': return 'bg-info';
      case 'consumed': return 'bg-primary';
      case 'cancelled': return 'bg-warning';
      case 'returned': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  getSerialTypeIcon(status: string): string {
    if (!status) return 'mdi-help-circle';
    switch (status.toLowerCase()) {
      case 'active': return 'mdi-play-circle';
      case 'consumed': return 'mdi-check-circle';
      case 'cancelled': return 'mdi-cancel';
      case 'returned': return 'mdi-arrow-u-left-top';
      default: return 'mdi-help-circle';
    }
  }

  refresh(): void {
    this.selectedAssignments.clear();
    this.loadAssignments(); // Load all records
    this.loadStatistics();
  }

  getActiveCount(): number {
    return this.filteredAssignments.filter(a => {
      return !(Number(a.is_voided) === 1);
    }).length;
  }

  getVoidedCount(): number {
    return this.filteredAssignments.filter(a => {
      return Number(a.is_voided) === 1;
    }).length;
  }

  get paginatedAssignments(): SerialAssignment[] {
    // Return all assignments since pagination is removed
    return this.filteredAssignments;
  }

  get pageNumbers(): number[] {
    // No pagination - return empty array
    return [];
  }

  // ========================================
  // VERIFICATION SYSTEM METHODS (NEW)
  // ========================================

  /**
   * Start verification process for a serial assignment
   */
  async startSerialVerification(assignment: SerialAssignment): Promise<void> {
    if (!assignment.eyefi_serial_number) {
      alert('No serial number found for this assignment');
      return;
    }

    if (assignment.source_table !== 'serial_assignments') {
      alert('Can only verify assignments from the new system');
      return;
    }

    // Store the assignment for retry purposes
    this.currentVerificationAssignment = assignment;

    try {
      this.loading = true;
      const response = await this.serialAssignmentsService.createVerificationSession(
        this.getAssignmentId(assignment),
        assignment.eyefi_serial_number,
        this.currentUser
      );

      if (response.success) {
        this.currentVerificationSession = response.session;
        this.verificationQRData = response.session.qr_data;
        this.verificationStatus = 'active';
        this.showVerificationModal = true;
        
        // Calculate seconds remaining until expiration
        const expiresAt = new Date(response.session.expires_at).getTime();
        const now = Date.now();
        this.verificationSecondsRemaining = Math.floor((expiresAt - now) / 1000);
        
        // Start polling for verification updates
        this.startVerificationPolling();
        
        // Start countdown timer
        this.startSessionTimer();
        
        console.log('Verification session created:', response.session.id);
      } else {
        alert('Failed to create verification session: ' + response.error);
      }
    } catch (error: any) {
      console.error('Error creating verification session:', error);
      alert('Error starting verification. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Retry verification for current assignment
   */
  retryVerification(): void {
    if (this.currentVerificationAssignment) {
      this.startSerialVerification(this.currentVerificationAssignment);
    }
  }

  /**
   * Poll for verification updates every second
   */
  private startVerificationPolling(): void {
    if (!this.currentVerificationSession) return;

    const sessionId = this.currentVerificationSession.id;
    
    // Stop any existing polling
    this.stopVerificationPolling();
    
    // Poll every 1 second, stop after 5 minutes (300 polls)
    let pollCount = 0;
    this.verificationPolling = interval(1000)
      .pipe(
        takeWhile(() => 
          this.verificationStatus === 'active' && 
          pollCount < 300
        )
      )
      .subscribe(async () => {
        pollCount++;
        await this.checkVerificationStatus(sessionId);
      });
  }

  /**
   * Stop verification polling
   */
  private stopVerificationPolling(): void {
    if (this.verificationPolling) {
      this.verificationPolling.unsubscribe();
      this.verificationPolling = null;
    }
  }

  /**
   * Start session countdown timer
   */
  private startSessionTimer(): void {
    if (this.verificationSessionTimer) {
      clearInterval(this.verificationSessionTimer);
    }

    this.verificationSessionTimer = setInterval(() => {
      this.verificationSecondsRemaining--;
      
      if (this.verificationSecondsRemaining <= 0) {
        clearInterval(this.verificationSessionTimer);
        this.onVerificationExpired();
      }
    }, 1000);
  }

  /**
   * Get formatted time remaining
   */
  getTimeRemaining(): string {
    const minutes = Math.floor(this.verificationSecondsRemaining / 60);
    const seconds = this.verificationSecondsRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if verification is complete
   */
  private async checkVerificationStatus(sessionId: string): Promise<void> {
    try {
      const response = await this.serialAssignmentsService.getVerificationSession(sessionId);

      if (response.success) {
        const session = response.session;
        
        // Update seconds remaining
        this.verificationSecondsRemaining = Math.max(0, response.seconds_remaining || 0);
        
        // Check if verification complete
        if (session.match_result && session.match_result !== 'pending') {
          this.onVerificationComplete(session);
        }

        // Check if session expired
        if (response.is_expired) {
          this.onVerificationExpired();
        }
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  }

  /**
   * Handle verification completion
   */
  private onVerificationComplete(session: any): void {
    // Stop polling and timer
    this.stopVerificationPolling();
    if (this.verificationSessionTimer) {
      clearInterval(this.verificationSessionTimer);
    }

    // Update status
    const isMatch = session.match_result === 'match';
    this.verificationStatus = isMatch ? 'verified' : 'failed';
    
    this.verificationResult = {
      session_id: session.id,
      expected_serial: session.expected_serial,
      captured_serial: session.captured_serial,
      match_result: session.match_result,
      is_match: isMatch,
      photo_path: session.photo_path,
      ocr_confidence: session.ocr_confidence
    };

    // Play sound feedback
    this.playVerificationSound(isMatch);

    // Refresh assignment list to show verified status
    this.refresh();
  }

  /**
   * Handle session expiration
   */
  private onVerificationExpired(): void {
    this.stopVerificationPolling();
    if (this.verificationSessionTimer) {
      clearInterval(this.verificationSessionTimer);
    }

    this.verificationStatus = 'idle';
    alert('Verification session expired. Please start a new verification.');
    this.closeVerificationModal();
  }

  /**
   * Close verification modal
   */
  closeVerificationModal(): void {
    this.stopVerificationPolling();
    if (this.verificationSessionTimer) {
      clearInterval(this.verificationSessionTimer);
    }

    this.showVerificationModal = false;
    this.currentVerificationSession = null;
    this.currentVerificationAssignment = null;
    this.verificationStatus = 'idle';
    this.verificationResult = null;
    this.verificationQRData = '';
    this.verificationSecondsRemaining = 0;
  }

  /**
   * Get tablet companion URL
   */
  getTabletCompanionUrl(): string {
    return `${window.location.origin}/backend/tablet-companion.html`;
  }

  /**
   * Copy session ID to clipboard
   */
  copySessionId(): void {
    if (!this.currentVerificationSession) return;
    
    navigator.clipboard.writeText(this.currentVerificationSession.id)
      .then(() => alert('Session ID copied to clipboard!'))
      .catch(err => console.error('Failed to copy:', err));
  }

  /**
   * Copy tablet URL to clipboard
   */
  copyTabletUrl(): void {
    navigator.clipboard.writeText(this.getTabletCompanionUrl())
      .then(() => alert('Tablet URL copied to clipboard!'))
      .catch(err => console.error('Failed to copy:', err));
  }

  /**
   * Play sound feedback
   */
  private playVerificationSound(isSuccess: boolean): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = isSuccess ? 800 : 400;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  /**
   * Check if assignment requires verification
   */
  requiresVerification(assignment: SerialAssignment): boolean {
    // Already verified
    if (assignment.verification_status === 'verified') {
      return false;
    }

    // Only new system assignments
    if (assignment.source_table !== 'serial_assignments') {
      return false;
    }

    // Rule 1: High-value customers (IGT, ATI, Aristocrat)
    const highValueCustomers = ['IGT', 'ATI', 'Aristocrat'];
    if (assignment.customer_name && highValueCustomers.some(c => 
      assignment.customer_name?.toUpperCase().includes(c.toUpperCase())
    )) {
      return true;
    }

    // Rule 2: Already flagged as requiring verification
    if (assignment.requires_verification) {
      return true;
    }

    // Rule 3: Pending verification status
    if (assignment.verification_status === 'pending') {
      return true;
    }

    return false;
  }

  /**
   * Bulk verify selected assignments
   */
  async bulkVerifyAssignments(): Promise<void> {
    const assignmentsToVerify = this.assignments.filter(a => 
      this.selectedAssignments.has(this.getAssignmentId(a)) &&
      this.requiresVerification(a)
    );

    if (assignmentsToVerify.length === 0) {
      alert('No assignments requiring verification selected');
      return;
    }

    for (const assignment of assignmentsToVerify) {
      await this.startSerialVerification(assignment);
      
      // Wait for verification to complete before next
      await this.waitForVerification();
    }
  }

  /**
   * Wait for current verification to complete
   */
  private waitForVerification(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.verificationStatus !== 'active') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  }

  /**
   * Get verification status badge class
   */
  getVerificationBadgeClass(status?: string): string {
    switch (status) {
      case 'verified': return 'bg-success';
      case 'failed': return 'bg-danger';
      case 'pending': return 'bg-warning text-dark';
      case 'skipped': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  /**
   * Get verification status icon
   */
  getVerificationIcon(status?: string): string {
    switch (status) {
      case 'verified': return 'mdi-check-circle';
      case 'failed': return 'mdi-alert-circle';
      case 'pending': return 'mdi-clock-outline';
      case 'skipped': return 'mdi-minus-circle';
      default: return 'mdi-help-circle';
    }
  }

  /**
   * Print Serial Number Report for all filtered assignments
   */
  async printAllAssignments(): Promise<void> {
    if (!this.filteredAssignments || this.filteredAssignments.length === 0) {
      alert('No assignments to print');
      return;
    }

    this.loading = true;
    try {
      // Use current filtered assignments (they already have full data from the initial load)
      // Group assignments by batch_id first (for batched assignments), then by work order
      const groupedByBatch = new Map<string, any>();
      
      this.filteredAssignments.forEach(assignment => {
        // If assignment has batch_id, use that as the primary grouping key
        // Otherwise, fall back to work order number
        const groupKey = assignment.batch_id || assignment.wo_number || assignment.po_number || `SINGLE-${assignment.id}`;
        
        if (!groupedByBatch.has(groupKey)) {
          const firstAssignment = assignment;
          groupedByBatch.set(groupKey, {
            workOrder: {
              number: firstAssignment.wo_number || firstAssignment.po_number || 'N/A',
              part: firstAssignment.part_number,
              cp_cust_part: firstAssignment.customer_part_number,
              description: firstAssignment.wo_description
            },
            batch: {
              quantity: 0,
              status: firstAssignment.status,
              date: new Date(firstAssignment.used_date || firstAssignment.created_at).toLocaleString(),
              createdBy: firstAssignment.used_by,
              batchId: firstAssignment.batch_id || null
            },
            customer: firstAssignment.customer_name || 'N/A',
            assets: [],
            timestamp: new Date(firstAssignment.used_date || firstAssignment.created_at),
            createdBy: firstAssignment.used_by || this.currentUser
          });
        }
        
        const batchData = groupedByBatch.get(groupKey);
        batchData.batch.quantity++;
        batchData.assets.push({
          index: batchData.assets.length + 1,
          assetNumber: assignment.generated_asset_number || 'N/A',
          eyefiSerial: assignment.eyefi_serial_number || 'N/A',
          ulNumber: assignment.ul_number || 'N/A',
          igtSerial: assignment.igt_serial_number,
          agsAsset: assignment.ags_serial_number,
          sgAsset: assignment.sg_asset_number
        });
      });

      // Use the shared service to print
      this.serialReportPrintService.printMultiWorkOrderReport(groupedByBatch, this.currentUser);
    } catch (error: any) {
      console.error('Error preparing print data:', error);
      alert('Failed to prepare print data');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Print Serial Number Report for a single assignment
   */
  async printSingleAssignment(assignment: SerialAssignment): Promise<void> {
    if (!assignment) return;

    // Only print for serial_assignments (new system)
    if (assignment.source_table !== 'serial_assignments') {
      alert('Printing is only available for new system assignments');
      return;
    }

    this.loading = true;
    try {
      // Fetch full assignment details from backend
      const response = await this.serialAssignmentsService.getAssignmentById(assignment.source_id);
      
      // Handle response - it might be wrapped in a data property or be the object directly
      const detailedAssignment = response?.data || response;

      if (!detailedAssignment) {
        alert('Failed to fetch assignment details');
        return;
      }

      console.log('Detailed Assignment:', detailedAssignment); // Debug log

      // Check if this assignment has a batch_id - if so, print entire batch
      if (detailedAssignment.batch_id) {
        console.log('Assignment has batch_id:', detailedAssignment.batch_id);
        await this.printBatchAssignments(detailedAssignment.batch_id, detailedAssignment);
        return;
      }

      // Create print data for single assignment with full details
      const printData = {
        workOrder: {
          number: detailedAssignment.wo_number || detailedAssignment.po_number || assignment.wo_number || assignment.po_number || 'N/A',
          part: detailedAssignment.part_number || assignment.part_number || 'N/A',
          cp_cust_part: detailedAssignment.customer_part_number || assignment.customer_part_number || 'N/A',
          description: detailedAssignment.wo_description || assignment.wo_description || 'N/A',
          qty_ord: detailedAssignment.qty_ord || 'N/A',
          due_date: detailedAssignment.due_date || 'N/A',
          routing: detailedAssignment.routing || 'N/A',
          line: detailedAssignment.line || 'N/A'
        },
        batch: {
          quantity: 1,
          status: detailedAssignment.status || assignment.status || 'N/A',
          category: 'Serial Assignment',
          date: new Date(detailedAssignment.used_date || detailedAssignment.created_at || assignment.used_date || assignment.created_at).toLocaleString(),
          createdBy: detailedAssignment.used_by || assignment.used_by || this.currentUser,
          batchId: null
        },
        customer: detailedAssignment.customer_name || assignment.customer_name || 'N/A',
        assets: [{
          index: 1,
          assetNumber: detailedAssignment.generated_asset_number || assignment.generated_asset_number || 'N/A',
          eyefiSerial: detailedAssignment.eyefi_serial_number || assignment.eyefi_serial_number || 'N/A',
          ulNumber: detailedAssignment.ul_number || assignment.ul_number || 'N/A',
          ulCategory: detailedAssignment.ul_category || 'N/A',
          igtSerial: detailedAssignment.igt_serial_number || assignment.igt_serial_number || 'N/A',
          agsAsset: detailedAssignment.ags_serial_number || assignment.ags_serial_number || 'N/A',
          sgAsset: detailedAssignment.sg_asset_number || assignment.sg_asset_number || 'N/A'
        }],
        timestamp: new Date(detailedAssignment.used_date || detailedAssignment.created_at || assignment.used_date || assignment.created_at),
        createdBy: detailedAssignment.used_by || assignment.used_by || this.currentUser
      };

      // Use the shared service to print
      this.serialReportPrintService.printSerialReport(printData);
    } catch (error: any) {
      console.error('Error fetching assignment details:', error);
      alert('Failed to fetch assignment details for printing');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Print all assignments in a batch together
   */
  async printBatchAssignments(batchId: string, sampleAssignment: any): Promise<void> {
    try {
      // Fetch all assignments with this batch_id from the view
      const batchResponse = await this.serialAssignmentsService.getAssignments({
        page: 1,
        limit: 9999 // Get all assignments in batch
      });

      const allAssignments = batchResponse?.data || [];
      
      // Filter to only assignments with matching batch_id
      const batchAssignments = allAssignments.filter((a: any) => a.batch_id === batchId);

      if (!batchAssignments || batchAssignments.length === 0) {
        console.warn('No batch assignments found for batch_id:', batchId);
        return;
      }

      console.log(`Found ${batchAssignments.length} assignments in batch ${batchId}`);

      // Build the print data
      const printData = {
        workOrder: {
          number: sampleAssignment.wo_number || sampleAssignment.po_number || 'N/A',
          part: sampleAssignment.part_number || 'N/A',
          cp_cust_part: sampleAssignment.customer_part_number || 'N/A',
          description: sampleAssignment.wo_description || 'N/A',
          qty_ord: sampleAssignment.qty_ord || 'N/A',
          due_date: sampleAssignment.due_date || 'N/A',
          routing: sampleAssignment.routing || 'N/A',
          line: sampleAssignment.line || 'N/A'
        },
        batch: {
          quantity: batchAssignments.length,
          status: sampleAssignment.status || 'N/A',
          category: 'Serial Assignment',
          date: new Date(sampleAssignment.used_date || sampleAssignment.created_at).toLocaleString(),
          createdBy: sampleAssignment.used_by || this.currentUser,
          batchId: batchId
        },
        customer: sampleAssignment.customer_name || 'N/A',
        assets: batchAssignments.map((assignment: any, index: number) => ({
          index: index + 1,
          assetNumber: assignment.generated_asset_number || assignment.part_number || 'N/A',
          eyefiSerial: assignment.eyefi_serial_number || 'N/A',
          ulNumber: assignment.ul_number || 'N/A',
          ulCategory: assignment.ul_category || 'N/A',
          igtSerial: assignment.igt_serial_number || 'N/A',
          agsAsset: assignment.ags_serial_number || 'N/A',
          sgAsset: assignment.sg_asset_number || 'N/A'
        })),
        timestamp: new Date(sampleAssignment.used_date || sampleAssignment.created_at),
        createdBy: sampleAssignment.used_by || this.currentUser
      };

      // Use the shared service to print
      this.serialReportPrintService.printSerialReport(printData);
    } catch (error: any) {
      console.error('Error fetching batch assignments:', error);
      alert('Failed to fetch batch assignments for printing');
    }
  }
}
