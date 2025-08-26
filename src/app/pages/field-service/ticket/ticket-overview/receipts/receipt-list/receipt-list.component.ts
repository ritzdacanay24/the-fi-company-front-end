import {
  Component,
  Input,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { TripExpenseService } from "@app/core/api/field-service/trip-expense.service";
import {
  NgbActiveModal,
  NgbActiveOffcanvas,
  NgbDropdownModule,
  NgbOffcanvas,
  NgbModal
} from "@ng-bootstrap/ng-bootstrap";
import { TripExpenseTransactionsService } from "@app/core/api/field-service/trip-expense-transactions";
import { NgSelectModule } from "@ng-select/ng-select";
import { Pipe, PipeTransform } from "@angular/core";
import { LazyLoadImageModule } from "ng-lazyload-image";
import moment from "moment";
import { AgGridModule } from "ag-grid-angular";
import { DomSanitizer } from "@angular/platform-browser";
import { WorkOrderService } from "@app/core/api/field-service/work-order.service";
import { ReceiptAddEditService } from "../receipt-add-edit/receipt-add-edit.service";
import { timeConvert } from "@app/pages/field-service/shared/field-service-helpers.service";
import { LinkImageRendererComponent } from "@app/shared/ag-grid/cell-renderers/link-image-renderer.component";
import { LinksImageRendererComponent } from "@app/shared/ag-grid/cell-renderers/links-image-renderer.component";
import { SharedModule } from "@app/shared/shared.module";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";
import {
  isMobile,
  currencyFormatter,
  autoSizeColumns,
} from "src/assets/js/util";
import printJS from "print-js";
import { Lightbox } from "ngx-lightbox";
import { GridApi, GridOptions } from "ag-grid-community";
import { EditIconV2Component } from "@app/shared/ag-grid/edit-icon-v2/edit-icon-v2.component";
import { LinkRendererV2Component } from "@app/shared/ag-grid/cell-renderers/link-renderer-v2/link-renderer-v2.component";
import { JobSearchComponent } from '@app/shared/components/job-search/job-search.component';
import { AuthenticationService } from "@app/core/services/auth.service";



interface ReceiptCategorySummary {
  name: string;
  count: number;
  total: number;
}

@Pipe({
  standalone: true,
  name: "myfilter",
})
export class MyFilterPipe implements PipeTransform {
  transform(items: any[], filter: any): any {
    if (!items || !filter) {
      return items;
    }
    return items.filter((item: any) => {
      return item.Transaction_Amount == filter;
    });
  }
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    LazyLoadImageModule,
    NgbDropdownModule,
    AgGridModule,
    JobSearchComponent
  ],
  providers: [NgbActiveModal, NgbActiveOffcanvas],
  selector: "app-uploaded-receipt",
  templateUrl: `./receipt-list.component.html`,
})
export class UploadedReceiptComponent implements OnInit {
  @Input() public data: any = [];
  @Input() public workOrderId: any;
  @Input() public fsId: number | string;
  @Input() public disabled: boolean = true;

  @ViewChild("firstNameField") firstNameField;
  @ViewChild('copyFromTicketModal', { static: false }) copyFromTicketModal: TemplateRef<any>;

  // Basic properties
  tripExpenseTotal = 0;
  transactions: any = [];
  groupArrays: { groupTotal: number; games: any }[];
  showNoReceipts = false;
  timeConvert = timeConvert;
  printedReceipts;
  loading = false;
  originalData;
  images = [];
  searchTransaction: any = "";
  closeResult = "";

  // Grid properties
  gridApi: GridApi;
  title = "Policy Usage";

  // Banking properties
  totalBankTransactins = 0;
  totalBankTransactinsAmount = 0;
  assignedTotalBankTransactions = 0;
  transactionDataOnly = 0;

  // Copy from ticket properties
  selectedSourceTicketId: string | null = null;
  sourceTicketRecords: any = [];
  selectAllRecords: boolean = false;
  copyErrors: string[] = [];
  copySuccessCount: number = 0;
  copyFiles: boolean = false;

  constructor(
    public activeOffcanvas: NgbActiveOffcanvas,
    public tripExpenseService: TripExpenseService,
    private receiptAddEditService: ReceiptAddEditService,
    private offcanvasService: NgbOffcanvas,
    private tripExpenseTransactionsService: TripExpenseTransactionsService,
    private domSanitizer: DomSanitizer,
    private workOrderService: WorkOrderService,
    private lightbox: Lightbox,
    private modalService: NgbModal,
    private authenticationService: AuthenticationService
  ) { }

  ngOnInit(): void {
    this.getData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["workOrderId"]) {
      this.workOrderId = changes["workOrderId"].currentValue;
      this.getData();
    }

    if (changes["fsId"]?.currentValue) {
      this.justGetTransaction();
    }
  }

  // Navigation and UI methods
  onNavChange(e) {
    if (e.nextId == "Transactions") {
      this.getAllTransactionAssignedToFsId();
    } else {
      this.getData();
    }
  }

  sani(url) {
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }

  isPdf(fileName) {
    return fileName?.substring(fileName?.lastIndexOf(".") + 1) !== "pdf";
  }

  onClickShowNoReceipts() {
    this.showNoReceipts = !this.showNoReceipts;
    let d = [];
    if (this.showNoReceipts) {
      for (let i = 0; i < this.transactions.length; i++) {
        if (this.transactions[i].possibleCount == 0)
          d.push(this.transactions[i]);
      }
      this.transactions = d;
    } else {
      this.transactions = this.originalData;
    }
  }

  focusOnFirstName() {
    this.firstNameField.nativeElement.focus();
  }

  // Data methods
  async getData(clear = true) {
    this.images = [];
    if (clear) this.data = [];
    try {
      this.loading = true;
      let data: any = await this.workOrderService.getById(this.workOrderId);
      this.fsId = data?.fs_scheduler_id;
      this.data = await this.tripExpenseService.getByFsId(data?.fs_scheduler_id);

      for (let i = 0; i < this.data.length; i++) {
        let row = this.data[i];
        const src = row.link;
        const caption = "Image " + i + "- " + row.created_date;
        const thumb = src;
        const item = {
          src: src,
          caption: caption,
          thumb: thumb,
        };
        this.images.push(item);
      }

      this.getTripExenses(this.data);

      // Only update grid if it exists and has data
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', this.data);
        this.setColumDef1();
      }

      this.loading = false;
    } catch (err) {
      this.loading = false;
    }
  }

  getTripExenses(data) {
    this.tripExpenseTotal = 0;
    for (let i = 0; i < data.length; i++) {
      this.tripExpenseTotal += data[i].cost;
    }
  }

  async justGetTransaction() {
    this.totalBankTransactinsAmount = 0;
    let transactions: any = (this.originalData =
      await this.tripExpenseTransactionsService.getByFsId(
        this.fsId,
        this.workOrderId
      ));
    for (let i = 0; i < transactions.length; i++) {
      this.totalBankTransactinsAmount += transactions[i].Transaction_Amount;
    }
  }

  // Modal and editing methods
  create(typeOfClick) {
    const modalRef = this.receiptAddEditService.open(
      this.fsId,
      this.workOrderId,
      typeOfClick
    );
    modalRef.result.then(
      async (result: any) => {
        await this.getData();
      },
      () => { }
    );
  }

  edit(id, typeOfClick) {
    const modalRef = this.receiptAddEditService.open(
      this.fsId,
      this.workOrderId,
      typeOfClick,
      id
    );
    modalRef.result.then(
      async (result: any) => {
        await this.getData();
      },
      () => { }
    );
  }

  // Transaction methods
  openBottom(content: TemplateRef<any>, row) {
    if (this.offcanvasService.hasOpenOffcanvas()) {
      return;
    }

    this.searchTransaction = row?.cost;

    this.offcanvasService
      .open(content, {
        ariaLabelledBy: "offcanvas-basic-title",
        position: "start",
        backdrop: true,
      })
      .result.then(
        (result) => {
          this.getData(false);
          this.getAllTransactionAssignedToFsId();
        },
        (reason) => {
          if (reason == "saved") {
            this.getData(false);
            this.getAllTransactionAssignedToFsId();
          }
        }
      );
  }

  async clearTransaction(id) {
    try {
      SweetAlert.loading("Clearing transaction..");
      await this.tripExpenseService.update(id, { transaction_id: null });
      await SweetAlert.close();
      this.offcanvasService.dismiss("saved");
    } catch (err) {
      SweetAlert.close(0);
    }
  }

  async selectTransaction(id, item) {
    try {
      SweetAlert.loading("Saving..");
      await this.tripExpenseService.update(id, {
        transaction_id: item.Transaction_ID,
      });
      await SweetAlert.close();
      this.offcanvasService.dismiss("saved");
    } catch (err) {
      SweetAlert.close(0);
    }
  }

  async getAllTransactionAssignedToFsId() {
    this.transactions = [];
    this.totalBankTransactins = 0;
    this.assignedTotalBankTransactions = 0;
    this.totalBankTransactinsAmount = 0;

    let transactions: any = (this.originalData =
      await this.tripExpenseTransactionsService.getByFsId(
        this.fsId,
        this.workOrderId
      ));

    for (let i = 0; i < transactions.length; i++) {
      transactions[i].possibleCount = 0;
      this.totalBankTransactins++;
      if (transactions[i].work_order_transaction_id !== null) {
        this.assignedTotalBankTransactions++;
      }
      this.totalBankTransactinsAmount += transactions[i].Transaction_Amount;
      // if (transactions[i].work_order_transaction_id == null) {
      //   this.transactions.push(transactions[i])
      // }
      for (let ii = 0; ii < this.data.length; ii++) {
        if (transactions[i].Transaction_Amount == this.data[ii].cost) {
          transactions[i].possibleCount++;
        }
        if (transactions[i].Transaction_ID == this.data[ii].transaction_id) {
          this.data[ii].receipt_date = transactions[i].Transaction_Date;
          this.data[ii].is_upload_same_day =
            moment(transactions[i].Transaction_Date).format("YYYY-MM-DD") ==
            moment(this.data[ii].created_date).format("YYYY-MM-DD");
        }
      }

      this.transactions.push(transactions[i]);
    }

    for (let i = 0; i < this.data.length; i++) {
      this.data[i].possibleCount = 0;
      for (let ii = 0; ii < this.transactions.length; ii++) {
        if (this.transactions[ii].Transaction_Amount == this.data[i].cost) {
          this.data[i].possibleCount++;
        }
      }
    }

    for (let i = 0; i < this.transactions.length; i++) {
      this.transactions[i].link = "";
      this.transactions[i].links = [];
      for (let ii = 0; ii < this.data.length; ii++) {
        if (
          transactions[i].Transaction_Amount == this.data[ii].cost &&
          transactions[i].possibleCount > 0
        ) {
          this.transactions[i].link = this.data[ii].link;
          this.transactions[i].links.push(this.data[ii].link);
        }
      }
    }

    this.gridApi!.setGridOption("rowData", this.transactions);
    this.setColumDef();
  }

  // Print methods
  async printReceipts() {
    const selectedData = this.gridApi.getSelectedRows();
    this.printedReceipts = selectedData;

    let print = [];
    selectedData.forEach((element) => {
      if (this.isPdf(element.fileName))
        print.push(element.link)
    });

    printJS({
      printable: print,
      showModal: true,
      modalMessage: "Document Loading...",
      type: "image",
      header: "FSID: " + this.fsId,
      imageStyle: "width:50%;margin-bottom:20px;",
    });
  }

  // Grid methods
  viewReceipt(e) {
    window.open(e.rowData.link, 'Image', 'width=largeImage.stylewidth,height=largeImage.style.height,resizable=1');
  }

  onGridReady(params: any) {
    this.gridApi = params.api;
    // Set initial column definitions and data when grid is ready
    this.setColumDef1();
    if (this.data?.length) {
      this.gridApi.setGridOption('rowData', this.data);
    }
  }

  gridOptions: GridOptions = {
    columnDefs: [],
    onGridReady: this.onGridReady.bind(this),
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    onFirstDataRendered: (params) => {
      autoSizeColumns(params);
    },
    onCellValueChanged: async (event) => {
      try {
        await this.tripExpenseTransactionsService.updateById(event.data.id, {
          reason_code: event.data.reason_code,
        });
      } catch (err) { }
    },
  };

  setColumDef() {
    this.gridApi.updateGridOptions({
      columnDefs: [
        {
          field: "",
          headerCheckboxSelection: true,
          headerCheckboxSelectionFilteredOnly: true,
          width: 50,
          maxWidth: 50,
          suppressHeaderMenuButton: true,
          pinned: isMobile() ? null : "left",
          checkboxSelection: true,
          floatingFilterComponentParams: { suppressFilterButton: true },
        },
        {
          field: "link",
          headerName: "Image",
          filter: "agMultiColumnFilter",
          cellRenderer: LinksImageRendererComponent,
          suppressHeaderMenuButton: true,
          floatingFilter: false,
          cellRendererParams: {
            onClick: (e: any) => this.viewReceipt(e),
            iconName: "mdi mdi-view-list",
            classColor: "text-info",
          },
        },
        {
          headerName: "Possible Count",
          field: "possibleCount",
          filter: "agMultiColumnFilter",
          hide: true,
        },

        {
          field: "reason_code",
          headerName: "Reason Code",
          filter: "agMultiColumnFilter",
          editable: true,
          cellRenderer: EditIconV2Component,
          cellRendererParams: {
            iconName: "mdi mdi-pencil",
            placeholder: "Enter reason code",
          },
        },
        {
          headerName: "First Name",
          field: "Cardholder_First_Name",
          filter: "agMultiColumnFilter",
        },
        {
          headerName: "Last Name",
          field: "Cardholder_Last_Name",
          filter: "agMultiColumnFilter",
        },
        {
          headerName: "Merchant Name",
          field: "Original_Merchant_Name",
          filter: "agMultiColumnFilter",
        },
        {
          headerName: "Post Date",
          field: "Post_Date",
          filter: "agMultiColumnFilter",
        },
        {
          headerName: "Purchase Type",
          field: "Purchase_Type",
          filter: "agMultiColumnFilter",
        },
        {
          headerName: "Transaction Date",
          field: "Transaction_Date",
          filter: "agMultiColumnFilter",
        },
        {
          headerName: "Amount",
          field: "Transaction_Amount",
          filter: "agMultiColumnFilter",
          pinned: "right",
          valueFormatter: currencyFormatter,
        },
      ],
    });
  }

  setColumDef1() {
    // Only proceed if gridApi is available
    if (!this.gridApi) return;

    this.gridApi.updateGridOptions({
      columnDefs: [
        {
          field: "",
          headerCheckboxSelection: true,
          headerCheckboxSelectionFilteredOnly: true,
          width: 50,
          maxWidth: 50,
          suppressHeaderMenuButton: true,
          floatingFilter: false,
          pinned: isMobile() ? null : "left",
          checkboxSelection: true,
        },
        {
          field: "copiedFromTicketId",
          headerName: "Source",
          filter: "agMultiColumnFilter",
          minWidth: 140,
          cellRenderer: (params) => {
            if (params.data.copiedFromTicketId) {
              return `
                <span class="badge bg-info bg-opacity-10 text-info">
                  <i class="ri-file-copy-line me-1"></i>Copied from #${params.data.copiedFromTicketId}
                </span>
              `;
            }
            return '<span class="badge bg-success bg-opacity-10 text-success"><i class="ri-file-add-line me-1"></i>Original</span>';
          }
        },
        {
          field: "link",
          headerName: "Image",
          suppressHeaderMenuButton: true,
          floatingFilter: false,
          filter: "agMultiColumnFilter",
          cellRenderer: LinkImageRendererComponent,
          cellRendererParams: {
            onClick: (e) => this.viewReceipt(e),
            iconName: "mdi mdi-view-list",
            classColor: "text-info",
          },
        },
        {
          field: "Edit",
          headerName: "Edit",
          filter: "agMultiColumnFilter",
          cellRenderer: LinkRendererV2Component,
          cellRendererParams: {
            onClick: (e) => this.edit(e.rowData.id, null),
            iconName: "mdi mdi-pencil",
            classColor: "text-warning",
            value: "Edit",
          },
        },
        {
          field: "vendor_name",
          headerName: "Vendor Name",
          filter: "agMultiColumnFilter"
        },
        {
          field: "cost",
          headerName: "Cost",
          filter: "agMultiColumnFilter",
          valueFormatter: currencyFormatter,
        },
        {
          field: "date",
          headerName: "Receipt Date",
          filter: "agMultiColumnFilter",
        },
        { field: "name", headerName: "Name", filter: "agMultiColumnFilter" },
        {
          field: "time",
          headerName: "Receipt Time",
          filter: "agMultiColumnFilter",
        },
        {
          field: "created_by_name",
          headerName: "Created By",
          filter: "agMultiColumnFilter",
        },
        {
          field: "created_date",
          headerName: "Created Date",
          filter: "agMultiColumnFilter",
        },
      ],
    });
  }

  // Copy from ticket methods
  async notifyParent($event) {
    if (!$event.id) return;
    this.selectedSourceTicketId = $event.workOrderId;
    try {
      this.sourceTicketRecords = await this.tripExpenseService.getByFsId($event.id);
      this.sourceTicketRecords.forEach(record => {
        record._selected = false;
      });
    } catch (error) {
      console.error('Error fetching source ticket receipts:', error);
      this.sourceTicketRecords = [];
    }
  }

  async openCopyFromTicketModal() {
    this.selectedSourceTicketId = null;
    this.sourceTicketRecords = [];
    this.selectAllRecords = false;
    this.copyErrors = [];
    this.copySuccessCount = 0;
    this.copyFiles = false;

    this.modalService.open(this.copyFromTicketModal, {
      size: 'lg',
      windowClass: 'overflow-visible-modal'
    });
  }

  toggleSelectAllRecords() {
    if (!this.sourceTicketRecords) return;
    for (const rec of this.sourceTicketRecords) {
      rec._selected = this.selectAllRecords;
    }
  }

  hasSelectedRecords(): boolean {
    return this.sourceTicketRecords?.some(r => r._selected);
  }

  async copySelectedRecords(modalRef: any) {
    const selected = this.sourceTicketRecords.filter(r => r._selected);
    if (!selected.length) return;

    this.copyErrors = [];
    this.copySuccessCount = 0;

    SweetAlert.loading('Copying receipts...');

    for (const record of selected) {
      try {
        // Create FormData for the receipt
        const formData = new FormData();

        // Add all the necessary fields to FormData
        formData.append('fs_scheduler_id', this.fsId.toString());
        formData.append('workOrderId', this.workOrderId.toString());
        formData.append('copiedFromTicketId', this.selectedSourceTicketId || '');
        formData.append('created_date', moment().format('YYYY-MM-DD HH:mm:ss'));
        formData.append('created_by', this.authenticationService.currentUserValue?.id?.toString() || '');
        formData.append('transaction_id', ''); // Reset transaction linkage
        formData.append('fileName', record.fileName);
        formData.append('fileCopied', 'false');
        formData.append('originalFileLink', record.link || '');

        // Add receipt-specific fields
        formData.append('vendor_name', record.vendor_name || '');
        formData.append('cost', record.cost?.toString() || '0');
        formData.append('date', record.date || '');
        formData.append('name', record.name || '');
        formData.append('time', record.time || '');
        formData.append('locale', record.locale || ''); // If you want to copy the file as well

        // Add any additional fields that might be needed
        if (record.description) formData.append('description', record.description);
        if (record.category) formData.append('category', record.category);
        if (record.receipt_type) formData.append('receipt_type', record.receipt_type);

        await this.tripExpenseService.create(formData);
        this.copySuccessCount++;

      } catch (error) {
        this.copyErrors.push(`Failed to copy receipt "${record.vendor_name || record.name || 'Unknown Receipt'}": ${error.message || 'Unknown error'}`);
      }
    }

    await SweetAlert.close();
    await this.getData(false);

    if (this.copyErrors.length === 0) {
      modalRef.close();
      SweetAlert.fire({
        icon: 'success',
        title: 'Receipts Copied Successfully',
        text: `Successfully copied ${this.copySuccessCount} receipt(s).`,
        timer: 3000
      });
    }
  }

  // Email method
  async sendEmail() {
    const selectedData = this.gridApi.getSelectedRows();

    selectedData.sort(function (a, b) {
      if (a.Cardholder_First_Name < b.Cardholder_First_Name) {
        return -1;
      }
      if (a.Cardholder_First_Name > b.Cardholder_First_Name) {
        return 1;
      }
      return 0;
    });

    if (selectedData.length == 0) {
      alert("Must have more than one selected.");
      return;
    }

    let d =
      '<div class=" mt-2"> <table class="table table-sm table-bordered" bordered="1" style="font-size:14px">';
    d += `
    <thead>
            <tr>
            <td class="sticky-top bg-light mt-n1">Transaction ID</td>
            <td class="sticky-top bg-light mt-n1">Name</td>
            <td class="sticky-top bg-light mt-n1">User</td>
            <td class="sticky-top bg-light mt-n1">Amount</td>
            </tr>
            </thead>
            <tbody>
          `;
    for (let i = 0; i < selectedData.length; i++) {
      d += `
            <tr>
            <td>${selectedData[i].Transaction_ID}</td>
            <td>${selectedData[i].Original_Merchant_Name}</td>
            <td>${selectedData[i].Cardholder_First_Name} ${selectedData[i].Cardholder_Last_Name}</td>
            <td>${selectedData[i].Transaction_Amount}</td>
            </tr>
          `;
    }

    d += "</tbody></table></div>";
    const { value: confirm } = await SweetAlert.fire({
      customClass: "swal-height1",
      title: "Missing Receipts",
      html: `The below list will be sent to the techs assigned to this job.

        ${d}
      `,
      confirmButtonText: "Send Email",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      width: "920px",
    });

    if (!confirm) return;

    try {
      SweetAlert.loading();

      await this.tripExpenseTransactionsService.emailMissingReceiptsToTechs(
        this.fsId,
        this.workOrderId,
        selectedData
      );
      SweetAlert.close();
    } catch (e) {
      SweetAlert.close();
    }
  }

  // Lightbox methods
  open(index: number): void {
    this.lightbox.open(this.images, index, {});
  }

  close(): void {
    this.lightbox.close();
  }

  // Data grouping method
  _groupMyData(data) {
    const groups = data.reduce((groups, game) => {
      const date = moment(game.created_date).calendar({
        sameDay: "[Today] • ddd, MMM DD, YYYY",
        nextDay: "[Tomorrow] • ddd, MMM DD, YYYY",
        nextWeek: "dddd, MMM DD, YYYY",
        lastDay: "[Yesterday] • ddd, MMM DD, YYYY",
        lastWeek: "ddd, MMM DD, YYYY",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(game);
      return groups;
    }, {});

    let groupArrays = Object.keys(groups).map((date) => {
      let total = 0;
      for (let i = 0; i < groups[date].length; i++) {
        total += groups[date][i].cost;
      }

      return {
        groupTotal: total,
        games: groups[date],
        date,
        dateRaw: moment(new Date(date)).format("YYYY-MM-DD"),
      };
    });

    return { groups, groupArrays };
  }
  // Helper methods for sidebar functionality
  getReceiptsByCategory(): ReceiptCategorySummary[] {
    const map = {};
    (this.data || []).forEach(r => {
      const key = r.name || 'Uncategorized';
      if (!map[key]) map[key] = { name: key, count: 0, total: 0 };
      map[key].count++;
      map[key].total += r.cost || 0;
    });
    return Object.values(map);
  }

  getRecentReceipts(): any[] {
    return this.data?.slice(-5).reverse() || [];
  }

  getMonthlyTotal(): number {
    const currentMonth = moment().format('YYYY-MM');
    return this.data?.filter(receipt =>
      moment(receipt.created_date).format('YYYY-MM') === currentMonth
    ).reduce((sum, receipt) => sum + (receipt.cost || 0), 0) || 0;
  }

  getMonthlyProgress(): number {
    const monthlyTotal = this.getMonthlyTotal();
    const averageMonthly = this.tripExpenseTotal / Math.max(1, moment().date()); // Rough estimate
    return Math.min(100, (monthlyTotal / Math.max(averageMonthly, 1)) * 100);
  }

  getAverageReceiptAmount(): number {
    if (!this.data?.length) return 0;
    return this.tripExpenseTotal / this.data.length;
  }

  getLargestReceiptAmount(): number {
    if (!this.data?.length) return 0;
    return Math.max(...this.data.map(receipt => receipt.cost || 0));
  }

  exportReceipts(): void {
    // Implement export functionality
    const csvContent = this.generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipts_${this.workOrderId}_${moment().format('YYYY-MM-DD')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  generateCSVContent(): string {
    const headers = ['Vendor', 'Amount', 'Date', 'Category', 'Created Date'];
    const rows = this.data?.map(receipt => [
      receipt.vendor_name || '',
      receipt.cost || 0,
      receipt.date || '',
      receipt.name || '',
      receipt.created_date || ''
    ]) || [];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  generateReport(): void {
    // Implement report generation
    const reportData = {
      totalReceipts: this.data?.length || 0,
      totalAmount: this.tripExpenseTotal,
      categories: this.getReceiptsByCategory(),
      monthlyTotal: this.getMonthlyTotal(),
      averageAmount: this.getAverageReceiptAmount(),
      largestAmount: this.getLargestReceiptAmount()
    };

    console.log('Receipt Report:', reportData);
    // Could open a modal or generate a PDF report
  }
}