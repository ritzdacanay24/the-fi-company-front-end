import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { SerialNumberService } from '../../services/serial-number.service';
import { SerialNumber } from '../../models/serial-number.model';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';

type SerialNumberStatus = 'available' | 'assigned' | 'shipped' | 'returned' | 'defective';
import { map, startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  selector: 'app-sn-list',
  templateUrl: './sn-list.component.html',
  styleUrls: ['./sn-list.component.scss']
})
export class SnListComponent implements OnInit {
  serialNumbers$: Observable<SerialNumber[]> = new Observable();
  filteredSerialNumbers$: Observable<SerialNumber[]> = new Observable();
  
  filterForm: FormGroup;
  isLoading = false;
  selectedSerialNumbers: Set<string> = new Set();
  currentPage = 1;
  pageSize = 25;
  totalItems = 0;

  // Filter options
  statusOptions: { value: SerialNumberStatus | 'all', label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'returned', label: 'Returned' },
    { value: 'defective', label: 'Defective' }
  ];

  productModels = [
    'All Models',
    'EyeFi Pro X1',
    'EyeFi Standard S2', 
    'EyeFi Enterprise E3',
    'EyeFi Lite L1',
    'EyeFi Advanced A2'
  ];

  sortOptions = [
    { value: 'serial_number_asc', label: 'Serial Number (A-Z)' },
    { value: 'serial_number_desc', label: 'Serial Number (Z-A)' },
    { value: 'created_at_desc', label: 'Created (Newest)' },
    { value: 'created_at_asc', label: 'Created (Oldest)' },
    { value: 'status_asc', label: 'Status (A-Z)' },
    { value: 'product_model_asc', label: 'Product Model (A-Z)' }
  ];

  private refreshSubject = new BehaviorSubject<void>(undefined);

  constructor(
    private serialNumberService: SerialNumberService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      status: ['all'],
      productModel: ['All Models'],
      sortBy: ['created_at_desc'],
      batchNumber: [''],
      dateFrom: [''],
      dateTo: ['']
    });
  }

  ngOnInit() {
    this.loadSerialNumbers();
    this.setupFilters();
  }

  loadSerialNumbers() {
    this.isLoading = true;
    this.serialNumbers$ = this.refreshSubject.pipe(
      map(() => this.serialNumberService.getAllSerialNumbers()),
      map(obs => {
        obs.subscribe({
          next: () => this.isLoading = false,
          error: () => this.isLoading = false
        });
        return obs;
      })
    ).pipe(
      map(obs => obs as Observable<SerialNumber[]>)
    )[0] || this.serialNumberService.getAllSerialNumbers();
  }

  setupFilters() {
    const filters$ = this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value),
      debounceTime(300),
      distinctUntilChanged()
    );

    this.filteredSerialNumbers$ = combineLatest([
      this.serialNumbers$,
      filters$
    ]).pipe(
      map(([serialNumbers, filters]) => this.applyFilters(serialNumbers, filters))
    );
  }

  private applyFilters(serialNumbers: SerialNumber[], filters: any): SerialNumber[] {
    let filtered = [...serialNumbers];

    // Text search
    if (filters.search?.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(sn => 
        sn.serial_number.toLowerCase().includes(searchTerm) ||
        sn.product_model.toLowerCase().includes(searchTerm) ||
        sn.batch_number?.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(sn => sn.status === filters.status);
    }

    // Product model filter
    if (filters.productModel && filters.productModel !== 'All Models') {
      filtered = filtered.filter(sn => sn.product_model === filters.productModel);
    }

    // Batch number filter
    if (filters.batchNumber?.trim()) {
      filtered = filtered.filter(sn => 
        sn.batch_number?.toLowerCase().includes(filters.batchNumber.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(sn => new Date(sn.created_at || '') >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(sn => new Date(sn.created_at || '') <= toDate);
    }

    // Sorting
    if (filters.sortBy) {
      const [field, direction] = filters.sortBy.split('_');
      filtered.sort((a, b) => {
        let aVal: any = a[field as keyof SerialNumber];
        let bVal: any = b[field as keyof SerialNumber];

        if (field === 'created_at') {
          aVal = new Date(aVal || '').getTime();
          bVal = new Date(bVal || '').getTime();
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.totalItems = filtered.length;
    return filtered;
  }

  // Selection methods
  toggleSelection(serialNumber: string, event: Event) {
    event.stopPropagation();
    if (this.selectedSerialNumbers.has(serialNumber)) {
      this.selectedSerialNumbers.delete(serialNumber);
    } else {
      this.selectedSerialNumbers.add(serialNumber);
    }
  }

  toggleSelectAll(serialNumbers: SerialNumber[]) {
    if (this.allSelected(serialNumbers)) {
      serialNumbers.forEach(sn => this.selectedSerialNumbers.delete(sn.serial_number));
    } else {
      serialNumbers.forEach(sn => this.selectedSerialNumbers.add(sn.serial_number));
    }
  }

  allSelected(serialNumbers: SerialNumber[]): boolean {
    return serialNumbers.length > 0 && 
           serialNumbers.every(sn => this.selectedSerialNumbers.has(sn.serial_number));
  }

  someSelected(serialNumbers: SerialNumber[]): boolean {
    return serialNumbers.some(sn => this.selectedSerialNumbers.has(sn.serial_number)) &&
           !this.allSelected(serialNumbers);
  }

  // Status update methods
  updateStatus(serialNumber: string, newStatus: SerialNumberStatus) {
    // For now, we'll implement a simple status update
    // In a real implementation, you'd find the ID first or have a separate endpoint
    console.log(`Updating ${serialNumber} to ${newStatus}`);
    this.refreshData();
  }

  bulkUpdateStatus(newStatus: SerialNumberStatus) {
    if (this.selectedSerialNumbers.size === 0) return;

    // For now, just clear selection and refresh
    // In a real implementation, you'd have a bulk update endpoint
    console.log(`Bulk updating ${this.selectedSerialNumbers.size} items to ${newStatus}`);
    this.selectedSerialNumbers.clear();
    this.refreshData();
  }

  // Export methods
  exportSelected() {
    if (this.selectedSerialNumbers.size === 0) return;
    
    const serialNumbers = Array.from(this.selectedSerialNumbers);
    this.serialNumberService.exportSerialNumbers(serialNumbers).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `serial-numbers-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting:', error);
      }
    });
  }

  exportAll(filteredSerialNumbers: SerialNumber[]) {
    const serialNumbers = filteredSerialNumbers.map(sn => sn.serial_number);
    this.serialNumberService.exportSerialNumbers(serialNumbers).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `all-serial-numbers-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting:', error);
      }
    });
  }

  // Utility methods
  clearFilters() {
    this.filterForm.reset({
      search: '',
      status: 'all',
      productModel: 'All Models',
      sortBy: 'created_at_desc',
      batchNumber: '',
      dateFrom: '',
      dateTo: ''
    });
  }

  refreshData() {
    this.refreshSubject.next();
  }

  getStatusBadgeClass(status: SerialNumberStatus): string {
    const classes: Record<SerialNumberStatus, string> = {
      available: 'badge-success',
      assigned: 'badge-warning',
      shipped: 'badge-info', 
      returned: 'badge-secondary',
      defective: 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
  }

  getStatusIcon(status: SerialNumberStatus): string {
    const icons: Record<SerialNumberStatus, string> = {
      available: 'fa-check-circle',
      assigned: 'fa-clock',
      shipped: 'fa-shipping-fast',
      returned: 'fa-undo',
      defective: 'fa-exclamation-triangle'
    };
    return icons[status] || 'fa-question';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Pagination methods
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get paginatedItems() {
    return this.filteredSerialNumbers$.pipe(
      map(items => {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        return items.slice(startIndex, startIndex + this.pageSize);
      })
    );
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get visiblePages(): number[] {
    const totalPages = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, current - delta); 
         i <= Math.min(totalPages - 1, current + delta); 
         i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, -1);
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < totalPages - 1) {
      rangeWithDots.push(-1, totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }

  trackBySerialNumber(index: number, item: SerialNumber): string {
    return item.serial_number;
  }

  // Template helper methods
  toggleSelectAllPaginated() {
    this.paginatedItems.subscribe(items => {
      this.toggleSelectAll(items);
    }).unsubscribe();
  }

  exportAllFiltered() {
    this.filteredSerialNumbers$.subscribe(items => {
      this.exportAll(items);
    }).unsubscribe();
  }
}