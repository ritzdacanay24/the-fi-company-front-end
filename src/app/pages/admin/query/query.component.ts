import { Component, HostListener, OnInit } from '@angular/core';
import { QueryService } from '@app/core/api/query/query.service';
import { agGridOptions } from '@app/shared/config/ag-grid.config';
import { first } from 'rxjs';
import { SharedModule } from '@app/shared/shared.module';
import { AgGridModule } from 'ag-grid-angular';

import { AceModule } from 'ngx-ace-wrapper';
import 'brace';
import 'brace/mode/plain_text';
import 'brace/theme/merbivore_soft';
import 'brace/theme/tomorrow';
import { RootReducerState } from '@app/store';
import { getLayoutMode } from '@app/store/layouts/layout-selector';
import { Store } from '@ngrx/store';
import { GridApi, GridOptions } from 'ag-grid-community';

@Component({
    standalone: true,
    imports: [SharedModule, AgGridModule, AceModule],
    selector: 'app-query',
    templateUrl: './query.component.html',
    styleUrls: []
})
export class QueryComponent implements OnInit {

    aceConfig: any = {
        maxLines: 21,
        minLines: 21,
        printMargin: false,
        autoScrollEditorIntoView: true,
        showInvisibles: false,
        tabSize: 3,
        newLineMode: "windows",
        fontSize: 16,
        useSoftTabs: true
    };

    value

    //query info
    gridApi: GridApi;

    gridOptions: GridOptions = {
        ...agGridOptions,
        columnDefs: [],
        sideBar: 'filters',
        onGridReady: (params) => {
            this.gridApi = params.api;
        },
        // getRowId: (data) => data.id
    };
    data!: any[];
    columnDefs: any[];

    //queries
    gridApi1: any;

    gridOptions1: GridOptions = {
        ...agGridOptions,
        columnDefs: [],
        sideBar: false,
        onGridReady: (params) => {
            this.gridApi1 = params.api;
        },
        onFirstDataRendered: (params) => {
            params.api.sizeColumnsToFit();
        },
        // getRowId: (data) => data.id
    };
    queries: any;
    columnDefs1 = [
        { field: 'tbl', headerName: 'Table Name', filter: 'agMultiColumnFilter' },
        { field: 'description', headerName: 'Description', filter: 'agTextColumnFilter', }
    ];

    constructor(
        private queryService: QueryService,
        private store: Store<RootReducerState>,
    ) {

        this.mode = 'plain_text';

        this.store.select(getLayoutMode).subscribe((mode) => {
            this.aceTheme = mode == 'dark' ? 'merbivore_soft' : 'tomorrow';;
        })
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

    @HostListener('window:keydown', ['$event'])
    onKeyPress($event: KeyboardEvent) {
        if ($event.ctrlKey && $event.key === 'Enter') {
            this.submit()
        }
    }

    keyUpFunction(event) {
        if (event.ctrlKey && event.key === 'Enter') {
            this.submit()
        } else if (event.key === 'Enter') {
            event.preventDefault();
        }
    }

    loading: boolean;
    submit() {
        this.loading = true;
        var lines = this.text.split(/\r\n/);
        for (var j = 0; j < lines.length; j++) {
            lines[j] = lines[j] + ' '
        }

        let e = lines.join("");

        this.queryService.getData(e.replace(/(<([^>]+)>)/gi, "")).pipe(first()).subscribe(data => {
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
