import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '@app/shared/shared.module';
import { SerialAssignmentsService } from './services/serial-assignments.service';

interface SerialAssignment {
  id: number;
  eyefi_serial_id: number;
  eyefi_serial_number: string;
  ul_label_id?: number;
  ul_number?: string;
  wo_number?: string;
  consumed_at: string;
  consumed_by: string;
  status: 'active' | 'consumed' | 'cancelled' | 'returned';
  created_at: string;
  is_voided?: boolean;
  voided_by?: string;
  voided_at?: string;
  void_reason?: string;
}

interface FilterOptions {
  status?: string;
  wo_number?: string;
  eyefi_serial_number?: string;
  ul_number?: string;
  consumed_by?: string;
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
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './serial-assignments.component.html',
  styleUrls: ['./serial-assignments.component.scss']
})
export class SerialAssignmentsComponent implements OnInit {
  
  assignments: SerialAssignment[] = [];
  filteredAssignments: SerialAssignment[] = [];
  
  loading: boolean = false;
  error: string | null = null;
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 50;
  totalItems: number = 0;
  totalPages: number = 0;
  
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
    today: 0,
    thisWeek: 0
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
    private serialAssignmentsService: SerialAssignmentsService
  ) {}

  ngOnInit(): void {
    this.loadAssignments();
    this.loadStatistics();
  }

  async loadAssignments(page: number = 1): Promise<void> {
    this.loading = true;
    this.error = null;
    this.currentPage = page;
    
    try {
      const response = await this.serialAssignmentsService.getAssignments({
        ...this.filters,
        page: this.currentPage,
        limit: this.itemsPerPage
      });
      
      if (response.success) {
        this.assignments = response.data || [];
        this.filteredAssignments = [...this.assignments];
        this.totalItems = response.total || this.assignments.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
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
      const response = await this.serialAssignmentsService.getStatistics();
      
      if (response.success && response.data) {
        this.stats = {
          total: response.data.total || 0,
          eyefi: response.data.eyefi || 0,
          ul: response.data.ul || 0,
          igt: response.data.igt || 0,
          today: response.data.today || 0,
          thisWeek: response.data.this_week || 0
        };
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }

  applyFilters(): void {
    this.filters.include_voided = this.includeVoided;
    this.currentPage = 1;
    this.loadAssignments();
  }

  clearFilters(): void {
    this.filters = {};
    this.includeVoided = false;
    this.loadAssignments();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadAssignments(page);
    }
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
      this.assignments.forEach(a => this.selectedAssignments.add(a.id));
    }
  }

  isSelected(assignmentId: number): boolean {
    return this.selectedAssignments.has(assignmentId);
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

    this.loading = true;
    try {
      const response = await this.serialAssignmentsService.voidAssignment(
        this.assignmentToVoid.id,
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

    if (!confirm('Are you sure you want to permanently delete this assignment? This cannot be undone.')) {
      return;
    }

    this.loading = true;
    try {
      const response = await this.serialAssignmentsService.deleteAssignment(
        this.assignmentToDelete.id,
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
    if (!confirm(`Restore assignment for serial ${assignment.eyefi_serial_number}?`)) {
      return;
    }

    this.loading = true;
    try {
      const response = await this.serialAssignmentsService.restoreAssignment(
        assignment.id,
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
    await this.loadAuditTrail(assignment?.id);
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
    this.loadAssignments(this.currentPage);
    this.loadStatistics();
  }

  get paginatedAssignments(): SerialAssignment[] {
    return this.filteredAssignments;
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}
