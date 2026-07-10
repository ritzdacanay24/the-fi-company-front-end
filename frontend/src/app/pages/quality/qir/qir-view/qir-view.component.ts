import { Component, Input, OnInit } from '@angular/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { Router, ActivatedRoute } from '@angular/router';
import { NAVIGATION_ROUTE } from '../qir-constant';
import { QirService } from '@app/core/api/quality/qir.service';
import { FeatureType } from '@app/shared/enums/feature.enum';

@Component({
  standalone: true,
  imports: [
    SharedModule
  ],
  selector: 'app-qir-view',
  templateUrl: './qir-view.component.html'
})
export class QirViewComponent implements OnInit {
  readonly FeatureType = FeatureType;

  constructor(
    public router: Router,
    public activatedRoute: ActivatedRoute,
    public api: QirService,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.id = params['id'];
      if (this.id) this.getData();
    });
  }

  title = 'View Quality Incident Report';

  icon = 'mdi-eye';

  id = null;

  data: any;

  isLoading = false;

  get isQirClosed() {
    return this.data && this.data.status !== 'Open';
  }

  getData = async () => {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(this.id);
    } catch (err) {
      console.error('Error loading QIR data:', err);
      alert('Error loading QIR data. Please try again.');
    } finally {
      this.isLoading = false;
    }
  };

  onEdit() {
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: 'merge',
      queryParams: { id: this.id }
    });
  }

  onCancel() {
    this.router.navigate([NAVIGATION_ROUTE.LIST], { queryParamsHandling: 'merge' });
  }

  onDownloadAsPdf() {
    // TODO: Implement PDF export functionality for view mode
    console.log('PDF export for view mode not yet implemented');
    alert('PDF export functionality will be implemented soon.');
  }

  openQirResponse() {
    // For now, navigate to edit mode for QIR Response functionality
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParamsHandling: 'merge',
      queryParams: { id: this.id }
    });
  }

  goBack() {
    window.history.back();
  }

  getDurationBetweenDates(startDate: string, endDate: string): string {
    if (!startDate || !endDate) return 'N/A';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${diffHours > 0 ? `${diffHours} hour${diffHours !== 1 ? 's' : ''}` : ''}`;
    } else if (diffHours > 0) {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${diffMinutes > 0 ? `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}` : ''}`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    }
  }

  getCurrentDate(): Date {
    return new Date();
  }

  checkFieldForTruth(field: any, expectedValue: string): boolean {
    if (!field) return false;
    return field.toString().toLowerCase().includes(expectedValue.toLowerCase());
  }
}
