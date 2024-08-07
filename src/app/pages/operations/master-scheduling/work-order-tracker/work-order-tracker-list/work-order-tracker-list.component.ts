import { Component, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { ItemInfoModalService } from "@app/shared/components/item-info-modal/item-info-modal.component";
import { KanbanApiService } from "@app/core/api/kanban";
import { timeUntil } from "@app/pages/operations/master-scheduling/work-order-tracker/work-order-tracker.component";
import { Subscription, interval } from "rxjs";
import { GridApi, GridOptions } from "ag-grid-community";

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: "app-work-order-tracker-list",
  templateUrl: "./work-order-tracker-list.component.html",
})
export class WorkOrderTrackerListComponent implements OnInit {
  data!: any[];
  sub: any;

  query;

  gridApi: GridApi;

  updateClock = () => {
    for (let i = 0; i < this.data.length; i++) {
      let row = this.data[i];
      if (row.last_transaction_date) {
        row.timeDiff = timeUntil(row.last_transaction_date, row.timeDiff);
        //row.timeDiffMins = timeUntil1(row.last_transaction_date, row.timeDiff);
      } else {
        row.timeDiff = "";
      }
    }

    if (this.gridApi!.isDestroyed) return;

    const res = this.gridApi!.applyTransaction({
      update: this.data,
    })!;
  };

  columnDefs = [
    {
      headerName: "WO Info",
      children: [
        { field: "wo_nbr", headerName: "WO #", filter: "agMultiColumnFilter" },
        {
          field: "item_number",
          headerName: "WOD Part #",
          filter: "agMultiColumnFilter",
        },
        {
          field: "item_description",
          headerName: "Part Description",
          filter: "agMultiColumnFilter",
        },
        {
          field: "wo_mstr.wo_due_date",
          headerName: "WO Due Date",
          filter: "agMultiColumnFilter",
        },
        {
          field: "wo_mstr.wo_qty_ord",
          headerName: "Qty Ordered",
          filter: "agMultiColumnFilter",
        },
        {
          field: "wo_mstr.wo_qty_comp",
          headerName: "Qty Completed",
          filter: "agMultiColumnFilter",
        },
        {
          field: "wo_mstr.wo_status",
          headerName: "WO Status",
          filter: "agMultiColumnFilter",
        },
        {
          field: "prod_line",
          headerName: "Prod Line",
          filter: "agMultiColumnFilter",
        },
        { field: "so_nbr", headerName: "SO #", filter: "agMultiColumnFilter" },
        {
          field: "wo_mstr.wo_rmks",
          headerName: "Remarks",
          filter: "agMultiColumnFilter",
        },
      ],
    },
    {
      headerName: "Current QAD Routing Info",
      children: [
        {
          field: "qad_current_queue.wr_op",
          headerName: "Current Queue",
          filter: "agMultiColumnFilter",
        },
        {
          field: "qad_current_queue.wr_qty_inque",
          headerName: "In queue",
          filter: "agMultiColumnFilter",
        },
        {
          field: "qad_current_queue.wr_status",
          headerName: "Routing Status",
          filter: "agMultiColumnFilter",
        },
        {
          field: "due_by",
          headerName: "Due By",
          filter: "agMultiColumnFilter",
        },
      ],
    },
    {
      headerName: "Dashboard Queue Info",
      children: [
        { field: "kanban_ID", headerName: "ID", filter: "agMultiColumnFilter" },
        {
          field: "timeDiff",
          headerName: "Time In Queue",
          filter: "agMultiColumnFilter",
          width: "auto",
        },
        {
          field: "queueInfo.hot_order",
          headerName: "Hot Order",
          filter: "agMultiColumnFilter",
        },
        {
          field: "queueInfo.staging_bay",
          headerName: "Staging Bay",
          filter: "agMultiColumnFilter",
        },
        {
          field: "queueInfo.last_transaction_date",
          headerName: "Last Transaction Date",
          filter: "agMultiColumnFilter",
        },
      ],
    },
    {
      headerName: "Pick Info",
      children: [
        {
          field: "pickInfo.wod_qty_req",
          headerName: "Qty Required",
          filter: "agMultiColumnFilter",
        },
        {
          field: "pickInfo.wod_qty_iss",
          headerName: "Qty Issued",
          filter: "agMultiColumnFilter",
        },
        {
          field: "pickInfo.open_qty",
          headerName: "Open qty",
          filter: "agMultiColumnFilter",
        },
        {
          field: "print_details.printedDate",
          headerName: "Printed Date",
          filter: "agMultiColumnFilter",
        },
      ],
    },
  ];

  gridOptions: GridOptions = {
    columnDefs: [],
    onGridReady: (params) => {
      this.gridApi = params.api;
      params.api.autoSizeAllColumns();
    },
  };

  openItemInfo = (workOrder) => {
    let modalRef = this.itemInfoModalService.open(workOrder);
    modalRef.result.then(
      (result: any) => {},
      () => {}
    );
  };

  constructor(
    private api: KanbanApiService,
    private itemInfoModalService: ItemInfoModalService
  ) {}

  ngOnInit(): void {
    this.getData();
  }

  subscription: Subscription;
  async getData() {
    try {
      this.gridApi?.showLoadingOverlay();
      let data: any = await this.api.getList();

      const source = interval(1000);
      this.subscription = source.subscribe((val) => this.updateClock());

      this.data = data?.details;
      this.gridApi?.hideOverlay();
    } catch (err) {
      this.gridApi?.hideOverlay();
    }
  }
}
