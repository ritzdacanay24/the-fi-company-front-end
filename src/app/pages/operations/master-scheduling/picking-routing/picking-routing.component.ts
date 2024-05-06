import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { MasterProductionComponent } from '../master-production/master-production.component';
import { TableSettingsService } from '@app/core/api/table-settings/table-settings.service';
import { MasterSchedulingService } from '@app/core/api/operations/master-scheduling/master-scheduling.service';
import { GridSettingsComponent } from '@app/shared/grid-settings/grid-settings.component';
import { GridFiltersComponent } from '@app/shared/grid-filters/grid-filters.component';

@Component({
    standalone: true,
    imports: [
        SharedModule,
        MasterProductionComponent,
        GridSettingsComponent,
        GridFiltersComponent
    ],
    selector: 'app-picking-routing',
    templateUrl: './picking-routing.component.html',
    styleUrls: []
})
export class PickingRoutingComponent implements OnInit {

    constructor(
        public route: ActivatedRoute,
        public router: Router,
        public activatedRoute: ActivatedRoute,
        private tableSettingsService: TableSettingsService,
        private api: MasterSchedulingService,
    ) {
    }

    ngOnInit(): void {
        this.activatedRoute.queryParams.subscribe(params => {
            this.id = params['id'];
            this.routing = params['routing'] || this.routing;
        })
        this.getData()
        this.getTableSettings();
    }


    statusCount = {
        pastDue: 0,
        todayDue: 0,
        futureDue: 0
    }

    private calculateStatus() {
        let statusCount = {
            pastDue: 0,
            todayDue: 0,
            futureDue: 0
        };

        for (let i = 0; i < this.data.length; i++) {
            let status = (this.data[i].status_info.status_text).trim();
            if (status == 'Past Due') {
                statusCount.pastDue++;
            } else if (status == 'Due Today') {
                statusCount.todayDue++;
            } else {
                statusCount.futureDue++;
            }
        }
        return statusCount;
    }


    query

    routing = 10;

    id = null;

    pageId = '/master-scheduling/picking'

    title: string = 'Picking Routing';

    icon = 'mdi-account-group';

    data

    defaultFilters = [
        {
            id: -1,
            name: "Future Orders",
            data: {
                "status_info.status_text": {
                    "values": [
                        "Future Order"
                    ],
                    "filterType": "set"
                }
            }
        },
        {
            id: -2,
            name: "Past Due Orders",
            data: {
                "status_info.status_text": {
                    "values": [
                        "Past Due"
                    ],
                    "filterType": "set"
                }
            }
        }
    ]

    gridApi: any;

    setGridApi($event) {
        this.gridApi = $event.api;
    }

    tableList: any;
    currentTableView: any
    async getTableSettings() {
        this.tableList = await this.tableSettingsService.getTableByUserId({ pageId: this.pageId });
        this.gridApi.applyColumnState({
            state: this.tableList.currentView.data,
            applyOrder: true,
        });
    }

    getData = async () => {
        try {
            this.router.navigate([`.`], {
                relativeTo: this.activatedRoute,
                queryParamsHandling: 'merge',
                queryParams: {
                    routing: this.routing
                }
            });
            this.gridApi?.showLoadingOverlay()
            this.data = await this.api.getMasterProduction(this.routing);
            this.statusCount = this.calculateStatus();
            this.gridApi?.hideOverlay();
        } catch (err) {
            this.gridApi?.hideOverlay()
        }
    }


}

