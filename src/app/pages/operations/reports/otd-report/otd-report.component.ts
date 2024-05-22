import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { ReportService } from '@app/core/api/operations/report/report.service';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import { SharedModule } from '@app/shared/shared.module';
import { _compressToEncodedURIComponent, _decompressFromEncodedURIComponent } from 'src/assets/js/util/jslzString';
import { AgGridModule } from 'ag-grid-angular';
import { GridApi } from 'ag-grid-community';
import moment from 'moment';
import { autoSizeColumns } from 'src/assets/js/util';
import { CommentsModalService } from '@app/shared/components/comments/comments-modal.service';
import { GridFiltersComponent } from '@app/shared/grid-filters/grid-filters.component';
import { GridSettingsComponent } from '@app/shared/grid-settings/grid-settings.component';
import { SalesOrderInfoModalService } from '@app/shared/components/sales-order-info-modal/sales-order-info-modal.component';
import { LinkRendererComponent } from '@app/shared/ag-grid/cell-renderers';
import { OtdChartComponent } from './otd-chart/otd-chart.component';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        AgGridModule,
        DateRangeComponent,
        GridSettingsComponent,
        GridFiltersComponent,
        OtdChartComponent
    ],
    selector: 'app-otd-report',
    templateUrl: './otd-report.component.html',
    styleUrls: []
})
export class OtdReportComponent implements OnInit {
    constructor(
        public activatedRoute: ActivatedRoute,
        public router: Router,
        public reportService: ReportService,
        private commentsModalService: CommentsModalService,
        private salesOrderInfoModalService: SalesOrderInfoModalService,
    ) {
    }

    ngOnInit(): void {
        this.activatedRoute.queryParams.subscribe(params => {
            this.dateFrom = params['dateFrom'] || this.dateFrom;
            this.dateTo = params['dateTo'] || this.dateTo;
            this.dateRange = [this.dateFrom, this.dateTo];
            this.displayCustomers = params['displayCustomers'] || 'Show All';
            this.typeOfView = params['typeOfView'] || this.typeOfView;
        });

        if (!this.displayCustomers || this.displayCustomers != 'Show All') {
            this.showAll = false
        }
        if (!this.displayCustomers) {
            this.showAll = true
        }
        // if(!this.displayCustomers){
        //     this.showAll = false;

        // }
        this.getData()
    }

    average = 0

    onCustomerChange(row) {
        this.showAll = false;
        this.displayCustomers = row.label
        this.average = row.value
        this.getData()
    }

    pageId = '/pulse/shipped-orders'

    searchName = "";

    onFilterTextBoxChanged(value: any) {
        //setQuickFilter
        this.gridApi.setGridOption('quickFilterText', value);
    }

    async refreshData() {

        try {
            this.gridApi?.showLoadingOverlay();
            this.isLoading = true;
            await this.reportService.refreshOtdData(this.dateFrom, this.dateTo, this.displayCustomers, this.typeOfView)
            await this.getData();

            this.gridApi?.hideOverlay();
            this.isLoading = false;
        } catch (err) {
            this.gridApi?.hideOverlay();
            this.isLoading = false;

        }
    }

    showAll = true;
    onChange() {
        if (this.showAll) {
            this.displayCustomers = "Show All"
        }

        this.showAll = false

        this.router.navigate([`.`], {
            relativeTo: this.activatedRoute,
            queryParamsHandling: 'merge',
            queryParams: {
                displayCustomers: this.displayCustomers,
                showAll: this.showAll
            }
        });

        this.getData();
    }

    title = 'OTD Report';

    addWeekdays(date, days) {
        // make a 'pseudo-constant' to represent the # used when adding/subtracting days
        var dayConst = 1;
        date = moment(date); // use a clone

        // add functionality for subtraction here
        if (days < 0) {
            dayConst = -1;
            days = -days;
        }

        while (days > 0) {
            // and then dayConst will be -1 if days is negative.
            date = date.add(dayConst, 'days');

            // decrease "days" only if it's a weekday.
            if (date.isoWeekday() !== 6 && date.isoWeekday() !== 7) {
                days -= 1;
            }
        }
        return date;
    }


    dateFrom = this.addWeekdays(moment(), -4).format('YYYY-MM-DD');
    dateTo = moment().format('YYYY-MM-DD');
    dateRange = [this.dateFrom, this.dateTo];

    onChangeDate($event) {
        this.dateFrom = $event['dateFrom']
        this.dateTo = $event['dateTo']
        this.getData()
    }

    viewComment = (salesOrderLineNumber: any, id: string, so?) => {
        let modalRef = this.commentsModalService.open(salesOrderLineNumber, 'Sales Order')
        modalRef.result.then((result: any) => {
            let rowNode = this.gridApi.getRowNode(id);
            rowNode.data.recent_comments = result;
            this.gridApi.redrawRows({ rowNodes: [rowNode] });
        }, () => { });
    }

    gridApi: GridApi;

    data: any[];

    columnDefs: any = [
        { field: "sod_per_date", headerName: "Performance Date", filter: "agTextColumnFilter" },
        { field: "week", headerName: "Week", filter: "agTextColumnFilter" },
        { field: "year", headerName: "Year", filter: "agTextColumnFilter" },
        { field: "month", headerName: "Month", filter: "agTextColumnFilter" },
        { field: "abs_ship_qty", headerName: "Shipped Qty", filter: "agTextColumnFilter" },
        { field: "diff", headerName: "Difference", filter: "agTextColumnFilter" },
        {
            field: "is_late", headerName: "Is Late", filter: "agTextColumnFilter",
            cellClass: (params: any) => {
                if (params.value == 'Yes') {
                    return ['bg-danger-subtle bg-opacity-75 text-danger'];
                } else if (params.value == 'No') {
                    return ['bg-success-subtle bg-opacity-75 text-success'];
                } else {
                    return [];
                }
            },
        },
        { field: "last_shipped_on", headerName: "Last Shipped On", filter: "agTextColumnFilter" },
        { field: "shipped_partial", headerName: "Shipped Partial", filter: "agTextColumnFilter" },
        { field: "so_cust", headerName: "Customer", filter: "agTextColumnFilter" },
        {
            field: "so_nbr", headerName: "SO #", filter: "agTextColumnFilter",
            cellRenderer: LinkRendererComponent,
            cellRendererParams: {
                onClick: e => this.salesOrderInfoModalService.open(e.rowData.so_nbr),
                isLink: true
            }
        },
        { field: "sod_line", headerName: "Line #", filter: "agTextColumnFilter" },
        { field: "sod_qty_ord", headerName: "Qty Ordered", filter: "agTextColumnFilter" },
    ];

    gridOptions = {
        ...agGridOptions,
        columnDefs: this.columnDefs,
        onGridReady: (params: any) => {
            this.gridApi = params.api;

            let data = this.activatedRoute.snapshot.queryParams['gridParams']
            _decompressFromEncodedURIComponent(data, params);
        },
        onFirstDataRendered: (params) => {
            autoSizeColumns(params)
        },
        onFilterChanged: params => this.updateUrl(params),
        onSortChanged: params => this.updateUrl(params),
    };


    gridApi1: GridApi;

    data1: any[];

    columnDefs1: any = [
        {
            field: "label", headerName: "Customer", filter: "agTextColumnFilter",
            cellRenderer: LinkRendererComponent,
            cellRendererParams: {
                onClick: (e: any) => this.onCustomerChange(e.rowData),
                isLink: true
            },
        },
        { field: "total_shipped_on_time", headerName: "On Time", filter: "agTextColumnFilter" },
        { field: "total_lines", headerName: "Total", filter: "agTextColumnFilter" },
        {
            field: "value", headerName: "OTD %", filter: "agTextColumnFilter", cellRenderer: (e) => e.value?.toFixed(2) + '%',
            cellClass: (params: any) => {
                if (params.data) {
                    if (params.value >= this.goal)
                        return ['bg-success-subtle text-success'];
                    if (params.value < this.goal)
                        return ['bg-danger-subtle text-danger'];
                    return params.value;
                }
                return null
            }
        }
    ];

    gridOptions1 = {
        sideBar: false,
        defaultColDef: {
            ...agGridOptions.defaultColDef,
            floatingFilter: false,
            filter: false
        },
        columnDefs: this.columnDefs1,
        onGridReady: (params: any) => {
            this.gridApi1 = params.api;
        },
        onFirstDataRendered: (params) => {
            params.api.sizeColumnsToFit();
        },
        onFilterChanged: params => this.updateUrl(params),
        onSortChanged: params => this.updateUrl(params),
    };

    updateUrl = (params) => {
        let gridParams = _compressToEncodedURIComponent(params.api);
        this.router.navigate([`.`], {
            relativeTo: this.activatedRoute,
            queryParamsHandling: 'merge',
            queryParams: {
                gridParams
            }
        });
    }

    calcTotalCols = ['total_shipped_on_time', 'total_lines', 'value'];

    totalRow = function (api) {
        let result = [{}];
        // initialize all total columns to zero
        this.calcTotalCols.forEach((params) => {
            result[0][params] = 0
        });
        // calculate all total columns
        this.calcTotalCols.forEach((params) => {
            this.summary.forEach((line) => {
                result[0][params] += line[params];
            });
            if (params == 'value') {
                result[0]['value'] = result[0]['total_lines'] > 0 ? (result[0]['total_shipped_on_time'] / result[0]['total_lines']) * 100 : 0
            }
        });
        api.setGridOption('pinnedBottomRowData', result);
    }


    summary = [];


    get getValue() {
        return ((this.allInfo?.todayInfo?.value - this.allInfo?.yesterdayInfo?.value) / this.allInfo?.yesterdayInfo?.value) * 100
    }

    displayCustomers = 'Show All';
    typeOfView = "Daily"

    otd = 0
    ontime = 0
    allInfo
    goal = 0
    async getData() {
        try {
            this.gridApi?.showLoadingOverlay();
            this.isLoading = true;
            let data: any = await this.reportService.getOtdReportV1(this.dateFrom, this.dateTo, this.displayCustomers, this.typeOfView)
            this.data = data?.details ? data?.details : [];
            this.dataChart = data?.chartData;
            this.summary = data?.summary;
            this.allInfo = data;
            this.goal = data?.goal;

            this.router.navigate(['.'], {
                queryParams: {
                    dateFrom: this.dateFrom,
                    dateTo: this.dateTo,
                    displayCustomers: this.displayCustomers,
                    typeOfView: this.typeOfView
                },
                relativeTo: this.activatedRoute,
                queryParamsHandling: 'merge'
            });
            this.isLoading = false;


            this.average = data?.average || 0

            this.setSummaryFooter()
            this.totalRow(this.gridApi1)

            this.gridApi?.hideOverlay();
        } catch (err) {
            this.isLoading = false;
            this.gridApi?.hideOverlay();
        }

    }

    summaryObject: any = {
        onTime: 0,
        total: 0,
        otd: 0,
    }

    setSummaryFooter() {
        let shippedOnTime = 0;
        let total_lines = 0;
        for (let i = 0; i < this.summary.length; i++) {
            shippedOnTime += parseInt(this.summary[i]['total_shipped_on_time'])
            total_lines += parseInt(this.summary[i]['total_lines'])
        }

        this.summaryObject = {
            otd: (shippedOnTime / total_lines * 100).toFixed(2),
            shippedOnTime: shippedOnTime,
            total_lines: total_lines
        }
    }

    isLoading = false;
    dataChart
    showCustomers = 'Show All';

    dateFrom1 = moment().startOf('week').format('YYYY-MM-DD');
    dateTo1 = moment().endOf('week').format('YYYY-MM-DD');
    dateRange1 = [this.dateFrom1, this.dateTo1];


    onChangeDate1($event) {
        this.dateFrom1 = $event['dateFrom']
        this.dateTo1 = $event['dateTo']
    }

    async getChartData() {
        // this.isLoading = true;
        // let data = await this.reportService.getShippedOrdersChart(this.dateFrom1, this.dateTo1, this.typeOfView, this.showCustomers);
        // this.dataChart = data;
        // this.isLoading = false
    }

}
