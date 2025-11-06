import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupedPriorityItem } from '../../services/priority-display.service';

@Component({
  selector: 'app-single-priority-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './single-priority-view.component.html',
  styleUrls: ['./single-priority-view.component.scss']
})
export class SinglePriorityViewComponent {
  @Input() currentGroupedItem: GroupedPriorityItem | null = null;
  @Input() nextGroupedItems: GroupedPriorityItem[] = [];
  @Input() currentTime: string = '';
  @Input() lastUpdated: string = '';

  @Output() refreshRequested = new EventEmitter<void>();

  // Utility methods - these will be moved to a shared service later
  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  formatQuantity(qty: number | string): string {
    if (!qty) return '0';
    return Number(qty).toLocaleString();
  }

  truncateText(text: string | null | undefined, maxLength: number = 50): string {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  getPartDescription(order: any): string {
    if (order.FULLDESC && order.FULLDESC.trim()) {
      return order.FULLDESC.trim();
    }
    if (order.PT_DESC1 && order.PT_DESC1.trim()) {
      return order.PT_DESC1.trim();
    }
    if (order.PT_DESC2 && order.PT_DESC2.trim()) {
      return order.PT_DESC2.trim();
    }
    return 'No description available';
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

  onRefreshData(): void {
    this.refreshRequested.emit();
  }
}