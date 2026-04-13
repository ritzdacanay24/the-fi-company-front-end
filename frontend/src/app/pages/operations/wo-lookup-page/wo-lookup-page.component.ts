import { Component } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { SharedModule } from '@app/shared/shared.module';
import { LoadingComponent } from '@app/shared/loading/loading.component';
import { Router, ActivatedRoute } from '@angular/router';
import { WoLookupComponent } from '@app/shared/components/wo-lookup/wo-lookup.component';
import { QadWoSearchComponent } from '@app/shared/components/qad-wo-search/qad-wo-search.component';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, LoadingComponent, WoLookupComponent, QadWoSearchComponent],
  selector: 'app-wo-lookup-page',
  templateUrl: `./wo-lookup-page.component.html`,
  styleUrls: [],
})

export class WoLookupPageComponent {

  constructor(
    public router: Router,
    public activatedRoute: ActivatedRoute,
  ) {

    this.activatedRoute.queryParams.subscribe(params => {
      this.wo_nbr = params['wo_nbr'];
      this.comment = params['comment'];
    })

  }

  comment = null

  isLoadingEmitter($event) {
  }

  hasDataEmitter = false;
  isLoading = false;
  wo_nbr = null;

  async notifyParent($event) {
    this.wo_nbr = $event.wo_nbr;

    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge',
      queryParams: {
        wo_nbr: this.wo_nbr
      }
    });

  }

}
