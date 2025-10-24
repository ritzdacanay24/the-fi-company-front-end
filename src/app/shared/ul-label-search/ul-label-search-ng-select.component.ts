import { Component, EventEmitter, Input, OnInit, OnChanges, Output, forwardRef, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgbTypeahead, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of, OperatorFunction, Subject, merge, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap, switchMap, catchError, map, filter } from 'rxjs/operators';
import { ULLabelService } from '../../features/ul-management/services/ul-label.service';

@Component({
  selector: 'app-ul-label-search-ng',
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
          container="body"
          (selectItem)="onLabelSelect($event)"
          (focus)="focus$.next($any($event).target.value)"
          (click)="click$.next($any($event).target.value)"
          (blur)="onBlur()"
          autocomplete="off"
          #instance="ngbTypeahead"
        />
        <button 
          *ngIf="selectedLabel" 
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
            <div class="fw-semibold text-dark">{{result.ul_number}}</div>
            <small class="text-muted">{{result.category}}</small>
          </div>
          <span class="badge bg-{{getStatusBadgeClass(result.status)}} ms-3">
            {{result.status}}
          </span>
        </div>
        <div *ngIf="result.isPlaceholder" class="py-3 text-center text-muted" style="cursor: default;">
          <i class="mdi mdi-alert-circle-outline me-1"></i>
          <div>{{result.ul_number}}</div>
          <small>{{result.category}}</small>
        </div>
      </ng-template>
      
      <ng-template #noResults>
        <div class="p-3 text-center text-muted">
          <i class="mdi mdi-alert-circle-outline me-1"></i>
          No UL labels found in database
        </div>
      </ng-template>
      
      <div class="form-text" *ngIf="showHelpText && !selectedLabel && !isSearching">
        <i class="mdi mdi-information-outline me-1"></i>
        Type to search for UL labels
      </div>
      
      <div class="form-text text-primary" *ngIf="showHelpText && isSearching">
        <i class="mdi mdi-loading mdi-spin me-1"></i>
        Searching...
      </div>
      
      <div class="text-danger small mt-1" *ngIf="showHelpText && showInvalidMessage">
        <i class="mdi mdi-alert-circle-outline me-1"></i>
        UL label not found in database. Please select from the dropdown.
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
      margin-left: -1px;
    }
    
    .input-group .btn-outline-secondary {
      border-color: #ced4da;
    }
    
    .input-group .btn-outline-secondary:hover {
      background-color: #e9ecef;
      border-color: #ced4da;
      color: #212529;
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
      useExisting: forwardRef(() => UlLabelSearchNgSelectComponent),
      multi: true
    }
  ]
})
export class UlLabelSearchNgSelectComponent implements OnInit, OnChanges, ControlValueAccessor {
  @Input() form_label: string = 'UL Label Number';
  @Input() placeholder: string = 'Search by UL Number';
  @Input() required: boolean = false;
  @Input() showLabel: boolean = true;
  @Input() showHelpText: boolean = true; // Show help text below input
  @Input() status: string = 'available';
  @Input() category: string = ''; // 'New' or 'Used'
  @Input() strictMode: boolean = true;
  @Input() excludeLabels: string[] = [];
  
  @Output() notifyParent = new EventEmitter<any>();

  @ViewChild('instance', { static: true }) instance!: NgbTypeahead;

  model: any;
  selectedLabel: any = null;
  isSearching: boolean = false;
  showInvalidMessage: boolean = false;
  
  focus$ = new Subject<string>();
  click$ = new Subject<string>();
  
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  disabled: boolean = false;

  constructor(private ulLabelService: ULLabelService) {}

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
      switchMap(term => this.searchLabels(term || '')),
      map(results => {
        // If no results, return a placeholder object
        if (results.length === 0) {
          return [{ 
            ul_number: 'No results found', 
            category: 'Try a different search term',
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
          ul_number: 'Error loading results', 
          category: 'Please try again',
          status: 'none',
          isPlaceholder: true 
        }]);
      })
    );
  };

  // Formatter for displaying selected item
  formatter = (result: any) => result.ul_number || '';

  private async searchLabels(term: string): Promise<any[]> {
    try {
      console.log('🔍 UL Search - Term:', term, 'Category:', this.category, 'Status:', this.status);
      
      // Build filters for the search
      const filters: any = {};
      
      // Add category filter if specified
      if (this.category) {
        filters.category = this.category;
      }
      
      // For 'available' status, use the available flag instead
      // Backend will filter for: status='active' AND is_consumed=0
      if (this.status === 'available') {
        filters.available = 'true';
      } else {
        // For other statuses (active, inactive, expired), pass directly
        filters.status = this.status;
      }
      
      console.log('🔍 UL Search - Filters being sent:', filters);
      
      // Request more results to account for filtering out excluded labels
      // This ensures we can still show ~10 after filtering
      filters.limit = 50;
      
      // Use searchULLabels which passes the search term to backend
      const response = await firstValueFrom(this.ulLabelService.searchULLabels(term || '', filters));
      
      console.log('🔍 UL Search - Raw response:', response);
      
      // Handle both wrapped and unwrapped responses
      let labels = [];
      if (response?.data) {
        labels = response.data;
      } else if (Array.isArray(response)) {
        labels = response;
      }
      
      console.log('🔍 UL Search - Total labels loaded:', labels.length);
      
      // Filter out ULs that are already assigned to other rows
      // But keep the currently selected UL for this row (if any) so it shows highlighted
      const currentValue = this.model?.ul_number || this.model;
      const filteredLabels = labels.filter(label => {
        // Keep if it's the current selection for this row
        if (label.ul_number === currentValue) {
          return true;
        }
        // Otherwise, exclude if it's already used in another row
        return !this.excludeLabels.includes(label.ul_number);
      });
      
      // Limit to 10 results for the dropdown
      const finalResults = filteredLabels.slice(0, 10);
      
      console.log('🔍 UL Search - After filtering excluded:', filteredLabels.length);
      console.log('🔍 UL Search - Returning (max 10):', finalResults.map(l => l.ul_number));
      
      return finalResults;
    } catch (error) {
      console.error('❌ Error searching UL labels:', error);
      return [];
    }
  }

  // Watch for changes in excludeLabels
  ngOnChanges(changes: SimpleChanges): void {
    // If excludeLabels changes, clear the current selection if it's now excluded
    if (changes['excludeLabels'] && !changes['excludeLabels'].firstChange) {
      if (this.selectedLabel && this.excludeLabels.includes(this.selectedLabel.ul_number)) {
        this.clearSelection();
      }
    }
  }

  onLabelSelect(event: any): void {
    const label = event.item;
    
    // Don't allow selection of placeholder items
    if (label && !label.isPlaceholder) {
      this.model = label;
      this.selectedLabel = label;
      this.showInvalidMessage = false;
      this.onChange(label.ul_number);
      this.onTouched();
      this.notifyParent.emit(label);
    } else if (label && label.isPlaceholder) {
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
      this.selectedLabel = null;
      this.onChange(null);
      
      // Hide message after 5 seconds
      setTimeout(() => {
        this.showInvalidMessage = false;
      }, 5000);
    } else if (!this.model) {
      // Field is empty
      this.showInvalidMessage = false;
      this.selectedLabel = null;
      this.onChange(null);
    } else {
      // Valid object selected
      this.showInvalidMessage = false;
    }
  }

  clearSelection(): void {
    this.model = null;
    this.selectedLabel = null;
    this.showInvalidMessage = false;
    this.onChange(null);
    this.onTouched();
    this.notifyParent.emit(null);
  }

  getStatusBadgeClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'available': 'success',
      'assigned': 'primary',
      'used': 'info',
      'consumed': 'warning',
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
        this.loadLabelByNumber(value);
      } else {
        this.selectedLabel = value;
        this.model = value;
      }
    } else {
      this.selectedLabel = null;
      this.model = null;
    }
  }

  private async loadLabelByNumber(ulNumber: string): Promise<void> {
    try {
      // Use getAvailableULNumbers to find the label
      const response = await firstValueFrom(this.ulLabelService.getAvailableULNumbers());
      
      let labels = [];
      if (response?.data) {
        labels = response.data;
      } else if (Array.isArray(response)) {
        labels = response;
      }
      
      // Find exact match
      const exactMatch = labels.find(
        label => label.ul_number === ulNumber
      );
      
      if (exactMatch) {
        this.selectedLabel = exactMatch;
        this.model = exactMatch;
      }
    } catch (error) {
      console.error('Error loading UL label by number:', error);
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
