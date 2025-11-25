import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { PhysicalInventoryDisplayService } from './services/physical-inventory-display.service';
import { PhyscialInventoryService } from '@app/core/api/operations/physcial-inventory/physcial-inventory.service';
import { InventoryChartsComponent } from './components/inventory-charts/inventory-charts.component';

@Component({
  selector: 'app-physical-inventory-display',
  standalone: true,
  imports: [CommonModule, InventoryChartsComponent],
  templateUrl: './physical-inventory-display.component.html',
  styleUrls: ['./physical-inventory-display.component.scss']
})
export class PhysicalInventoryDisplayComponent implements OnInit, OnDestroy {
  
  // View mode
  viewMode: 'stats' | 'charts' = 'stats';
  
  // Stats data
  stats = {
    totalTags: 0,
    completedFirstCounts: 0,
    completedSecondCounts: 0,
    completedThirdCounts: 0,
    firstCountVariance: 0,
    secondCountVariance: 0,
    outstandingFirstCounts: 0,
    outstandingSecondCounts: 0,
    postedTags: 0,
    unpostedTags: 0,
    bulkTagsWithQty: 0,
    totalValue: 0,
    varianceValue: 0
  };

  // Progress percentages
  progress = {
    firstCount: 0,
    secondCount: 0,
    thirdCount: 0,
    posted: 0
  };

  // Loading state
  isLoading = false;
  lastUpdated: Date | null = null;

  // Auto-refresh
  private refreshSubscription?: Subscription;
  refreshInterval = 30000; // 30 seconds
  refreshCountdown = '';

  // Display settings
  currentTheme: 'light' | 'dark' = 'dark';
  zoomLevel = 100;

  constructor(
    private inventoryService: PhyscialInventoryService,
    private displayService: PhysicalInventoryDisplayService
  ) {}

  ngOnInit(): void {
    // Load initial data
    this.loadInventoryData();

    // Start auto-refresh
    this.startAutoRefresh();

    // Load display settings from service
    this.loadDisplaySettings();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  async loadInventoryData(): Promise<void> {
    this.isLoading = true;
    try {
      const data = await this.inventoryService.getTags();
      this.calculateStats(data);
      this.lastUpdated = new Date();
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  calculateStats(data: any[]): void {
    // Reset stats
    this.stats = {
      totalTags: data.length,
      completedFirstCounts: 0,
      completedSecondCounts: 0,
      completedThirdCounts: 0,
      firstCountVariance: 0,
      secondCountVariance: 0,
      outstandingFirstCounts: 0,
      outstandingSecondCounts: 0,
      postedTags: 0,
      unpostedTags: 0,
      bulkTagsWithQty: 0,
      totalValue: 0,
      varianceValue: 0
    };

    // Calculate stats
    data.forEach(tag => {
      // First count stats
      if (tag.tag_cnt_dt) {
        this.stats.completedFirstCounts++;
        if (tag.TAG_CNT_QTY !== tag.LD_QTY_OH) {
          this.stats.firstCountVariance++;
        }
      } else {
        this.stats.outstandingFirstCounts++;
      }

      // Second count stats
      if (tag.tag_rcnt_dt) {
        this.stats.completedSecondCounts++;
        if (tag.TAG_RCNT_QTY !== tag.LD_QTY_OH) {
          this.stats.secondCountVariance++;
        }
      }

      // Third count stats
      if (tag.thirdCountPrintTag) {
        this.stats.completedThirdCounts++;
      }

      // Posted/Unposted
      if (tag.tag_posted == 1) {
        this.stats.postedTags++;
      } else {
        this.stats.unpostedTags++;
      }

      // Bulk tags with qty
      if (tag.tag_type === 'B' && tag.LD_QTY_OH > 0) {
        this.stats.bulkTagsWithQty++;
      }

      // Calculate values
      const unitCost = parseFloat(tag.UNIT_COST) || 0;
      const qtyOnHand = parseFloat(tag.LD_QTY_OH) || 0;
      this.stats.totalValue += unitCost * qtyOnHand;

      // Calculate variance value (COV)
      if (tag.COV) {
        this.stats.varianceValue += parseFloat(tag.COV) || 0;
      }
    });

    // Calculate progress percentages
    this.progress.firstCount = this.stats.totalTags > 0 
      ? Math.round((this.stats.completedFirstCounts / this.stats.totalTags) * 100) 
      : 0;

    this.progress.secondCount = this.stats.firstCountVariance > 0
      ? Math.round((this.stats.completedSecondCounts / this.stats.firstCountVariance) * 100)
      : 100;

    this.progress.thirdCount = this.stats.secondCountVariance > 0
      ? Math.round((this.stats.completedThirdCounts / this.stats.secondCountVariance) * 100)
      : 100;

    this.progress.posted = this.stats.totalTags > 0
      ? Math.round((this.stats.postedTags / this.stats.totalTags) * 100)
      : 0;

    // Update the service with stats for charts component
    this.displayService.updateInventoryStats({
      totalTags: this.stats.totalTags,
      scanned: this.stats.completedFirstCounts,
      notScanned: this.stats.outstandingFirstCounts,
      percentComplete: this.progress.firstCount,
      lastUpdate: new Date(),
      completedFirstCounts: this.stats.completedFirstCounts,
      completedSecondCounts: this.stats.completedSecondCounts,
      completedThirdCounts: this.stats.completedThirdCounts,
      firstCountVariance: this.stats.firstCountVariance,
      secondCountVariance: this.stats.secondCountVariance,
      postedTags: this.stats.postedTags,
      unpostedTags: this.stats.unpostedTags,
      bulkTagsWithQty: this.stats.bulkTagsWithQty,
      totalValue: this.stats.totalValue,
      varianceValue: this.stats.varianceValue
    });
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh();
    
    if (this.refreshInterval > 0) {
      // Start countdown
      let countdown = this.refreshInterval / 1000;
      const countdownInterval = setInterval(() => {
        countdown--;
        this.refreshCountdown = this.formatCountdown(countdown);
        if (countdown <= 0) {
          countdown = this.refreshInterval / 1000;
        }
      }, 1000);

      // Start refresh
      this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
        this.loadInventoryData();
      });

      // Store countdown interval for cleanup
      (this.refreshSubscription as any).countdownInterval = countdownInterval;
    }
  }

  stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      if ((this.refreshSubscription as any).countdownInterval) {
        clearInterval((this.refreshSubscription as any).countdownInterval);
      }
    }
  }

  formatCountdown(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 
      ? `${mins}m ${secs}s` 
      : `${secs}s`;
  }

  loadDisplaySettings(): void {
    const settings = this.displayService.getSettings();
    this.currentTheme = settings.theme;
    this.zoomLevel = settings.zoomLevel;
    this.refreshInterval = settings.refreshInterval;
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.displayService.updateSettings({ theme: this.currentTheme });
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'stats' ? 'charts' : 'stats';
  }

  adjustZoom(delta: number): void {
    this.zoomLevel = Math.min(200, Math.max(75, this.zoomLevel + delta));
    this.displayService.updateSettings({ zoomLevel: this.zoomLevel });
  }

  manualRefresh(): void {
    this.loadInventoryData();
    this.startAutoRefresh(); // Reset countdown
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'warning';
    return 'danger';
  }

  getVarianceColor(varianceCount: number): string {
    if (varianceCount === 0) return 'success';
    if (varianceCount <= 5) return 'warning';
    return 'danger';
  }
}
