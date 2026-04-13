import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SalesOrderInfoService } from '@app/core/api/sales-order/sales-order-info.service';
import { ItemService } from '@app/core/api/operations/item/item.service';
import { WorkOrderInfoService } from '@app/core/api/work-order/work-order-info.service';
import { QadService } from '@app/core/api/qad/sales-order-search.service';

// Import the actual lookup components
import { OrderLookupComponent } from '@app/shared/components/order-lookup/order-lookup.component';
import { PartLookupComponent } from '@app/shared/components/part-lookup/part-lookup.component';
import { WoLookupComponent } from '@app/shared/components/wo-lookup/wo-lookup.component';

// Import search components
import { SoSearchComponent } from '@app/shared/components/so-search/so-search.component';
import { QadPartSearchComponent } from '@app/shared/components/qad-part-search/qad-part-search.component';
import { QadWoSearchComponent } from '@app/shared/components/qad-wo-search/qad-wo-search.component';

export interface SearchResult {
  id: string;
  term: string;
  type: 'order' | 'part' | 'workOrder';
  timestamp: Date;
}

export interface OrderResult {
  sod_nbr: string;
  customer: string;
  customer_name?: string;
  sod_date: string;
  sod_ord_date: string;
  so_status?: string;
  sod_line?: string;
  sod_part?: string;
  id?: string;
}

export interface PartResult {
  pt_nbr: string;
  pt_desc1: string;
  pt_desc2?: string;
  pt_part_type?: string;
  onHand?: number;
  available?: number;
  id?: string;
}

export interface WorkOrderResult {
  wo_nbr: string;
  wo_part: string;
  wo_ord_date: string;
  wo_due_date?: string;
  wo_need_date?: string;
  wo_status: string;
  wo_qty_ord: number;
  wo_qty_comp: number;
  id?: string;
}

@Component({
  selector: 'app-universal-search',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    OrderLookupComponent,
    PartLookupComponent,
    WoLookupComponent,
    SoSearchComponent,
    QadPartSearchComponent,
    QadWoSearchComponent
  ],
  templateUrl: './universal-search.component.html',
  styleUrls: ['./universal-search.component.scss']
})
export class UniversalSearchComponent implements OnInit, OnDestroy {
  
  // Search terms for each tab
  searchTerms = {
    orders: '',
    parts: '',
    workOrders: ''
  };

  // Selected items for detailed view
  selectedItems = {
    order: null,
    part: null,
    workOrder: null
  };

  // Show detailed view flags
  showDetails = {
    orders: false,
    parts: false,
    workOrders: false
  };

  // Loading states (keeping for search dropdowns)
  isLoading = {
    orders: false,
    parts: false,
    workOrders: false
  };

  // Recent searches
  recentSearches: SearchResult[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadRecentSearches();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  // Simple search handlers that work with the integrated components
  onOrderSearch(event: any): void {
    // Just update the search term - the integrated component handles the search
    this.searchTerms.orders = event.target.value;
  }

  onPartSearch(event: any): void {
    // Just update the search term - the integrated component handles the search  
    this.searchTerms.parts = event.target.value;
  }

  onWOSearch(event: any): void {
    // Just update the search term - the integrated component handles the search
    this.searchTerms.workOrders = event.target.value;
  }

  // Handlers for when user selects an item from search dropdown
  onOrderSelected(selectedOrder: any): void {
    this.selectedItems.order = selectedOrder.sod_nbr;
    this.showDetails.orders = true;
    this.addToRecentSearches(selectedOrder.sod_nbr, 'order');
  }

  onPartSelected(selectedPart: any): void {
    this.selectedItems.part = selectedPart.pt_part || selectedPart.pt_nbr;
    this.showDetails.parts = true;
    this.addToRecentSearches(this.selectedItems.part, 'part');
  }

  onWorkOrderSelected(selectedWO: any): void {
    this.selectedItems.workOrder = selectedWO.wo_nbr;
    this.showDetails.workOrders = true;
    this.addToRecentSearches(selectedWO.wo_nbr, 'workOrder');
  }

  // Clear detail view handlers
  clearOrderDetails(): void {
    this.showDetails.orders = false;
    this.selectedItems.order = null;
    this.searchTerms.orders = '';
  }

  clearPartDetails(): void {
    this.showDetails.parts = false;
    this.selectedItems.part = null;
    this.searchTerms.parts = '';
  }

  clearWorkOrderDetails(): void {
    this.showDetails.workOrders = false;
    this.selectedItems.workOrder = null;
    this.searchTerms.workOrders = '';
  }

  // Status class methods
  getOrderStatusClass(status: string): string {
    const statusClasses: {[key: string]: string} = {
      'Open': 'bg-primary',
      'Shipped': 'bg-success',
      'Pending': 'bg-secondary',
      'Cancelled': 'bg-danger',
      'Completed': 'bg-success',
      'In Progress': 'bg-warning text-dark'
    };
    return statusClasses[status] || 'bg-secondary';
  }

  getStockStatusClass(stock: number): string {
    if (stock > 50) return 'bg-success';
    if (stock > 10) return 'bg-warning text-dark';
    return 'bg-danger';
  }

  getWOStatusClass(status: string): string {
    const statusClasses: {[key: string]: string} = {
      'Released': 'bg-primary',
      'Completed': 'bg-success',
      'Hold': 'bg-warning text-dark',
      'Cancelled': 'bg-danger',
      'Active': 'bg-primary',
      'Open': 'bg-info'
    };
    return statusClasses[status] || 'bg-secondary';
  }

  // Detail view methods
  viewOrderDetails(order: OrderResult): void {
    // Navigate to existing order lookup page with query parameter
    this.router.navigate(['/operations/order-lookup'], {
      queryParams: { salesOrderNumber: order.sod_nbr }
    });
  }

  viewPartDetails(part: PartResult): void {
    // Navigate to existing part lookup page with query parameter
    this.router.navigate(['/operations/part-lookup'], {
      queryParams: { partNumber: part.pt_nbr }
    });
  }

  viewWODetails(wo: WorkOrderResult): void {
    // Navigate to existing WO lookup page with query parameter
    this.router.navigate(['/operations/wo-lookup'], {
      queryParams: { wo_nbr: wo.wo_nbr }
    });
  }

  // Recent searches management
  addToRecentSearches(term: string, type: 'order' | 'part' | 'workOrder'): void {
    const search: SearchResult = {
      id: Date.now().toString(),
      term,
      type,
      timestamp: new Date()
    };

    // Remove duplicate if exists
    this.recentSearches = this.recentSearches.filter(s => 
      !(s.term === term && s.type === type)
    );

    // Add to beginning
    this.recentSearches.unshift(search);

    // Keep only last 10
    this.recentSearches = this.recentSearches.slice(0, 10);

    // Save to localStorage
    localStorage.setItem('universalSearchRecent', JSON.stringify(this.recentSearches));
  }

  loadRecentSearches(): void {
    const saved = localStorage.getItem('universalSearchRecent');
    if (saved) {
      try {
        this.recentSearches = JSON.parse(saved);
      } catch (e) {
        this.recentSearches = [];
      }
    }
  }

  useRecentSearch(recent: SearchResult): void {
    switch (recent.type) {
      case 'order':
        this.searchTerms.orders = recent.term;
        this.activateTab('orders-tab');
        // The integrated component will handle the search automatically
        break;
      case 'part':
        this.searchTerms.parts = recent.term;
        this.activateTab('parts-tab');
        // The integrated component will handle the search automatically
        break;
      case 'workOrder':
        this.searchTerms.workOrders = recent.term;
        this.activateTab('workorders-tab');
        // The integrated component will handle the search automatically
        break;
    }
  }

  private activateTab(tabId: string): void {
    // Remove active from all tabs
    document.querySelectorAll('.nav-link').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('show', 'active');
    });

    // Activate target tab
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
      targetTab.classList.add('active');
      const targetPane = document.querySelector(targetTab.getAttribute('data-bs-target') || '');
      if (targetPane) {
        targetPane.classList.add('show', 'active');
      }
    }
  }
}