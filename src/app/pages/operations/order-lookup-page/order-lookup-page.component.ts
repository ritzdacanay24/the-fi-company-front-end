import { Component } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';
import { SharedModule } from '@app/shared/shared.module';
import { LoadingComponent } from '@app/shared/loading/loading.component';
import { SoSearchComponent } from '@app/shared/components/so-search/so-search.component';
import { OrderLookupComponent } from '@app/shared/components/order-lookup/order-lookup.component';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, LoadingComponent, OrderLookupComponent, SoSearchComponent],
  selector: 'app-order-lookup-page',
  templateUrl: `./order-lookup-page.component.html`,
  styleUrls: [],
})

export class OrderLookupPageComponent {

  constructor(
    public router: Router,
    public activatedRoute: ActivatedRoute,
  ) {

    this.activatedRoute.queryParams.subscribe(params => {
      this.salesOrderNumber = params['salesOrderNumber'];
    })

  }

  isLoadingEmitter($event){
  }

  hasDataEmitter = false;
  isLoading = false;
  salesOrderNumber = null;

  async notifyParent($event) {
    this.salesOrderNumber = $event.sod_nbr;


    this.router.navigate([`.`], {
      relativeTo: this.activatedRoute,
      queryParamsHandling: 'merge',
      queryParams: {
        salesOrderNumber: this.salesOrderNumber
      }
    });

  }

}
