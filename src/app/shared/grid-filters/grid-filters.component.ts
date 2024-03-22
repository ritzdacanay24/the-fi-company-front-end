import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '@app/shared/shared.module';
import { autoSizeColumnsApi } from 'src/assets/js/util';
import { AuthenticationService } from '@app/core/services/auth.service';
import { TableFilterSettingsService } from '@app/core/api/table-filter-settings/table-filter-settings.component';
import { GridFiltersModalService } from './grid-filters-modal/grid-filters-modal.component';
import { GridFiltersEditModalService } from './grid-filters-edit-modal/grid-filters-edit-modal.component';
import { ColumnApi, GridApi } from 'ag-grid-community';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        TranslateModule,
        ReactiveFormsModule,
        NgSelectModule
    ],
    selector: 'app-grid-filters',
    templateUrl: `./grid-filters.component.html`,
})
export class GridFiltersComponent implements OnInit {

    constructor(
        private tableFilterSettingsService: TableFilterSettingsService,
        private gridFiltersModalService: GridFiltersModalService,
        private gridFiltersEditModalService: GridFiltersEditModalService,
        private authenticationService: AuthenticationService
    ) { }

    ngOnInit() {
        this.getOtherGridByUsers()
    }

    checkFiltersApplied(data) {
        return Object.keys(JSON.parse(data)).length
    }

    @Output() emitFilter = new EventEmitter<string>();
    currentUserGrids = []
    otherGrids = []
    current: any
    @Input() data = [];
    @Input() afterData = [];
    @Input() defaultFilters = [];

    getOtherGridByUsers = async () => {
        this.currentUserGrids = []
        this.otherGrids = []

        this.data = [];
        this.afterData = [];
        this.defaultFilters = [];

        this.afterData = await this.tableFilterSettingsService.find({ pageId: this.pageId, tf_active: '1', userId: this.authenticationService.currentUserValue.id })
        this.current = ""
        for (let i = 0; i < this.afterData.length; i++) {
            let row = this.afterData[i];
            this.currentUserGrids.push(row)


            if (this.value && this.value == row.id) {
                this.current = row;
            } else if (row.table_default && !this.value) {
                this.current = row;
            }
        }


    }

    async openUp() {
        await this.getOtherGridByUsers()
        setTimeout(() => {
            let el = document.getElementById('test-' + this.value);
            if (el)
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 0);
    }

    setFilter() {
        for (let i = 0; i < this.afterData.length; i++) {
            let row = this.afterData[i];
            if (row.table_default && !this.value) {
                this.current = row;
            }

            if (this.value && this.value == row.id) {
                this.current = row;

            }
        }

        if (this.current) {
            this.value = this.current?.id
            this.gridApi.setFilterModel(JSON.parse(this.current.data))

        }
    }



    @Input() value;
    @Input() dataRenderered;
    @Input() saveDefault = async (row) => {
        let e = row.table_default == 1 ? 0 : 1;

        for (let i = 0; i < this.currentUserGrids.length; i++) {

            //reset
            this.currentUserGrids[i].table_default = 0;

            if (row.id == this.currentUserGrids[i].id) this.currentUserGrids[i].table_default = e

            await this.tableFilterSettingsService.saveTableSettings(this.currentUserGrids[i].id, this.currentUserGrids[i])
        }

    };

    @Input() pageId = null;

    @Input() gridApi: GridApi;
    @Input() gridColumnApi: ColumnApi

    ngOnChanges(changes: SimpleChanges) {
        if (changes['pageId']) {
            this.pageId = changes['pageId'].currentValue;
        }
        if (changes['gridApi']) {
            this.gridApi = changes['gridApi'].currentValue;
        }
        if (changes['gridColumnApi']) {
            this.gridColumnApi = changes['gridColumnApi'].currentValue;
        }
        if (changes['dataRenderered']?.currentValue) {
            this.setFilter()
        }


    }

    clearFilters() {
        this.value = null;
        this.gridApi.setFilterModel(null);
        this.gridApi.onFilterChanged();
        this.emitFilter.emit(this.value);
    }

    isJsonString(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    selectTable(row) {

        let e = this.isJsonString(row.data) ? JSON.parse(row.data) : row.data;
        try {
            this.gridApi.setFilterModel(e)
            this.value = row.id;
            //this.emitFilter.emit(this.value);

        } catch (err) { }
    }

    get isIdFound() {
        let d: any = this.currentUserGrids?.filter((pilot) => {
            return pilot.id === this.value;
        })
        return d?.length ? true : false;
    }

    async update() {
        const savedState = this.gridApi.getFilterModel();

        let saveData = {
            data: JSON.stringify(savedState)
        }

        this.currentUserGrids = this.currentUserGrids.map((pilot) => {
            if (this.value == pilot.id) pilot.data = JSON.stringify(savedState);
            return pilot
        })

        await this.tableFilterSettingsService.saveTableSettings(this.value, saveData)

    }

    updateToDefault() {
        this.gridApi?.showLoadingOverlay()
        this.value = null;

        setTimeout(() => {
            this.gridColumnApi.resetColumnState();
            autoSizeColumnsApi(this.gridApi)
            this.gridApi?.hideOverlay()
        }, 500);
        this.emitFilter.emit(this.value);
    }

    createNewView() {
        const savedState = this.gridApi.getFilterModel();
        let inst = this.gridFiltersModalService.open(savedState, this.pageId);
        inst.result.then((result) => {
            this.value = result.id;
            this.currentUserGrids.push(result)
        }, () => { });
    }

    viewAll() {
        let inst = this.gridFiltersEditModalService.open(this.pageId);
        inst.result.then((result) => {
            console.log(result)
            this.currentUserGrids = result;
        }, () => { });

    }

}
