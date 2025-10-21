import { Component, EventEmitter, Input, OnInit, OnChanges, Output, forwardRef, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgbTypeahead, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of, OperatorFunction, Subject, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap, switchMap, catchError, map, filter } from 'rxjs/operators';
import { SerialNumberService } from '../../features/serial-number-management/services/serial-number.service';

@Component({
  selector: 'app-eyefi-serial-search-ng',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbTypeaheadModule],
  template: `
    <div class="form-group">
      <label *ngIf="showLabel" class="form-label">
        {{ form_label }}
        <span *ngIf="required" class="text-danger">*</span>
      </label>
      
      <div class="input-group">
        <input
          type="text"
          class="form-control"
          [class.is-invalid]="showInvalidMessage"
          [(ngModel)]="model"
          [ngbTypeahead]="search"
          [resultTemplate]="rt"
          [resultFormatter]="formatter"
          [inputFormatter]="formatter"
          [placeholder]="placeholder"
          [disabled]="disabled"
          (selectItem)="onSerialSelect($event)"
          (focus)="focus$.next($any($event).target.value)"
          (click)="click$.next($any($event).target.value)"
          (blur)="onBlur()"
          autocomplete="off"
          #instance="ngbTypeahead"
        />
        <button 
          *ngIf="selectedSerial" 
          class="btn btn-outline-secondary" 
          type="button"
          (click)="clearSelection()"
          [disabled]="disabled"
        >
          <i class="mdi mdi-close"></i>
        </button>
      </div>
      
      <ng-template #rt let-result="result" let-term="term">
        <div *ngIf="!result.isPlaceholder" class="d-flex align-items-center justify-content-between py-2">
          <div>
            <div class="fw-semibold text-dark">{{result.serial_number}}</div>
          </div>
          <span class="badge bg-{{getStatusBadgeClass(result.status)}} ms-3">
            {{result.status}}
          </span>
        </div>
        <div *ngIf="result.isPlaceholder" class="py-3 text-center text-muted" style="cursor: default;">
          <i class="mdi mdi-alert-circle-outline me-1"></i>
          <div>{{result.serial_number}}</div>
          <small>{{result.product_model}}</small>
        </div>
      </ng-template>
      
      <ng-template #noResults>
        <div class="p-3 text-center text-muted">
          <i class="mdi mdi-alert-circle-outline me-1"></i>
          No serial numbers found in database
        </div>
      </ng-template>
      
      <div class="form-text" *ngIf="!selectedSerial && !isSearching">
        <i class="mdi mdi-information-outline me-1"></i>
        Type to search for EyeFi serial numbers
      </div>
      
      <div class="form-text text-primary" *ngIf="isSearching">
        <i class="mdi mdi-loading mdi-spin me-1"></i>
        Searching...
      </div>
      
      <div class="text-danger small mt-1" *ngIf="showInvalidMessage">
        <i class="mdi mdi-alert-circle-outline me-1"></i>
        Serial number not found in database. Please select from the dropdown.
      </div>
    </div>
  `,
  styles: [`
    .form-control:focus {
      border-color: #86b7fe;
      box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
    }
    
    .input-group .btn {
      border-left: 0;
    }
    
    ::ng-deep .dropdown-menu {
      max-height: 350px;
      overflow-y: auto;
      box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.1);
    }
    
    ::ng-deep .dropdown-item:hover,
    ::ng-deep .dropdown-item.active {
      background-color: #f8f9fa;
    }
    
    ::ng-deep .dropdown-item:has([style*="cursor: default"]):hover {
      background-color: transparent;
      cursor: default;
    }
    
    .form-control.is-invalid {
      border-color: #dc3545;
    }
    
    .form-control.is-invalid:focus {
      border-color: #dc3545;
      box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.25);
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EyefiSerialSearchNgSelectComponent),
      multi: true
    }
  ]
})
export class EyefiSerialSearchNgSelectComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input() form_label: string = 'Serial Number';
  @Input() placeholder: string = 'Search by Serial Number';
  @Input() required: boolean = false;
  @Input() showLabel: boolean = true;
  @Input() status: string = 'available';
  @Input() productModel: string = '';
  @Input() strictMode: boolean = true;
  @Input() excludeSerials: string[] = [];
  
  @Output() notifyParent = new EventEmitter<any>();

  @ViewChild('instance', { static: true }) instance!: NgbTypeahead;

  model: any;
  selectedSerial: any = null;
  isSearching: boolean = false;
  showInvalidMessage: boolean = false;
  
  focus$ = new Subject<string>();
  click$ = new Subject<string>();
  
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  disabled: boolean = false;

  constructor(private serialNumberService: SerialNumberService) {}

  ngOnInit(): void {
    // No initialization needed
  }

  // Search function for typeahead with focus/click support
  search: OperatorFunction<string, readonly any[]> = (text$: Observable<string>) => {
    const debouncedText$ = text$.pipe(debounceTime(300), distinctUntilChanged());
    const clicksWithClosedPopup$ = this.click$.pipe(filter(() => !this.instance.isPopupOpen()));
    const inputFocus$ = this.focus$;

    return merge(debouncedText$, inputFocus$, clicksWithClosedPopup$).pipe(
      tap(() => this.isSearching = true),
      switchMap(term => this.searchSerials(term || '')),
      map(results => {
        // If no results, return a placeholder object
        if (results.length === 0) {
          return [{ 
            serial_number: 'No results found', 
            product_model: 'Try a different search term',
            status: 'none',
            isPlaceholder: true 
          }];
        }
        return results;
      }),
      tap(() => this.isSearching = false),
      catchError(() => {
        this.isSearching = false;
        return of([{ 
          serial_number: 'Error loading results', 
          product_model: 'Please try again',
          status: 'none',
          isPlaceholder: true 
        }]);
      })
    );
  };

  // Formatter for displaying selected item
  formatter = (result: any) => result.serial_number || '';

  private async searchSerials(term: string): Promise<any[]> {
    try {
      const filters: any = {
        // limit: 30,
        sort: 'serial_number',
        order: 'asc'
      };

      // If term is empty, get recent/available serials, otherwise search
      if (term && term.length > 0) {
        filters.search = term;
      }

      // if (this.status) {
      //   filters.status = this.status;
      // }

      if (this.productModel) {
        filters.product_model = this.productModel;
      }

      const response = await this.serialNumberService.getAllSerialNumbers(filters);
      
      if (response?.success) {
        const serials = response.data || [];
        // Filter out excluded serials
        return serials.filter(
          serial => !this.excludeSerials.includes(serial.serial_number)
        );
      }
      return [];
    } catch (error) {
      console.error('Error searching serial numbers:', error);
      return [];
    }
  }

  // Watch for changes in excludeSerials
  ngOnChanges(changes: SimpleChanges): void {
    // If excludeSerials changes, clear the current selection if it's now excluded
    if (changes['excludeSerials'] && !changes['excludeSerials'].firstChange) {
      if (this.selectedSerial && this.excludeSerials.includes(this.selectedSerial.serial_number)) {
        this.clearSelection();
      }
    }
  }

  onSerialSelect(event: any): void {
    const serial = event.item;
    
    // Don't allow selection of placeholder items
    if (serial && !serial.isPlaceholder) {
      this.model = serial;
      this.selectedSerial = serial;
      this.showInvalidMessage = false;
      this.onChange(serial.serial_number);
      this.onTouched();
      this.notifyParent.emit(serial);
    } else if (serial && serial.isPlaceholder) {
      // Prevent selection and keep dropdown open
      event.preventDefault();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    // Allow tab, escape, arrow keys for navigation
    const allowedKeys = ['Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'Enter'];
    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  onBlur(): void {
    this.onTouched();
    
    // Check if the current model is a valid selection
    if (this.model && typeof this.model === 'string') {
      // User typed something but didn't select from dropdown
      this.showInvalidMessage = true;
      this.model = null;
      this.selectedSerial = null;
      this.onChange(null);
      
      // Hide message after 5 seconds
      setTimeout(() => {
        this.showInvalidMessage = false;
      }, 5000);
    } else if (!this.model) {
      // Field is empty
      this.showInvalidMessage = false;
      this.selectedSerial = null;
      this.onChange(null);
    } else {
      // Valid object selected
      this.showInvalidMessage = false;
    }
  }

  clearSelection(): void {
    this.model = null;
    this.selectedSerial = null;
    this.showInvalidMessage = false;
    this.onChange(null);
    this.onTouched();
    this.notifyParent.emit(null);
  }

  getStatusBadgeClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'available': 'success',
      'assigned': 'primary',
      'shipped': 'info',
      'returned': 'warning',
      'defective': 'danger'
    };
    return statusMap[status] || 'secondary';
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value) {
      if (typeof value === 'string') {
        // Set display value and try to fetch the full object
        this.model = value;
        this.loadSerialByNumber(value);
      } else {
        this.selectedSerial = value;
        this.model = value;
      }
    } else {
      this.selectedSerial = null;
      this.model = null;
    }
  }

  private async loadSerialByNumber(serialNumber: string): Promise<void> {
    try {
      const filters = {
        search: serialNumber,
        limit: 1
      };
      const response = await this.serialNumberService.getAllSerialNumbers(filters);
      if (response?.success && response.data?.length > 0) {
        this.selectedSerial = response.data[0];
        this.model = response.data[0];
      }
    } catch (error) {
      console.error('Error loading serial by number:', error);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
