import { Component, OnInit } from '@angular/core';
import moment from 'moment';
import { ReportService } from '@app/core/api/operations/report/report.service';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridModule } from 'ag-grid-angular';
import { AG_THEME, TABLE_GRID_CONFIG, agGridOptions } from '@app/shared/config/ag-grid.config';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';
import { currencyFormatter } from 'src/assets/js/util';
import { LogisiticsDailyReportService } from '@app/core/api/operations/logisitics/daily-report.service';

@Component({
    standalone: true,
    imports: [SharedModule, AgGridModule],
    selector: 'app-daily-report',
    templateUrl: './daily-report.component.html',
    styleUrls: []
})
export class DailyReportComponent implements OnInit {

    data: any;
    sub: any;

    today = moment().format('YYYY-MM-DD')
    todayAsOf = moment().format('YYYY-MM-DD HH:mm:ss')

    theme = AG_THEME;

    gridApi: any;
    gridColumnApi: any;

    fullscreen = false;

    tableConfig = {
        ...TABLE_GRID_CONFIG,
        setFullscreen: true,
        refreshData: this.getData.bind(this),
    };


    columnDefs: any = [
        { field: "createdDate", headerName: "Recorded Date/Time", filter: "agMultiColumnFilter" },
        { field: "data.shipping_open_overdue_and_due_today_value", headerName: "Lines Shipped", filter: "agMultiColumnFilter", valueFormatter: currencyFormatter },
        { field: "data.shipping_total_shipped_value", headerName: "Lines Shipped Value", filter: "agMultiColumnFilter", valueFormatter: currencyFormatter },
        { field: "data.on_time_delivery_today_percent", headerName: "Shipping OTD %", filter: "agMultiColumnFilter" },
        { field: "data.inventory_value", headerName: "Inventory Value", filter: "agMultiColumnFilter", valueFormatter: currencyFormatter },
        { field: "data.finished_goods_inventory_value", headerName: "FG Inventory $", filter: "agMultiColumnFilter", valueFormatter: currencyFormatter },
        { field: "data.jiaxing_total_ext_cost", headerName: "JIAXING Inventory $", filter: "agMultiColumnFilter", valueFormatter: currencyFormatter },
        { field: "data.transit_total_ext_cost", headerName: "TRANSIT Inventory $	", filter: "agMultiColumnFilter", valueFormatter: currencyFormatter },
        { field: "data.intgrtd_total_ext_cost", headerName: "INTGRTD Inventory $	", filter: "agMultiColumnFilter", valueFormatter: currencyFormatter },
        { field: "data.reject_total_ext_cost", headerName: "REJECT Inventory $	", filter: "agMultiColumnFilter", valueFormatter: currencyFormatter },
        { field: "data.wip", headerName: "WIP $	", filter: "agMultiColumnFilter", valueFormatter: currencyFormatter },
        { field: "data.production.production_routing_20.due.due_percent", headerName: "Production OTD %", filter: "agMultiColumnFilter" },
    ];

    gridOptions = {
        ...agGridOptions,
        columnDefs: this.columnDefs,
        onGridReady: this.onGridReady.bind(this),
        pagination: false,
    };
    totalValue: number = 0;

    onGridReady(params: any) {
        this.gridApi = params.api;
        this.gridColumnApi = params.columnApi;
        this.tableConfig.onGridReady(params);
    }

    constructor(
        private api: ReportService,
        private sweetAlert: SweetAlert,
        private logisiticsDailyReportService: LogisiticsDailyReportService,
    ) { }

    ngOnInit(): void {
        this.getData()
    }

    isLoading = false;
    logistics
    async getData() {
        try {
            this.isLoading = true;
            this.data = await this.api.getDailyReport();
            this.isLoading = false;
            this.logistics = await this.logisiticsDailyReportService.getDailyReport()

        } catch (err) {
            this.isLoading = false;
        }
    }

}