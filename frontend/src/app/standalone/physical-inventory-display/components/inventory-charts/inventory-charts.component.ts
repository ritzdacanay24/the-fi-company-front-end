import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { PhysicalInventoryDisplayService } from '../../services/physical-inventory-display.service';
import { Subscription, interval } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-inventory-charts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-charts.component.html',
  styleUrls: ['./inventory-charts.component.scss']
})
export class InventoryChartsComponent implements OnInit, OnDestroy {
  @ViewChild('completionChart') completionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('progressChart') progressChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('countComparisonChart') countComparisonChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendChart') trendChartRef!: ElementRef<HTMLCanvasElement>;

  completionChart: Chart<'doughnut'> | null = null;
  progressChart: Chart<'bar'> | null = null;
  countComparisonChart: Chart<'line'> | null = null;
  trendChart: Chart<'line'> | null = null;

  stats: any = {
    totalCount: 0,
    totalFirstCounts: 0,
    completedFirstCounts: 0,
    totalSecondCounts: 0,
    completedSecondCounts: 0,
    firstCountPercentage: 0,
    secondCountPercentage: 0,
    overallProgress: 0
  };

  private statsSubscription?: Subscription;
  private refreshSubscription?: Subscription;
  private themeObserver?: MutationObserver;
  private themeContainerElement?: HTMLElement;
  private isDarkTheme = false;

  constructor(
    private displayService: PhysicalInventoryDisplayService,
    private hostElementRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.syncThemeFromApp();
    this.observeThemeChanges();
    this.loadStats();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.statsSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
    this.themeObserver?.disconnect();
  }

  private loadStats(): void {
    this.statsSubscription = this.displayService.getInventoryStats().subscribe(inventoryStats => {
      // Map the inventory stats to our chart stats format
      this.stats.totalCount = inventoryStats.totalTags || 0;
      this.stats.completedFirstCounts = inventoryStats.completedFirstCounts || 0;
      this.stats.completedSecondCounts = inventoryStats.completedSecondCounts || 0;
      this.stats.totalFirstCounts = inventoryStats.totalTags || 0;
      this.stats.totalSecondCounts = inventoryStats.firstCountVariance || 0;
      
      // Calculate percentages
      this.stats.firstCountPercentage = this.stats.totalFirstCounts > 0
        ? (this.stats.completedFirstCounts / this.stats.totalFirstCounts) * 100
        : 0;
      
      this.stats.secondCountPercentage = this.stats.totalSecondCounts > 0
        ? (this.stats.completedSecondCounts / this.stats.totalSecondCounts) * 100
        : 0;
      
      // Calculate overall progress
      const totalCounts = this.stats.totalFirstCounts + this.stats.totalSecondCounts;
      const completedCounts = this.stats.completedFirstCounts + this.stats.completedSecondCounts;
      this.stats.overallProgress = totalCounts > 0
        ? (completedCounts / totalCounts) * 100
        : 0;
      
      this.updateCharts();
    });
  }

  private startAutoRefresh(): void {
    // Refresh every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadStats();
    });
  }

  private updateCharts(): void {
    setTimeout(() => {
      this.createCompletionChart();
      this.createProgressChart();
      this.createCountComparisonChart();
      this.createTrendChart();
    }, 100);
  }

  private createCompletionChart(): void {
    if (this.completionChart) {
      this.completionChart.destroy();
    }

    if (!this.completionChartRef) return;

    const ctx = this.completionChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const firstCountRemaining = this.stats.totalFirstCounts - this.stats.completedFirstCounts;
    const secondCountRemaining = this.stats.totalSecondCounts - this.stats.completedSecondCounts;
    const theme = this.getChartTheme();
    const palette = this.getSemanticPalette();

    this.completionChart = new Chart<'doughnut'>(ctx, {
      type: 'doughnut',
      data: {
        labels: ['First Count Complete', 'First Count Remaining', 'Second Count Complete', 'Second Count Remaining'],
        datasets: [{
          data: [
            this.stats.completedFirstCounts,
            firstCountRemaining,
            this.stats.completedSecondCounts,
            secondCountRemaining
          ],
          backgroundColor: [
            palette.success.strong,
            palette.warning.soft,
            palette.info.strong,
            palette.neutral.soft
          ],
          borderColor: [
            palette.success.base,
            palette.warning.base,
            palette.info.base,
            palette.neutral.base
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: theme.text,
              font: {
                size: 12
              },
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'Inventory Count Completion',
            color: theme.text,
            font: {
              size: 18,
              weight: 'bold'
            },
            padding: 20
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = this.stats.totalFirstCounts + this.stats.totalSecondCounts;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  private createProgressChart(): void {
    if (this.progressChart) {
      this.progressChart.destroy();
    }

    if (!this.progressChartRef) return;

    const ctx = this.progressChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    const theme = this.getChartTheme();
    const palette = this.getSemanticPalette();

    this.progressChart = new Chart<'bar'>(ctx, {
      type: 'bar',
      data: {
        labels: ['First Count', 'Second Count'],
        datasets: [{
          label: 'Completed',
          data: [this.stats.completedFirstCounts, this.stats.completedSecondCounts],
          backgroundColor: palette.success.strong,
          borderColor: palette.success.base,
          borderWidth: 2
        }, {
          label: 'Remaining',
          data: [
            this.stats.totalFirstCounts - this.stats.completedFirstCounts,
            this.stats.totalSecondCounts - this.stats.completedSecondCounts
          ],
          backgroundColor: palette.warning.soft,
          borderColor: palette.warning.base,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            ticks: {
              color: theme.text,
              font: {
                size: 14
              }
            },
            grid: {
              color: theme.grid
            }
          },
          y: {
            stacked: true,
            ticks: {
              color: theme.text,
              font: {
                size: 12
              }
            },
            grid: {
              color: theme.grid
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: theme.text,
              font: {
                size: 12
              },
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'Count Progress Overview',
            color: theme.text,
            font: {
              size: 18,
              weight: 'bold'
            },
            padding: 20
          }
        }
      }
    });
  }

  private createCountComparisonChart(): void {
    if (this.countComparisonChart) {
      this.countComparisonChart.destroy();
    }

    if (!this.countComparisonChartRef) return;

    const ctx = this.countComparisonChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    const theme = this.getChartTheme();
    const palette = this.getSemanticPalette();

    this.countComparisonChart = new Chart<'line'>(ctx, {
      type: 'line',
      data: {
        labels: ['First Count', 'Second Count'],
        datasets: [{
          label: 'Completion %',
          data: [this.stats.firstCountPercentage, this.stats.secondCountPercentage],
          borderColor: palette.info.base,
          backgroundColor: palette.info.soft,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: palette.info.base,
          pointBorderColor: theme.pointBorder,
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: theme.text,
              font: {
                size: 14
              }
            },
            grid: {
              color: theme.grid
            }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: theme.text,
              font: {
                size: 12
              },
              callback: (value) => value + '%'
            },
            grid: {
              color: theme.grid
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Completion Rate Comparison',
            color: theme.text,
            font: {
              size: 18,
              weight: 'bold'
            },
            padding: 20
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `Completion: ${context.parsed.y.toFixed(1)}%`;
              }
            }
          }
        }
      }
    });
  }

  private createTrendChart(): void {
    if (this.trendChart) {
      this.trendChart.destroy();
    }

    if (!this.trendChartRef) return;

    const ctx = this.trendChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    const theme = this.getChartTheme();
    const palette = this.getSemanticPalette();

    // Mock trend data - you can replace this with real historical data
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current'];
    const firstCountData = [45, 62, 78, 85, this.stats.firstCountPercentage];
    const secondCountData = [20, 35, 50, 68, this.stats.secondCountPercentage];

    this.trendChart = new Chart<'line'>(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'First Count Progress',
          data: firstCountData,
          borderColor: palette.success.base,
          backgroundColor: palette.success.faint,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }, {
          label: 'Second Count Progress',
          data: secondCountData,
          borderColor: palette.info.base,
          backgroundColor: palette.info.faint,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: theme.text,
              font: {
                size: 12
              }
            },
            grid: {
              color: theme.grid
            }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: theme.text,
              font: {
                size: 12
              },
              callback: (value) => value + '%'
            },
            grid: {
              color: theme.grid
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: theme.text,
              font: {
                size: 12
              },
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'Historical Progress Trend',
            color: theme.text,
            font: {
              size: 18,
              weight: 'bold'
            },
            padding: 20
          }
        }
      }
    });
  }

  private destroyCharts(): void {
    if (this.completionChart) {
      this.completionChart.destroy();
      this.completionChart = null;
    }
    if (this.progressChart) {
      this.progressChart.destroy();
      this.progressChart = null;
    }
    if (this.countComparisonChart) {
      this.countComparisonChart.destroy();
      this.countComparisonChart = null;
    }
    if (this.trendChart) {
      this.trendChart.destroy();
      this.trendChart = null;
    }
  }

  refreshCharts(): void {
    this.loadStats();
  }

  private getThemeContainerElement(): HTMLElement | null {
    if (this.themeContainerElement && this.themeContainerElement.isConnected) {
      return this.themeContainerElement;
    }

    this.themeContainerElement = this.hostElementRef.nativeElement.closest('.inventory-display-container') as HTMLElement | undefined;
    return this.themeContainerElement ?? null;
  }

  private syncThemeFromApp(): void {
    const container = this.getThemeContainerElement();
    const usesContainerDarkClass = container?.classList.contains('theme-dark') ?? false;
    const usesContainerLightClass = container?.classList.contains('theme-light') ?? false;

    if (usesContainerDarkClass || usesContainerLightClass) {
      this.isDarkTheme = usesContainerDarkClass;
      return;
    }

    this.isDarkTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  }

  private observeThemeChanges(): void {
    this.themeObserver?.disconnect();
    this.themeObserver = new MutationObserver((mutations) => {
      const hasThemeMutation = mutations.some((mutation) => mutation.attributeName === 'data-bs-theme' || mutation.attributeName === 'class');
      if (!hasThemeMutation) {
        return;
      }

      const wasDarkTheme = this.isDarkTheme;
      this.syncThemeFromApp();
      if (wasDarkTheme !== this.isDarkTheme) {
        this.updateCharts();
      }
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bs-theme'],
    });

    const container = this.getThemeContainerElement();
    if (container) {
      this.themeObserver.observe(container, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  private getChartTheme(): { text: string; grid: string; pointBorder: string } {
    const hostStyles = getComputedStyle(this.hostElementRef.nativeElement);
    const read = (name: string): string => hostStyles.getPropertyValue(name).trim();

    const text = read('--analytics-chart-text');
    const grid = read('--analytics-chart-grid');
    const pointBorder = read('--analytics-chart-point-border');

    if (text && grid && pointBorder) {
      return {
        text,
        grid,
        pointBorder,
      };
    }

    if (this.isDarkTheme) {
      return {
        text: '#ced4da',
        grid: 'rgba(50, 56, 62, 0.6)',
        pointBorder: '#212529',
      };
    }

    return {
      text: '#212529',
      grid: 'rgba(15, 23, 42, 0.12)',
      pointBorder: '#ffffff',
    };
  }

  private getSemanticPalette(): {
    success: { base: string; strong: string; soft: string; faint: string };
    info: { base: string; strong: string; soft: string; faint: string };
    warning: { base: string; strong: string; soft: string; faint: string };
    neutral: { base: string; strong: string; soft: string; faint: string };
  } {
    const rootStyles = getComputedStyle(document.documentElement);
    const readRgb = (name: string, fallback: string): string => {
      const value = rootStyles.getPropertyValue(name).trim();
      return value || fallback;
    };
    const token = (rgb: string) => ({
      base: `rgba(${rgb}, 1)`,
      strong: `rgba(${rgb}, 0.8)`,
      soft: `rgba(${rgb}, 0.25)`,
      faint: `rgba(${rgb}, 0.12)`,
    });

    return {
      success: token(readRgb('--bs-success-rgb', '40, 167, 69')),
      info: token(readRgb('--bs-info-rgb', '23, 162, 184')),
      warning: token(readRgb('--bs-warning-rgb', '255, 193, 7')),
      neutral: token(readRgb('--bs-secondary-rgb', '108, 117, 125')),
    };
  }
}
