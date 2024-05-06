import { Component, Input, OnInit, SimpleChanges, TemplateRef, ViewChild } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { TripExpenseService } from '@app/core/api/field-service/trip-expense.service'
import { NgbActiveModal, NgbActiveOffcanvas, NgbDropdownModule, NgbNavModule, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import { TripExpenseTransactionsService } from '@app/core/api/field-service/trip-expense-transactions'
import { NgSelectModule } from '@ng-select/ng-select'

import { Pipe, PipeTransform } from '@angular/core';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { AgGridModule } from 'ag-grid-angular'

// Angular
import { DomSanitizer, SafeHtml, SafeStyle, SafeScript, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';
import { ReceiptAddEditService } from '../receipt-add-edit/receipt-add-edit.service'
import { timeConvert } from '@app/pages/field-service/shared/field-service-helpers.service'
import { agGridOptions } from '@app/shared/config/ag-grid.config'
import { SharedModule } from '@app/shared/shared.module'
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service'
import moment from 'moment'
import { isMobile, autoSizeColumns } from 'src/assets/js/util'

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
    SafePipe
  ],
  providers: [
    NgbActiveModal,
    NgbActiveOffcanvas
  ],
  selector: 'app-credit-card',
  templateUrl: `./credit-card.component.html`,
})
export class CreditCardComponent implements OnInit {
  @Input() public data: any = [];
  @Input() public workOrderId: number | string;
  @Input() public fsId: number | string;
  @Input() public disabled: boolean = true;
  tripExpenseTotal = 0;
  transactions: any = []
  groupArrays: { groupTotal: number; games: any }[]
  showNoReceipts = false;

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
      // printJS({ printable: row.link, type: 'pdf', showModal: true })
      // let win = window.open(row.link, "_blank")

      // win.focus();
      // win.addEventListener(
      //   "load",
      //   () => {
      //     setTimeout(() => {
      //       //to give time for the browser to load the pdf
      //       win.window.print();
      //     }, 500);
      //   },
      //   true
      // );

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
    this.printedReceipts = this.data;

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

  @ViewChild("firstNameField") firstNameField;

  focusOnFirstName() {
    this.firstNameField.nativeElement.focus();
  }

  // ngOnChanges(changes: SimpleChanges) {
  //   if (changes.workOrderId) {
  //     this.workOrderId = changes.workOrderId.currentValue
  //     this.getData()

  //   }


  //   if (changes.fsId?.currentValue) {
  //     this.getAllTransactionAssignedToFsId()
  //   }
  // }


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
    private activatedRoute: ActivatedRoute,
    public tripExpenseService: TripExpenseService,
    private receiptAddEditService: ReceiptAddEditService,
    private offcanvasService: NgbOffcanvas,
    private tripExpenseTransactionsService: TripExpenseTransactionsService,
    private domSanitizer: DomSanitizer
  ) {
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.workOrderId = params['id'];
      this.fsId = params['fsId'];
    });

    if (this.workOrderId) this.getData();
    if (this.fsId) this.getAllTransactionAssignedToFsId();

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

  loading = false;
  originalData
  async getData(clear = true) {
    if (clear)
      this.data = [];
    try {
      this.loading = true;
      this.data = await this.tripExpenseService.getByWorkOrderId(this.workOrderId)
      let groupedData = this._groupMyData(this.data);

      this.groupArrays = groupedData.groupArrays;


      this.getTripExenses(this.data);
      this.loading = false;

    } catch (err) {
      this.loading = false;
    }
  }

  create(typeOfClick) {
    const modalRef = this.receiptAddEditService.open(this.workOrderId, typeOfClick)
    modalRef.result.then(async (result: any) => {
      await this.getData();
    }, () => { });
  }

  edit(id, typeOfClick) {
    const modalRef = this.receiptAddEditService.open(this.workOrderId, typeOfClick, id);
    modalRef.result.then(async (result: any) => {
      await this.getData();
    }, () => { });
  }

  totalBankTransactins = 0
  totalBankTransactinsAmount = 0
  assignedTotalBankTransactions = 0
  async getAllTransactionAssignedToFsId() {
    this.transactions = []
    this.totalBankTransactins = 0
    this.assignedTotalBankTransactions = 0

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
      for (let ii = 0; ii < this.data.length; ii++) {
        if (transactions[i].Transaction_Amount == this.data[ii].cost && transactions[i].possibleCount == 1) {
          this.transactions[i].link = this.data[ii].link
        }
      }

    }

    this.gridApi.setRowData(this.transactions)

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
      this.getData()
      SweetAlert.close()
    } catch (e) {
      SweetAlert.close()
    }
  }


  gridApi: any
  
  title = 'Policy Usage'

  columnDefs: any = [
    {
      field: '',
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      checkboxSelection: true,
      width: 50,
      maxWidth: 50,
      suppressHeaderMenuButton: true,
      floatingFilter: false,
      pinned: isMobile() ? null : 'left',
    },
    {
      field: 'link',
      headerName: 'link',
      filter: 'agMultiColumnFilter',
      cellRenderer: (params: { value: any }) => {
        if (params.value) {
          return `<img src=${params.value} style="width:25px;height:25px" class="rounded">`
        }
        return null;
      }
    },
    {
      field: 'possibleCount',
      headerName: 'possibleCount',
      filter: 'agMultiColumnFilter'
    },
    {
      field: 'Cardholder_First_Name',
      headerName: 'Cardholder_First_Name',
      filter: 'agMultiColumnFilter'
    },
    {
      field: 'Cardholder_Last_Name',
      headerName: 'Cardholder_Last_Name',
      filter: 'agMultiColumnFilter'
    },
    {
      field: 'Original_Merchant_Name',
      headerName: 'Original_Merchant_Name',
      filter: 'agMultiColumnFilter'
    },
    {
      field: 'Post_Date',
      headerName: 'Post_Date',
      filter: 'agMultiColumnFilter'
    },
    {
      field: 'Purchase_Type',
      headerName: 'Purchase_Type',
      filter: 'agMultiColumnFilter'
    },
    {
      field: 'Transaction_Date',
      headerName: 'Transaction_Date',
      filter: 'agMultiColumnFilter'
    },
    {
      field: 'Transaction_Amount',
      headerName: 'Transaction_Amount',
      filter: 'agMultiColumnFilter',
      pinned: 'right'
    },
  ]

  gridOptions = {
    ...agGridOptions,
    columnDefs: this.columnDefs,
    onGridReady: this.onGridReady.bind(this),
    getRowId: (data) => data.data.id,

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

    }

  }



  onGridReady(params: any) {
    this.gridApi = params.api
  }


}
