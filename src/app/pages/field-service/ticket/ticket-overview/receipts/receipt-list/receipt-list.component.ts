import { Component, Input, OnInit, SimpleChanges, TemplateRef, ViewChild } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { TripExpenseService } from '@app/core/api/field-service/trip-expense.service'
import { NgbActiveModal, NgbActiveOffcanvas, NgbDropdownModule, NgbNavModule, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import { TripExpenseTransactionsService } from '@app/core/api/field-service/trip-expense-transactions'
import { NgSelectModule } from '@ng-select/ng-select'

import { Pipe, PipeTransform } from '@angular/core';
import { LazyLoadImageModule } from 'ng-lazyload-image';

import moment from 'moment'
import { AgGridModule } from 'ag-grid-angular'

// Angular
import { DomSanitizer, SafeHtml, SafeStyle, SafeScript, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';
import { CreditCardComponent } from '../credit-card/credit-card.component'
import { WorkOrderService } from '@app/core/api/field-service/work-order.service'
import { ReceiptAddEditService } from '../receipt-add-edit/receipt-add-edit.service'
import { timeConvert } from '@app/pages/field-service/shared/field-service-helpers.service'
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers'
import { LinkImageRendererComponent } from '@app/shared/ag-grid/cell-renderers/link-image-renderer.component'
import { LinksImageRendererComponent } from '@app/shared/ag-grid/cell-renderers/links-image-renderer.component'
import { agGridOptions } from '@app/shared/config/ag-grid.config'
import { SharedModule } from '@app/shared/shared.module'
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service'
import { isMobile, currencyFormatter, autoSizeColumns } from 'src/assets/js/util'
import { EditIconComponent } from '@app/shared/ag-grid/edit-icon/edit-icon.component'
import printJS from 'print-js'
import { Lightbox } from 'ngx-lightbox'

/**
 * Sanitize HTML
 */
@Pipe({
  name: 'safe',
  standalone: true
})
export class SafePipe implements PipeTransform {
  /**
   * Pipe Constructor
   *
   * @param _sanitizer: DomSanitezer
   */
  // tslint:disable-next-line
  constructor(protected _sanitizer: DomSanitizer) {
  }

  /**
   * Transform
   *
   * @param value: string
   * @param type: string
   */
  transform(value: string, type: string): SafeHtml | SafeStyle | SafeScript | SafeUrl | SafeResourceUrl {
    switch (type) {
      case 'html':
        return this._sanitizer.bypassSecurityTrustHtml(value);
      case 'style':
        return this._sanitizer.bypassSecurityTrustStyle(value);
      case 'script':
        return this._sanitizer.bypassSecurityTrustScript(value);
      case 'url':
        return this._sanitizer.bypassSecurityTrustUrl(value);
      case 'resourceUrl':
        return this._sanitizer.bypassSecurityTrustResourceUrl(value);
      default:
        return this._sanitizer.bypassSecurityTrustHtml(value);
    }
  }
}

@Pipe({
  standalone: true,
  name: 'myfilter',
})
export class MyFilterPipe implements PipeTransform {
  transform(items: any[], filter: any): any {
    if (!items || !filter) {
      return items;
    }
    // filter items array, items which match and return true will be
    // kept, false will be filtered out
    return items.filter((item: any) => {
      return item.Transaction_Amount == filter;
    })

  }
}

@Component({
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,
    NgSelectModule,
    MyFilterPipe,
    LazyLoadImageModule,
    NgbDropdownModule,
    NgbNavModule,
    AgGridModule,
    SafePipe,
    CreditCardComponent
  ],
  providers: [
    NgbActiveModal,
    NgbActiveOffcanvas
  ],
  selector: 'app-uploaded-receipt',
  templateUrl: `./receipt-list.component.html`,
})
export class UploadedReceiptComponent implements OnInit {
  @Input() public data: any = [];
  @Input() public workOrderId: any;
  @Input() public fsId: number | string;
  @Input() public disabled: boolean = true;
  tripExpenseTotal = 0;
  transactions: any = []
  groupArrays: { groupTotal: number; games: any }[]
  showNoReceipts = false;

  onNavChange(e) {
    if (e.nextId == 'Transactions') {

      this.getAllTransactionAssignedToFsId()

    } else {

      this.getData()
    }
  }
  sani(url) {
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url)
  }

  isPdf(fileName) {
    return (fileName?.substring(fileName?.lastIndexOf('.') + 1) !== 'pdf')
  }

  onClickShowNoReceipts() {
    this.showNoReceipts != this.showNoReceipts;

    let d = []
    if (this.showNoReceipts) {
      for (let i = 0; i < this.transactions.length; i++) {
        if (this.transactions[i].possibleCount == 0)
          d.push(this.transactions[i])
      }
      this.transactions = d;

    } else {
      this.transactions = this.originalData;
    }

  }


  printSingle(row) {

    this.printedReceipts = [row]

    if (!this.isPdf(row.link)) {

    } else {
      setTimeout(() => {
        const printContent = document.getElementById("printDiv");
        const WindowPrt = window.open('', '', 'left=0,top=0,width=900,height=900,toolbar=0,scrollbars=0,status=0');
        WindowPrt.document.write(printContent.innerHTML);
        WindowPrt.document.close();
        WindowPrt.focus();
        WindowPrt.print();
        WindowPrt.close();
      }, 500);
    }

  }

  active = 'Receipts';
  timeConvert = timeConvert;


  printedReceipts
  async printReceipts() {

    const selectedData = this.gridApi.getSelectedRows();

    this.printedReceipts = selectedData;

    let print = []
    selectedData.forEach((element) => print.push(element.link));


    printJS({
      printable: print,
      type: 'image',
      header: 'FSID: ' + this.fsId,
      imageStyle: 'width:50%;margin-bottom:20px;'
    })

    // setTimeout(() => {
    //   const printContent = document.getElementById("printDiv");
    //   let WindowPrt = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');
    //   WindowPrt.document.write(printContent.innerHTML);
    //   WindowPrt.document.close();
    //   WindowPrt.focus();
    //   WindowPrt.print();
    //   WindowPrt.close();
    // }, 0);


  }

  @ViewChild("firstNameField") firstNameField;

  focusOnFirstName() {
    this.firstNameField.nativeElement.focus();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['workOrderId']) {

      this.active = 'Receipts';
      this.workOrderId = changes['workOrderId'].currentValue
      this.getData();

    }


    if (changes['fsId']?.currentValue) {
      this.active = 'Receipts';
      this.justGetTransaction()
    }
  }


  searchTransaction: any = "";
  closeResult = "";
  openBottom(content: TemplateRef<any>, row) {
    if (this.offcanvasService.hasOpenOffcanvas()) {
      return
    }

    this.searchTransaction = row?.cost;

    this.offcanvasService.open(content, { ariaLabelledBy: 'offcanvas-basic-title', position: 'start', backdrop: true }).result.then(
      (result) => {
        this.getData(false);
        this.getAllTransactionAssignedToFsId()
      },
      (reason) => {
        if (reason == 'saved') {
          this.getData(false)
          this.getAllTransactionAssignedToFsId()
        }
      },
    );
  }

  async clearTransaction(id) {
    try {
      SweetAlert.loading('Clearing transaction..')
      await this.tripExpenseService.update(id, { transaction_id: null })
      await SweetAlert.close();
      this.offcanvasService.dismiss('saved')
    } catch (err) {
      SweetAlert.close(0)
    }

  }

  async selectTransaction(id, item) {

    try {
      SweetAlert.loading('Saving..')
      await this.tripExpenseService.update(id, { transaction_id: item.Transaction_ID })
      await SweetAlert.close();
      this.offcanvasService.dismiss('saved')
    } catch (err) {
      SweetAlert.close(0)
    }

  }

  constructor(
    public activeOffcanvas: NgbActiveOffcanvas,
    public tripExpenseService: TripExpenseService,
    private receiptAddEditService: ReceiptAddEditService,
    private offcanvasService: NgbOffcanvas,
    private tripExpenseTransactionsService: TripExpenseTransactionsService,
    private domSanitizer: DomSanitizer,
    private workOrderService: WorkOrderService,
    private lightbox: Lightbox
  ) {
  }

  ngOnInit(): void {

  }

  getTripExenses(data) {
    this.tripExpenseTotal = 0;
    for (let i = 0; i < data.length; i++) {
      this.tripExpenseTotal += data[i].cost
    }
  }

  _groupMyData(data) {
    const groups = data.reduce((groups, game) => {
      const date = moment(game.created_date).calendar({
        sameDay: '[Today] • ddd, MMM DD, YYYY',
        nextDay: '[Tomorrow] • ddd, MMM DD, YYYY',
        nextWeek: 'dddd, MMM DD, YYYY',
        lastDay: '[Yesterday] • ddd, MMM DD, YYYY',
        lastWeek: 'ddd, MMM DD, YYYY'
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
        total += groups[date][i].cost
      }

      return {
        groupTotal: total,
        games: groups[date],
        date,
        dateRaw: moment(new Date(date)).format('YYYY-MM-DD'),

      };

    })


    return { groups, groupArrays }
  }

  
  images = []
  open(index: number): void {
      // open lightbox
      this.lightbox.open(this.images, index, {});
  }

  close(): void {
      // close lightbox programmatically
      this.lightbox.close();
  }


  loading = false;
  originalData
  async getData(clear = true) {
    this.images = []
    if (clear)
      this.data = [];
    try {
      this.loading = true;
      let data: any = await this.workOrderService.getById(this.workOrderId)
      this.fsId = data?.fs_scheduler_id
      this.data = await this.tripExpenseService.getByFsId(data?.fs_scheduler_id)

      for (let i = 0; i < this.data.length; i++) {
        let row = this.data[i]
        const src = row.link;
        const caption = 'Image ' + i + '- ' + row.created_date;
        const thumb = src;
        const item = {
            src: src,
            caption: caption,
            thumb: thumb
        };
        this.images.push(item);
    }


      this.getTripExenses(this.data)
      this.setColumDef1();

    } catch (err) {
      this.loading = false;
    }
  }

  create(typeOfClick) {
    const modalRef = this.receiptAddEditService.open(this.fsId, this.workOrderId, typeOfClick)
    modalRef.result.then(async (result: any) => {
      await this.getData();
    }, () => { });
  }

  edit(id, typeOfClick) {
    const modalRef = this.receiptAddEditService.open(this.fsId, this.workOrderId, typeOfClick, id);
    modalRef.result.then(async (result: any) => {
      await this.getData();
    }, () => { });
  }

  totalBankTransactins = 0
  totalBankTransactinsAmount = 0
  assignedTotalBankTransactions = 0

  transactionDataOnly = 0
  async justGetTransaction() {
    this.totalBankTransactinsAmount = 0;
    let transactions: any = this.originalData = await this.tripExpenseTransactionsService.getByFsId(this.fsId, this.workOrderId);
    for (let i = 0; i < transactions.length; i++) {
      this.totalBankTransactinsAmount += transactions[i].Transaction_Amount
    }

  }

  async getAllTransactionAssignedToFsId() {
    this.transactions = []
    let transactionsData = []

    this.totalBankTransactins = 0
    this.assignedTotalBankTransactions = 0

    this.totalBankTransactinsAmount = 0;

    let transactions: any = this.originalData = await this.tripExpenseTransactionsService.getByFsId(this.fsId, this.workOrderId);

    for (let i = 0; i < transactions.length; i++) {
      transactions[i].possibleCount = 0;
      this.totalBankTransactins++;
      if (transactions[i].work_order_transaction_id !== null) {
        this.assignedTotalBankTransactions++
      }
      this.totalBankTransactinsAmount += transactions[i].Transaction_Amount
      // if (transactions[i].work_order_transaction_id == null) {
      //   this.transactions.push(transactions[i])
      // }
      for (let ii = 0; ii < this.data.length; ii++) {
        if (transactions[i].Transaction_Amount == this.data[ii].cost) {
          transactions[i].possibleCount++
        }
        if (transactions[i].Transaction_ID == this.data[ii].transaction_id) {
          this.data[ii].receipt_date = transactions[i].Transaction_Date
          this.data[ii].is_upload_same_day = moment(transactions[i].Transaction_Date).format('YYYY-MM-DD') == moment(this.data[ii].created_date).format('YYYY-MM-DD');
        }
      }

      this.transactions.push(transactions[i])


    }


    for (let i = 0; i < this.data.length; i++) {
      this.data[i].possibleCount = 0;
      for (let ii = 0; ii < this.transactions.length; ii++) {
        if (this.transactions[ii].Transaction_Amount == this.data[i].cost) {
          this.data[i].possibleCount++
        }

      }
    }


    for (let i = 0; i < this.transactions.length; i++) {
      this.transactions[i].link = ""
      this.transactions[i].links = []
      for (let ii = 0; ii < this.data.length; ii++) {
        if (transactions[i].Transaction_Amount == this.data[ii].cost && transactions[i].possibleCount > 0) {
          this.transactions[i].link = this.data[ii].link
          this.transactions[i].links.push(this.data[ii].link)
        }
      }

    }



    this.gridApi.setRowData(this.transactions)

    this.setColumDef()

  }


  async sendEmail() {
    const selectedData = this.gridApi.getSelectedRows()

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
      alert('Must have more than one selected.')
      return
    }

    let d =
      '<div class=" mt-2"> <table class="table table-sm table-bordered" bordered="1" style="font-size:14px">'
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
          `
    for (let i = 0; i < selectedData.length; i++) {
      d += `
            <tr>
            <td>${selectedData[i].Transaction_ID}</td>
            <td>${selectedData[i].Original_Merchant_Name}</td>
            <td>${selectedData[i].Cardholder_First_Name} ${selectedData[i].Cardholder_Last_Name}</td>
            <td>${selectedData[i].Transaction_Amount}</td>
            </tr>
          `
    }

    d += '</tbody></table></div>'
    const { value: confirm } = await SweetAlert.fire({
      customClass: 'swal-height1',
      title: 'Missing Receipts',
      html: `The below list will be sent to the techs assigned to this job.

        ${d}
      `,
      confirmButtonText: 'Send Email',
      cancelButtonText: 'Cancel',
      showCancelButton: true,
      width: '920px'
    })

    if (!confirm) return

    try {
      SweetAlert.loading()

      await this.tripExpenseTransactionsService.emailMissingReceiptsToTechs(this.fsId, this.workOrderId, selectedData);
      SweetAlert.close()
    } catch (e) {
      SweetAlert.close()
    }
  }

  viewReceipt(e) {
    this.lightbox.open(this.images, e.index, {});

    //window.open(link, 'Image', 'width=largeImage.stylewidth,height=largeImage.style.height,resizable=1');
  }

  gridApi: any
  gridColumnApi: any
  title = 'Policy Usage'

  setColumDef() {

    this.gridApi.updateGridOptions({
      columnDefs: [
        {
          field: '',
          headerCheckboxSelection: true,
          headerCheckboxSelectionFilteredOnly: true,
          width: 50,
          maxWidth: 50,
          suppressHeaderMenuButton: true,
          pinned: isMobile() ? null : 'left',
          checkboxSelection: true,
          floatingFilterComponentParams: { suppressFilterButton: true },
          enableFilter: false,
        },
        {
          field: 'link',
          headerName: 'Image',
          filter: 'agMultiColumnFilter',
          cellRenderer: LinksImageRendererComponent,
          suppressHeaderMenuButton: true,
          floatingFilter: false,
          cellRendererParams: {
            onClick: (e: any) => this.viewReceipt(e),
            iconName: 'mdi mdi-view-list',
            classColor: 'text-info'
          },
        },
        {
          headerName: 'Possible Count',
          field: 'possibleCount',
          filter: 'agMultiColumnFilter',
          hide: true
        },

        {
          field: 'reason_code',
          headerName: 'Reason Code',
          filter: 'agMultiColumnFilter',
          editable: true,
          cellRenderer: EditIconComponent,
          cellRendererParams: {
            iconName: 'mdi mdi-pencil',
            placeholder: "Enter reason code"
          },
        },
        {
          headerName: 'First Name',
          field: 'Cardholder_First_Name',
          filter: 'agMultiColumnFilter'
        },
        {
          headerName: 'Last Name',
          field: 'Cardholder_Last_Name',
          filter: 'agMultiColumnFilter'
        },
        {
          headerName: 'Merchant Name',
          field: 'Original_Merchant_Name',
          filter: 'agMultiColumnFilter'
        },
        {
          headerName: 'Post Date',
          field: 'Post_Date',
          filter: 'agMultiColumnFilter'
        },
        {
          headerName: 'Purchase Type',
          field: 'Purchase_Type',
          filter: 'agMultiColumnFilter'
        },
        {
          headerName: 'Transaction Date',
          field: 'Transaction_Date',
          filter: 'agMultiColumnFilter'
        },
        {
          headerName: 'Amount',
          field: 'Transaction_Amount',
          filter: 'agMultiColumnFilter',
          pinned: 'right',
          valueFormatter: currencyFormatter
        },
      ]
    })
  }

  gridOptions = {
    ...agGridOptions,
    columnDefs: [],
    onGridReady: this.onGridReady.bind(this),

    suppressRowClickSelection: true,
    onFirstDataRendered: (params) => {
      params.api.forEachNode(node => {
        node.setSelected(
          !!node.data &&
          node.data.case_manager_email !== null &&
          node.data.policy_limit_usage >= node.data.min_policy_limit_usage
        )
      })

      autoSizeColumns(params);

      //highlightRowView(params, 'Cardholder_ID', this.preview_id_view)

    },
    onCellValueChanged: async (event) => {
      try {
        await this.tripExpenseTransactionsService.updateById(event.data.id, { reason_code: event.data.reason_code });
      } catch (err) {
      }
    }

  }

  onGridReady(params: any) {
    this.gridApi = params.api
    this.gridColumnApi = params.columnApi


  }


  /*uploaded receipts*/


  setColumDef1() {

    this.gridApi.updateGridOptions({
      columnDefs: [
        {
          field: '',
          headerCheckboxSelection: true,
          headerCheckboxSelectionFilteredOnly: true,
          width: 50,
          maxWidth: 50,
          suppressHeaderMenuButton: true,
          floatingFilter: false,
          pinned: isMobile() ? null : 'left',
          checkboxSelection: true
        },
        {
          field: 'link',
          headerName: 'Image',
          suppressHeaderMenuButton: true,
          floatingFilter: false,
          filter: 'agMultiColumnFilter',
          cellRenderer: LinkImageRendererComponent,
          cellRendererParams: {
            onClick: e => this.viewReceipt(e),
            iconName: 'mdi mdi-view-list',
            classColor: 'text-info'
          },
        },
        {
          field: 'Edit',
          headerName: 'Edit',
          filter: 'agMultiColumnFilter',
          cellRenderer: LinkRendererComponent,
          cellRendererParams: {
            onClick: e => this.edit(e.rowData.id, null),
            iconName: 'mdi mdi-view-list',
            classColor: 'text-info',
            value: 'Edit',

          },
        },
        { field: 'vendor_name', headerName: 'Vendor Name', filter: 'agMultiColumnFilter' },
        {
          field: 'cost', headerName: 'Cost', filter: 'agMultiColumnFilter',
          valueFormatter: currencyFormatter
        },
        { field: 'date', headerName: 'Receipt Date', filter: 'agMultiColumnFilter' },
        { field: 'name', headerName: 'Name', filter: 'agMultiColumnFilter' },
        { field: 'time', headerName: 'Receipt Time', filter: 'agMultiColumnFilter' },
        { field: 'created_by_name', headerName: 'Created By', filter: 'agMultiColumnFilter' },
        { field: 'created_date', headerName: 'Created Date', filter: 'agMultiColumnFilter' }
      ]
    })
  }




}
