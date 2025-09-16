import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { 
  ChecklistTemplate, 
  ChecklistInstance, 
  ChecklistTemplateAnalytics 
} from '../../models/checklist-template.interface';
import { ChecklistTemplateMockService } from '../../services/checklist-template-mock.service';

interface DashboardStats {
  totalTemplates: number;
  activeTemplates: number;
  totalInstances: number;
  completedInstances: number;
  pendingInstances: number;
  averageCompletionTime: number;
}

@Component({
  selector: 'app-inspection-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [ChecklistTemplateMockService],
  templateUrl: './inspection-dashboard.component.html',
  styleUrls: ['./inspection-dashboard.component.scss']
})
export class InspectionDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data properties
  templates: ChecklistTemplate[] = [];
  recentInstances: ChecklistInstance[] = [];
  stats: DashboardStats = {
    totalTemplates: 0,
    activeTemplates: 0,
    totalInstances: 0,
    completedInstances: 0,
    pendingInstances: 0,
    averageCompletionTime: 0
  };

  // UI state
  isLoading = false;
  selectedPeriod = '7'; // days
  searchTerm = '';

  // Filtered data
  filteredTemplates: ChecklistTemplate[] = [];
  filteredInstances: ChecklistInstance[] = [];

  constructor(
    private checklistService: ChecklistTemplateMockService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    combineLatest([
      this.checklistService.getAllTemplates(),
      this.checklistService.getAllInstances(),
      this.checklistService.getAnalytics()
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([templates, instances, analytics]) => {
        this.templates = templates;
        this.recentInstances = instances
          .sort((a, b) => new Date(b.startedDate).getTime() - new Date(a.startedDate).getTime())
          .slice(0, 10);
        
        this.calculateStats(templates, instances);
        this.filterData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      }
    });
  }

  private calculateStats(templates: ChecklistTemplate[], instances: ChecklistInstance[]): void {
    this.stats = {
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.status === 'active').length,
      totalInstances: instances.length,
      completedInstances: instances.filter(i => i.status === 'completed').length,
      pendingInstances: instances.filter(i => i.status === 'in-progress' || i.status === 'pending').length,
      averageCompletionTime: this.calculateAverageCompletionTime(instances)
    };
  }

  private calculateAverageCompletionTime(instances: ChecklistInstance[]): number {
    const completedInstances = instances.filter(i => 
      i.status === 'completed' && i.completedDate && i.startedDate
    );

    if (completedInstances.length === 0) return 0;

    const totalTime = completedInstances.reduce((sum, instance) => {
      const start = new Date(instance.startedDate).getTime();
      const end = new Date(instance.completedDate!).getTime();
      return sum + (end - start);
    }, 0);

    return totalTime / completedInstances.length / (1000 * 60); // Convert to minutes
  }

  private filterData(): void {
    // Filter templates
    this.filteredTemplates = this.templates.filter(template =>
      template.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      template.type.toLowerCase().includes(this.searchTerm.toLowerCase())
    );

    // Filter instances based on selected period
    const daysAgo = parseInt(this.selectedPeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    this.filteredInstances = this.recentInstances.filter(instance => {
      const instanceDate = new Date(instance.startedDate);
      const matchesSearch = instance.template.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           instance.assignedTo.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return instanceDate >= cutoffDate && matchesSearch;
    });
  }

  onSearchChange(): void {
    this.filterData();
  }

  onPeriodChange(): void {
    this.filterData();
  }

  // Navigation methods
  createNewTemplate(): void {
    this.router.navigate(['../templates/new'], { relativeTo: this.route });
  }

  editTemplate(template: ChecklistTemplate): void {
    this.router.navigate(['../templates', template.id, 'edit'], { relativeTo: this.route });
  }

  viewTemplate(template: ChecklistTemplate): void {
    this.router.navigate(['../templates', template.id], { relativeTo: this.route });
  }

  startInspection(template: ChecklistTemplate): void {
    this.router.navigate(['../instance/new', template.id], { relativeTo: this.route });
  }

  viewInstance(instance: ChecklistInstance): void {
    this.router.navigate(['../instance', instance.id], { relativeTo: this.route });
  }

  continueInspection(instance: ChecklistInstance): void {
    this.router.navigate(['../instance', instance.id], { relativeTo: this.route });
  }

  // Utility methods
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active': return 'badge-success';
      case 'completed': return 'badge-success';
      case 'in-progress': return 'badge-info';
      case 'pending': return 'badge-warning';
      case 'draft': return 'badge-secondary';
      case 'archived': return 'badge-dark';
      default: return 'badge-secondary';
    }
  }

  getProgressPercentage(instance: ChecklistInstance): number {
    if (!instance.items || instance.items.length === 0) return 0;
    
    const completedItems = instance.items.filter(item => 
      item.status === 'completed' || item.status === 'skipped'
    ).length;
    
    return (completedItems / instance.items.length) * 100;
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  getTemplateUsageCount(template: ChecklistTemplate): number {
    return this.recentInstances.filter(instance => 
      instance.template.id === template.id
    ).length;
  }

  // Quick actions
  duplicateTemplate(template: ChecklistTemplate, event: Event): void {
    event.stopPropagation();
    
    const newName = prompt(`Enter name for duplicated template:`, `${template.name} (Copy)`);
    if (!newName) return;

    this.checklistService.duplicateTemplate(template.id, newName).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (duplicatedTemplate) => {
        this.templates.push(duplicatedTemplate);
        this.filterData();
        alert('Template duplicated successfully!');
      },
      error: (error) => {
        console.error('Error duplicating template:', error);
        alert('Failed to duplicate template. Please try again.');
      }
    });
  }

  deleteTemplate(template: ChecklistTemplate, event: Event): void {
    event.stopPropagation();
    
    if (confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      this.checklistService.deleteTemplate(template.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.templates = this.templates.filter(t => t.id !== template.id);
          this.filterData();
          alert('Template deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting template:', error);
          alert('Failed to delete template. Please try again.');
        }
      });
    }
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  exportData(): void {
    // This would typically generate a report
    alert('Export functionality would be implemented here');
  }

  viewReports(): void {
    this.router.navigate(['../reports'], { relativeTo: this.route });
  }

  manageTemplates(): void {
    this.router.navigate(['../templates'], { relativeTo: this.route });
  }

  viewAllInstances(): void {
    this.router.navigate(['../instances'], { relativeTo: this.route });
  }
}