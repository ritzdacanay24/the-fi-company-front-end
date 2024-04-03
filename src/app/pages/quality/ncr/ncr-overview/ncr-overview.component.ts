import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { NcrService } from '@app/core/api/quality/ncr-service';
import { NcrMainComponent } from './ncr-main/ncr-main.component';
import { NcrCorrectiveAcrionComponent } from './ncr-corrective-action/ncr-corrective-action.component';
import { NcrVerificationComponent } from './ncr-verification/ncr-verification.component';
import { NAVIGATION_ROUTE } from '../ncr-constant';
import { NcrAttachmentsListComponent } from './ncr-attachments-list/ncr-attachments-list.component';

@Component({
  standalone: true,
  imports: [
    SharedModule,
    NgbNavModule,
    NcrMainComponent,
    NcrCorrectiveAcrionComponent,
    NcrVerificationComponent,
    NcrAttachmentsListComponent
  ],
  selector: 'app-ncr-overview',
  templateUrl: './ncr-overview.component.html',
  styleUrls: []
})
export class NcrOverviewComponent implements OnInit {

  constructor(
    public activatedRoute: ActivatedRoute,
    public router: Router,
    public api: NcrService
  ) {
  }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.goBackUrl = params['goBackUrl'];
      this.id = params['id'];
      this.active = Number(params['active']) || this.active;
    });
    this.getData();
  }

  active = 1;

  @Input() id = null;

  selectedViewType = 'NCR Overview';

  goBackUrl = null;

  data = null;

  title = "NCR Overview";

  onNavChange($event) {
    this.router.navigate(['.'], {
      queryParams: {
        active: $event?.nextId
      },
      relativeTo: this.activatedRoute
      , queryParamsHandling: 'merge'
    });
  }

  @Input() goBack: Function = () => {
    if (this.goBackUrl) {
      this.router.navigate([this.goBackUrl], { queryParamsHandling: 'merge', queryParams: { active: null } });
    } else {
      this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge', queryParams: { active: null } });
    }
  }

  getData = async () => {
    this.data = await this.api.getById(this.id)
  }

  onSelect(e) {
    this.router.navigate(['/quality/ncr/overview'], { queryParamsHandling: 'merge', queryParams: { active: e } });
  }

  onCancel() {
    this.goBack()
  }
}
