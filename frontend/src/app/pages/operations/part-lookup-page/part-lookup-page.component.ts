import { Component } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { SharedModule } from '@app/shared/shared.module';
import { LoadingComponent } from '@app/shared/loading/loading.component';
import { Router, ActivatedRoute } from '@angular/router';
import { QadPartSearchComponent } from '@app/shared/components/qad-part-search/qad-part-search.component';
import { PartLookupComponent } from '@app/shared/components/part-lookup/part-lookup.component';

@Component({
    standalone: true,
    imports: [SharedModule, AgGridModule, LoadingComponent, PartLookupComponent, QadPartSearchComponent],
    selector: 'app-part-lookup-page',
    templateUrl: `./part-lookup-page.component.html`,
    styleUrls: [],
})

export class PartLookupPageComponent {

    constructor(
        public router: Router,
        public activatedRoute: ActivatedRoute,
    ) {

        this.activatedRoute.queryParams.subscribe(params => {
            this.partNumber = params['partNumber'];
        })

    }

    isLoadingEmitter($event) {
    }

    hasDataEmitter = false;
    isLoading = false;
    partNumber = null;

    async notifyParent($event) {
        this.partNumber = $event.pt_part;

        this.router.navigate([`.`], {
            relativeTo: this.activatedRoute,
            queryParamsHandling: 'merge',
            queryParams: {
                partNumber: this.partNumber
            }
        });

    }

}
