import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { ForkliftService } from '@app/core/api/operations/forklift/forklift.service';
import { NAVIGATION_ROUTE } from '../forklift-constant';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-forklift-list',
  templateUrl: './forklift-list.component.html',
})
export class ForkliftListComponent implements OnInit {
  constructor(
    private readonly api: ForkliftService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  title = 'Forklift Management';
  selectedViewType = 'Active';
  data: any[] = [];
  isLoading = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.selectedViewType = params['selectedViewType'] || this.selectedViewType;
      this.getData();
    });
  }

  async getData(): Promise<void> {
    this.isLoading = true;
    try {
      this.data = await this.api.getList(this.selectedViewType);
    } finally {
      this.isLoading = false;
    }
  }

  onCreate(): void {
    this.router.navigate([NAVIGATION_ROUTE.CREATE], { queryParamsHandling: 'merge' });
  }

  onEdit(id: number): void {
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: 'merge',
      queryParams: { id },
    });
  }
}
