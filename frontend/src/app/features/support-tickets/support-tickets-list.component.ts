import { Component, Input, OnInit, DestroyRef, signal, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { GridApi, ColDef, GridOptions } from 'ag-grid-community';
import { SupportTicketsService } from '@app/core/api/support-tickets/support-tickets.service';
import { AuthenticationService } from '@app/core/services/auth.service';
import { ErrorReportDialogService } from '@app/core/services/error-report-dialog.service';
import { NotificationService } from '@app/core/services/notification.service';
import { BreadcrumbComponent } from '@app/shared/components/breadcrumb/breadcrumb.component';
import {
  SupportTicket,
  SupportTicketFilters,
  SupportTicketType,
  SupportTicketStatus,
  SupportTicketPriority,
  SUPPORT_TICKET_TYPE_LABELS,
  SUPPORT_TICKET_STATUS_LABELS,
  SUPPORT_TICKET_PRIORITY_LABELS,
} from '@app/shared/models/support-ticket.model';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers/link-renderer/link-renderer.component';
import moment from 'moment';

/**
 * Support Tickets List Component
 * 
 * Master list of support tickets with dual-mode functionality:
 * - Admin Mode: View all tickets from all users
 * - User Mode: View only current user's tickets
 * 
 * Uses ag-grid for advanced filtering, sorting, and data visualization
 */
@Component({
  selector: 'app-support-tickets-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, BreadcrumbComponent],
  templateUrl: './support-tickets-list.component.html',
  styleUrls: ['./support-tickets-list.component.scss']
})
export class SupportTicketsListComponent implements OnInit {

  /**
   * Optional user ID input for context-aware usage
   * - If provided: Shows tickets for specific user
   * - If not provided: Shows all tickets (admin master list)
   */
  @Input() userId?: number;

  /**
   * Control header/breadcrumb visibility
   * - true: Show breadcrumbs and page header (master list mode)
   * - false: Hide decorative elements (embedded mode)
   * - Default: Auto-detect based on userId
   */
  @Input() showHeader?: boolean;

  /**
   * Control whether the grid shows user information columns
   * - true: Show user_email and user_id columns (admin view)
   * - false: Hide user columns (user view)
   * - Default: true for admin, false for user context
   */
  @Input() showUserColumns?: boolean;

  /**
   * Force list to current authenticated user's tickets, even for admin users.
   */
  @Input() forceCurrentUser?: boolean;

  private supportTicketsService = inject(SupportTicketsService);
  private authService = inject(AuthenticationService);
  private ticketDialog = inject(ErrorReportDialogService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  // Signals for reactive state
  tickets = signal<SupportTicket[]>([]);
  isLoading = signal(false);
  selectedStatus = signal<string>('open_in_progress');
  selectedType = signal<string>('');
  selectedPriority = signal<string>('');
  searchTerm = signal<string>('');
  focusTicketId = signal<number | null>(null);

  statusFilterOptions = [
    { value: 'open_in_progress', label: 'Open + In Progress' },
    { value: 'all', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  // Grid state
  gridApi!: GridApi;
  gridOptions: GridOptions = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: true
    },
    pagination: false,
    rowSelection: 'single',
    onGridReady: (params) => {
      this.gridApi = params.api;
      this.loadTickets();
    },
    onRowDoubleClicked: (event) => {
      this.viewTicket(event.data.id);
    }
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      field: 'id',
      width: 100,
      cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: (params: any) => {
          const ticketId = params.rowData?.id;
          this.viewTicket(ticketId);
        },
        label: 'View',
        icon: 'bi-eye'
      },
      pinned: 'left',
      filter: false,
      floatingFilter: false
    },
    {
      headerName: 'Ticket #',
      field: 'ticket_number',
      width: 170,
      pinned: 'left',
      cellRenderer: (params: any) => {
        return `<code class="text-primary">${params.value}</code>`;
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 130,
      cellRenderer: (params: any) => {
        const statusClass = this.getStatusBadgeClass(params.value);
        const label = SUPPORT_TICKET_STATUS_LABELS[params.value as SupportTicketStatus] || params.value;
        return `<span class="badge ${statusClass}">${label}</span>`;
      },
      filterParams: {
        values: ['open', 'in_progress', 'resolved', 'closed']
      }
    },
    {
      headerName: 'Type',
      field: 'type',
      width: 150,
      valueFormatter: (params) => SUPPORT_TICKET_TYPE_LABELS[params.value as SupportTicketType] || params.value,
      filterParams: {
        values: ['bug', 'feature_request', 'question', 'improvement', 'maintenance', 'access_permissions', 'data_correction', 'incident_outage']
      }
    },
    {
      headerName: 'Priority',
      field: 'priority',
      width: 120,
      cellRenderer: (params: any) => {
        const priorityClass = this.getPriorityBadgeClass(params.value);
        const label = SUPPORT_TICKET_PRIORITY_LABELS[params.value as SupportTicketPriority] || params.value;
        return `<span class="badge ${priorityClass}">${label}</span>`;
      },
      filterParams: {
        values: ['low', 'medium', 'high', 'urgent']
      }
    },
    {
      headerName: 'Title',
      field: 'title',
      flex: 1,
      minWidth: 250
    },
    {
      headerName: 'User Email',
      field: 'user_email',
      width: 200,
      hide: false // Will be controlled by showUserColumns
    },
    {
      headerName: 'Created',
      field: 'created_at',
      width: 170,
      valueFormatter: (params) => moment(params.value).format('MMM D, YYYY h:mm A'),
      sort: 'desc' // Default sort
    },
    {
      headerName: 'Updated',
      field: 'updated_at',
      width: 170,
      valueFormatter: (params) => moment(params.value).format('MMM D, YYYY h:mm A')
    }
  ];

  // Computed breadcrumbs
  breadcrumbItems = computed(() => {
    if (this.userId) {
      return [
        { label: 'Home', url: '/' },
        { label: 'Support', url: '/support-tickets' },
        { label: 'My Tickets', active: true }
      ];
    }
    return [
      { label: 'Home', url: '/' },
      { label: 'Support', url: '/support' },
      { label: 'All Tickets', active: true }
    ];
  });

  title = computed(() => this.userId ? 'My Support Tickets' : 'All Support Tickets');
  
  description = computed(() => 
    this.userId 
      ? 'View and manage your support tickets. Track issues, feature requests, and get help from our support team.'
      : 'Monitor and manage all support tickets across the system. Review and resolve customer issues.'
  );

  // Computed counts for summary cards
  openCount = computed(() => this.tickets().filter(t => t.status === 'open').length);
  inProgressCount = computed(() => this.tickets().filter(t => t.status === 'in_progress').length);
  resolvedCount = computed(() => this.tickets().filter(t => t.status === 'resolved').length);

  ngOnInit(): void {
    // Get route data configuration once
    const routeConfig = (this.route.snapshot.data as any)?.allTickets;
    
    // Priority: 1) Input binding, 2) Route data, 3) Route param, 4) Defaults
    if (this.showHeader === undefined) {
      this.showHeader = routeConfig?.showHeader ?? true;
    }
    
    if (this.showUserColumns === undefined) {
      this.showUserColumns = routeConfig?.showUserColumns ?? !this.userId;
    }

    if (this.forceCurrentUser === undefined) {
      this.forceCurrentUser = routeConfig?.forceCurrentUser ?? false;
    }

    if (this.forceCurrentUser && !this.userId) {
      const currentUser = this.authService.user;
      if (currentUser && typeof currentUser === 'object' && 'id' in currentUser) {
        this.userId = (currentUser as any).id;
      }
    }
    
    if (!this.userId) {
      const userIdParam = this.route.snapshot.paramMap.get('user_id');
      if (userIdParam) {
        this.userId = +userIdParam;
      }
    }

    const queryParams = this.route.snapshot.queryParamMap;
    const status = queryParams.get('status');
    const type = queryParams.get('type');
    const priority = queryParams.get('priority');
    const search = queryParams.get('search');
    const focusTicketId = queryParams.get('focusTicketId');

    if (status) this.selectedStatus.set(status);
    if (type) this.selectedType.set(type);
    if (priority) this.selectedPriority.set(priority);
    if (search) this.searchTerm.set(search);
    if (focusTicketId) {
      const parsed = Number(focusTicketId);
      if (Number.isFinite(parsed) && parsed > 0) {
        this.focusTicketId.set(parsed);
      }
    }
  }

  private syncUserColumnVisibility(): void {
    if (this.gridApi && this.columnDefs) {
      this.gridApi.setColumnsVisible(['user_email'], this.showUserColumns || false);
    }
  }

  loadTickets(): void {
    // Prevent multiple simultaneous calls
    if (this.isLoading()) {
      return;
    }
    
    this.isLoading.set(true);

    // Build filters object, only including defined values
    const filters: SupportTicketFilters = {};
    
    if (this.userId) {
      filters.user_id = this.userId;
    }
    
    const status = this.selectedStatus();
    if (status && status !== 'all' && status !== 'open_in_progress') {
      filters.status = status as SupportTicketStatus;
    }
    
    const type = this.selectedType();
    if (type) {
      filters.type = type as SupportTicketType;
    }
    
    const priority = this.selectedPriority();
    if (priority) {
      filters.priority = priority as SupportTicketPriority;
    }
    
    const search = this.searchTerm();
    if (search) {
      filters.search = search;
    }

    this.supportTicketsService.getTickets(filters).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tickets: SupportTicket[]) => {
        const statusFilter = this.selectedStatus();
        let filteredTickets = tickets;

        // Default view prioritizes actionable tickets.
        if (statusFilter === 'open_in_progress') {
          filteredTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
        }

        this.tickets.set(filteredTickets);
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', filteredTickets);
          this.highlightFocusedTicketRow();
        }
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load tickets:', error);
        this.notification.error(error);
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.updateFilterQueryParams();
    this.loadTickets();
  }

  onSearchChange(): void {
    this.updateFilterQueryParams();
    // Debounce search
    setTimeout(() => this.loadTickets(), 300);
  }

  private updateFilterQueryParams(): void {
    const queryParams: Record<string, string | null> = {
      status: this.selectedStatus() || null,
      type: this.selectedType() || null,
      priority: this.selectedPriority() || null,
      search: this.searchTerm() || null,
      focusTicketId: null,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  viewTicket(ticketId: number): void {
    if (!ticketId) {
      console.error('Ticket ID is undefined');
      return;
    }

    const queryParams: Record<string, string | number> = {
      status: this.selectedStatus(),
      focusTicketId: ticketId
    };

    const type = this.selectedType();
    const priority = this.selectedPriority();
    const search = this.searchTerm();
    if (type) queryParams['type'] = type;
    if (priority) queryParams['priority'] = priority;
    if (search) queryParams['search'] = search;

    this.router.navigate(['/support-tickets', ticketId], { queryParams });
  }

  private highlightFocusedTicketRow(): void {
    const ticketId = this.focusTicketId();
    if (!ticketId || !this.gridApi) {
      return;
    }

    let targetNode: any = null;
    this.gridApi.forEachNode((node) => {
      if (node?.data?.id === ticketId) {
        targetNode = node;
      }
    });

    if (targetNode) {
      targetNode.setSelected(true, true);
      this.gridApi.ensureNodeVisible(targetNode, 'middle');
      this.gridApi.flashCells({ rowNodes: [targetNode] });
    }
  }

  openNewTicket(): void {
    this.ticketDialog.open();
  }

  refreshGrid(): void {
    this.loadTickets();
  }

  exportToExcel(): void {
    if (this.gridApi) {
      this.gridApi.exportDataAsExcel({
        fileName: `support-tickets-${moment().format('YYYY-MM-DD')}.xlsx`
      });
    }
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'open': 'bg-primary',
      'in_progress': 'bg-warning',
      'resolved': 'bg-success',
      'closed': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
  }

  getPriorityBadgeClass(priority: string): string {
    const classes: Record<string, string> = {
      'low': 'bg-info',
      'medium': 'bg-primary',
      'high': 'bg-warning',
      'urgent': 'bg-danger'
    };
    return classes[priority] || 'bg-secondary';
  }
}
