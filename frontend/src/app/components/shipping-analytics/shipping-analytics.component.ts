import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexStroke,
  ApexPlotOptions,
  ApexYAxis,
  ApexFill,
  ApexLegend,
  ApexResponsive,
  ApexGrid,
  ApexNonAxisChartSeries,
  ApexTitleSubtitle
} from 'ng-apexcharts';
import { ShippingDataService, ShippingOrder, ShippingAnalytics } from '../../services/shipping-data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MasterSchedulingService } from '@app/core/api/operations/master-scheduling/master-scheduling.service';

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  fill: ApexFill;
  legend: ApexLegend;
  responsive: ApexResponsive[];
  labels: string[];
  colors: string[];
};

interface ShippingData {
  SOD_NBR: string;
  SOD_DUE_DATE: string;
  LEADTIME: number;
  SOD_PART: string;
  SOD_QTY_ORD: number;
  SOD_QTY_SHIP: number;
  SOD_PRICE: number;
  SOD_CONTR_ID: string;
  OPENBALANCE: number;
  QTYOPEN: number;
  SOD_QTY_ALL: number;
  FULLDESC: string;
  SO_CUST: string;
  SOD_LINE: number;
  SO_ORD_DATE: string;
  SO_SHIP: string;
  STATUS: string;
  STATUSCLASS: string;
  CP_CUST_PART: string;
  LD_QTY_OH: number;
  AGE: number;
  SOD_LIST_PR: number;
  PT_ROUTING: string;
  WO_NBR: number;
  shipping_priority?: number;
  recent_comments?: any;
  misc?: any;
}

interface ProductivityMetrics {
  totalOrders: number;
  pastDueOrders: number;
  dueTodayOrders: number;
  futureOrders: number;
  averageLeadTime: number;
  onTimeDeliveryRate: number;
  priorityOrdersCount: number;
  averageAge: number;
  
  // Task-focused metrics
  assignedOrders: number;
  unassignedOrders: number;
  teamWorkload: Array<{userName: string, orderCount: number, pastDue: number, dueToday: number}>;
  topAssignees: Array<{userName: string, orders: number, pastDueCount: number}>;
  workloadDistribution: Array<{userName: string, workload: number}>;
  
  // Operational issue metrics
  ordersWithoutCost: number;
  ordersWithoutListPrice: number;
  priorityDroppedOrders: number;
  pricingIssueOrders: Array<{orderNumber: string, issue: string, customerName?: string}>;
  priorityChangeHistory: Array<{orderNumber: string, oldPriority: string, newPriority: string, changeDate: Date}>;
}

@Component({
  selector: 'app-shipping-analytics',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './shipping-analytics.component.html',
  styleUrls: ['./shipping-analytics.component.scss']
})
export class ShippingAnalyticsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() shippingData: ShippingData[] = [];
  @Input() refreshTrigger?: any;

  private destroy$ = new Subject<void>();
  
  // Real data properties
  data: any;
  allOrdersData: any[] = [];
  statusCount: any;
  
  // Service data
  orders: ShippingOrder[] = [];
  analytics: ShippingAnalytics | null = null;

  // Chart options for different visualizations
  orderStatusChart: Partial<ChartOptions> = {};
  leadTimeChart: Partial<ChartOptions> = {};
  customerValueChart: Partial<ChartOptions> = {};
  agingAnalysisChart: Partial<ChartOptions> = {};
  priorityChart: Partial<ChartOptions> = {};
  financialOverviewChart: Partial<ChartOptions> = {};
  trendsChart: Partial<ChartOptions> = {};
  
  // Creative productivity charts
  urgentShippingChart: Partial<ChartOptions> = {};
  teamPerformanceChart: Partial<ChartOptions> = {};
  dailyWinsChart: Partial<ChartOptions> = {};
  revenueProtectionChart: Partial<ChartOptions> = {};
  workloadBalanceChart: Partial<ChartOptions> = {};
  shippingUrgencyChart: Partial<ChartOptions> = {};

  // Productivity metrics
  metrics: ProductivityMetrics = {
    totalOrders: 0,
    pastDueOrders: 0,
    dueTodayOrders: 0,
    futureOrders: 0,
    averageLeadTime: 0,
    onTimeDeliveryRate: 0,
    priorityOrdersCount: 0,
    averageAge: 0,
    assignedOrders: 0,
    unassignedOrders: 0,
    teamWorkload: [],
    topAssignees: [],
    workloadDistribution: [],
    ordersWithoutCost: 0,
    ordersWithoutListPrice: 0,
    priorityDroppedOrders: 0,
    pricingIssueOrders: [],
    priorityChangeHistory: []
  };

  // Key insights for productivity
  insights: Array<{
    type: 'warning' | 'info' | 'success' | 'danger';
    title: string;
    message: string;
    action?: string;
  }> = [];

  constructor(private shippingDataService: ShippingDataService, private api: MasterSchedulingService) {}

  ngOnInit(): void {
    // Load real data using the API pattern
    this.getData();
    
    // Subscribe to data updates
    this.shippingDataService.orders$
      .pipe(takeUntil(this.destroy$))
      .subscribe(orders => {
        this.orders = orders;
        this.processServiceData();
      });

    this.shippingDataService.analytics$
      .pipe(takeUntil(this.destroy$))
      .subscribe(analytics => {
        this.analytics = analytics;
        if (analytics) {
          this.updateMetricsFromAnalytics(analytics);
          this.generateChartsFromAnalytics(analytics);
          this.calculateInsightsFromAnalytics(analytics);
        }
      });

    // Fallback to input data if no service data
    if (this.shippingData.length) {
      this.processData();
      this.generateCharts();
      this.calculateInsights();
    }
  }

  async getData() {
    try {
      // Load shipping data and priorities in parallel
      const [shippingData] = await Promise.all([
        this.api.getShipping(),
        this.loadPriorities()
      ]);

      this.data = shippingData;
      this.statusCount = this.calculateStatus();

      // Merge priority data with shipping data
      this.mergePriorityData();

      // Set data to all orders, filtering will be handled by the tab switching
      this.data = this.allOrdersData;

      // Process the real data for analytics
      this.shippingData = this.data;
      this.processData();
      this.generateCharts();
      this.calculateInsights();

    } catch (err) {
      console.error('Error loading shipping data:', err);
    }
  }

  async loadPriorities() {
    try {
      const response = await this.api.getShippingPriorities();
      return response;
    } catch (error) {
      console.error('Error loading priorities:', error);
      return [];
    }
  }

  calculateStatus() {
    // Calculate status counts from the data
    const statusCounts = {
      'Past Due': 0,
      'Due Today': 0,
      'Future Order': 0
    };

    if (this.data) {
      this.data.forEach((item: any) => {
        if (statusCounts.hasOwnProperty(item.STATUS)) {
          statusCounts[item.STATUS]++;
        }
      });
    }

    return statusCounts;
  }

  mergePriorityData() {
    // Merge priority data with shipping data
    if (this.data) {
      this.allOrdersData = [...this.data];
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['shippingData'] || changes['refreshTrigger']) {
      this.processData();
      this.generateCharts();
      this.calculateInsights();
    }
    
    // If refresh trigger changed, reload data from API
    if (changes['refreshTrigger']) {
      this.getData();
    }
  }

  private processData(): void {
    if (!this.shippingData.length) return;

    const currentDate = new Date('2025-09-16');
    
    // Calculate basic metrics
    this.metrics.totalOrders = this.shippingData.length;
    this.metrics.pastDueOrders = this.shippingData.filter(d => d.STATUS === 'Past Due').length;
    this.metrics.dueTodayOrders = this.shippingData.filter(d => d.STATUS === 'Due Today').length;
    this.metrics.futureOrders = this.shippingData.filter(d => d.STATUS === 'Future Order').length;
    this.metrics.averageLeadTime = this.shippingData.reduce((sum, d) => sum + (d.LEADTIME || 0), 0) / this.metrics.totalOrders;
    this.metrics.priorityOrdersCount = this.shippingData.filter(d => d.shipping_priority && d.shipping_priority > 0).length;
    this.metrics.averageAge = this.shippingData.reduce((sum, d) => sum + Math.abs(d.AGE || 0), 0) / this.metrics.totalOrders;
    
    // Calculate on-time delivery rate (based on current status)
    const onTimeOrders = this.metrics.futureOrders + this.metrics.dueTodayOrders;
    this.metrics.onTimeDeliveryRate = (onTimeOrders / this.metrics.totalOrders) * 100;

    // Calculate team assignment metrics
    this.calculateTeamWorkload();
    
    // Calculate operational issue metrics
    this.calculateOperationalIssues();
  }

  private calculateTeamWorkload(): void {
    const userWorkload = new Map<string, {orderCount: number, pastDue: number, dueToday: number}>();
    let assignedCount = 0;
    let unassignedCount = 0;

    this.shippingData.forEach(order => {
      const userName = order.misc?.userName || 'Unassigned';
      
      if (userName === 'Unassigned' || !userName) {
        unassignedCount++;
      } else {
        assignedCount++;
      }

      if (!userWorkload.has(userName)) {
        userWorkload.set(userName, {orderCount: 0, pastDue: 0, dueToday: 0});
      }
      
      const stats = userWorkload.get(userName)!;
      stats.orderCount++;
      
      if (order.STATUS === 'Past Due') {
        stats.pastDue++;
      } else if (order.STATUS === 'Due Today') {
        stats.dueToday++;
      }
    });

    this.metrics.assignedOrders = assignedCount;
    this.metrics.unassignedOrders = unassignedCount;

    // Convert to arrays for charts
    this.metrics.teamWorkload = Array.from(userWorkload.entries())
      .map(([userName, stats]) => ({userName, ...stats}))
      .filter(item => item.userName !== 'Unassigned')
      .sort((a, b) => b.orderCount - a.orderCount);

    this.metrics.topAssignees = this.metrics.teamWorkload
      .map(item => ({
        userName: item.userName,
        orders: item.orderCount,
        pastDueCount: item.pastDue
      }))
      .slice(0, 10);

    this.metrics.workloadDistribution = this.metrics.teamWorkload
      .map(item => ({
        userName: item.userName,
        workload: item.orderCount
      }));
  }

  private calculateOperationalIssues(): void {
    let ordersWithoutCost = 0;
    let ordersWithoutListPrice = 0;
    let priorityDroppedOrders = 0;
    const pricingIssueOrders: Array<{orderNumber: string, issue: string, customerName?: string}> = [];
    const priorityChangeHistory: Array<{orderNumber: string, oldPriority: string, newPriority: string, changeDate: Date}> = [];

    this.shippingData.forEach(order => {
      // Check for missing cost data (using SOD_PRICE as cost indicator)
      if (!order.SOD_PRICE || order.SOD_PRICE === 0 || order.SOD_PRICE === null) {
        ordersWithoutCost++;
        pricingIssueOrders.push({
          orderNumber: order.SOD_NBR,
          issue: 'Missing Cost/Price',
          customerName: order.SO_CUST
        });
      }

      // Check for missing list price
      if (!order.SOD_LIST_PR || order.SOD_LIST_PR === 0 || order.SOD_LIST_PR === null) {
        ordersWithoutListPrice++;
        pricingIssueOrders.push({
          orderNumber: order.SOD_NBR,
          issue: 'Missing List Price',
          customerName: order.SO_CUST
        });
      }

      // Check for priority changes/drops (if there's a priority history field)
      // This would need to be implemented based on your data structure
      // For now, we'll check if current priority is lower than expected
      if (order.misc?.priorityDropped || order.misc?.priorityChanged) {
        priorityDroppedOrders++;
        priorityChangeHistory.push({
          orderNumber: order.SOD_NBR,
          oldPriority: order.misc.oldPriority || 'Unknown',
          newPriority: order.shipping_priority?.toString() || 'Standard',
          changeDate: new Date(order.misc.priorityChangeDate || new Date())
        });
      }
    });

    this.metrics.ordersWithoutCost = ordersWithoutCost;
    this.metrics.ordersWithoutListPrice = ordersWithoutListPrice;
    this.metrics.priorityDroppedOrders = priorityDroppedOrders;
    this.metrics.pricingIssueOrders = pricingIssueOrders.slice(0, 50); // Limit to first 50 for performance
    this.metrics.priorityChangeHistory = priorityChangeHistory.slice(0, 50);
  }

  private generateCharts(): void {
    this.createOrderStatusChart();
    this.createLeadTimeChart();
    this.createTeamWorkloadChart();
    this.createAgingAnalysisChart();
    this.createPriorityChart();
    this.createAssignmentOverviewChart();
    this.createWorkloadDistributionChart();
    
    // Creative productivity charts
    this.createUrgentShippingChart();
    this.createTeamPerformanceChart();
    this.createDailyWinsChart();
    this.createRevenueProtectionChart();
    this.createShippingUrgencyChart();
  }

  private createOrderStatusChart(): void {
    const data = [
      this.metrics.pastDueOrders,
      this.metrics.dueTodayOrders,
      this.metrics.futureOrders
    ];

    this.orderStatusChart = {
      series: data,
      chart: {
        type: 'donut',
        height: 350,
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        }
      },
      labels: ['Past Due', 'Due Today', 'Future Orders'],
      colors: ['#dc3545', '#ffc107', '#28a745'],
      title: {
        text: 'Order Status Distribution',
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return Math.round(val) + '%';
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return val + ' orders';
          }
        }
      },
      legend: {
        position: 'bottom'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Orders',
                formatter: () => this.metrics.totalOrders.toString()
              }
            }
          }
        }
      }
    };
  }

  private createLeadTimeChart(): void {
    // Group lead times into buckets
    const leadTimeBuckets = {
      '0-30 days': 0,
      '31-60 days': 0,
      '61-90 days': 0,
      '90+ days': 0
    };

    this.shippingData.forEach(order => {
      const leadTime = order.LEADTIME || 0;
      if (leadTime <= 30) leadTimeBuckets['0-30 days']++;
      else if (leadTime <= 60) leadTimeBuckets['31-60 days']++;
      else if (leadTime <= 90) leadTimeBuckets['61-90 days']++;
      else leadTimeBuckets['90+ days']++;
    });

    this.leadTimeChart = {
      series: [{
        name: 'Orders',
        data: Object.values(leadTimeBuckets)
      }],
      chart: {
        type: 'bar',
        height: 350
      },
      xaxis: {
        categories: Object.keys(leadTimeBuckets)
      },
      title: {
        text: 'Lead Time Distribution',
        align: 'center'
      },
      colors: ['#007bff'],
      dataLabels: {
        enabled: true
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return val + ' orders';
          }
        }
      }
    };
  }

  private createTeamWorkloadChart(): void {
    const topAssignees = this.metrics.topAssignees.slice(0, 10);
    
    this.customerValueChart = {
      series: [{
        name: 'Total Orders',
        data: topAssignees.map(a => a.orders)
      }, {
        name: 'Past Due',
        data: topAssignees.map(a => a.pastDueCount)
      }],
      chart: {
        type: 'bar',
        height: 400
      },
      plotOptions: {
        bar: {
          horizontal: true
        }
      },
      xaxis: {
        categories: topAssignees.map(a => a.userName),
        labels: {
          formatter: function (val: string) {
            return val.length > 15 ? val.substring(0, 15) + '...' : val;
          }
        }
      },
      title: {
        text: 'Team Workload Distribution',
        align: 'center'
      },
      colors: ['#17a2b8', '#dc3545'],
      dataLabels: {
        enabled: true
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return val + ' orders';
          }
        }
      },
      legend: {
        position: 'top'
      }
    };
  }

  private createAgingAnalysisChart(): void {
    // Create age buckets
    const ageBuckets = {
      'Future (0+)': 0,
      'Current (0)': 0,
      'Overdue 1-30': 0,
      'Overdue 31-60': 0,
      'Overdue 60+': 0
    };

    this.shippingData.forEach(order => {
      const age = order.AGE || 0;
      if (age > 0) ageBuckets['Future (0+)']++;
      else if (age === 0) ageBuckets['Current (0)']++;
      else if (age >= -30) ageBuckets['Overdue 1-30']++;
      else if (age >= -60) ageBuckets['Overdue 31-60']++;
      else ageBuckets['Overdue 60+']++;
    });

    this.agingAnalysisChart = {
      series: [{
        name: 'Orders',
        data: Object.values(ageBuckets)
      }],
      chart: {
        type: 'area',
        height: 350
      },
      xaxis: {
        categories: Object.keys(ageBuckets)
      },
      title: {
        text: 'Order Aging Analysis',
        align: 'center'
      },
      colors: ['#fd7e14'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3
        }
      },
      dataLabels: {
        enabled: false
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return val + ' orders';
          }
        }
      }
    };
  }

  private createPriorityChart(): void {
    const priorityOrders = this.shippingData.filter(d => d.shipping_priority && d.shipping_priority > 0);
    const priorityGroups = {
      'Priority 1-5': 0,
      'Priority 6-10': 0,
      'Priority 11+': 0,
      'No Priority': this.shippingData.length - priorityOrders.length
    };

    priorityOrders.forEach(order => {
      const priority = order.shipping_priority!;
      if (priority <= 5) priorityGroups['Priority 1-5']++;
      else if (priority <= 10) priorityGroups['Priority 6-10']++;
      else priorityGroups['Priority 11+']++;
    });

    this.priorityChart = {
      series: Object.values(priorityGroups),
      chart: {
        type: 'pie',
        height: 350
      },
      labels: Object.keys(priorityGroups),
      colors: ['#dc3545', '#ffc107', '#6f42c1', '#6c757d'],
      title: {
        text: 'Shipping Priority Distribution',
        align: 'center'
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return Math.round(val) + '%';
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return val + ' orders';
          }
        }
      }
    };
  }

  private createAssignmentOverviewChart(): void {
    const assignmentData = [
      this.metrics.assignedOrders,
      this.metrics.unassignedOrders
    ];

    this.financialOverviewChart = {
      series: assignmentData,
      chart: {
        type: 'donut',
        height: 350
      },
      labels: ['Assigned Orders', 'Unassigned Orders'],
      colors: ['#28a745', '#ffc107'],
      title: {
        text: 'Task Assignment Overview',
        align: 'center'
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return Math.round(val) + '%';
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return val + ' orders';
          }
        }
      },
      legend: {
        position: 'bottom'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Orders',
                formatter: () => this.metrics.totalOrders.toString()
              }
            }
          }
        }
      }
    };
  }

  private createWorkloadDistributionChart(): void {
    // Group team workload by status for each person
    const teamData = this.metrics.teamWorkload.slice(0, 8); // Top 8 team members
    
    this.trendsChart = {
      series: [{
        name: 'Total Orders',
        data: teamData.map(t => t.orderCount)
      }, {
        name: 'Past Due',
        data: teamData.map(t => t.pastDue)
      }, {
        name: 'Due Today',
        data: teamData.map(t => t.dueToday)
      }],
      chart: {
        type: 'bar',
        height: 350
      },
      xaxis: {
        categories: teamData.map(t => t.userName),
        labels: {
          formatter: function (val: string) {
            return val.length > 10 ? val.substring(0, 10) + '...' : val;
          }
        }
      },
      title: {
        text: 'Team Performance Dashboard',
        align: 'center'
      },
      colors: ['#007bff', '#dc3545', '#ffc107'],
      dataLabels: {
        enabled: false
      },
      plotOptions: {
        bar: {
          columnWidth: '75%'
        }
      },
      legend: {
        position: 'top'
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return val + ' orders';
          }
        }
      }
    };
  }

  // CREATIVE PRODUCTIVITY CHARTS FOR MANAGEMENT & BREAK ROOM

  private createUrgentShippingChart(): void {
    // Orders missing pricing that are shipping in next 7 days - URGENT!
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const urgentOrders = this.shippingData.filter(order => {
      const dueDate = new Date(order.SOD_DUE_DATE);
      const isSoon = dueDate <= nextWeek;
      const noCost = !order.SOD_PRICE || order.SOD_PRICE === 0;
      const noListPrice = !order.SOD_LIST_PR || order.SOD_LIST_PR === 0;
      return isSoon && (noCost || noListPrice);
    });

    const urgentData = [
      { name: 'Safe to Ship', value: this.metrics.totalOrders - urgentOrders.length, color: '#28a745' },
      { name: 'NEEDS ATTENTION!', value: urgentOrders.length, color: '#dc3545' }
    ];

    this.urgentShippingChart = {
      series: urgentData.map(d => d.value),
      chart: {
        type: 'donut',
        height: 300
      },
      labels: urgentData.map(d => d.name),
      colors: urgentData.map(d => d.color),
      title: {
        text: '🚨 URGENT: Orders Shipping Soon Without Pricing',
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number, opts: any) {
          return opts.w.config.series[opts.seriesIndex] + ' orders';
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '22px',
                fontWeight: 600,
                color: undefined,
                offsetY: -10
              },
              value: {
                show: true,
                fontSize: '28px',
                fontWeight: 700,
                color: '#dc3545',
                offsetY: 10,
                formatter: function (val: string) {
                  return val + ' orders';
                }
              },
              total: {
                show: true,
                label: 'Total Orders',
                fontSize: '18px',
                fontWeight: 600,
                color: '#373d3f'
              }
            }
          }
        }
      },
      legend: {
        position: 'bottom',
        fontSize: '14px'
      }
    };
  }

  private createTeamPerformanceChart(): void {
    // Perfect for break room - shows who's crushing it!
    const teamData = this.metrics.teamWorkload.slice(0, 6); // Top 6 performers
    
    this.teamPerformanceChart = {
      series: [{
        name: 'Orders Handled',
        data: teamData.map(t => t.orderCount)
      }],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          horizontal: true,
          barHeight: '70%'
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          colors: ['#fff'],
          fontSize: '14px',
          fontWeight: 'bold'
        }
      },
      xaxis: {
        categories: teamData.map(t => t.userName),
        title: {
          text: 'Number of Orders'
        }
      },
      yaxis: {
        title: {
          text: 'Team Members'
        }
      },
      title: {
        text: '🏆 TEAM CHAMPIONS - Who\'s Crushing It Today!',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#007bff'
        }
      },
      colors: ['#007bff'],
      grid: {
        borderColor: '#e7e7e7',
        row: {
          colors: ['#f3f3f3', 'transparent'],
          opacity: 0.5
        }
      }
    };
  }

  private createDailyWinsChart(): void {
    // Show daily accomplishments - great for morale!
    const completedToday = this.shippingData.filter(order => {
      const today = new Date().toDateString();
      return order.STATUS === 'COMPLETE' || order.STATUS === 'SHIPPED';
    }).length;

    const onTrackOrders = this.metrics.totalOrders - this.metrics.pastDueOrders;
    const perfectOrders = this.metrics.totalOrders - this.metrics.ordersWithoutCost - this.metrics.ordersWithoutListPrice;

    this.dailyWinsChart = {
      series: [
        {
          name: 'Daily Performance',
          data: [completedToday, onTrackOrders, perfectOrders, this.metrics.assignedOrders]
        }
      ],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '60%'
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '14px',
          fontWeight: 'bold'
        }
      },
      xaxis: {
        categories: ['✅ Completed Today', '⏰ On Schedule', '💰 Perfect Pricing', '👥 All Assigned'],
        labels: {
          style: {
            fontSize: '12px'
          }
        }
      },
      title: {
        text: '🎉 TODAY\'S WINS - What We\'re Crushing!',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#28a745'
        }
      },
      colors: ['#28a745'],
      grid: {
        borderColor: '#e7e7e7'
      }
    };
  }

  private createRevenueProtectionChart(): void {
    // Management view - how much money are we protecting?
    const protectedRevenue = this.shippingData
      .filter(order => order.SOD_PRICE && order.SOD_PRICE > 0 && order.SOD_LIST_PR && order.SOD_LIST_PR > 0)
      .reduce((sum, order) => sum + (order.SOD_PRICE * order.SOD_QTY_ORD), 0);

    const riskRevenue = this.shippingData
      .filter(order => !order.SOD_PRICE || order.SOD_PRICE === 0 || !order.SOD_LIST_PR || order.SOD_LIST_PR === 0)
      .reduce((sum, order) => sum + ((order.SOD_PRICE || 0) * order.SOD_QTY_ORD), 0);

    this.revenueProtectionChart = {
      series: [
        {
          name: 'Revenue Status',
          data: [protectedRevenue, riskRevenue]
        }
      ],
      chart: {
        type: 'bar',
        height: 350
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '50%'
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return '$' + (val / 1000).toFixed(0) + 'K';
        },
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          colors: ['#fff']
        }
      },
      xaxis: {
        categories: ['💰 Protected Revenue', '⚠️ At Risk Revenue']
      },
      yaxis: {
        labels: {
          formatter: function (val: number) {
            return '$' + (val / 1000).toFixed(0) + 'K';
          }
        }
      },
      title: {
        text: '💵 REVENUE PROTECTION - Safeguarding Our Money',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#007bff'
        }
      },
      colors: ['#28a745', '#dc3545']
    };
  }

  private createShippingUrgencyChart(): void {
    // Timeline view - what needs attention NOW vs later
    const today = new Date();
    const urgent = this.shippingData.filter(order => {
      const dueDate = new Date(order.SOD_DUE_DATE);
      return dueDate <= new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000); // Next 2 days
    }).length;

    const soon = this.shippingData.filter(order => {
      const dueDate = new Date(order.SOD_DUE_DATE);
      return dueDate > new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) && 
             dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 3-7 days
    }).length;

    const later = this.metrics.totalOrders - urgent - soon;

    this.shippingUrgencyChart = {
      series: [urgent, soon, later],
      chart: {
        type: 'donut',
        height: 350
      },
      labels: ['🔥 URGENT (0-2 days)', '⏳ SOON (3-7 days)', '📅 LATER (7+ days)'],
      colors: ['#dc3545', '#ffc107', '#28a745'],
      title: {
        text: '⏰ SHIPPING TIMELINE - What Needs Attention When',
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number, opts: any) {
          return opts.w.config.series[opts.seriesIndex] + ' orders\n(' + val.toFixed(0) + '%)';
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '50%'
          }
        }
      },
      legend: {
        position: 'bottom',
        fontSize: '14px'
      }
    };
  }

  private calculateInsights(): void {
    this.insights = [];

    // Past due orders insight
    if (this.metrics.pastDueOrders > 0) {
      const pastDuePercentage = (this.metrics.pastDueOrders / this.metrics.totalOrders) * 100;
      this.insights.push({
        type: pastDuePercentage > 20 ? 'danger' : 'warning',
        title: 'Past Due Orders Alert',
        message: `${this.metrics.pastDueOrders} orders (${pastDuePercentage.toFixed(1)}%) are past due. This may impact customer satisfaction.`,
        action: 'Review past due orders and expedite shipping'
      });
    }

    // Unassigned orders insight
    if (this.metrics.unassignedOrders > 0) {
      const unassignedPercentage = (this.metrics.unassignedOrders / this.metrics.totalOrders) * 100;
      this.insights.push({
        type: unassignedPercentage > 10 ? 'warning' : 'info',
        title: 'Unassigned Tasks',
        message: `${this.metrics.unassignedOrders} orders (${unassignedPercentage.toFixed(1)}%) are not assigned to any team member.`,
        action: 'Assign orders to team members for better tracking'
      });
    }

    // Team workload balance insight
    if (this.metrics.teamWorkload.length > 0) {
      const maxWorkload = Math.max(...this.metrics.teamWorkload.map(t => t.orderCount));
      const minWorkload = Math.min(...this.metrics.teamWorkload.map(t => t.orderCount));
      const workloadDifference = maxWorkload - minWorkload;
      
      if (workloadDifference > 10) {
        this.insights.push({
          type: 'warning',
          title: 'Workload Imbalance',
          message: `Large workload difference detected (${workloadDifference} orders). Consider redistributing tasks.`,
          action: 'Balance workload across team members'
        });
      }
    }

    // High individual workload insight
    const overloadedMembers = this.metrics.teamWorkload.filter(t => t.orderCount > 20);
    if (overloadedMembers.length > 0) {
      this.insights.push({
        type: 'warning',
        title: 'High Individual Workload',
        message: `${overloadedMembers.length} team member(s) have more than 20 orders assigned.`,
        action: 'Review and possibly redistribute high workloads'
      });
    }

    // On-time delivery rate insight
    if (this.metrics.onTimeDeliveryRate < 80) {
      this.insights.push({
        type: 'warning',
        title: 'On-Time Delivery Rate',
        message: `Current on-time delivery rate is ${this.metrics.onTimeDeliveryRate.toFixed(1)}%. Target should be above 90%.`,
        action: 'Analyze lead time accuracy and shipping processes'
      });
    } else if (this.metrics.onTimeDeliveryRate > 95) {
      this.insights.push({
        type: 'success',
        title: 'Excellent Delivery Performance',
        message: `Outstanding on-time delivery rate of ${this.metrics.onTimeDeliveryRate.toFixed(1)}%!`,
      });
    }

    // Priority orders insight
    if (this.metrics.priorityOrdersCount > 0) {
      this.insights.push({
        type: 'info',
        title: 'Priority Orders Active',
        message: `${this.metrics.priorityOrdersCount} orders have shipping priority assignments.`,
        action: 'Monitor priority queue for optimal sequencing'
      });
    }

    // Team members with past due orders
    const membersWithPastDue = this.metrics.teamWorkload.filter(t => t.pastDue > 0);
    if (membersWithPastDue.length > 0) {
      this.insights.push({
        type: 'danger',
        title: 'Team Members with Past Due Orders',
        message: `${membersWithPastDue.length} team member(s) have past due orders requiring attention.`,
        action: 'Follow up with team members on past due items'
      });
    }

    // Lead time insight
    if (this.metrics.averageLeadTime > 90) {
      this.insights.push({
        type: 'warning',
        title: 'Extended Lead Times',
        message: `Average lead time is ${this.metrics.averageLeadTime.toFixed(0)} days. Consider process optimization.`,
        action: 'Review manufacturing and procurement schedules'
      });
    }

    // Operational issue insights
    if (this.metrics.ordersWithoutCost > 0) {
      this.insights.push({
        type: 'danger',
        title: 'Missing Cost Information',
        message: `${this.metrics.ordersWithoutCost} orders are missing cost/price information. This affects profitability tracking.`,
        action: 'Update cost information in ERP system before shipping'
      });
    }

    if (this.metrics.ordersWithoutListPrice > 0) {
      this.insights.push({
        type: 'warning',
        title: 'Missing List Price',
        message: `${this.metrics.ordersWithoutListPrice} orders are missing list price information. This may affect pricing accuracy.`,
        action: 'Verify and update list prices for accurate margin calculation'
      });
    }

    if (this.metrics.priorityDroppedOrders > 0) {
      this.insights.push({
        type: 'info',
        title: 'Priority Changes Detected',
        message: `${this.metrics.priorityDroppedOrders} orders have had priority changes that may need review.`,
        action: 'Review priority change reasons and validate current assignments'
      });
    }
  }

  // Helper methods for template
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercentage(value: number): string {
    return value.toFixed(1) + '%';
  }

  getInsightIcon(type: string): string {
    switch (type) {
      case 'success': return 'las la-check-circle';
      case 'warning': return 'las la-exclamation-triangle';
      case 'danger': return 'las la-exclamation-circle';
      case 'info': default: return 'las la-info-circle';
    }
  }

  // Service data methods (keeping for backwards compatibility)
  private loadShippingData(): void {
    // This is now handled by getData() method
    this.getData();
  }

  private processServiceData(): void {
    if (!this.orders.length) return;
    // Convert service data to component format if needed
    // This method can be used to transform ShippingOrder[] to ShippingData[] if required
  }

  private updateMetricsFromAnalytics(analytics: ShippingAnalytics): void {
    this.metrics = {
      totalOrders: analytics.totalOrders,
      pastDueOrders: analytics.pastDueOrders,
      dueTodayOrders: 0, // Calculate based on today's date
      futureOrders: analytics.totalOrders - analytics.pastDueOrders,
      averageLeadTime: analytics.averageLeadTime,
      onTimeDeliveryRate: analytics.onTimeDeliveryRate,
      priorityOrdersCount: analytics.priorityOrders,
      averageAge: 0, // Calculate from orders if needed
      assignedOrders: 0, // Will be calculated from order data
      unassignedOrders: 0, // Will be calculated from order data
      teamWorkload: [], // Will be calculated from order data
      topAssignees: [], // Will be calculated from order data
      workloadDistribution: [], // Will be calculated from order data
      ordersWithoutCost: 0, // Will be calculated from order data
      ordersWithoutListPrice: 0, // Will be calculated from order data
      priorityDroppedOrders: 0, // Will be calculated from order data
      pricingIssueOrders: [], // Will be calculated from order data
      priorityChangeHistory: [] // Will be calculated from order data
    };
  }

  private generateChartsFromAnalytics(analytics: ShippingAnalytics): void {
    this.generateStatusChartFromAnalytics(analytics);
    this.generateCustomerChartFromAnalytics(analytics);
    this.generateTrendsChartFromAnalytics(analytics);
    this.generateLeadTimeChartFromAnalytics(analytics);
  }

  private generateStatusChartFromAnalytics(analytics: ShippingAnalytics): void {
    const statuses = Object.keys(analytics.statusDistribution);
    const counts = Object.values(analytics.statusDistribution);

    this.orderStatusChart = {
      series: counts,
      chart: {
        type: 'donut',
        height: 350
      },
      labels: statuses,
      legend: {
        position: 'bottom'
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          },
          legend: {
            position: 'bottom'
          }
        }
      }]
    };
  }

  private generateCustomerChartFromAnalytics(analytics: ShippingAnalytics): void {
    const customers = Object.keys(analytics.customerDistribution);
    const counts = Object.values(analytics.customerDistribution);

    this.customerValueChart = {
      series: [{
        name: 'Orders',
        data: counts
      }],
      chart: {
        type: 'bar',
        height: 350
      },
      xaxis: {
        categories: customers
      },
      plotOptions: {
        bar: {
          distributed: true
        }
      }
    };
  }

  private generateTrendsChartFromAnalytics(analytics: ShippingAnalytics): void {
    this.trendsChart = {
      series: [{
        name: 'Orders',
        data: analytics.monthlyTrends.map(t => t.orders)
      }, {
        name: 'Value',
        data: analytics.monthlyTrends.map(t => t.value / 1000) // Convert to thousands
      }],
      chart: {
        type: 'line',
        height: 350
      },
      xaxis: {
        categories: analytics.monthlyTrends.map(t => t.month)
      },
      yaxis: [{
        title: {
          text: 'Orders'
        }
      }, {
        opposite: true,
        title: {
          text: 'Value (K)'
        }
      }]
    };
  }

  private generateLeadTimeChartFromAnalytics(analytics: ShippingAnalytics): void {
    this.leadTimeChart = {
      series: [{
        name: 'Orders',
        data: analytics.leadTimeDistribution.map(d => d.count)
      }],
      chart: {
        type: 'bar',
        height: 350
      },
      xaxis: {
        categories: analytics.leadTimeDistribution.map(d => d.range)
      }
    };
  }

  private calculateInsightsFromAnalytics(analytics: ShippingAnalytics): void {
    this.insights = [];

    // Past due analysis
    if (analytics.pastDueOrders > 0) {
      this.insights.push({
        type: 'danger',
        title: 'Past Due Orders',
        message: `${analytics.pastDueOrders} orders are past their estimated delivery date.`,
        action: 'Review and expedite past due shipments'
      });
    }

    // On-time delivery analysis
    if (analytics.onTimeDeliveryRate < 95) {
      this.insights.push({
        type: 'warning',
        title: 'On-Time Delivery Rate',
        message: `Current on-time rate is ${analytics.onTimeDeliveryRate.toFixed(1)}%. Target is 95%+.`,
        action: 'Analyze delivery bottlenecks and improve processes'
      });
    } else {
      this.insights.push({
        type: 'success',
        title: 'Excellent Delivery Performance',
        message: `On-time delivery rate of ${analytics.onTimeDeliveryRate.toFixed(1)}% exceeds target.`,
        action: 'Maintain current processes'
      });
    }

    // Priority orders
    if (analytics.priorityOrders > 0) {
      this.insights.push({
        type: 'info',
        title: 'Priority Orders',
        message: `${analytics.priorityOrders} high/critical priority orders require attention.`,
        action: 'Focus on priority order fulfillment'
      });
    }
  }
}