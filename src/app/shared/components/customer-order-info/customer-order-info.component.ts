import { Component, Input } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";
import { LinkRendererComponent } from "@app/shared/ag-grid/cell-renderers";
import { SalesOrderInfoService } from "@app/core/api/sales-order/sales-order-info.service";
import { SalesOrderInfoModalService } from "../sales-order-info-modal/sales-order-info-modal.component";
import { GridApi, GridOptions } from "ag-grid-community";

@Injectable({
  providedIn: "root",
})
export class CustomerOrderInfoModalService {
  constructor(public modalService: NgbModal) {}

  open(customerOrderNumber: number) {
    const modalRef = this.modalService.open(CustomerOrderInfoModalComponent, {
      size: "xl",
    });
    modalRef.componentInstance.customerOrderNumber = customerOrderNumber;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: "app-customer-order-info",
  templateUrl: "./customer-order-info.component.html",
  styleUrls: [],
})
export class CustomerOrderInfoModalComponent {
  isLoading = true;
  data: any;
  @Input() public customerOrderNumber: number;

  columnDefs: any = [
    {
      field: "SOD_NBR",
      headerName: "SO #",
      filter: "agTextColumnFilter",
      cellRenderer: LinkRendererComponent,
      cellRendererParams: {
        onClick: (e) => {
          this.salesOrderInfoModalService.open(e.rowData.SOD_NBR);
        },
        isLink: true,
      },
    },
    { field: "so_cust", headerName: "Customer", filter: "agTextColumnFilter" },
    {
      field: "SOD_CUSTPART",
      headerName: "Customer Part #",
      filter: "agTextColumnFilter",
    },
    {
      field: "SOD_DUE_DATE",
      headerName: "Due Date",
      filter: "agTextColumnFilter",
    },
    {
      field: "SOD_PART",
      headerName: "Part number",
      filter: "agTextColumnFilter",
    },
    {
      field: "so_po",
      headerName: "Customer PO #",
      filter: "agTextColumnFilter",
    },
  ];

  gridApi: GridApi;

  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params) => {
      this.gridApi = params.api;
      params.api.updateGridOptions({
        defaultColDef: {
          floatingFilter: false,
        },
      });
    },
    sideBar: false,
    domLayout: "autoHeight",
  };

  onGridReady(params) {
    this.gridApi = params.api;
  }

  constructor(
    private api: SalesOrderInfoService,
    private ngbActiveModal: NgbActiveModal,
    private salesOrderInfoModalService: SalesOrderInfoModalService
  ) {}

  getData() {
    this.isLoading = true;
    this.api.getCustomerOrderNumbers(this.customerOrderNumber).subscribe(
      (data: any) => {
        this.isLoading = false;
        this.data = data;
      },
      (error) => {
        this.isLoading = false;
      }
    );
  }
  ngOnInit() {
    this.getData();
  }

  public dismiss() {
    this.ngbActiveModal.dismiss("dismiss");
  }

  public close() {
    this.ngbActiveModal.close(this.customerOrderNumber);
  }
}
