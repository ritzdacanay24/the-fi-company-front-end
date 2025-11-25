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

  constructor(private displayService: PhysicalInventoryDisplayService) {}

  ngOnInit(): void {
    this.loadStats();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.statsSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
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
        : 100; // 100% if no second counts needed
      
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
            'rgba(40, 167, 69, 0.8)',
            'rgba(255, 193, 7, 0.3)',
            'rgba(23, 162, 184, 0.8)',
            'rgba(108, 117, 125, 0.3)'
          ],
          borderColor: [
            'rgba(40, 167, 69, 1)',
            'rgba(255, 193, 7, 1)',
            'rgba(23, 162, 184, 1)',
            'rgba(108, 117, 125, 1)'
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
              color: '#ffffff',
              font: {
                size: 12
              },
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'Inventory Count Completion',
            color: '#ffffff',
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

    this.progressChart = new Chart<'bar'>(ctx, {
      type: 'bar',
      data: {
        labels: ['First Count', 'Second Count'],
        datasets: [{
          label: 'Completed',
          data: [this.stats.completedFirstCounts, this.stats.completedSecondCounts],
          backgroundColor: 'rgba(40, 167, 69, 0.8)',
          borderColor: 'rgba(40, 167, 69, 1)',
          borderWidth: 2
        }, {
          label: 'Remaining',
          data: [
            this.stats.totalFirstCounts - this.stats.completedFirstCounts,
            this.stats.totalSecondCounts - this.stats.completedSecondCounts
          ],
          backgroundColor: 'rgba(255, 193, 7, 0.3)',
          borderColor: 'rgba(255, 193, 7, 1)',
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
              color: '#ffffff',
              font: {
                size: 14
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y: {
            stacked: true,
            ticks: {
              color: '#ffffff',
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#ffffff',
              font: {
                size: 12
              },
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'Count Progress Overview',
            color: '#ffffff',
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

    this.countComparisonChart = new Chart<'line'>(ctx, {
      type: 'line',
      data: {
        labels: ['First Count', 'Second Count'],
        datasets: [{
          label: 'Completion %',
          data: [this.stats.firstCountPercentage, this.stats.secondCountPercentage],
          borderColor: 'rgba(23, 162, 184, 1)',
          backgroundColor: 'rgba(23, 162, 184, 0.2)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgba(23, 162, 184, 1)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: '#ffffff',
              font: {
                size: 14
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: '#ffffff',
              font: {
                size: 12
              },
              callback: (value) => value + '%'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
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
            color: '#ffffff',
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
          borderColor: 'rgba(40, 167, 69, 1)',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }, {
          label: 'Second Count Progress',
          data: secondCountData,
          borderColor: 'rgba(23, 162, 184, 1)',
          backgroundColor: 'rgba(23, 162, 184, 0.1)',
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
              color: '#ffffff',
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: '#ffffff',
              font: {
                size: 12
              },
              callback: (value) => value + '%'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#ffffff',
              font: {
                size: 12
              },
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'Historical Progress Trend',
            color: '#ffffff',
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
}
