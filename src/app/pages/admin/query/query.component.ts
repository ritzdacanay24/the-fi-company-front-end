import { Component, OnInit } from '@angular/core';
import { QueryService } from '@app/core/api/query/query.service';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { first } from 'rxjs';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridModule } from 'ag-grid-angular';
import { QuillModule } from 'ngx-quill';

@Component({
    standalone: true,
    imports: [SharedModule, AgGridModule, QuillModule],
    selector: 'app-query',
    templateUrl: './query.component.html',
    styleUrls: []
})
export class QueryComponent implements OnInit {


    quillConfig = {
        toolbar: false,
        spellcheck: false
    }


    //query info
    gridApi: any;
    gridColumnApi: any;

    gridOptions = {
        ...agGridOptions,
        columnDefs: [],
        sideBar: 'filters',
        onGridReady: (params: { api: any; columnApi: any; }) => {
            this.gridApi = params.api;
            this.gridColumnApi = params.columnApi;
        },
        // getRowNodeId: (data) => data.id
    };
    data: any;
    columnDefs: any[];

    //queries
    gridApi1: any;
    gridColumnApi1: any;

    gridOptions1 = {
        ...agGridOptions,
        columnDefs: [],
        sideBar: false,
        onGridReady: (params: { api: any; columnApi: any; }) => {
            this.gridApi1 = params.api;
            this.gridColumnApi1 = params.columnApi;
        },
        onFirstDataRendered: (params) => {
            params.api.sizeColumnsToFit();
        },
        // getRowNodeId: (data) => data.id
    };
    queries: any;
    columnDefs1 = [
        { field: 'tbl', headerName: 'Table Name', filter: 'agMultiColumnFilter' },
        { field: 'description', headerName: 'Description', filter: 'agTextColumnFilter', }
    ];

    constructor(
        private queryService: QueryService
    ) {

        this.mode = 'plain_text';

    }

    ngOnInit(): void {
        this.getQueries();
    }

    text: string = "";

    aceTheme: string;
    mode: string;
    borderColor: string;

    onChange(code) {
        this.text = code;
        //console.log("new code", code);
    }

    setColumnGrid(row) {
        return {
            headerName: row,
            field: row,
            editable: false,
            filter: 'agTextColumnFilter',
        };
    }

    getQueries() {
        this.queryService.getQuery().pipe(first()).subscribe(data => {
            this.queries = data.result;
        }, error => { });
    }

    loading: boolean;
    submit() {
        this.loading = true;

        this.queryService.getData(this.text.replace(/(<([^>]+)>)/gi, "")).pipe(first()).subscribe(data => {
            this.loading = false;
            this.data = data;

            var customColumns = [];

            for (const [key] of Object.entries(data[0])) {
                customColumns.push(this.setColumnGrid(key));
            }
            this.columnDefs = customColumns;

        }, error => { this.loading = false; });
    }
}
