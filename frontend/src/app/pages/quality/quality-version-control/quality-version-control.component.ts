import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { 
  QualityVersionControlService, 
  QualityDocument, 
  QualityRevision, 
  VersionControlStats,
  CreateDocumentRequest,
  CreateRevisionRequest
} from '@app/core/api/quality-version-control/quality-version-control.service';

// Import new sub-components
import { QualityDocumentGridComponent } from './components/quality-document-grid/quality-document-grid.component';
import { DocumentStatsComponent } from './components/document-stats/document-stats.component';
import { ApprovalQueueComponent } from './components/approval-queue/approval-queue.component';
import { RevisionWorkflowComponent } from './components/revision-workflow/revision-workflow.component';

@Component({
  selector: 'app-quality-version-control',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    RouterModule,
    QualityDocumentGridComponent,
    DocumentStatsComponent,
    ApprovalQueueComponent,
    RevisionWorkflowComponent
  ],
  templateUrl: './quality-version-control.component.html',
  styleUrls: ['./quality-version-control.component.scss']
})
export class QualityVersionControlComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Modal references
  @ViewChild('createRevisionModal') createRevisionModalTemplate!: TemplateRef<any>;
  @ViewChild('revisionsModal') revisionsModalTemplate!: TemplateRef<any>;
  @ViewChild('exportModal') exportModalTemplate!: TemplateRef<any>;
  
  // Data
  documents: QualityDocument[] = [];
  filteredDocuments: QualityDocument[] = [];
  selectedDocument: QualityDocument | null = null;
  documentRevisions: QualityRevision[] = [];
  stats: VersionControlStats | null = null;
  
  // Loading states
  loading = true;
  creating = false;
  updating = false;
  
  // UI state
  showCreateForm = false;
  showRevisionForm = false;
  selectedTab: 'documents' | 'stats' | 'approvals' = 'documents';
  exporting = false;
  
  // Forms
  createDocumentForm: FormGroup;
  createRevisionForm: FormGroup;
  
  // Filters
  filterType = '';
  filterCategory = '';
  filterDepartment = '';
  filterStatus = '';
  searchQuery = '';
  
  // Options
  documentTypes = [
    { value: 'FRM', label: 'Form', description: 'Quality forms and checklists' },
    { value: 'SOP', label: 'Standard Operating Procedure', description: 'Step-by-step procedures' },
    { value: 'CHK', label: 'Checklist', description: 'Quality checklists' },
    { value: 'INS', label: 'Instruction', description: 'Work instructions' },
    { value: 'QCP', label: 'Quality Control Plan', description: 'Quality control procedures' },
    { value: 'WI', label: 'Work Instruction', description: 'Detailed work instructions' }
  ];
  
  categories = [
    { value: 'quality_control', label: 'Quality Control' },
    { value: 'training', label: 'Training' },
    { value: 'process', label: 'Process' },
    { value: 'safety', label: 'Safety' },
    { value: 'compliance', label: 'Compliance' }
  ];
  
  departments: string[] = [];

  constructor(
    private versionControlService: QualityVersionControlService,
    private fb: FormBuilder,
    private modalService: NgbModal
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadData();
    this.loadDepartments();
  }

  // Event handlers for sub-components
  onDocumentSelected(document: QualityDocument): void {
    this.selectedDocument = document;
    const documentId = typeof document.id === 'string' ? parseInt(document.id) : document.id;
    this.loadDocumentRevisions(documentId);
  }

  onDocumentAction(event: {action: string, document: QualityDocument}): void {
    switch (event.action) {
      case 'view':
        this.onViewDocument(event.document);
        break;
      case 'revisions':
        this.onViewRevisions(event.document);
        break;
      case 'export':
        this.onExportDocument(event.document);
        break;
    }
  }

  onRevisionAction(event: {action: string, revision: QualityRevision}): void {
    switch (event.action) {
      case 'approve':
        this.onApproveRevision(event.revision);
        break;
      case 'reject':
        this.onRejectRevision(event.revision);
        break;
      case 'submit':
        this.onSubmitForApproval(event.revision);
        break;
      case 'withdraw':
        this.onWithdrawRevision(event.revision);
        break;
    }
  }

  onCreateRevisionRequest(request: CreateRevisionRequest): void {
    this.creating = true;
    this.versionControlService.createRevision(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.creating = false)
      )
      .subscribe({
        next: (revision) => {
          console.log('Revision created:', revision);
          this.showNotification(`Revision ${revision.revision_number} created successfully!`, 'success');
          
          // Refresh data
          if (this.selectedDocument) {
            const documentId = typeof this.selectedDocument.id === 'string' ? parseInt(this.selectedDocument.id) : this.selectedDocument.id;
            this.loadDocumentRevisions(documentId);
          }
          this.loadData(); // Refresh to update current revision info
        },
        error: (error) => {
          console.error('Error creating revision:', error);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.createDocumentForm = this.fb.group({
      document_type: ['FRM', Validators.required],
      title: ['', Validators.required],
      description: [''],
      category: ['quality_control', Validators.required],
      department: ['', Validators.required],
      initial_revision: this.fb.group({
        title: ['', Validators.required],
        description: [''],
        change_description: ['Initial version', Validators.required],
        effective_date: [this.formatDate(new Date()), Validators.required]
      })
    });

    this.createRevisionForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      change_description: ['', Validators.required],
      effective_date: [this.formatDate(new Date()), Validators.required]
    });
  }

  private loadData(): void {
    this.loading = true;
    console.log('Loading quality documents...');
    
    // Load documents
    this.versionControlService.getDocuments()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          console.log('Loading finished, loading state:', this.loading);
        })
      )
      .subscribe({
        next: (documents) => {
          console.log('Documents loaded successfully:', documents);
          this.documents = documents;
          // Apply any existing filters
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error loading documents:', error);
          this.loading = false; // Ensure loading is set to false on error
        }
      });
      
    // Load stats (don't block main loading)
    this.versionControlService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          console.log('Stats loaded:', stats);
          this.stats = stats;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
        }
      });
  }

  private loadDepartments(): void {
    this.versionControlService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (departments) => {
          this.departments = departments;
        },
        error: (error) => {
          console.error('Error loading departments:', error);
        }
      });
  }

  // Enhanced action handlers
  onViewDocument(document: QualityDocument): void {
    console.log('Viewing document:', document);
    
    // Select the document and switch to document details view
    this.selectedDocument = document;
    this.selectedTab = 'documents';
    
    // Load document revisions for the sidebar
    const documentId = typeof document.id === 'string' ? parseInt(document.id) : document.id;
    this.loadDocumentRevisions(documentId);
    
    // You could also:
    // 1. Open a modal with document details
    // 2. Navigate to a dedicated document view page
    // 3. Show a sidebar with document information
    
    // For now, let's show a success message to indicate the action worked
    this.showNotification(`Viewing document: ${document.document_number}`, 'info');
  }

  onViewRevisions(document: QualityDocument): void {
    console.log('Viewing revisions for document:', document);
    
    // Select the document and load its revisions
    this.selectedDocument = document;
    const documentId = typeof document.id === 'string' ? parseInt(document.id) : document.id;
    this.loadDocumentRevisions(documentId);
    
    // Switch to a revisions-focused view or open revision form
    this.selectedTab = 'documents'; // Could be a 'revisions' tab
    
    // Scroll to revisions section or highlight it
    setTimeout(() => {
      const revisionsElement = window.document.querySelector('.revisions-section');
      if (revisionsElement) {
        revisionsElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    
    this.showNotification(`Loaded ${this.documentRevisions.length} revisions for ${document.document_number}`, 'info');
  }

  onExportDocument(document: QualityDocument): void {
    console.log('Opening export options for document:', document);
    
    // Set selected document and open export modal
    this.selectedDocument = document;
    this.openExportModal();
    
    this.showNotification(`Select export format for ${document.document_number}`, 'info');
  }

  // Updated showExportOptions method for consistency
  showExportOptions(document: QualityDocument): void {
    this.onExportDocument(document);
  }

  // Helper method for user feedback
  private showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    // For now, just use console.log and alert
    // In a real app, you'd use a toast/notification service
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Simple user feedback - replace with proper toast notifications
    const alertClass = type === 'error' ? 'danger' : type;
    
    // Get appropriate MDI icon for notification type
    const iconClass = {
      'success': 'mdi mdi-check-circle',
      'error': 'mdi mdi-alert-circle',
      'info': 'mdi mdi-information',
      'warning': 'mdi mdi-alert'
    }[type] || 'mdi mdi-information';
    
    // You could create a temporary alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${alertClass} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
      <i class="${iconClass} me-2"></i>${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.parentNode.removeChild(alertDiv);
      }
    }, 3000);
  }

  private updateGridData(): void {
    // No longer needed - handled by sub-component
  }

  // Document Management
  onCreateDocument(): void {
    if (this.createDocumentForm.valid) {
      this.creating = true;
      const request: CreateDocumentRequest = this.createDocumentForm.value;
      
      console.log('Creating document with request:', request);
      
      this.versionControlService.createDocument(request)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.creating = false)
        )
        .subscribe({
          next: (document) => {
            console.log('Document created:', document);
            this.showCreateForm = false;
            this.createDocumentForm.reset();
            this.initializeForms(); // Reset to defaults
            this.loadData();
          },
          error: (error) => {
            console.error('Error creating document:', error);
          }
        });
    } else {
      console.log('Form is invalid:', this.createDocumentForm.errors);
      console.log('Form value:', this.createDocumentForm.value);
      // Mark all fields as touched to show validation errors
      Object.keys(this.createDocumentForm.controls).forEach(key => {
        this.createDocumentForm.get(key)?.markAsTouched();
      });
    }
  }

  // Toggle create form visibility
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.createDocumentForm.reset();
      this.initializeForms(); // Reset to defaults
    }
  }

  // Cancel create form
  cancelCreateForm(): void {
    this.showCreateForm = false;
    this.createDocumentForm.reset();
    this.initializeForms(); // Reset to defaults
  }

  onSelectDocument(document: QualityDocument): void {
    this.selectedDocument = document;
    const documentId = typeof document.id === 'string' ? parseInt(document.id) : document.id;
    this.loadDocumentRevisions(documentId);
  }

  private loadDocumentRevisions(documentId: number): void {
    this.versionControlService.getRevisions(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (revisions) => {
          this.documentRevisions = revisions;
        },
        error: (error) => {
          console.error('Error loading revisions:', error);
        }
      });
  }

  // Revision Management
  onCreateRevision(modalRef?: NgbModalRef): void {
    if (this.createRevisionForm.valid && this.selectedDocument) {
      this.creating = true;
      const documentId = typeof this.selectedDocument.id === 'string' ? parseInt(this.selectedDocument.id) : this.selectedDocument.id;
      const request: CreateRevisionRequest = {
        document_id: documentId,
        ...this.createRevisionForm.value
      };
      
      this.versionControlService.createRevision(request)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.creating = false)
        )
        .subscribe({
          next: (revision) => {
            console.log('Revision created:', revision);
            this.showNotification(`Revision ${revision.revision_number} created successfully!`, 'success');
            
            // Close modal and reset form
            if (modalRef) {
              modalRef.close();
            }
            this.createRevisionForm.reset();
            this.initializeRevisionForm();
            
            // Refresh data
            const documentId = typeof this.selectedDocument!.id === 'string' ? parseInt(this.selectedDocument!.id) : this.selectedDocument!.id;
            this.loadDocumentRevisions(documentId);
            this.loadData(); // Refresh to update current revision info
          },
          error: (error) => {
            console.error('Error creating revision:', error);
            this.showNotification('Failed to create revision. Please try again.', 'error');
          }
        });
    } else {
      this.showNotification('Please fill in all required fields', 'warning');
      // Mark all fields as touched to show validation errors
      Object.keys(this.createRevisionForm.controls).forEach(key => {
        this.createRevisionForm.get(key)?.markAsTouched();
      });
    }
  }

  onApproveRevision(revision: QualityRevision): void {
    if (confirm(`Are you sure you want to approve revision ${revision.revision_number}?`)) {
      this.versionControlService.approveRevision(revision.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Revision approved');
            this.showNotification(`Revision ${revision.revision_number} approved successfully!`, 'success');
            this.loadDocumentRevisions(revision.document_id);
            this.loadData();
          },
          error: (error) => {
            console.error('Error approving revision:', error);
            this.showNotification('Failed to approve revision. Please try again.', 'error');
          }
        });
    }
  }

  // Reject/Deny revision with reason
  onRejectRevision(revision: QualityRevision): void {
    const reason = prompt(`Please provide a reason for rejecting revision ${revision.revision_number}:`);
    if (reason && reason.trim()) {
      this.versionControlService.rejectRevision(revision.id, reason.trim())
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Revision rejected');
            this.showNotification(`Revision ${revision.revision_number} rejected successfully!`, 'success');
            this.loadDocumentRevisions(revision.document_id);
            this.loadData();
          },
          error: (error) => {
            console.error('Error rejecting revision:', error);
            this.showNotification('Failed to reject revision. Please try again.', 'error');
          }
        });
    }
  }

  // Submit revision for approval (placeholder - would need backend implementation)
  onSubmitForApproval(revision: QualityRevision): void {
    if (confirm(`Submit revision ${revision.revision_number} for approval?`)) {
      // For now, we'll update the revision status to pending_approval
      this.versionControlService.updateRevision(revision.id, { status: 'pending_approval' })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Revision submitted for approval');
            this.showNotification(`Revision ${revision.revision_number} submitted for approval!`, 'success');
            this.loadDocumentRevisions(revision.document_id);
            this.loadData();
          },
          error: (error) => {
            console.error('Error submitting revision for approval:', error);
            this.showNotification('Failed to submit revision for approval. Please try again.', 'error');
          }
        });
    }
  }

  // Withdraw revision from approval process (placeholder - would need backend implementation)
  onWithdrawRevision(revision: QualityRevision): void {
    if (confirm(`Withdraw revision ${revision.revision_number} from approval process?`)) {
      // For now, we'll update the revision status back to draft
      this.versionControlService.updateRevision(revision.id, { status: 'draft' })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Revision withdrawn');
            this.showNotification(`Revision ${revision.revision_number} withdrawn from approval process!`, 'success');
            this.loadDocumentRevisions(revision.document_id);
            this.loadData();
          },
          error: (error) => {
            console.error('Error withdrawing revision:', error);
            this.showNotification('Failed to withdraw revision. Please try again.', 'error');
          }
        });
    }
  }

  // Get revision actions based on status and user permissions
  getRevisionActions(revision: QualityRevision): { action: string, label: string, icon: string, class: string, enabled: boolean }[] {
    const actions = [];
    
    // Download action - always available
    actions.push({
      action: 'download',
      label: 'Download',
      icon: 'mdi-download',
      class: 'btn-outline-primary',
      enabled: true
    });

    switch (revision.status?.toLowerCase()) {
      case 'draft':
        actions.push({
          action: 'submit',
          label: 'Submit for Approval',
          icon: 'mdi-send',
          class: 'btn-outline-success',
          enabled: true
        });
        break;

      case 'pending_approval':
        // Approver actions
        actions.push({
          action: 'approve',
          label: 'Approve',
          icon: 'mdi-check',
          class: 'btn-outline-success',
          enabled: true
        });
        actions.push({
          action: 'reject',
          label: 'Reject',
          icon: 'mdi-close',
          class: 'btn-outline-danger',
          enabled: true
        });
        // Author can withdraw
        actions.push({
          action: 'withdraw',
          label: 'Withdraw',
          icon: 'mdi-undo',
          class: 'btn-outline-warning',
          enabled: true
        });
        break;

      case 'approved':
        // Already approved - no actions except download
        break;

      case 'rejected':
        // Can resubmit
        actions.push({
          action: 'submit',
          label: 'Resubmit',
          icon: 'mdi-send',
          class: 'btn-outline-success',
          enabled: true
        });
        break;
    }

    return actions;
  }

  // Download specific revision
  downloadRevision(revision: QualityRevision): void {
    this.showNotification(`Downloading revision ${revision.revision_number}...`, 'info');
    
    // Use the export document method with the document ID for now
    // In a real implementation, you'd have a specific downloadRevision method
    if (this.selectedDocument) {
      const documentId = typeof this.selectedDocument.id === 'string' ? parseInt(this.selectedDocument.id) : this.selectedDocument.id;
      
      this.versionControlService.exportDocument(documentId, 'pdf')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            link.download = `${this.selectedDocument?.document_number}_rev${revision.revision_number}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);
            
            this.showNotification(`Revision ${revision.revision_number} downloaded successfully!`, 'success');
          },
          error: (error) => {
            console.error('Error downloading revision:', error);
            this.showNotification('Failed to download revision. Please try again.', 'error');
          }
        });
    }
  }

  // Version Number Generation
  generateNewDocumentNumber(): void {
    const type = this.createDocumentForm.get('document_type')?.value;
    const department = this.createDocumentForm.get('department')?.value;
    
    if (type) {
      this.versionControlService.generateDocumentNumber(type, department)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (documentNumber) => {
            console.log('Generated document number:', documentNumber);
            // You could display this to the user or auto-fill a field
          },
          error: (error) => {
            console.error('Error generating document number:', error);
          }
        });
    }
  }

  // Filtering and Search
  applyFilters(): void {
    console.log('Applying filters:', {
      filterType: this.filterType,
      filterCategory: this.filterCategory,
      filterDepartment: this.filterDepartment,
      filterStatus: this.filterStatus,
      searchQuery: this.searchQuery
    });
    
    this.filteredDocuments = this.documents.filter(doc => {
      // Extract document type from prefix for filtering
      const docType = this.getDocumentTypeFromPrefix(doc.prefix);
      const docCategory = this.getCategoryFromType(docType);
      
      const matchesType = !this.filterType || docType === this.filterType;
      const matchesCategory = !this.filterCategory || docCategory === this.filterCategory;
      const matchesDepartment = !this.filterDepartment || doc.department === this.filterDepartment;
      const matchesStatus = !this.filterStatus || doc.status === this.filterStatus;
      const matchesSearch = !this.searchQuery || 
        doc.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        doc.document_number.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matches = matchesType && matchesCategory && matchesDepartment && matchesStatus && matchesSearch;
      
      // Debug logging for first few documents
      if (this.documents.indexOf(doc) < 3) {
        console.log(`Document ${doc.document_number}:`, {
          docType, docCategory,
          matchesType, matchesCategory, matchesDepartment, matchesStatus, matchesSearch,
          finalMatch: matches
        });
      }
      
      return matches;
    });
    
    console.log(`Filtered ${this.filteredDocuments.length} out of ${this.documents.length} documents`);
  }

  // Helper method to extract document type from prefix
  private getDocumentTypeFromPrefix(prefix: string): string {
    if (!prefix) return 'DOC';
    return prefix.split('-').pop() || 'DOC';
  }

  // Helper method to map document type to category
  private getCategoryFromType(type: string): string {
    switch (type) {
      case 'FRM':
      case 'CHK':
      case 'QCP':
        return 'quality_control';
      case 'SOP':
      case 'WI':
        return 'process';
      case 'INS':
        return 'training';
      default:
        return 'quality_control';
    }
  }

  onFilterChange(): void {
    this.applyFilters();
    this.updateGridData();
  }

  onSearchChange(): void {
    this.applyFilters();
    this.updateGridData();
  }

  // Quick filter for AG-Grid global search (delegated to sub-component)
  onQuickFilterChanged(event: any): void {
    // Handled by sub-component
  }

  // Clear all filters (delegated to sub-component)
  clearFilters(): void {
    this.filterType = '';
    this.filterCategory = '';
    this.filterDepartment = '';
    this.filterStatus = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  // Utility Methods
  getDocumentTypeLabel(type: string): string {
    return this.documentTypes.find(dt => dt.value === type)?.label || type;
  }

  getDocumentTypeLabelFromDocument(document: QualityDocument): string {
    const type = this.getDocumentTypeFromPrefix(document.prefix);
    return this.getDocumentTypeLabel(type);
  }

  getCategoryLabel(category: string): string {
    return this.categories.find(c => c.value === category)?.label || category;
  }

  getCategoryLabelFromDocument(document: QualityDocument): string {
    const type = this.getDocumentTypeFromPrefix(document.prefix);
    const category = this.getCategoryFromType(type);
    return this.getCategoryLabel(category);
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'draft': 'bg-secondary',
      'pending_approval': 'bg-warning',
      'approved': 'bg-success',
      'superseded': 'bg-info',
      'obsolete': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  }

  formatVersionString(documentNumber: string, revisionNumber: number): string {
    return this.versionControlService.formatVersionString(documentNumber, revisionNumber);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Export functionality
  exportDocument(document: QualityDocument, format: 'pdf' | 'json' | 'excel'): void {
    this.exporting = true;
    const documentId = typeof document.id === 'string' ? parseInt(document.id) : document.id;
    
    this.showNotification(`Preparing ${format.toUpperCase()} export for ${document.document_number}...`, 'info');
    
    this.versionControlService.exportDocument(documentId, format)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.exporting = false)
      )
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = window.document.createElement('a');
          link.href = url;
          link.download = `${document.document_number}_rev${document.current_revision}.${format}`;
          link.click();
          window.URL.revokeObjectURL(url);
          
          this.showNotification(`Successfully exported ${document.document_number} as ${format.toUpperCase()}`, 'success');
        },
        error: (error) => {
          console.error('Error exporting document:', error);
          this.showNotification(`Failed to export ${document.document_number}. Please try again.`, 'error');
        }
      });
  }

  // Export with specific format from modal
  exportWithFormat(format: 'pdf' | 'json' | 'excel'): void {
    if (this.selectedDocument) {
      this.exportDocument(this.selectedDocument, format);
      // Modal will close automatically when user clicks the export option
    }
  }

  // Navigation
  useDocumentForChecklist(document: QualityDocument): void {
    // This would integrate with your existing checklist template manager
    // You could emit an event or navigate to the template manager with the document data
    console.log('Using document for checklist template:', document);
  }

  // Computed getters for template binding
  get documentsCount(): number {
    return this.documents.length;
  }

  get pendingApprovalsCount(): number {
    let count = 0;
    this.documents.forEach(doc => {
      if (doc.revisions) {
        count += doc.revisions.filter(rev => rev.status === 'pending_approval').length;
      }
    });
    return count;
  }

  get activeDocumentsCount(): number {
    return this.stats?.active_documents || this.documents.filter(d => d.status === 'approved').length;
  }

  get totalRevisionsCount(): number {
    let count = 0;
    this.documents.forEach(doc => {
      if (doc.revisions) {
        count += doc.revisions.length;
      }
    });
    return count;
  }

  // Approval workflow methods (keep original methods for backward compatibility)
  getPendingApprovalsCount(): number {
    return this.pendingApprovalsCount;
  }

  getTotalRevisionsCount(): number {
    return this.totalRevisionsCount;
  }

  getPendingApprovals(): { document: QualityDocument, revision: QualityRevision }[] {
    const pendingApprovals: { document: QualityDocument, revision: QualityRevision }[] = [];
    
    this.documents.forEach(document => {
      if (document.revisions) {
        document.revisions
          .filter(revision => revision.status === 'pending_approval')
          .forEach(revision => {
            pendingApprovals.push({ document, revision });
          });
      }
    });
    
    // Sort by submission date (newest first)
    return pendingApprovals.sort((a, b) => 
      new Date(b.revision.created_at).getTime() - new Date(a.revision.created_at).getTime()
    );
  }

  viewRevisionDetails(document: QualityDocument, revision: QualityRevision): void {
    // Select the document and revision, then open the revisions modal
    this.selectedDocument = document;
    this.loadDocumentRevisions(typeof document.id === 'string' ? parseInt(document.id) : document.id);
    this.openRevisionsModal();
  }

  private initializeRevisionForm(): void {
    if (this.createRevisionForm) {
      this.createRevisionForm.patchValue({
        title: '',
        description: '',
        change_description: '',
        effective_date: this.formatDate(new Date())
      });
    }
  }

  // Modal methods for backward compatibility
  openRevisionsModal(): void {
    if (!this.selectedDocument) {
      this.showNotification('Please select a document first', 'warning');
      return;
    }
    
    this.modalService.open(this.revisionsModalTemplate, { 
      size: 'xl',
      backdrop: 'static'
    });
  }

  openExportModal(): void {
    if (!this.selectedDocument) {
      this.showNotification('Please select a document first', 'warning');
      return;
    }
    
    this.modalService.open(this.exportModalTemplate, {
      size: 'md',
      backdrop: 'static'
    });
  }
}
