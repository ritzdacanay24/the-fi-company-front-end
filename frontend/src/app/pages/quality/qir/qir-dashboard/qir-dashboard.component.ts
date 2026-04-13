import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { QirService } from '@app/core/api/quality/qir.service';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexStroke,
  ApexGrid,
  ApexFill,
  ApexMarkers,
  ApexTooltip,
  ApexPlotOptions,
  ApexResponsive,
  ApexLegend,
  ApexNoData
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries | number[];
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  grid?: ApexGrid;
  fill?: ApexFill;
  markers?: ApexMarkers;
  tooltip?: ApexTooltip;
  stroke?: ApexStroke;
  title?: ApexTitleSubtitle;
  plotOptions?: ApexPlotOptions;
  responsive?: ApexResponsive[];
  legend?: ApexLegend;
  noData?: ApexNoData;
  colors?: string[];
  labels?: string[];
};

interface QirMetrics {
  totalQirs: number;
  monthlyTrend: { month: string; count: number; year: number }[];
  failureTypes: { type: string; count: number; color: string }[];
  componentTypes: { component: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  daysSinceLastQir: number;
  averageResolutionDays: number;
  currentMonthQirs: number;
  lastMonthQirs: number;
  improvementPercentage: number;
  priorityBreakdown: { priority: string; count: number }[];
  customerBreakdown: { customer: string; count: number }[];
  qtyAffectedTotal: number;
  stakeholderBreakdown: { stakeholder: string; count: number }[];
  supplierBreakdown: { supplier: string; count: number }[];
  createdByBreakdown: { creator: string; count: number }[];
  platformTypeBreakdown: { platform: string; count: number }[];
}

@Component({
  selector: 'app-qir-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './qir-dashboard.component.html',
  styleUrls: ['./qir-dashboard.component.scss']
})
export class QirDashboardComponent implements OnInit, OnDestroy {
  
  @Input() isDisplayMode: boolean = false;
  @Input() showDisplayButton: boolean = true;
  @Input() autoRefreshInterval: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  public Math = Math; // Expose Math to template
  
  public monthlyTrendChart: Partial<ChartOptions> = {};
  public failureTypeChart: Partial<ChartOptions> = {};
  public componentTypeChart: Partial<ChartOptions> = {};
  public statusChart: Partial<ChartOptions> = {};
  public priorityChart: Partial<ChartOptions> = {};
  public customerChart: Partial<ChartOptions> = {};
  public paretoChart: Partial<ChartOptions> = {};
  public stakeholderChart: Partial<ChartOptions> = {};
  public supplierChart: Partial<ChartOptions> = {};
  public createdByChart: Partial<ChartOptions> = {};
  public platformTypeChart: Partial<ChartOptions> = {};

  public metrics: QirMetrics = {
    totalQirs: 0,
    monthlyTrend: [],
    failureTypes: [],
    componentTypes: [],
    statusBreakdown: [],
    daysSinceLastQir: 0,
    averageResolutionDays: 0,
    currentMonthQirs: 0,
    lastMonthQirs: 0,
    improvementPercentage: 0,
    priorityBreakdown: [],
    customerBreakdown: [],
    qtyAffectedTotal: 0,
    stakeholderBreakdown: [],
    supplierBreakdown: [],
    createdByBreakdown: [],
    platformTypeBreakdown: []
  };

  public isLoading = true;
  public lastUpdated = new Date();
  private data: any[] = [];
  private refreshInterval: any;
  private timestampInterval: any;

  constructor(
    private qirService: QirService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    // Check if this is display mode from route
    this.route.url.subscribe(segments => {
      this.isDisplayMode = segments.some(segment => segment.path === 'qir-dashboard-display');
      this.showDisplayButton = !this.isDisplayMode;
    });

    await this.loadQirData();
    
    // Set up timestamp update interval
    this.timestampInterval = setInterval(() => {
      this.lastUpdated = new Date();
    }, 60000); // Update timestamp every minute

    // Set up auto-refresh for display mode
    if (this.isDisplayMode || this.autoRefreshInterval > 0) {
      this.refreshInterval = setInterval(() => {
        this.loadQirData();
      }, this.autoRefreshInterval);
    }
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.timestampInterval) {
      clearInterval(this.timestampInterval);
    }
  }

  private async loadQirData() {
    try {
      this.isLoading = true;
      const data = await this.qirService.getList('All', '', '', true);
      this.data = data;
      this.processData(data);
      this.setupCharts();
    } catch (error) {
      console.error('Error loading QIR data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private processData(data: any[]) {
    // Calculate metrics
    this.metrics.totalQirs = data.length;
    
    // Days since last QIR
    const sortedQirs = data.sort((a, b) => 
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
    
    if (sortedQirs.length > 0) {
      const latestQir = sortedQirs[0];
      const lastQirDate = new Date(latestQir.createdDate);
      const today = new Date();
      this.metrics.daysSinceLastQir = Math.floor(
        (today.getTime() - lastQirDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Monthly trend (last 12 months)
    this.metrics.monthlyTrend = this.calculateMonthlyTrend(data);
    
    // Current vs last month comparison
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    this.metrics.currentMonthQirs = data.filter(qir => {
      const qirDate = new Date(qir.createdDate);
      return qirDate.getMonth() === currentMonth && qirDate.getFullYear() === currentYear;
    }).length;

    this.metrics.lastMonthQirs = data.filter(qir => {
      const qirDate = new Date(qir.createdDate);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return qirDate.getMonth() === lastMonth && qirDate.getFullYear() === lastMonthYear;
    }).length;

    // Calculate improvement percentage
    if (this.metrics.lastMonthQirs > 0) {
      this.metrics.improvementPercentage = 
        ((this.metrics.lastMonthQirs - this.metrics.currentMonthQirs) / this.metrics.lastMonthQirs) * 100;
    }

    // Failure types
    const failureTypeCount = new Map();
    data.forEach(qir => {
      const type = qir.failureType || 'Other';
      failureTypeCount.set(type, (failureTypeCount.get(type) || 0) + 1);
    });

    const failureColors = [
      '#dc3545', // Red for Component Malfunction
      '#ffc107', // Yellow for Quality Issue
      '#28a745', // Green for Process Issue
      '#007bff', // Blue for Material Issue
      '#6f42c1'  // Purple for Other
    ];

    this.metrics.failureTypes = Array.from(failureTypeCount.entries()).map(([type, count], index) => ({
      type,
      count,
      color: failureColors[index % failureColors.length]
    }));

    // Component types
    const componentTypeCount = new Map();
    data.forEach(qir => {
      const component = qir.componentType || 'Other';
      componentTypeCount.set(component, (componentTypeCount.get(component) || 0) + 1);
    });

    this.metrics.componentTypes = Array.from(componentTypeCount.entries()).map(([component, count]) => ({
      component,
      count
    }));

    // Status breakdown
    const statusCount = new Map();
    data.forEach(qir => {
      const status = qir.status || 'Unknown';
      statusCount.set(status, (statusCount.get(status) || 0) + 1);
    });

    this.metrics.statusBreakdown = Array.from(statusCount.entries()).map(([status, count]) => ({
      status,
      count
    }));

    // Priority breakdown
    const priorityCount = new Map();
    data.forEach(qir => {
      const priority = qir.priority || 'Unknown';
      priorityCount.set(priority, (priorityCount.get(priority) || 0) + 1);
    });

    this.metrics.priorityBreakdown = Array.from(priorityCount.entries()).map(([priority, count]) => ({
      priority,
      count
    }));

    // Customer breakdown (top 10)
    const customerCount = new Map();
    data.forEach(qir => {
      const customer = qir.customerName || 'Unknown';
      customerCount.set(customer, (customerCount.get(customer) || 0) + 1);
    });

    this.metrics.customerBreakdown = Array.from(customerCount.entries())
      .map(([customer, count]) => ({ customer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Total quantity affected
    this.metrics.qtyAffectedTotal = data.reduce((sum, qir) => sum + (qir.qtyAffected || 0), 0);

    // Stakeholder breakdown
    const stakeholderCount = new Map();
    data.forEach(qir => {
      const stakeholder = qir.stakeholder || 'Unknown';
      stakeholderCount.set(stakeholder, (stakeholderCount.get(stakeholder) || 0) + 1);
    });

    this.metrics.stakeholderBreakdown = Array.from(stakeholderCount.entries())
      .map(([stakeholder, count]) => ({ stakeholder, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Supplier breakdown (top 10)
    const supplierCount = new Map();
    data.forEach(qir => {
      const supplier = qir.supplierName ? String(qir.supplierName).trim() : 'Unknown';
      if (supplier && supplier !== '') {
        supplierCount.set(supplier, (supplierCount.get(supplier) || 0) + 1);
      }
    });

    this.metrics.supplierBreakdown = Array.from(supplierCount.entries())
      .map(([supplier, count]) => ({ supplier, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Created by breakdown (top 10)
    const createdByCount = new Map();
    data.forEach(qir => {
      const creator = qir.createdBy || 'Unknown';
      createdByCount.set(creator, (createdByCount.get(creator) || 0) + 1);
    });

    this.metrics.createdByBreakdown = Array.from(createdByCount.entries())
      .map(([creator, count]) => ({ creator, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Platform type breakdown
    const platformTypeCount = new Map();
    data.forEach(qir => {
      const platform = qir.platformType ? String(qir.platformType).trim() : 'Unknown';
      if (platform && platform !== '') {
        platformTypeCount.set(platform, (platformTypeCount.get(platform) || 0) + 1);
      }
    });

    this.metrics.platformTypeBreakdown = Array.from(platformTypeCount.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    // Average resolution days
    const completedQirs = data.filter(qir => 
      qir.status === 'Closed' && 
      qir.completedDate &&
      qir.createdDate
    );

    if (completedQirs.length > 0) {
      const totalDays = completedQirs.reduce((sum, qir) => {
        const startDate = new Date(qir.createdDate);
        const endDate = new Date(qir.completedDate);
        return sum + Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      
      this.metrics.averageResolutionDays = Math.round(totalDays / completedQirs.length);
    }
  }

  private calculateMonthlyTrend(data: any[]) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const last12Months = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      const count = data.filter(qir => {
        const qirDate = new Date(qir.createdDate);
        return qirDate.getMonth() === date.getMonth() && 
               qirDate.getFullYear() === date.getFullYear();
      }).length;
      
      last12Months.push({ month, count, year });
    }
    
    return last12Months;
  }

  private setupCharts() {
    this.setupMonthlyTrendChart();
    this.setupFailureTypeChart();
    this.setupComponentTypeChart();
    this.setupStatusChart();
    this.setupPriorityChart();
    this.setupCustomerChart();
    this.setupParetoChart();
    this.setupStakeholderChart();
    this.setupSupplierChart();
    this.setupCreatedByChart();
    this.setupPlatformTypeChart();
  }

  private setupMonthlyTrendChart() {
    const qirData = this.metrics.monthlyTrend.map(m => m.count);
    const average = qirData.reduce((sum, count) => sum + count, 0) / qirData.length;
    const averageData = new Array(qirData.length).fill(Math.round(average * 10) / 10);

    this.monthlyTrendChart = {
      series: [
        {
          name: 'QIRs',
          data: qirData
        },
        {
          name: 'Average',
          data: averageData
        }
      ],
      chart: {
        type: 'line',
        height: 450,
        toolbar: { show: false },
        background: 'transparent'
      },
      colors: ['#dc3545', '#28a745'],
      stroke: {
        curve: 'smooth',
        width: [4, 2],
        dashArray: [0, 5]
      },
      markers: {
        size: [6, 0],
        colors: ['#dc3545', '#28a745'],
        strokeColors: '#fff',
        strokeWidth: 2
      },
      xaxis: {
        categories: this.metrics.monthlyTrend.map(m => m.month),
        labels: {
          style: {
            fontSize: '14px',
            fontWeight: 'bold'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Number of QIRs',
          style: {
            fontSize: '14px',
            fontWeight: 'bold'
          }
        },
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      grid: {
        borderColor: '#e0e6ed',
        strokeDashArray: 5
      },
      tooltip: {
        theme: 'dark',
        shared: true,
        intersect: false
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right'
      },
      title: {
        text: 'Monthly QIR Trend',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    };
  }

  private setupFailureTypeChart() {
    this.failureTypeChart = {
      series: this.metrics.failureTypes.map(t => t.count),
      chart: {
        type: 'donut',
        height: 400,
        toolbar: { show: false }
      },
      labels: this.metrics.failureTypes.map(t => t.type),
      colors: this.metrics.failureTypes.map(t => t.color),
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                fontSize: '18px',
                fontWeight: 'bold'
              }
            }
          }
        }
      },
      legend: {
        position: 'bottom',
        fontSize: '14px'
      },
      title: {
        text: 'QIRs by Failure Type',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    } as any;
  }

  private setupComponentTypeChart() {
    this.componentTypeChart = {
      series: [{
        name: 'QIRs',
        data: this.metrics.componentTypes.map(c => c.count)
      }],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: { show: false }
      },
      colors: ['#007bff'],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4
        }
      },
      xaxis: {
        categories: this.metrics.componentTypes.map(c => c.component),
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      title: {
        text: 'QIRs by Component Type',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    };
  }

  private setupStatusChart() {
    this.statusChart = {
      series: this.metrics.statusBreakdown.map(s => s.count),
      chart: {
        type: 'pie',
        height: 350,
        toolbar: { show: false }
      },
      labels: this.metrics.statusBreakdown.map(s => s.status),
      colors: ['#28a745', '#dc3545', '#ffc107', '#6c757d'],
      legend: {
        position: 'bottom',
        fontSize: '14px'
      },
      title: {
        text: 'QIR Status',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    } as any;
  }

  private setupPriorityChart() {
    this.priorityChart = {
      series: [{
        name: 'QIRs',
        data: this.metrics.priorityBreakdown.map(p => p.count)
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: false }
      },
      colors: ['#dc3545', '#ffc107', '#28a745'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false
        }
      },
      xaxis: {
        categories: this.metrics.priorityBreakdown.map(p => p.priority),
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      title: {
        text: 'QIRs by Priority',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    };
  }

  private setupCustomerChart() {
    this.customerChart = {
      series: [{
        name: 'QIRs',
        data: this.metrics.customerBreakdown.map(c => c.count)
      }],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: { show: false }
      },
      colors: ['#6f42c1'],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4
        }
      },
      xaxis: {
        categories: this.metrics.customerBreakdown.map(c => c.customer),
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      title: {
        text: 'Top 10 Customers by QIR Count',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    };
  }

  private setupParetoChart() {
    // Sort failure types by count descending
    const sortedFailureTypes = [...this.metrics.failureTypes]
      .sort((a, b) => b.count - a.count);
    
    // Calculate cumulative percentages
    const totalCount = sortedFailureTypes.reduce((sum, item) => sum + item.count, 0);
    let cumulativeCount = 0;
    const cumulativePercentages = sortedFailureTypes.map(item => {
      cumulativeCount += item.count;
      return Math.round((cumulativeCount / totalCount) * 100);
    });

    this.paretoChart = {
      series: [
        {
          name: 'QIR Count',
          type: 'column',
          data: sortedFailureTypes.map(item => item.count)
        },
        {
          name: 'Cumulative %',
          type: 'line',
          data: cumulativePercentages
        }
      ],
      chart: {
        height: 400,
        type: 'line',
        toolbar: { show: false }
      },
      stroke: {
        width: [0, 4],
        curve: 'smooth'
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '50%'
        }
      },
      colors: ['#dc3545', '#28a745'],
      fill: {
        opacity: [0.85, 1]
      },
      labels: sortedFailureTypes.map(item => item.type),
      markers: {
        size: 0
      },
      xaxis: {
        type: 'category',
        labels: {
          style: {
            fontSize: '12px'
          },
          rotate: -45
        }
      },
      yaxis: {
        title: {
          text: 'QIR Count',
          style: {
            color: '#dc3545',
            fontSize: '14px',
            fontWeight: 'bold'
          }
        },
        labels: {
          style: {
            colors: '#dc3545',
            fontSize: '14px'
          }
        }
      } as ApexYAxis,
      tooltip: {
        shared: true,
        intersect: false,
        y: [
          {
            formatter: function (y) {
              if (typeof y !== "undefined") {
                return y.toFixed(0) + " QIRs";
              }
              return y;
            }
          },
          {
            formatter: function (y) {
              if (typeof y !== "undefined") {
                return y.toFixed(1) + "%";
              }
              return y;
            }
          }
        ]
      },
      title: {
        text: 'Pareto Chart - Failure Types (80/20 Analysis)',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      },
      legend: {
        horizontalAlign: 'left',
        offsetX: 40
      }
    };
  }

  private setupStakeholderChart() {
    this.stakeholderChart = {
      series: [{
        name: 'QIRs',
        data: this.metrics.stakeholderBreakdown.map(s => s.count)
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: false }
      },
      colors: ['#e74c3c'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false
        }
      },
      xaxis: {
        categories: this.metrics.stakeholderBreakdown.map(s => s.stakeholder),
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      title: {
        text: 'QIRs by Stakeholder',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    };
  }

  private setupSupplierChart() {
    this.supplierChart = {
      series: [{
        name: 'QIRs',
        data: this.metrics.supplierBreakdown.map(s => s.count)
      }],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: { show: false }
      },
      colors: ['#f39c12'],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4
        }
      },
      xaxis: {
        categories: this.metrics.supplierBreakdown.map(s => s.supplier),
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      title: {
        text: 'Top 10 Suppliers by QIR Count',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    };
  }

  private setupCreatedByChart() {
    this.createdByChart = {
      series: this.metrics.createdByBreakdown.map(c => c.count),
      chart: {
        type: 'donut',
        height: 400,
        toolbar: { show: false }
      },
      labels: this.metrics.createdByBreakdown.map(c => c.creator),
      colors: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#95a5a6', '#d35400', '#8e44ad'],
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                fontSize: '18px',
                fontWeight: 'bold'
              }
            }
          }
        }
      },
      legend: {
        position: 'bottom',
        fontSize: '14px'
      },
      title: {
        text: 'QIRs by Creator',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    } as any;
  }

  private setupPlatformTypeChart() {
    this.platformTypeChart = {
      series: [{
        name: 'QIRs',
        data: this.metrics.platformTypeBreakdown.map(p => p.count)
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: false }
      },
      colors: ['#16a085'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false
        }
      },
      xaxis: {
        categories: this.metrics.platformTypeBreakdown.map(p => p.platform),
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '14px'
          }
        }
      },
      title: {
        text: 'QIRs by Platform Type',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    };
  }

  public refresh() {
    this.loadQirData();
  }

  public openDisplayMode() {
    window.open('/qir-dashboard-display', '_blank');
  }

  public getPerformanceColor(): string {
    if (this.metrics.improvementPercentage > 0) return 'text-success';
    if (this.metrics.improvementPercentage < 0) return 'text-danger';
    return 'text-warning';
  }

  public getPerformanceIcon(): string {
    if (this.metrics.improvementPercentage > 0) return 'mdi-trending-up';
    if (this.metrics.improvementPercentage < 0) return 'mdi-trending-down';
    return 'mdi-minus';
  }

  public getDaysSinceColor(): string {
    if (this.metrics.daysSinceLastQir > 7) return 'text-success';
    if (this.metrics.daysSinceLastQir > 3) return 'text-warning';
    return 'text-danger';
  }

  public getOpenQirsCount(): number {
    const openStatus = this.metrics.statusBreakdown.find(s => s.status === 'Open');
    return openStatus ? openStatus.count : 0;
  }
}