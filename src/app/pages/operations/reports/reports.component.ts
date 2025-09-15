import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { filter } from 'rxjs/operators';

interface Report {
  title: string;
  description: string;
  path: string;
  icon: string;
  category: string;
  keywords: string[];
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: []
})
export class ReportsComponent implements OnInit {
  
  searchTerm: string = '';
  showDashboard: boolean = true;
  favoriteReports: string[] = [];
  currentReportPath: string = '';
  
  reports: Report[] = [
    // Inventory & Stock Reports
    {
      title: 'Inventory Report',
      description: 'Current inventory levels and stock status across all locations',
      path: 'inventory-report',
      icon: 'mdi mdi-package-variant-closed',
      category: 'inventory',
      keywords: ['inventory', 'stock', 'levels', 'warehouse']
    },
    {
      title: 'WIP Report',
      description: 'Work in progress tracking and manufacturing status',
      path: 'wip-report',
      icon: 'mdi mdi-progress-wrench',
      category: 'inventory',
      keywords: ['wip', 'work in progress', 'manufacturing', 'production']
    },
    {
      title: 'Safety Stock Report',
      description: 'Safety stock levels and reorder point analysis',
      path: 'safety-stock-report',
      icon: 'mdi mdi-shield-check',
      category: 'inventory',
      keywords: ['safety', 'stock', 'reorder', 'minimum']
    },
    {
      title: 'Negative Location Report',
      description: 'Locations with negative inventory balances',
      path: 'negative-location-report',
      icon: 'mdi mdi-alert-circle',
      category: 'inventory',
      keywords: ['negative', 'location', 'balance', 'shortage']
    },
    {
      title: 'Empty Location Report',
      description: 'Empty warehouse locations available for storage',
      path: 'empty-location-report',
      icon: 'mdi mdi-home-outline',
      category: 'inventory',
      keywords: ['empty', 'location', 'available', 'warehouse']
    },
    {
      title: 'One SKU Location Report',
      description: 'Locations containing only one SKU item',
      path: 'one-sku-location-report',
      icon: 'mdi mdi-numeric-1-box',
      category: 'inventory',
      keywords: ['sku', 'location', 'single', 'item']
    },
    {
      title: 'FG Value Report',
      description: 'Finished goods inventory valuation and analysis',
      path: 'fg-value-report',
      icon: 'mdi mdi-package-variant',
      category: 'inventory',
      keywords: ['finished goods', 'valuation', 'inventory', 'fg']
    },
    {
      title: 'JX Value Report',
      description: 'JX inventory valuation and cost analysis',
      path: 'jx-value-report',
      icon: 'mdi mdi-currency-usd',
      category: 'inventory',
      keywords: ['jx', 'valuation', 'cost', 'analysis']
    },
    {
      title: 'Transit Location Value Report',
      description: 'Inventory in transit between locations',
      path: 'transit-location-value-report',
      icon: 'mdi mdi-truck-delivery',
      category: 'inventory',
      keywords: ['transit', 'location', 'transfer', 'movement']
    },
    {
      title: 'Las Vegas Raw Material Report',
      description: 'Raw material inventory at Las Vegas facility',
      path: 'las-vegas-raw-material-report',
      icon: 'mdi mdi-factory',
      category: 'inventory',
      keywords: ['las vegas', 'raw material', 'facility', 'location']
    },
    {
      title: 'Item Consolidation Report',
      description: 'Opportunities for inventory consolidation',
      path: 'item-consolidation-report',
      icon: 'mdi mdi-merge',
      category: 'inventory',
      keywords: ['consolidation', 'optimization', 'efficiency', 'merge']
    },

    // Financial & Revenue Reports
    {
      title: 'Revenue Report',
      description: 'Revenue analysis and financial performance metrics',
      path: 'revenue',
      icon: 'mdi mdi-chart-line',
      category: 'financial',
      keywords: ['revenue', 'financial', 'performance', 'sales']
    },
    {
      title: 'Revenue by Customer',
      description: 'Customer-specific revenue breakdown and analysis',
      path: 'revenue-by-customer',
      icon: 'mdi mdi-account-cash',
      category: 'financial',
      keywords: ['revenue', 'customer', 'breakdown', 'analysis']
    },

    // Operations & Performance Reports
    {
      title: 'Daily Report',
      description: 'Daily operations summary and key metrics',
      path: 'daily-report',
      icon: 'mdi mdi-calendar-today',
      category: 'operations',
      keywords: ['daily', 'operations', 'summary', 'metrics']
    },
    {
      title: 'Work Order Variance Report',
      description: 'Work order completion variance and efficiency analysis',
      path: 'work-order-variance-report',
      icon: 'mdi mdi-clipboard-list',
      category: 'operations',
      keywords: ['work order', 'variance', 'efficiency', 'completion']
    },

    // Shipping & Logistics Reports
    {
      title: 'Shipped Orders Report',
      description: 'Shipping performance and order fulfillment tracking',
      path: 'shipped-orders-report',
      icon: 'mdi mdi-truck-fast',
      category: 'shipping',
      keywords: ['shipped', 'orders', 'fulfillment', 'delivery']
    },
    {
      title: 'Shipped Orders Report V1',
      description: 'Alternative view of shipping performance metrics',
      path: 'shipped-orders-report-v1',
      icon: 'mdi mdi-truck',
      category: 'shipping',
      keywords: ['shipped', 'orders', 'alternative', 'metrics']
    },
    {
      title: 'OTD Report',
      description: 'On-time delivery performance and analysis',
      path: 'otd-report',
      icon: 'mdi mdi-clock-check',
      category: 'shipping',
      keywords: ['otd', 'on time', 'delivery', 'performance']
    },

    // Quality & Analysis Reports
    {
      title: 'Reason Code Report',
      description: 'Analysis of reason codes and issue categorization',
      path: 'reason-code-report',
      icon: 'mdi mdi-format-list-bulleted-type',
      category: 'quality',
      keywords: ['reason code', 'analysis', 'issues', 'categorization']
    }
  ];

  filteredReports: Report[] = [];

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
    this.filteredReports = [...this.reports];
  }

  ngOnInit(): void {
    // Load favorites from localStorage
    this.loadFavorites();
    
    // Check initial route
    this.updateDashboardVisibility();
    
    // Listen to route changes to show/hide dashboard
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateDashboardVisibility();
    });
  }

  loadFavorites(): void {
    const saved = localStorage.getItem('reportsFavorites');
    this.favoriteReports = saved ? JSON.parse(saved) : [];
  }

  saveFavorites(): void {
    localStorage.setItem('reportsFavorites', JSON.stringify(this.favoriteReports));
  }

  updateDashboardVisibility(): void {
    const currentUrl = this.router.url;
    // Show dashboard only when at the root reports path
    this.showDashboard = currentUrl === '/operations/reports' || currentUrl === '/operations/reports/';
    
    // Extract current report path for favorite functionality
    if (!this.showDashboard) {
      this.currentReportPath = currentUrl.replace('/operations/reports/', '');
    }
  }

  isReportFavorited(reportPath: string): boolean {
    return this.favoriteReports.includes(reportPath);
  }

  toggleFavorite(reportPath: string): void {
    const index = this.favoriteReports.indexOf(reportPath);
    if (index > -1) {
      // Remove from favorites
      this.favoriteReports.splice(index, 1);
    } else {
      // Add to favorites
      this.favoriteReports.push(reportPath);
    }
    this.saveFavorites();
  }

  getCurrentReportTitle(): string {
    const currentReport = this.reports.find(r => r.path === this.currentReportPath);
    return currentReport ? currentReport.title : 'Report';
  }

  backToDashboard(): void {
    this.router.navigate(['/operations/reports']);
  }

  navigateToReport(path: string): void {
    this.router.navigate([path], { relativeTo: this.route });
  }

  filterReports(): void {
    if (!this.searchTerm.trim()) {
      this.filteredReports = [...this.reports];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredReports = this.reports.filter(report => 
      report.title.toLowerCase().includes(term) ||
      report.description.toLowerCase().includes(term) ||
      report.keywords.some(keyword => keyword.toLowerCase().includes(term))
    );
  }

  getFilteredReports(category: string): Report[] {
    if (category === 'all') {
      return this.filteredReports;
    }
    
    if (category === 'favorites') {
      return this.filteredReports.filter(report => this.favoriteReports.includes(report.path));
    }
    
    return this.filteredReports.filter(report => report.category === category);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterReports();
  }
}
