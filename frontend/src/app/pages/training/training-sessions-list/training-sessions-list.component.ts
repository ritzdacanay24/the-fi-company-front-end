import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TrainingService } from '../services/training.service';
import { TrainingSession, TrainingMetrics } from '../models/training.model';

@Component({
  selector: 'app-training-sessions-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbDropdownModule],
  templateUrl: './training-sessions-list.component.html',
  styleUrls: ['./training-sessions-list.component.scss']
})
export class TrainingSessionsListComponent implements OnInit, OnDestroy {
  
  // Make Math available to template
  Math = Math;
  
  allSessions: TrainingSession[] = [];
  filteredSessions: TrainingSession[] = [];
  selectedSessions: number[] = [];
  
  // Loading states
  isLoading = false;
  isProcessing = false;
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  
  // Search and filters
  searchForm: FormGroup;
  statusFilter = 'all';
  dateRangeFilter = 'all';
  facilitatorFilter = 'all';
  
  // Sorting
  sortField: keyof TrainingSession = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // UI states
  showDeleteModal = false;
  sessionToDelete: TrainingSession | null = null;
  showBulkActions = false;
  
  // Auto-refresh
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds
  
  // Available facilitators for filter
  facilitators: string[] = [];
  
  constructor(
    private router: Router,
    private trainingService: TrainingService,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      searchTerm: [''],
      status: ['all'],
      dateRange: ['all'],
      facilitator: ['all']
    });
  }

  ngOnInit(): void {
    this.loadSessions();
    this.startAutoRefresh();
    this.setupSearchSubscription();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private loadSessions(): void {
    this.isLoading = true;
    
    this.trainingService.getTrainingSessions().subscribe({
      next: (sessions) => {
        this.allSessions = sessions.map(session => this.mapTrainingSessionData(session));
        this.extractFacilitators();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading sessions:', error);
        this.isLoading = false;
      }
    });
  }

  private mapTrainingSessionData(session: any): TrainingSession {
    return {
      ...session,
      startTime: session.start_time || session.startTime,
      endTime: session.end_time || session.endTime,
      facilitatorName: session.facilitator_name || session.facilitatorName,
      createdBy: session.created_by || session.createdBy,
      createdDate: session.created_date || session.createdDate,
      updatedDate: session.updated_date || session.updatedDate,
      categoryId: session.category_id || session.categoryId,
      categoryName: session.category_name || session.categoryName,
      categoryColor: session.category_color || session.categoryColor,
      expectedCount: parseInt(session.expected_count || session.expectedCount || '0'),
      completedCount: parseInt(session.completed_count || session.completedCount || '0')
    };
  }

  private extractFacilitators(): void {
    const facilitatorSet = new Set(this.allSessions.map(s => s.facilitatorName));
    this.facilitators = Array.from(facilitatorSet).sort();
  }

  private setupSearchSubscription(): void {
    this.searchForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  applyFilters(): void {
    const formValue = this.searchForm.value;
    let filtered = [...this.allSessions];

    // Search term filter
    if (formValue.searchTerm) {
      const term = formValue.searchTerm.toLowerCase();
      filtered = filtered.filter(session => 
        session.title.toLowerCase().includes(term) ||
        session.description?.toLowerCase().includes(term) ||
        session.facilitatorName.toLowerCase().includes(term) ||
        session.location.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (formValue.status !== 'all') {
      filtered = filtered.filter(session => session.status === formValue.status);
    }

    // Date range filter
    if (formValue.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.date);
        
        switch (formValue.dateRange) {
          case 'today':
            return sessionDate.toDateString() === today.toDateString();
          case 'week':
            const weekAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
            return sessionDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
            return sessionDate >= monthAgo;
          case 'future':
            return sessionDate >= today;
          case 'past':
            return sessionDate < today;
          default:
            return true;
        }
      });
    }

    // Facilitator filter
    if (formValue.facilitator !== 'all') {
      filtered = filtered.filter(session => session.facilitatorName === formValue.facilitator);
    }

    // Apply sorting
    this.sortSessions(filtered);
    
    this.filteredSessions = filtered;
    this.updatePagination();
  }

  private sortSessions(sessions: TrainingSession[]): void {
    sessions.sort((a, b) => {
      let aValue = a[this.sortField];
      let bValue = b[this.sortField];
      
      // Handle date sorting
      if (this.sortField === 'date') {
        aValue = new Date(a.date + 'T' + a.startTime).getTime();
        bValue = new Date(b.date + 'T' + b.startTime).getTime();
      }
      
      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredSessions.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  // Sorting methods
  sort(field: keyof TrainingSession): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: keyof TrainingSession): string {
    if (this.sortField !== field) return 'mdi-sort';
    return this.sortDirection === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending';
  }

  // Pagination methods
  get paginatedSessions(): TrainingSession[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredSessions.slice(start, end);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Selection methods
  toggleSessionSelection(sessionId: number): void {
    const index = this.selectedSessions.indexOf(sessionId);
    if (index > -1) {
      this.selectedSessions.splice(index, 1);
    } else {
      this.selectedSessions.push(sessionId);
    }
    this.showBulkActions = this.selectedSessions.length > 0;
  }

  toggleSelectAll(): void {
    if (this.selectedSessions.length === this.paginatedSessions.length) {
      this.selectedSessions = [];
    } else {
      this.selectedSessions = this.paginatedSessions.map(s => s.id);
    }
    this.showBulkActions = this.selectedSessions.length > 0;
  }

  isSelected(sessionId: number): boolean {
    return this.selectedSessions.includes(sessionId);
  }

  get isAllSelected(): boolean {
    return this.paginatedSessions.length > 0 && 
           this.selectedSessions.length === this.paginatedSessions.length;
  }

  get isPartiallySelected(): boolean {
    return this.selectedSessions.length > 0 && 
           this.selectedSessions.length < this.paginatedSessions.length;
  }

  // CRUD Operations
  createNewSession(): void {
    this.router.navigate(['/training/setup']);
  }

  editSession(session: TrainingSession): void {
    this.router.navigate(['/training/setup', session.id]);
  }

  manageAttendees(session: TrainingSession): void {
    // Navigate to setup page with focus on attendees section
    this.router.navigate(['/training/setup', session.id], { 
      queryParams: { tab: 'attendees' } 
    });
  }

  duplicateSession(session: TrainingSession): void {
    // Navigate to setup with session data for duplication
    this.router.navigate(['/training/setup'], { 
      queryParams: { duplicate: session.id } 
    });
  }

  confirmDeleteSession(session: TrainingSession): void {
    this.sessionToDelete = session;
    this.showDeleteModal = true;
  }

  deleteSession(): void {
    if (!this.sessionToDelete) return;
    
    this.isProcessing = true;
    this.trainingService.deleteTrainingSession(this.sessionToDelete.id).subscribe({
      next: () => {
        this.loadSessions();
        this.closeDeleteModal();
        this.isProcessing = false;
      },
      error: (error) => {
        console.error('Error deleting session:', error);
        this.isProcessing = false;
      }
    });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.sessionToDelete = null;
  }

  // Navigation methods
  viewSessionDetails(session: TrainingSession): void {
    // Navigate to attendance dashboard for details
    this.router.navigate(['/training/attendance', session.id]);
  }

  goToSignOff(session: TrainingSession): void {
    this.router.navigate(['/training/sign-off', session.id]);
  }

  goToLiveSessions(): void {
    this.router.navigate(['/training/live']);
  }

  // Session status methods
  getStatusClass(status: string): string {
    switch (status) {
      case 'scheduled': return 'badge bg-primary';
      case 'in-progress': return 'badge bg-success';
      case 'completed': return 'badge bg-secondary';
      case 'cancelled': return 'badge bg-danger';
      default: return 'badge bg-light text-dark';
    }
  }

  getStatusDisplayText(status: string): string {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  canEditSession(session: TrainingSession): boolean {
    return session.status === 'scheduled';
  }

  canManageAttendees(session: TrainingSession): boolean {
    // Allow managing attendees for scheduled and in-progress sessions
    return session.status === 'scheduled' || session.status === 'in-progress';
  }

  canDeleteSession(session: TrainingSession): boolean {
    return session.status === 'scheduled' || session.status === 'cancelled';
  }

  canStartSession(session: TrainingSession): boolean {
    return session.status === 'scheduled';
  }

  // Utility methods
  formatDate(dateString: string): string {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'TBD';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(timeString: string): string {
    if (!timeString) return 'TBD';
    const time = new Date(`2000-01-01T${timeString}`);
    if (isNaN(time.getTime())) return 'TBD';
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTime(session: TrainingSession): string {
    if (!session.date || !session.startTime) return 'TBD';
    const dateTime = new Date(`${session.date}T${session.startTime}`);
    if (isNaN(dateTime.getTime())) return 'TBD';
    return dateTime.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDaysUntilSession(session: TrainingSession): number {
    const today = new Date();
    const sessionDate = new Date(session.date);
    const diffTime = sessionDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Auto-refresh
  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      if (!this.isLoading && !this.isProcessing) {
        this.loadSessions();
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  refresh(): void {
    this.loadSessions();
  }

  // Bulk operations
  bulkDelete(): void {
    if (this.selectedSessions.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${this.selectedSessions.length} selected sessions?`)) {
      this.isProcessing = true;
      
      // TODO: Implement bulk delete API call
      console.log('Bulk deleting sessions:', this.selectedSessions);
      
      // For now, delete one by one
      const deletePromises = this.selectedSessions.map(id => 
        this.trainingService.deleteTrainingSession(id).toPromise()
      );
      
      Promise.all(deletePromises).then(() => {
        this.selectedSessions = [];
        this.showBulkActions = false;
        this.loadSessions();
        this.isProcessing = false;
      }).catch(error => {
        console.error('Error in bulk delete:', error);
        this.isProcessing = false;
      });
    }
  }

  exportSessions(): void {
    // TODO: Implement export functionality
    console.log('Exporting sessions:', this.selectedSessions.length > 0 ? this.selectedSessions : this.filteredSessions);
  }

  // Additional helper methods for template
  trackBySessionId(index: number, session: TrainingSession): number {
    return session.id;
  }

  getSessionCountByStatus(status: string): number {
    return this.allSessions.filter(session => session.status === status).length;
  }
}