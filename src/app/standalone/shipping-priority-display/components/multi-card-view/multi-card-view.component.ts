import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupedPriorityItem } from '../../services/priority-display.service';
import { ThemeManagementService } from '../../services/theme-management.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-multi-card-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multi-card-view.component.html',
  styleUrls: ['./multi-card-view.component.scss']
})
export class MultiCardViewComponent implements OnInit, OnDestroy {
  @Input() groupedItems: GroupedPriorityItem[] = [];
  @Input() displayMode: 'top3' | 'top6' | 'grid' = 'top3';
  @Input() cardLayout: 'traditional' | 'production' | 'salesorder' | 'compact' | 'detailed' | 'minimal' | 'dashboard' = 'traditional';
  @Input() currentTime: string = '';
  @Input() lastUpdated: string = '';
  @Input() isRefreshing: boolean = false;
  @Input() showRefreshOverlay: boolean = true;

  @Output() refreshRequested = new EventEmitter<void>();

  // Theme-related properties
  currentTheme: 'light' | 'dark' | 'dark-vibrant' | 'midnight' | 'neon' | 'bootstrap-dark' = 'light';
  private themeSubscription?: Subscription;

  constructor(private themeService: ThemeManagementService) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.themeSettings$.subscribe(settings => {
      this.currentTheme = settings.currentTheme;
    });

    // Initialize theme based on current settings
    const currentSettings = this.themeService.getCurrentSettings();
    this.currentTheme = currentSettings.currentTheme;
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  get displayedItems(): GroupedPriorityItem[] {
    switch (this.displayMode) {
      case 'top3':
        return this.groupedItems.slice(0, 3);
      case 'top6':
        return this.groupedItems.slice(0, 6);
      case 'grid':
        return this.groupedItems;
      default:
        return this.groupedItems.slice(0, 3);
    }
  }

  get cardClass(): string {
    switch (this.displayMode) {
      case 'top3':
        return 'col-lg-4 col-md-6';
      case 'top6':
        return 'col-lg-4 col-md-6';
      case 'grid':
        return 'col-xl-3 col-lg-4 col-md-6';
      default:
        return 'col-lg-4 col-md-6';
    }
  }

  get containerClass(): string {
    const baseClass = this.displayMode === 'grid' ? 'grid-view' : 'card-view';
    const themeClass = this.currentTheme === 'dark' ? 'theme-dark' : 'theme-light';
    return `${baseClass} ${themeClass} burn-in-prevention`;
  }

  // Utility methods - these will be moved to a shared service later
  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  formatQuantity(qty: number | string): string {
    if (!qty) return '0';
    return Number(qty).toLocaleString();
  }

  truncateText(text: string | null | undefined, maxLength: number = 30): string {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  hasCompletedOrders(orders: any[]): boolean {
    return orders.some(order => order.misc?.['userName'] === 'Shipping');
  }

  hasHotOrders(orders: any[]): boolean {
    return orders.some(order => order.misc?.hot_order);
  }

  hasLowInventoryOrders(orders: any[]): boolean {
    return orders.some(order => order.LD_QTY_OH && order.LD_QTY_OH < (order.QTYOPEN || 0));
  }

  getPriorityCardColor(index: number): string {
    const colors = [
      'border-danger',    // Red for highest priority
      'border-warning',   // Orange for second
      'border-info',      // Blue for third
      'border-success',   // Green for fourth
      'border-secondary', // Gray for others
      'border-primary'    // Blue variant for others
    ];
    return colors[index % colors.length];
  }

  getCompletionPercentage(orders: any[]): number {
    if (!orders || orders.length === 0) return 0;
    const completedCount = orders.filter(order => order.misc?.['userName'] === 'Shipping').length;
    return Math.round((completedCount / orders.length) * 100);
  }

  onRefreshData(): void {
    this.refreshRequested.emit();
  }

  getPartDescription(item: any): string {
    // Get description from first order with available description
    const orderWithDesc = item.orders.find((order: any) => 
      order.FULLDESC || order.PT_DESC1 || order.PT_DESC2
    );
    
    if (orderWithDesc) {
      // Combine PT_DESC1 and PT_DESC2 if both exist
      const desc1 = orderWithDesc.PT_DESC1 || '';
      const desc2 = orderWithDesc.PT_DESC2 || '';
      const combinedDesc = [desc1, desc2].filter(d => d.trim()).join(' ');
      
      return orderWithDesc.FULLDESC || combinedDesc || 'No description available';
    }
    
    return 'No description available';
  }

  getUniqueCustomers(item: any): string[] {
    const customerSet = new Set<string>();
    
    item.orders.forEach((order: any) => {
      const customer = order.SO_CUST || order['COMPANY'] || order.CUSTNAME;
      if (customer && customer !== 'N/A' && customer.trim()) {
        customerSet.add(customer.trim());
      }
    });
    
    return Array.from(customerSet);
  }

  getPrimaryCustomer(item: any): string {
    const customers = this.getUniqueCustomers(item);
    if (customers.length === 0) {
      return 'N/A';
    }
    if (customers.length === 1) {
      return customers[0];
    }
    return customers[0]; // Return first customer if multiple
  }

  getWorkOrderNumber(item: any): string {
    // Check for WO_NBR in orders
    const orderWithWO = item.orders.find((order: any) => order.WO_NBR);
    if (orderWithWO && orderWithWO.WO_NBR) {
      return orderWithWO.WO_NBR.toString();
    }
    
    // Check for work order in misc data
    const orderWithMiscWO = item.orders.find((order: any) => order.misc?.tj_po_number);
    if (orderWithMiscWO && orderWithMiscWO.misc?.tj_po_number) {
      return orderWithMiscWO.misc.tj_po_number.toString();
    }
    
    return '';
  }

  getWorkOrderNumbers(item: any): string[] {
    const workOrderSet = new Set<string>();
    
    item.orders.forEach((order: any) => {
      // Check for WO_NBR first
      if (order.WO_NBR) {
        workOrderSet.add(order.WO_NBR.toString());
      }
      // Check for work order in misc data
      else if (order.misc?.tj_po_number) {
        workOrderSet.add(order.misc.tj_po_number.toString());
      }
    });
    
    return Array.from(workOrderSet);
  }

  getCustomerLogo(customerName: string): string | null {
    if (!customerName) return null;
    
    const customer = customerName.toLowerCase().trim();
    
    if (customer.includes('amegam')) {
      return 'https://assets.talentronic.com/brands/employers/logos/000/279/189/logo.png?1582145902';
    } else if (customer.includes('ati') || customer.includes('aristocrat')) {
      return 'https://www.indiangaming.com/wp-content/uploads/2021/03/Aristocrat_Logo2-1024x323.jpg';
    } else if (customer.includes('baltec')) {
      return 'https://c.smartrecruiters.com/sr-careersite-image-prod/55920a6fe4b06ce952a5c887/060d5037-4f70-4dd7-9c31-d700f6c5b468?r=s3';
    } else if (customer.includes('incred') || customer.includes('incredible')) {
      return 'assets/images/companies/incred-logo.svg';
    } else if (customer.includes('igt') || customer.includes('intgam') || customer.includes('international game technology')) {
      return 'https://cdn.imgbin.com/19/15/1/imgbin-international-game-technology-i-g-t-australia-pty-ltd-portable-network-graphics-lottomatica-spa-social-campaign-iQga30i3JCuekwguEpeYSgfSg.jpg';
    }
    
    return null;
  }

  getPriorityRankClass(index: number): string {
    if (index === 0) return 'priority-gold';      // #1 - Gold
    if (index === 1) return 'priority-silver';    // #2 - Silver  
    if (index === 2) return 'priority-bronze';    // #3 - Bronze
    if (index <= 4) return 'priority-high';       // #4-5 - High priority
    if (index <= 9) return 'priority-medium';     // #6-10 - Medium priority
    return 'priority-standard';                   // #11+ - Standard
  }
}