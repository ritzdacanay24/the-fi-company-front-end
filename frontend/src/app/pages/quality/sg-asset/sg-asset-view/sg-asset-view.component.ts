import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { SgAssetService } from '@app/core/api/quality/sg-asset.service';
import { NAVIGATION_ROUTE } from '../sg-asset-constant';
import moment from 'moment';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-sg-asset-view',
  templateUrl: './sg-asset-view.component.html',
  styleUrls: ['./sg-asset-view.component.scss']
})
export class SgAssetViewComponent implements OnInit {
  
  constructor(
    public api: SgAssetService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  data: any = null;
  id: string | null = null;
  isLoading = true;

  async ngOnInit(): Promise<void> {
    this.activatedRoute.params.subscribe(async (params) => {
      this.id = params['id'];
      if (this.id) {
        await this.getData();
      } else {
        this.isLoading = false;
      }
    });
  }

  async getData(): Promise<void> {
    try {
      this.isLoading = true;
      this.data = await this.api.getById(Number(this.id));
      this.processRawData();
    } catch (error) {
      console.error('Error loading SG asset data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  processRawData(): void {
    if (this.data) {
      // Clean up data - remove null, undefined, and 'N/A' values
      this.data = this.cleanNAValues(this.data);
    }
  }

  cleanNAValues(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj === 'N/A' || obj === 'null' || obj === null || obj === undefined ? '' : obj;
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === 'N/A' || value === 'null' || value === null || value === undefined) {
        cleaned[key] = '';
      } else if (typeof value === 'object') {
        cleaned[key] = this.cleanNAValues(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  // Helper methods for display
  safeDisplay(value: any, type: 'text' | 'date' = 'text'): string {
    if (!value || value === 'N/A' || value === 'null') {
      return 'Not specified';
    }
    
    if (type === 'date' && value) {
      try {
        return moment(value).format('MMM DD, YYYY h:mm A');
      } catch {
        return value;
      }
    }
    
    return value.toString();
  }

  getSgAssetDisplay(): string {
    if (this.data?.generated_SG_asset) {
      return this.data.generated_SG_asset;
    }
    return 'Not Generated';
  }

  isSgAssetGenerated(): boolean {
    return !!(this.data?.generated_SG_asset && this.data.generated_SG_asset !== 'N/A');
  }

  getStatus(): string {
    return this.data?.active ? 'Active' : 'Inactive';
  }

  getStatusBadgeClass(): string {
    return this.data?.active ? 'bg-success' : 'bg-secondary';
  }

  getTimeSinceCreated(): string {
    if (!this.data?.timeStamp) return 'Unknown';
    return moment(this.data.timeStamp).fromNow();
  }

  // Action methods
  copySgAsset(): void {
    if (this.data?.generated_SG_asset) {
      navigator.clipboard.writeText(this.data.generated_SG_asset).then(() => {
        // You could add a toast notification here
        console.log('SG Asset number copied to clipboard');
      });
    }
  }

  printRecord(): void {
    window.print();
  }

  shareRecord(): void {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `SG Asset Record #${this.id}`,
        text: `SG Asset: ${this.getSgAssetDisplay()}`,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        console.log('Link copied to clipboard');
      });
    }
  }

  onEdit(): void {
    this.router.navigate([NAVIGATION_ROUTE.EDIT], {
      queryParams: { id: this.id },
      queryParamsHandling: 'merge'
    });
  }

  onCancel(): void {
    this.router.navigate([NAVIGATION_ROUTE.LIST]);
  }

  goBack = this.onCancel;
}