import { Injectable } from '@angular/core';
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class DisplayUtilsService {

  /**
   * Format date for display
   */
  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    return moment(date).format('MM/DD/YYYY');
  }

  /**
   * Format time for display
   */
  formatTime(date: string | null): string {
    if (!date) return 'N/A';
    return moment(date).format('h:mm A');
  }

  /**
   * Format current time for header display
   */
  formatCurrentTime(): string {
    return moment().format('dddd, MMMM Do YYYY, h:mm:ss A');
  }

  /**
   * Get status badge class based on status
   */
  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'past due':
        return 'badge bg-danger';
      case 'due today':
        return 'badge bg-warning';
      case 'future order':
        return 'badge bg-success';
      default:
        return 'badge bg-secondary';
    }
  }

  /**
   * Get priority badge class based on priority level
   */
  getPriorityBadgeClass(priority: number): string {
    if (priority === 1) return 'badge bg-danger';
    if (priority <= 3) return 'badge bg-warning';
    if (priority <= 5) return 'badge bg-info';
    return 'badge bg-secondary';
  }

  /**
   * Get priority rank text for display
   */
  getPriorityRankText(index: number): string {
    switch (index) {
      case 0: return '1st Priority';
      case 1: return '2nd Priority';
      case 2: return '3rd Priority';
      default: return `${index + 1}th Priority`;
    }
  }

  /**
   * Get priority rank class for styling
   */
  getPriorityRankClass(index: number): string {
    switch (index) {
      case 0: return 'priority-gold';
      case 1: return 'priority-silver';
      case 2: return 'priority-bronze';
      default: return 'priority-default';
    }
  }

  /**
   * Truncate text with ellipsis
   */
  truncateText(text: string, maxLength: number = 50): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  /**
   * Format quantity for display
   */
  formatQuantity(qty: number | string): string {
    if (!qty) return '0';
    const num = typeof qty === 'string' ? parseInt(qty) : qty;
    return num.toLocaleString();
  }
}
