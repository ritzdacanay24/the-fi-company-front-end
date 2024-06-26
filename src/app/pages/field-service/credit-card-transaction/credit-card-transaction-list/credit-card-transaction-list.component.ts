import { GridOptions } from 'ag-grid-community'
import { GridReadyEvent, GridApi } from 'ag-grid-community';
import { Component, OnInit } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import {
    NgbDropdownModule,
    NgbNavModule
} from '@ng-bootstrap/ng-bootstrap'
import { NgSelectModule } from '@ng-select/ng-select'
import { AgGridModule } from 'ag-grid-angular'

import moment from 'moment'
import { CreditCardModalService } from '../credit-card-transaction-modal/credit-card-transaction-modal.component'
import { TripExpenseTransactionsService } from '@app/core/api/field-service/trip-expense-transactions'
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component'
import { agGridOptions } from '@app/shared/config/ag-grid.config'
import { SharedModule } from '@app/shared/shared.module'
import { CreditCardTransactionChartComponent } from '../credit-card-transaction-chart/credit-card-transaction-chart.component'

@Component({
    standalone: true,
    imports: [
        SharedModule,
        ReactiveFormsModule,
        NgbDropdownModule,
        NgbNavModule,
        NgSelectModule,
        AgGridModule,
        DateRangeComponent,
        CreditCardTransactionChartComponent
    ],
    selector: 'app-credit-card-transaction-list',
    templateUrl: `./credit-card-transaction-list.component.html`
})
export class CreditCardTransactionListComponent implements OnInit {

    dateFrom = moment().subtract(1, 'week').format('YYYY-MM-DD')
    dateTo = moment().format('YYYY-MM-DD')
    dateRange = [this.dateFrom, this.dateTo];
    onChangeDate($event) {
        this.dateFrom = $event['dateFrom']
        this.dateTo = $event['dateTo']
        this.getData()
    }

    title = 'Patient Claims'
    gridApi: GridApi

    columnDefs: any[]

    data: any[]

    gridOptions: GridOptions = {
        ...agGridOptions,
        columnDefs: [],
        onGridReady: this.onGridReady.bind(this),
        suppressColumnVirtualisation: false,
        defaultColDef: {
            ...agGridOptions.defaultColDef,
            editable: false,
            // cellRenderer: CellRenderer,
        },
        singleClickEdit: false,
        getRowId: params => params.data.id,
        onCellValueChanged: async (event) => {
            try {
                await this.tripExpenseTransactionsService.updateById(event.data.id, event.data);
            } catch (err) {
            }
        }

    }

    isLoading = false;

    onGridReady(params: GridReadyEvent) {
        this.gridApi = params.api
    }

    constructor(
        public tripExpenseTransactionsService: TripExpenseTransactionsService,
        private creditCardModalService: CreditCardModalService
    ) { }

    ngOnInit(): void {
        this.getData();
    }

    async getData() {
        this.gridApi?.showLoadingOverlay()
        this.data = await this.tripExpenseTransactionsService.findByDateRange('Transaction_Date', { dateFrom: this.dateFrom, dateTo: this.dateTo });

        var customColumns = []

        if (this.data.length > 0) {
            for (const [key] of Object.entries(this.data[0])) {
                customColumns.push(this.setColumnGrid(key))
            }
        }

        this.columnDefs = customColumns
        this.gridApi?.hideOverlay()
    }

    setColumnGrid(row) {
        return {
            headerName: row.replaceAll('_', ' '),
            field: row,
            editable: false,
            filter: 'agMultiColumnFilter'
        }
    }

    async showFileUpload() {

        const modalRef = this.creditCardModalService.open()
        modalRef.result.then(async (result: any) => {
            await this.getData();
        }, () => { });


        // await SweetAlert.fire({
        //   title: 'Select .xlsx file',
        //   text: 'XLSX file must be in a specific format. If format is incorrect, an error will be thrown or it will fail to upload.',
        //   showCancelButton: true,
        //   input: 'file',
        //   confirmButtonText: 'Upload',
        //   inputAttributes: {
        //     accept:
        //       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        //     'aria-label': 'Upload xlsx'
        //   },
        //   showLoaderOnConfirm: true,
        //   inputValidator: result => {
        //     return !result && 'No File Found..'
        //   },
        //   preConfirm: async data => {
        //     try {
        //       await this.tripExpenseTransactionsService.uploadCreditCardTransactions(data)
        //       await this.getData()
        //       return true
        //     } catch (err) {
        //       return false
        //     }
        //   },
        //   footer: 'Each new upload will assign a timestamp to each record.'
        // })
    }

    async deleteAll() {
    }
}