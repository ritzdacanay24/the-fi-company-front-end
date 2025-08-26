import { ColDef, GridApi, GridOptions } from "ag-grid-community";
import { Component, Input, OnInit } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { AgGridModule } from "ag-grid-angular";
import { ActivatedRoute, Router } from "@angular/router";
import moment from "moment";
import { NAVIGATION_ROUTE } from "../igt-constant";
import { DateRangeComponent } from "@app/shared/components/date-range/date-range.component";
import { SharedModule } from "@app/shared/shared.module";
import { highlightRowView, autoSizeColumns } from "src/assets/js/util";
import {
  _decompressFromEncodedURIComponent,
  _compressToEncodedURIComponent,
} from "src/assets/js/util/jslzString";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { SerialNumberService } from "../services/serial-number.service";
import { IgtAssetService } from "@app/pages/quality/igt/services/igt-asset.service";
import type { ISetFilter } from "ag-grid-community";

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    AgGridModule,
    DateRangeComponent,
  ],
  selector: "app-igt-list",
  templateUrl: "./igt-list.component.html",
})
export class IgtListComponent implements OnInit {
  constructor(
    public router: Router,
    private activatedRoute: ActivatedRoute,
    private serialNumberService: SerialNumberService,
    private igtAssetService: IgtAssetService
    // TODO: Add IGT service when created
    // public api: IgtService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.dateFrom = params["dateFrom"] || this.dateFrom;
      this.dateTo = params["dateTo"] || this.dateTo;
      this.dateRange = [this.dateFrom, this.dateTo];

      this.id = params["id"];
      this.isAll = params["isAll"]
        ? params["isAll"].toLocaleLowerCase() === "true"
        : false;
      this.selectedViewType =
        params["selectedViewType"] || this.selectedViewType;
    });

    this.getData();
  }

  columnDefs: ColDef[] = [
    {
      field: "View",
      headerName: "View",
      filter: "agMultiColumnFilter",
      pinned: "left",
      cellRenderer: LinkRendererV2Component,
      cellRendererParams: {
        onClick: (e: any) => this.onEdit(e.rowData.id),
        value: "SELECT",
      },
      maxWidth: 115,
      minWidth: 115,
    },
    { field: "id", headerName: "ID", filter: "agMultiColumnFilter" },
    {
      field: "igtSerialNumber",
      headerName: "IGT Serial Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "serialNumber",
      headerName: "EyeFi Serial Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "igtPartNumber",
      headerName: "IGT Part Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "woNumber",
      headerName: "WO Number",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    {
      field: "eyefiPartNumber",
      headerName: "Eyefi Part Number",
      filter: "agMultiColumnFilter",
    },
    {
      field: "inspectorName",
      headerName: "Inspector Name",
      filter: "agMultiColumnFilter",
    },
    {
      field: "lastUpdate",
      headerName: "Last Update",
      filter: "agMultiColumnFilter",
    },
    {
      field: "manualUpdate",
      headerName: "Manual Update",
      filter: "agMultiColumnFilter",
      cellDataType: "text",
    },
    {
      field: "timeStamp",
      headerName: "Created Date",
      filter: "agMultiColumnFilter",
    },
    { field: "active", headerName: "Active", filter: "agMultiColumnFilter" },
  ];

  @Input() selectedViewType = "Active";

  selectedViewOptions = [
    {
      name: "Active",
      value: 1,
      selected: false,
    },
    {
      name: "Inactive",
      value: 0,
      selected: false,
    },
    {
      name: "All",
      selected: false,
    },
  ];

  title = "IGT List";

  gridApi: GridApi;

  data: any[];

  id = null;

  isAll = false;

  changeIsAll() { }

  dateFrom = moment()
    .subtract(1, "months")
    .startOf("month")
    .format("YYYY-MM-DD");
  dateTo = moment().endOf("month").format("YYYY-MM-DD");
  dateRange = [this.dateFrom, this.dateTo];

  availableSerialCount: number = 0;
  usedSerialCount: number = 0;
  totalSerialCount: number = 0;

  uniqueInspectors: string[] = [];

  onChangeDate($event) {
    this.dateFrom = $event["dateFrom"];
    this.dateTo = $event["dateTo"];
    this.getData();
  }

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;

      let data = this.activatedRoute.snapshot.queryParams["gridParams"];
      _decompressFromEncodedURIComponent(data, params);
    },
    onFirstDataRendered: (params) => {
      highlightRowView(params, "id", this.id);
      autoSizeColumns(params);
    },
    getRowId: (params) => params.data.id?.toString(),
    onFilterChanged: (params) => this.updateUrl(params),
    onSortChanged: (params) => this.updateUrl(params),
  };

  updateUrl = (params) => {
    let gridParams = _compressToEncodedURIComponent(params.api);
    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: "merge",
      queryParams: {
        gridParams,
      },
    });
  };

  onEdit(id) {
    this.router.navigate(['../edit'], {
      queryParamsHandling: "merge",
      queryParams: {
        id: id,
      },
      relativeTo: this.activatedRoute,
    });
  }

  async loadAvailableSerialCount() {
    try {
      const stats = await this.serialNumberService.getUsageStatistics();
      this.availableSerialCount = 0;
      this.usedSerialCount = 0;
      this.totalSerialCount = 0;

      if (Array.isArray(stats)) {
        for (const s of stats) {
          if (s.status === 'available') {
            this.availableSerialCount += Number(s.count) || 0;
          }
          if (s.status === 'used') {
            this.usedSerialCount += Number(s.count) || 0;
          }
          this.totalSerialCount += Number(s.count) || 0;
        }
      }
    } catch (err) {
      this.availableSerialCount = 0;
      this.usedSerialCount = 0;
      this.totalSerialCount = 0;
    }
  }

  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();

      let params: any = {};
      if (this.selectedViewType != "All") {
        let status = this.selectedViewOptions.find(
          (person) => person.name == this.selectedViewType
        );
        params = { active: status.value };
      }

      // Call the actual IGT asset service
      let data: any = await this.igtAssetService.getAll();
      // Map API data to grid format and normalize fields
      this.data = (data?.data || []).map((item: any) => ({
        id: item.id,
        generated_IGT_asset: item.generated_IGT_asset,
        serialNumber: item.serial_number,
        igtSerialNumber: item.igt_serial_number,
        timeStamp: item.time_stamp,
        woNumber: item.wo_number,
        property_site: item.property_site,
        igtPartNumber: item.igt_part_number,
        eyefiPartNumber: item.eyefi_part_number,
        inspectorName: item.inspector_name,
        lastUpdate: item.last_update,
        active: item.active,
        manualUpdate: item.manual_update,
        created_by: item.created_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        updated_by: item.updated_by,
        serial_number_id: item.serial_number_id,
        notes: item.notes,
        serial_category: item.serial_category,
        serial_manufacturer: item.serial_manufacturer,
        serial_model: item.serial_model,
        serial_status: item.serial_status,
      }));

      // Populate uniqueInspectors after data is loaded
      this.uniqueInspectors = Array.from(
        new Set(this.data.map(d => d.inspectorName).filter(Boolean))
      );

      this.router.navigate(["."], {
        queryParams: {
          selectedViewType: this.selectedViewType,
          isAll: this.isAll,
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
        },
        relativeTo: this.activatedRoute,
        queryParamsHandling: "merge",
      });

      this.gridApi?.hideOverlay();
      this.loadAvailableSerialCount();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }

  inspectorFilter: string = "";

  onInspectorFilter(inspector: string) {
    this.inspectorFilter = inspector;
    if (!this.gridApi) return;
    const filterInstance = this.gridApi.getFilterInstance('inspectorName') as ISetFilter | null;
    if (filterInstance && typeof filterInstance.setModel === 'function') {
      if (inspector) {
        filterInstance.setModel({ values: [inspector] });
      } else {
        filterInstance.setModel(null);
      }
      this.gridApi.onFilterChanged();
    }
  }

  statusFilter: string = "";

  onStatusFilter(status: string) {
    this.statusFilter = status;
    if (!this.gridApi) return;
    const filterInstance = this.gridApi.getFilterInstance('serial_status') as ISetFilter | null;
    if (filterInstance && typeof filterInstance.setModel === 'function') {
      if (status) {
        filterInstance.setModel({ values: [status] });
      } else {
        filterInstance.setModel(null);
      }
      this.gridApi.onFilterChanged();
    }
  }

  clearFilters() {
    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
      // Use 'any' to access setQuickFilter, which is available at runtime
      (this.gridApi as any).setQuickFilter('');
    }
  }

  quickFilter: string = "";

  onQuickFilterChange(value: string) {
    this.gridApi.setGridOption(
      "quickFilterText",
      value,
    );
  }
}
