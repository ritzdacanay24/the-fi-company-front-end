import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '@app/shared/shared.module';
import { TableSettingsService } from '@app/core/api/table-settings/table-settings.service';
import { autoSizeColumnsApi } from 'src/assets/js/util';
import { GridSettingsModalService } from './grid-settings-modal/grid-settings-modal.component';
import { GridSettingsEditModalService } from './grid-settings-edit-modal/grid-settings-edit-modal.component';
import { AuthenticationService } from '@app/core/services/auth.service';
import { FullTextSearchPipe } from '../pipes/full-text-search.pipe';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        TranslateModule,
        ReactiveFormsModule,
        NgSelectModule,
        FullTextSearchPipe
    ],
    selector: 'app-grid-settings',
    templateUrl: `./grid-settings.component.html`,
})
export class GridSettingsComponent implements OnInit {

    constructor(
        private tableSettingsService: TableSettingsService,
        private gridSettingsModalService: GridSettingsModalService,
        private gridSettingsEditModalService: GridSettingsEditModalService,
        private authenticationService: AuthenticationService
    ) { }

    ngOnInit() {
        this.getOtherGridByUsers()
    }

    query

    @Output() emitGrid = new EventEmitter<string>();
    otherGrids = []
    currentUserGrids = [];
    myView = false;
    currentView;
    getOtherGridByUsers = async () => {
        this.myView = false;
        let data = await this.tableSettingsService.getTableByUserId({ pageId: this.pageId, userId: this.authenticationService.currentUserValue.id })

        let current: any
        for (let i = 0; i < data.data.length; i++) {
            let row = data.data[i];
            if (row.userId != this.authenticationService.currentUserValue.id) {
                this.otherGrids.push(row)
            } else {
                this.currentUserGrids.push(row)
            }

            if (this.value && this.value == row.id) {
                current = row;
            } else if (row.table_default && !this.value) {
                this.myView = true;
                current = row;
            }
        }

        if (current) {
            this.value = current.id
            this.currentView = current;

            this.gridApi.applyColumnState({
                state: JSON.parse(current.data),
                applyOrder: true,
            });
        }

    }

    openUp() {

        setTimeout(() => {
            let el = document.getElementById('test-' + this.value);
            if (el)
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 0);
    }

    @Input() data = [];
    @Input() value;
    @Input() saveDefault = async (row) => {
        let e = row.table_default == 1 ? 0 : 1;

        for (let i = 0; i < this.currentUserGrids.length; i++) {

            //reset
            this.currentUserGrids[i].table_default = 0;

            if (row.id == this.currentUserGrids[i].id) this.currentUserGrids[i].table_default = e

            await this.tableSettingsService.saveTableSettings(this.currentUserGrids[i].id, this.currentUserGrids[i])
        }
    };

    @Input() pageId = null;

    @Input() gridApi
    @Input() gridColumnApi

    ngOnChanges(changes: SimpleChanges) {
        // if (changes['data']) {
        //     this.data = changes['data'].currentValue;
        // }

        if (changes['pageId']) {
            this.pageId = changes['pageId'].currentValue;
        }
        // if (changes['gridApi']) {
        //     this.gridApi = changes['gridApi'].currentValue;
        // }
        // if (changes['gridColumnApi']) {
        //     this.gridColumnApi = changes['gridColumnApi'].currentValue;
        // }
    }

    selectTable(row) {
        this.myView = true;
        this.gridApi?.showLoadingOverlay()
        setTimeout(() => {
            this.gridApi.applyColumnState({
                state: JSON.parse(row.data),
                applyOrder: true,
            });
            this.gridApi?.hideOverlay()
        }, 500);
        this.value = row.id;
        this.currentView = row;
        this.emitGrid.emit(this.value);

    }

    get isIdFound() {
        let d: any = this.currentUserGrids?.filter((pilot) => {
            return pilot.id === this.value;
        })
        return d?.length ? true : false;
    }

    async update() {
        const savedState = this.gridColumnApi.getColumnState();
        let saveData = {
            data: JSON.stringify(savedState)
        }

        this.currentUserGrids = this.currentUserGrids.map((pilot) => {
            if (this.value == pilot.id) pilot.data = JSON.stringify(savedState);
            return pilot
        })

        await this.tableSettingsService.saveTableSettings(this.value, saveData)

    }

    updateToDefault() {
        this.myView = false;
        this.gridApi?.showLoadingOverlay()
        this.value = "";
        this.currentView = null;

        setTimeout(() => {
            this.gridColumnApi.resetColumnState();
            autoSizeColumnsApi(this.gridApi)
            this.gridApi?.hideOverlay()
        }, 500);
        this.emitGrid.emit(this.value);
    }

    createNewView() {
        const savedState = this.gridColumnApi.getColumnState();
        let inst = this.gridSettingsModalService.open(savedState, this.pageId);
        inst.result.then((result) => {
            this.value = result.id;
            this.currentView = result;
            this.currentUserGrids.push(result)
        }, () => { });
    }

    viewAll() {
        let inst = this.gridSettingsEditModalService.open(this.pageId);
        inst.result.then((result) => {
            this.currentUserGrids = result;
        }, () => { });

    }

}
