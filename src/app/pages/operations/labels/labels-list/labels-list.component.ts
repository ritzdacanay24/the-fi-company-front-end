import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AgGridModule } from "ag-grid-angular";
import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { NgSelectModule } from "@ng-select/ng-select";
import { FormsModule } from "@angular/forms";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _compressToEncodedURIComponent,
  _decompressFromEncodedURIComponent,
} from "src/assets/js/util/jslzString";

import { labelData } from "../labels";
import { CustomerLabelModalService } from "../customer-label-modal/customer-label-modal.component";
import { PartInformationLabelModalService } from "../part-information-label-modal/part-information-label-modal.component";
import { KitLabelModalService } from "../kit-label-modal/kit-label-modal.component";
import { LocationLabelModalService } from "../location-label-modal/location-label-modal.component";
import { JustLabelModalService } from "../just-label-modal/just-label-modal.component";

import tippy from "tippy.js";
import { IssueToWorkOrderLabelModalService } from "../issue-to-work-order-label-modal/issue-to-work-order-label-modal.component";
import { PartInformationLabelLgModalService } from "../part-information-label-lg-modal/part-information-label-lg-modal.component";
import { AgsLabelModalService } from "../ags-label-modal/ags-label-modal.component";
import { GridFiltersComponent } from "@app/shared/grid-filters/grid-filters.component";
import { GridSettingsComponent } from "@app/shared/grid-settings/grid-settings.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { PartInformationLabelModalSmService } from "../part-information-label-modal-sm/part-information-label-modal-sm.component";
import { PartAndSNModalService } from "../part-and-sn-modal/part-and-sn-modal.component";
import { SNULAssetModalService } from "../sn-ul-asset-modal/sn-ul-asset-modal.component";
import { ContinuityModalService } from "../continuity-test-modal/continuity-test-modal.component";
import { TotalLabelsModalService } from "../total-labels-modal/total-labels-modal.component";
import { BlackRedLabelModalService } from "@app/pages/operations/labels/black-red-modal/black-red-modal.component";

tippy.setDefaultProps({ delay: 0 });
tippy.setDefaultProps({ animation: false });

@Component({
  standalone: true,
  imports: [
    SharedModule,
    FormsModule,
    AgGridModule,
    NgSelectModule,
    GridSettingsComponent,
    GridFiltersComponent,
  ],
  selector: "app-labels-list",
  templateUrl: "./labels-list.component.html",
  styleUrls: ["./labels-list.component.scss"]
})
export class LabelsListComponent implements OnInit {
  pageId = "/list-labels";

  constructor(
    public router: Router,
    public activatedRoute: ActivatedRoute,
    private customerLabelModalService: CustomerLabelModalService,
    private partInformationLabelModalService: PartInformationLabelModalService,
    private kitLabelModalService: KitLabelModalService,
    private locationLabelModalService: LocationLabelModalService,
    private justLabelModalService: JustLabelModalService,
    private issueToWorkOrderLabelModalService: IssueToWorkOrderLabelModalService,
    private partInformationLabelLgModalService: PartInformationLabelLgModalService,
    private agsLabelModalService: AgsLabelModalService,
    private partInformationLabelModalSmService: PartInformationLabelModalSmService,
    private partAndSNModalService: PartAndSNModalService,
    private sNULAssetModalService: SNULAssetModalService,
    private continuityModalService: ContinuityModalService,
    private totalLabelsModalService: TotalLabelsModalService,
    private blackRedLabelModalService: BlackRedLabelModalService
  ) { }

  ngOnInit(): void {
    this.getData();
  }

  searchName = "";

  gridApi: GridApi;

  id = null;

  title = "Labels";

  view(data) {
    this[data.service].open(data);
  }

  columnDefs: ColDef[] = [
    {
      field: "View",
      headerName: "View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.view(e.rowData),
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "labelName",
      headerName: "Label Name",
      filter: "agMultiColumnFilter",
    },
    {
      field: "labelSize",
      headerName: "Label Size",
      filter: "agMultiColumnFilter",
    },
    {
      field: "orientation",
      headerName: "Orientation",
      filter: "agMultiColumnFilter",
    },
    {
      field: "labelImage",
      headerName: "Image",
      filter: "agMultiColumnFilter",
      cellRenderer: (params) => {
        let image = params.value;

        tippy(params.eGridCell, {
          arrow: false,
          content: `
            <div class="card shadow-lg">
              <div class="card-header d-flex align-items-center">
              <h4 class="card-title mb-0 me-3">${params.data.labelName}</h4> <br/>
              <h4 class="card-title mb-0 ms-auto">${params.data.labelSize}</h4>
              </div>
              <div class="card-body text-center" style="overflow:hidden">
              <img class="rounded" src="${image}" style="width:250px" />
              </div>
            </div>
          `,
          placement: "bottom-start",
          allowHTML: true,
          theme: "light",
          offset: [20, -3],
          trigger: "mouseenter",
        });

        return `<img class="rounded img-thumbnail" src="${image}" style="width:20px;height:20px" />`;
      },
    },
  ];

  gridOptions: GridOptions = {
    columnDefs: [],
    getRowId: (params) => params.data.id?.toString(),
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams["gridParams"];
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, "id", this.id);
      autoSizeColumns(params);
    },
  };

  data: any = [];
  filteredData: any = [];
  selectedLabels = new Set<string>();
  hiddenImages = new Set<string>(); // Track images that failed to load
  favoriteLabels = new Set<string>(); // Track favorite labels
  showFavoritesOnly = false; // Filter to show only favorites

  async getData() {
    this.data = labelData;
    this.loadFavorites(); // Load saved favorites from localStorage
    this.applyFilters(); // Apply current filters
    this.hiddenImages.clear(); // Reset hidden images when refreshing data
  }

  // Filter labels based on search and favorites
  filterLabels(searchTerm: string) {
    this.searchName = searchTerm;
    this.applyFilters();
  }

  // Apply all filters (search + favorites)
  applyFilters() {
    let filtered = [...this.data];

    // Apply search filter
    if (this.searchName) {
      const term = this.searchName.toLowerCase();
      filtered = filtered.filter((label: any) => 
        label.labelName?.toLowerCase().includes(term) ||
        label.labelSize?.toLowerCase().includes(term) ||
        label.orientation?.toLowerCase().includes(term) ||
        label.service?.toLowerCase().includes(term)
      );
    }

    // Apply favorites filter
    if (this.showFavoritesOnly) {
      filtered = filtered.filter((label: any) => this.favoriteLabels.has(label.id.toString()));
    }

    this.filteredData = filtered;
  }

  // Favorites management
  toggleFavorite(label: any) {
    const labelId = label.id.toString();
    if (this.favoriteLabels.has(labelId)) {
      this.favoriteLabels.delete(labelId);
    } else {
      this.favoriteLabels.add(labelId);
    }
    this.saveFavorites();
    this.applyFilters(); // Reapply filters in case we're showing favorites only
  }

  isFavorite(labelId: any): boolean {
    return this.favoriteLabels.has(labelId.toString());
  }

  getFavoritesCount(): number {
    return this.favoriteLabels.size;
  }

  // Save favorites to localStorage
  saveFavorites() {
    const favoritesArray = Array.from(this.favoriteLabels);
    localStorage.setItem('label-favorites', JSON.stringify(favoritesArray));
  }

  // Load favorites from localStorage
  loadFavorites() {
    const saved = localStorage.getItem('label-favorites');
    if (saved) {
      try {
        const favoritesArray = JSON.parse(saved);
        this.favoriteLabels = new Set(favoritesArray);
      } catch (error) {
        console.warn('Failed to load favorites from localStorage', error);
        this.favoriteLabels = new Set();
      }
    }
  }

  // Handle image loading errors
  onImageError(event: any, labelId: string) {
    // Hide the image by adding to hidden set
    this.hiddenImages.add(labelId);
  }

  // Handle successful image load
  onImageLoad(labelId: string) {
    // Remove from hidden set if it was there
    this.hiddenImages.delete(labelId);
  }

  // Check if image should be hidden
  isImageHidden(labelId: string): boolean {
    return this.hiddenImages.has(labelId);
  }

  // Clear search
  clearSearch() {
    this.searchName = '';
    this.applyFilters();
  }

  // Label selection methods
  toggleLabelSelection(label: any) {
    if (this.selectedLabels.has(label.id)) {
      this.selectedLabels.delete(label.id);
    } else {
      this.selectedLabels.add(label.id);
    }
  }

  clearSelection() {
    this.selectedLabels.clear();
  }

  // Print methods
  printLabel(label: any) {
    // Use existing view method to open the appropriate modal
    this.view(label);
  }

  printSelectedLabels() {
    // Print all selected labels
    const selectedLabels = this.filteredData.filter((label: any) => 
      this.selectedLabels.has(label.id)
    );
    
    selectedLabels.forEach((label: any) => {
      this.view(label);
    });
    
    this.clearSelection();
  }

  // Preview label
  previewLabel(label: any) {
    // For now, just show the modal - could add a preview mode later
    this.view(label);
  }

  // Configure label
  configureLabel(label: any) {
    // For now, just show the modal - could add configuration mode later
    this.view(label);
  }

  // Get category based on label name
  getLabelCategory(labelName: string): string {
    if (!labelName) return 'General';
    
    const name = labelName.toLowerCase();
    
    if (name.includes('customer')) return 'Customer';
    if (name.includes('part')) return 'Part Info';
    if (name.includes('location')) return 'Location';
    if (name.includes('kit')) return 'Kit';
    if (name.includes('ags') || name.includes('asset')) return 'Asset';
    if (name.includes('work order') || name.includes('issue')) return 'Work Order';
    if (name.includes('serial') || name.includes('sn')) return 'Serial Number';
    if (name.includes('continuity')) return 'Continuity';
    if (name.includes('total')) return 'Total';
    if (name.includes('aristocrat')) return 'Gaming';
    if (name.includes('bill') || name.includes('hold')) return 'Shipping';
    if (name.includes('finished') || name.includes('goods')) return 'Inventory';
    if (name.includes('do not touch') || name.includes('led')) return 'Warning';
    
    return 'General';
  }

  // Get icon based on label name/type
  getLabelIcon(labelName: string): string {
    if (!labelName) return 'mdi mdi-label';
    
    const name = labelName.toLowerCase();
    
    if (name.includes('customer')) return 'mdi mdi-account';
    if (name.includes('part')) return 'mdi mdi-package-variant';
    if (name.includes('location')) return 'mdi mdi-map-marker';
    if (name.includes('kit')) return 'mdi mdi-package';
    if (name.includes('ags') || name.includes('asset')) return 'mdi mdi-briefcase';
    if (name.includes('work order') || name.includes('issue')) return 'mdi mdi-clipboard-text';
    if (name.includes('serial') || name.includes('sn')) return 'mdi mdi-numeric';
    if (name.includes('continuity')) return 'mdi mdi-connection';
    if (name.includes('total')) return 'mdi mdi-calculator';
    if (name.includes('aristocrat')) return 'mdi mdi-crown';
    if (name.includes('bill') || name.includes('hold')) return 'mdi mdi-pause-circle';
    if (name.includes('finished') || name.includes('goods')) return 'mdi mdi-package-variant-closed';
    if (name.includes('do not touch') || name.includes('led')) return 'mdi mdi-alert-circle';
    
    return 'mdi mdi-label';
  }

  // Get status badge class
  getStatusBadgeClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'badge bg-success',
      'inactive': 'badge bg-secondary',
      'deprecated': 'badge bg-warning'
    };
    
    return statusMap[status] || 'badge bg-primary';
  }

  // Track by function for ngFor
  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  // Helper methods for statistics display
  getAvailableCount(): number {
    if (!this.filteredData) return 0;
    // For labels, we consider all as available since they are print utilities
    return this.filteredData.length;
  }
}
