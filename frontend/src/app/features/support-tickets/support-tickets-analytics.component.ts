import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BreadcrumbComponent } from '@app/shared/components/breadcrumb/breadcrumb.component';
import {
  SupportTicket,
  SupportTicketFilters,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
} from '@app/shared/models/support-ticket.model';
import { SupportTicketsService } from '@app/core/api/support-tickets/support-tickets.service';
import { NotificationService } from '@app/core/services/notification.service';
import { SupportTicketsInsightsComponent } from './support-tickets-insights.component';

@Component({
  selector: 'app-support-tickets-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, SupportTicketsInsightsComponent],
  templateUrl: './support-tickets-analytics.component.html',
  styleUrls: ['./support-tickets-analytics.component.scss'],
})
export class SupportTicketsAnalyticsComponent implements OnInit {
  private readonly supportTicketsService = inject(SupportTicketsService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tickets = signal<SupportTicket[]>([]);
  readonly isLoading = signal(false);

  readonly selectedStatus = signal<string>('open_in_progress');
  readonly selectedType = signal<string>('');
  readonly selectedPriority = signal<string>('');
  readonly searchTerm = signal<string>('');

  readonly statusFilterOptions = [
    { value: 'open_in_progress', label: 'Open + In Progress' },
    { value: 'all', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  readonly typeFilterOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'All Types' },
    { value: 'bug', label: 'Bug' },
    { value: 'incident_outage', label: 'Incident / Outage' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'question', label: 'Question' },
    { value: 'improvement', label: 'Improvement' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'access_permissions', label: 'Access / Permissions' },
    { value: 'data_correction', label: 'Data Correction' },
  ];

  readonly priorityFilterOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  readonly breadcrumbItems = computed(() => [
    { label: 'Home', url: '/' },
    { label: 'Support', url: '/support-tickets' },
    { label: 'Analytics', active: true },
  ]);

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    const status = query.get('status');
    const type = query.get('type');
    const priority = query.get('priority');
    const search = query.get('search');

    if (status) this.selectedStatus.set(status);
    if (type) this.selectedType.set(type);
    if (priority) this.selectedPriority.set(priority);
    if (search) this.searchTerm.set(search);

    this.loadTickets();
  }

  onFilterChange(): void {
    this.updateFilterQueryParams();
    this.loadTickets();
  }

  onSearchChange(): void {
    this.updateFilterQueryParams();
    setTimeout(() => this.loadTickets(), 300);
  }

  clearFilters(): void {
    this.selectedStatus.set('open_in_progress');
    this.selectedType.set('');
    this.selectedPriority.set('');
    this.searchTerm.set('');
    this.updateFilterQueryParams();
    this.loadTickets();
  }

  private updateFilterQueryParams(): void {
    const queryParams: Record<string, string | null> = {
      status: this.selectedStatus() || null,
      type: this.selectedType() || null,
      priority: this.selectedPriority() || null,
      search: this.searchTerm() || null,
    };

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  private loadTickets(): void {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);

    const filters: SupportTicketFilters = {};
    const status = this.selectedStatus();
    const type = this.selectedType();
    const priority = this.selectedPriority();
    const search = this.searchTerm();

    if (status && status !== 'all' && status !== 'open_in_progress') {
      filters.status = status as SupportTicketStatus;
    }
    if (type) {
      filters.type = type as SupportTicketType;
    }
    if (priority) {
      filters.priority = priority as SupportTicketPriority;
    }
    if (search) {
      filters.search = search;
    }

    this.supportTicketsService.getTickets(filters).subscribe({
      next: (tickets) => {
        let filteredTickets = tickets;
        if (status === 'open_in_progress') {
          filteredTickets = tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress');
        }

        this.tickets.set(filteredTickets);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.notification.error(error);
        this.isLoading.set(false);
      },
    });
  }
}
