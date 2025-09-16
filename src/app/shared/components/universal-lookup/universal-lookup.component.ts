import { Component, OnInit } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { OrderLookupComponent } from '../order-lookup/order-lookup.component';
import { PartLookupComponent } from '../part-lookup/part-lookup.component';
import { WoLookupComponent } from '../wo-lookup/wo-lookup.component';
import { BomViewComponent } from '@app/pages/operations/bom/bom-view/bom-view.component';

export interface SearchType {
  value: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  standalone: true,
  imports: [
    SharedModule, 
    OrderLookupComponent, 
    PartLookupComponent, 
    WoLookupComponent,
    BomViewComponent
  ],
  selector: 'app-universal-lookup',
  templateUrl: './universal-lookup.component.html',
  styleUrls: ['./universal-lookup.component.scss']
})
export class UniversalLookupComponent implements OnInit {
  
  searchQuery: string = '';
  selectedSearchType: string = 'sales-order';
  isSearching: boolean = false;
  hasSearched: boolean = false;
  shouldShowResults: boolean = false;
  triggerSearch: boolean = false;
  showAmbiguousSelection: boolean = false;
  ambiguousQuery: string = '';
  searchResults: any = null;
  isAutoDetected: boolean = false;

  searchTypes: SearchType[] = [
    {
      value: 'sales-order',
      label: 'Sales Order',
      icon: 'mdi-package-variant',
      description: 'Search by Sales Order Number'
    },
    {
      value: 'work-order',
      label: 'Work Order',
      icon: 'mdi-wrench',
      description: 'Search by Work Order Number'
    },
    {
      value: 'part-number',
      label: 'Part Number',
      icon: 'mdi-cog',
      description: 'Search by Part Number or Description'
    },
    {
      value: 'bom-structure',
      label: 'BOM Structure',
      icon: 'mdi-file-tree',
      description: 'Search Bill of Materials Structure'
    }
  ];

  ngOnInit(): void {
    // Initialize component
  }

  onSearchTypeChange(searchType: string): void {
    this.selectedSearchType = searchType;
    this.isAutoDetected = false; // Manual selection
    // Don't clear results when manually changing search type
    // this.shouldShowResults = false;
    // Don't clear search query, just hide ambiguous selection if showing
    this.showAmbiguousSelection = false;
    this.ambiguousQuery = '';
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      return;
    }

    // Check if query is ambiguous before searching
    const detectedType = this.detectSearchType(this.searchQuery.trim());
    if (detectedType === 'ambiguous') {
      this.ambiguousQuery = this.searchQuery.trim();
      this.showAmbiguousSelection = true;
    } else {
      this.executeSearch();
    }
  }

  executeSearch(): void {
    this.isSearching = true;
    this.hasSearched = true;
    this.shouldShowResults = true;
    this.triggerSearch = true;
    this.searchResults = null;
    
    // Reset trigger after a brief delay to ensure child components detect the change
    setTimeout(() => {
      this.triggerSearch = false;
    }, 100);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.hasSearched = false;
    this.shouldShowResults = false;
    this.isSearching = false;
    this.searchResults = null;
    this.isAutoDetected = false;
    this.showAmbiguousSelection = false;
    this.ambiguousQuery = '';
  }

  onAmbiguousSelection(selectedType: string): void {
    this.selectedSearchType = selectedType;
    this.isAutoDetected = true;
    this.showAmbiguousSelection = false;
    this.executeSearch();
  }

  onAmbiguousCancel(): void {
    this.showAmbiguousSelection = false;
    this.ambiguousQuery = '';
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSearch();
    }
  }

  onSearchQueryChange(): void {
    // Auto-detect search type based on input pattern
    if (this.searchQuery.trim()) {
      const detectedType = this.detectSearchType(this.searchQuery.trim());
      if (detectedType === 'ambiguous') {
        // Don't auto-select for ambiguous cases, keep current selection
        this.isAutoDetected = false;
        // Hide ambiguous selection if user is typing
        this.showAmbiguousSelection = false;
      } else if (detectedType !== this.selectedSearchType) {
        this.selectedSearchType = detectedType;
        this.isAutoDetected = true;
        // Hide ambiguous selection if auto-detecting
        this.showAmbiguousSelection = false;
      }
    } else {
      this.isAutoDetected = false;
      this.showAmbiguousSelection = false;
    }
    
    // Don't clear existing results when typing - let them persist until new search
  }

  onPasteDetection(event: ClipboardEvent): void {
    // Handle paste event with slight delay to ensure input value is updated
    setTimeout(() => {
      if (this.searchQuery.trim()) {
        const detectedType = this.detectSearchType(this.searchQuery.trim());
        
        if (detectedType === 'ambiguous') {
          // Show selection modal for ambiguous queries
          this.ambiguousQuery = this.searchQuery.trim();
          this.showAmbiguousSelection = true;
        } else {
          if (detectedType !== this.selectedSearchType) {
            this.selectedSearchType = detectedType;
            this.isAutoDetected = true;
          }
          
          // Auto-search after paste for non-ambiguous cases
          this.executeSearch();
        }
      }
    }, 10);
  }

  private detectSearchType(query: string): string | 'ambiguous' {
    const trimmedQuery = query.toUpperCase().trim();
    
    // Sales Order patterns: MUST have SO prefix
    if (trimmedQuery.match(/^SO\d+$/i)) {
      return 'sales-order';
    }
    
    // Work Order patterns: Pure numbers (like 38824) or WO prefix
    if (trimmedQuery.match(/^WO\d+$/i) || 
        (trimmedQuery.match(/^\d+$/) && trimmedQuery.length >= 4 && trimmedQuery.length <= 8)) {
      return 'work-order';
    }
    
    // Check for ambiguous patterns that could be part numbers OR BOM structures
    // Pattern like "VWL-03527-400" - alphanumeric with dashes, could be either
    if (trimmedQuery.match(/^[A-Z0-9\-\.\_]+$/i) && 
        trimmedQuery.length >= 5 && 
        trimmedQuery.length <= 25 &&
        trimmedQuery.includes('-') &&
        !trimmedQuery.match(/^SO\d+$/i) &&
        !trimmedQuery.match(/^WO\d+$/i) &&
        !trimmedQuery.match(/^\d+$/)) {
      return 'ambiguous';
    }
    
    // Part Number patterns: alphanumeric with possible dashes/dots/underscores
    // Must not be pure numbers or SO/WO patterns
    if (trimmedQuery.match(/^[A-Z0-9\-\.\_]+$/i) && 
        trimmedQuery.length >= 3 && 
        trimmedQuery.length <= 25 &&
        !trimmedQuery.match(/^SO\d+$/i) &&
        !trimmedQuery.match(/^WO\d+$/i) &&
        !trimmedQuery.match(/^\d+$/)) {
      return 'part-number';
    }
    
    // If it contains letters and numbers mixed (not pure numbers), likely a part number
    if (trimmedQuery.match(/^[A-Z0-9\-\.\_]*[A-Z][A-Z0-9\-\.\_]*$/i) && 
        trimmedQuery.match(/\d/) && 
        trimmedQuery.length >= 3 && 
        trimmedQuery.length <= 25) {
      return 'part-number';
    }
    
    // Default to work order for pure numbers (like 38824)
    return 'work-order';
  }

  onOrderDataReceived(data: any): void {
    console.log('Order data received:', data);
    this.searchResults = data;
    this.isSearching = false;
  }

  onPartDataReceived(data: any): void {
    console.log('Part data received:', data);
    this.searchResults = data;
    this.isSearching = false;
  }

  onWorkOrderDataReceived(data: any): void {
    console.log('Work order data received:', data);
    this.searchResults = data;
    this.isSearching = false;
  }

  onBomDataReceived(data: any): void {
    console.log('BOM data received:', data);
    this.searchResults = data;
    this.isSearching = false;
  }

  onLoadingStateChanged(isLoading: boolean): void {
    // Properly manage loading state from child components
    this.isSearching = isLoading;
  }
}