import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormGroup } from "@angular/forms";
import { SignaturesService } from "@app/core/api/signatures.service";
import { AgGridModule } from "ag-grid-angular";
import {
  ColDef,
  GridOptions,
  ProcessDataFromClipboardParams,
} from "ag-grid-community";

@Injectable({
  providedIn: "root",
})
export class BillingModalService {
  constructor(public modalService: NgbModal) {}

  open(id) {
    let modalRef = this.modalService.open(BillingModalComponent, {
      size: "lg",
    });
    modalRef.componentInstance.id = id;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule],
  selector: "app-billing-modal",
  templateUrl: "./billing.modal.component.html",
  styleUrls: [],
})
export class BillingModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private api: SignaturesService
  ) {}

  data: any;
  async getData() {
    this.data = await this.api.getById(this.id);
  }

  @Input() id: any;

  ngOnInit(): void {
    if (this.id) {
      this.getData();
    }
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  form: FormGroup;
  setFormEmitter($event) {
    this.form = $event;
  }

  submitted = false;

  async onSubmit() {
    if (this.id) {
      this.onUpdate();
    } else {
      this.onCreate();
    }
  }

  async onCreate() {
    await this.api.create(this.form.value);
    this.close();
  }

  async onUpdate() {
    await this.api.update(this.id, this.form.value);
    this.close();
  }

  async onDelete() {
    if (!confirm("Are you sure you want to delete?")) return;
    await this.api.delete(this.id);
    this.close();
  }

  options = [
    {
      name: "Option1-30% Exp. MU",
      billToCustomer: " $8,505.50 ",
      markUpPercent: "28%",
      gpmPercent: "38%",
      selected: 0,
    },
    {
      name: "Option2-40% Exp. MU",
      billToCustomer: "  $8,846.03  ",
      markUpPercent: "31%",
      gpmPercent: "44%",
      selected: 0,
    },
  ];

  columnDefs: ColDef[] = [
    { field: "name", headerName: "name", filter: "agMultiColumnFilter" },
    {
      field: "billToCustomer",
      headerName: "billToCustomer",
      filter: "agMultiColumnFilter",
    },
    {
      field: "markUpPercent",
      headerName: "markUpPercent",
      filter: "agMultiColumnFilter",
    },
    {
      field: "gpmPercent",
      headerName: "gpmPercent",
      filter: "agMultiColumnFilter",
    },
    {
      field: "selected",
      headerName: "selected",
      filter: "agMultiColumnFilter",
    },
  ];

  gridApi;
  gridOptions: GridOptions = {
    columnDefs: this.columnDefs,
    onGridReady: (params: any) => {
      this.gridApi = params.api;
    },
    singleClickEdit: false,
    defaultColDef: {
      editable: true,
      flex: 1,
      minWidth: 100,
    },
    getRowId: (params) => params.data.id?.toString(),
    cellSelection: true,
    copyHeadersToClipboard: true,
    processDataFromClipboard: this.processDataFromClipboard,
  };

  processDataFromClipboard(
    params: ProcessDataFromClipboardParams
  ): string[][] | null {
    const data = [...params.data];
    const emptyLastRow =
      data[data.length - 1][0] === "" && data[data.length - 1].length === 1;
    if (emptyLastRow) {
      data.splice(data.length - 1, 1);
    }
    const lastIndex = params.api!.getDisplayedRowCount() - 1;
    const focusedCell = params.api!.getFocusedCell();
    const focusedIndex = focusedCell!.rowIndex;
    if (focusedIndex + data.length - 1 > lastIndex) {
      const resultLastIndex = focusedIndex + (data.length - 1);
      const numRowsToAdd = resultLastIndex - lastIndex;
      const rowsToAdd: any[] = [];
      for (let i = 0; i < numRowsToAdd; i++) {
        const index = data.length - 1;
        const row = data.slice(index, index + 1)[0];
        // Create row object
        const rowObject: any = {};
        let currentColumn: any = focusedCell!.column;
        row.forEach((item) => {
          if (!currentColumn) {
            return;
          }
          rowObject[currentColumn.colDef.field] = item;
          currentColumn = params.api!.getDisplayedColAfter(currentColumn);
        });
        rowsToAdd.push(rowObject);
      }
      params.api!.applyTransaction({ add: rowsToAdd });
    }
    return data;
  }
}
