import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SerialNumberService } from '../../services/serial-number.service';
import { SerialNumberStats, SerialNumberReport } from '../../models/serial-number.model';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-sn-stats',
  templateUrl: './sn-stats.component.html',
  styleUrls: ['./sn-stats.component.scss']
})
export class SnStatsComponent implements OnInit {
  stats$: Observable<SerialNumberStats> = new Observable();
  recentActivity$: Observable<SerialNumberReport[]> = new Observable();
  isLoading = true;

  // Chart data (mock data for display)
  statusDistribution = [
    { status: 'Available', count: 245, percentage: 45, color: '#28a745' },
    { status: 'Assigned', count: 150, percentage: 28, color: '#ffc107' },
    { status: 'Shipped', count: 120, percentage: 22, color: '#17a2b8' },
    { status: 'Returned', count: 15, percentage: 3, color: '#6c757d' },
    { status: 'Defective', count: 12, percentage: 2, color: '#dc3545' }
  ];

  modelDistribution = [
    { model: 'EyeFi Pro X1', count: 180, percentage: 33, color: '#3498db' },
    { model: 'EyeFi Standard S2', count: 150, percentage: 28, color: '#9b59b6' },
    { model: 'EyeFi Enterprise E3', count: 120, percentage: 22, color: '#e74c3c' },
    { model: 'EyeFi Lite L1', count: 60, percentage: 11, color: '#f39c12' },
    { model: 'EyeFi Advanced A2', count: 32, percentage: 6, color: '#2ecc71' }
  ];

  monthlyTrends = [
    { month: 'Jan', generated: 45, assigned: 32, shipped: 28 },
    { month: 'Feb', generated: 52, assigned: 38, shipped: 35 },
    { month: 'Mar', generated: 48, assigned: 45, shipped: 41 },
    { month: 'Apr', generated: 63, assigned: 52, shipped: 48 },
    { month: 'May', generated: 71, assigned: 58, shipped: 54 },
    { month: 'Jun', generated: 58, assigned: 49, shipped: 46 }
  ];

  constructor(private serialNumberService: SerialNumberService) {}

  ngOnInit() {
    this.loadStats();
    this.loadRecentActivity();
  }

  loadStats() {
    this.isLoading = true;
    this.stats$ = this.serialNumberService.getSerialNumberStats();
    
    // Simulate loading completion
    this.stats$.subscribe({
      next: () => this.isLoading = false,
      error: () => this.isLoading = false
    });
  }

  loadRecentActivity() {
    const filters = {
      limit: 10,
      sort: 'assigned_date',
      order: 'desc'
    };
    
    this.recentActivity$ = this.serialNumberService.getSerialNumberReport(filters);
  }

  refreshStats() {
    this.loadStats();
    this.loadRecentActivity();
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'Available': 'fa-check-circle',
      'Assigned': 'fa-clock',
      'Shipped': 'fa-shipping-fast',
      'Returned': 'fa-undo',
      'Defective': 'fa-exclamation-triangle'
    };
    return icons[status] || 'fa-question-circle';
  }

  getModelIcon(model: string): string {
    // Different icons for different models
    if (model.includes('Pro')) return 'fa-star';
    if (model.includes('Enterprise')) return 'fa-building';
    if (model.includes('Lite')) return 'fa-feather-alt';
    if (model.includes('Advanced')) return 'fa-rocket';
    return 'fa-microchip';
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getTrendIcon(current: number, previous: number): string {
    if (current > previous) return 'fa-arrow-up text-success';
    if (current < previous) return 'fa-arrow-down text-danger';
    return 'fa-minus text-muted';
  }

  calculateTrend(data: any[], key: string): { current: number, previous: number, trend: number } {
    const current = data[data.length - 1][key];
    const previous = data[data.length - 2][key];
    const trend = ((current - previous) / previous) * 100;
    
    return { current, previous, trend };
  }

  exportReport() {
    // Mock export functionality
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalSerialNumbers: this.statusDistribution.reduce((sum, item) => sum + item.count, 0),
        availableCount: this.statusDistribution.find(s => s.status === 'Available')?.count || 0,
        assignedCount: this.statusDistribution.find(s => s.status === 'Assigned')?.count || 0,
        shippedCount: this.statusDistribution.find(s => s.status === 'Shipped')?.count || 0
      },
      statusDistribution: this.statusDistribution,
      modelDistribution: this.modelDistribution,
      monthlyTrends: this.monthlyTrends
    };

    // Create and download JSON report
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `serial-number-stats-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }

  // Getter methods for template
  get totalSerialNumbers(): number {
    return this.statusDistribution.reduce((sum, s) => sum + s.count, 0);
  }

  get availableCount(): number {
    return this.statusDistribution.find(s => s.status === 'Available')?.count || 0;
  }

  get shippedCount(): number {
    return this.statusDistribution.find(s => s.status === 'Shipped')?.count || 0;
  }

  get assignedCount(): number {
    return this.statusDistribution.find(s => s.status === 'Assigned')?.count || 0;
  }
}