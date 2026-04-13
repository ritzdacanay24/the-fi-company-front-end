import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { SafetyIncidentService } from '@app/core/api/operations/safety-incident/safety-incident.service';
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

interface SafetyMetrics {
  totalIncidents: number;
  monthlyTrend: { month: string; count: number; year: number }[];
  incidentTypes: { type: string; count: number; color: string }[];
  locations: { location: string; count: number }[];
  closedVsOpen: { status: string; count: number }[];
  daysSinceLastIncident: number;
  longestSafetyStreak: number;
  averageResolutionDays: number;
  currentMonthIncidents: number;
  lastMonthIncidents: number;
  improvementPercentage: number;
  resolutionTrend: { month: string; avgDays: number }[];
  timeOfDayData: { hour: string; count: number }[];
  actionOwners: { owner: string; count: number }[];
}

@Component({
  selector: 'app-safety-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './safety-dashboard.component.html',
  styleUrls: ['./safety-dashboard.component.scss']
})
export class SafetyDashboardComponent implements OnInit, OnDestroy {
  
  @Input() isDisplayMode: boolean = false;
  @Input() showDisplayButton: boolean = true;
  @Input() autoRefreshInterval: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  public Math = Math; // Expose Math to template
  
  public monthlyTrendChart: Partial<ChartOptions> = {};
  public incidentTypeChart: Partial<ChartOptions> = {};
  public locationChart: Partial<ChartOptions> = {};
  public statusChart: Partial<ChartOptions> = {};
  public resolutionTimeChart: Partial<ChartOptions> = {};
  public timeOfDayChart: Partial<ChartOptions> = {};
  public actionOwnerChart: Partial<ChartOptions> = {};

  public metrics: SafetyMetrics = {
    totalIncidents: 0,
    monthlyTrend: [],
    incidentTypes: [],
    locations: [],
    closedVsOpen: [],
    daysSinceLastIncident: 0,
    longestSafetyStreak: 0,
    averageResolutionDays: 0,
    currentMonthIncidents: 0,
    lastMonthIncidents: 0,
    improvementPercentage: 0,
    resolutionTrend: [],
    timeOfDayData: [],
    actionOwners: []
  };

  public isLoading = true;
  public lastUpdated = new Date();
  private data: any[] = [];
  private refreshInterval: any;
  private timestampInterval: any;

  constructor(
    private safetyService: SafetyIncidentService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    // Check if this is display mode from route
    this.route.url.subscribe(segments => {
      this.isDisplayMode = segments.some(segment => segment.path === 'safety-dashboard-display');
      this.showDisplayButton = !this.isDisplayMode;
    });

    await this.loadSafetyData();
    
    // Set up timestamp update interval
    this.timestampInterval = setInterval(() => {
      this.lastUpdated = new Date();
    }, 60000); // Update timestamp every minute

    // Set up auto-refresh for display mode
    if (this.isDisplayMode || this.autoRefreshInterval > 0) {
      this.refreshInterval = setInterval(() => {
        this.loadSafetyData();
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

  private async loadSafetyData() {
    try {
      this.isLoading = true;
      const data = await this.safetyService.getList('All', '', '', true);
      this.data = data; // Store data for use in calculation methods
      this.processData(data);
      this.setupCharts();
    } catch (error) {
      console.error('Error loading safety data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private processData(data: any[]) {
    // Calculate metrics
    this.metrics.totalIncidents = data.length;
    
    // Days since last incident and longest safety streak
    const sortedIncidents = data.sort((a, b) => 
      new Date(a.date_of_incident).getTime() - new Date(b.date_of_incident).getTime()
    );
    
    if (sortedIncidents.length > 0) {
      // Days since last incident
      const latestIncident = sortedIncidents[sortedIncidents.length - 1];
      const lastIncidentDate = new Date(latestIncident.date_of_incident);
      const today = new Date();
      this.metrics.daysSinceLastIncident = Math.floor(
        (today.getTime() - lastIncidentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate longest safety streak (historical record to beat)
      this.metrics.longestSafetyStreak = this.calculateLongestSafetyStreak(sortedIncidents);
    } else {
      // No incidents means we're still on our first streak
      // Assume company started 1 year ago for current streak calculation
      this.metrics.daysSinceLastIncident = 365; 
      // No historical record to beat yet
      this.metrics.longestSafetyStreak = 0;
    }

    // Monthly trend (last 12 months)
    this.metrics.monthlyTrend = this.calculateMonthlyTrend(data);
    
    // Current vs last month comparison
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    this.metrics.currentMonthIncidents = data.filter(incident => {
      const incidentDate = new Date(incident.date_of_incident);
      return incidentDate.getMonth() === currentMonth && incidentDate.getFullYear() === currentYear;
    }).length;

    this.metrics.lastMonthIncidents = data.filter(incident => {
      const incidentDate = new Date(incident.date_of_incident);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return incidentDate.getMonth() === lastMonth && incidentDate.getFullYear() === lastMonthYear;
    }).length;

    // Calculate improvement percentage
    if (this.metrics.lastMonthIncidents > 0) {
      this.metrics.improvementPercentage = 
        ((this.metrics.lastMonthIncidents - this.metrics.currentMonthIncidents) / this.metrics.lastMonthIncidents) * 100;
    }

    // Incident types
    const typeCount = new Map();
    data.forEach(incident => {
      const type = incident.type_of_incident || 'Other';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });

    const typeColors = [
      '#28a745', // Green for Near miss
      '#ffc107', // Yellow for Safety Procedure
      '#dc3545', // Red for Buildings/Product Damage
      '#6f42c1', // Purple for Other
      '#fd7e14'  // Orange for additional types
    ];

    this.metrics.incidentTypes = Array.from(typeCount.entries()).map(([type, count], index) => ({
      type,
      count,
      color: typeColors[index % typeColors.length]
    }));

    // Locations
    const locationCount = new Map();
    data.forEach(incident => {
      const location = incident.location_of_incident_other || incident.location_of_incident || 'Unknown';
      locationCount.set(location, (locationCount.get(location) || 0) + 1);
    });

    this.metrics.locations = Array.from(locationCount.entries()).map(([location, count]) => ({
      location,
      count
    }));

    // Status breakdown
    const statusCount = new Map();
    data.forEach(incident => {
      const status = incident.status || 'Unknown';
      statusCount.set(status, (statusCount.get(status) || 0) + 1);
    });

    this.metrics.closedVsOpen = Array.from(statusCount.entries()).map(([status, count]) => ({
      status,
      count
    }));

    // Average resolution days
    const closedIncidents = data.filter(incident => 
      incident.status === 'Closed' && 
      incident.confirmed_corrective_action_completion_date &&
      incident.date_of_incident
    );

    if (closedIncidents.length > 0) {
      const totalDays = closedIncidents.reduce((sum, incident) => {
        const startDate = new Date(incident.date_of_incident);
        const endDate = new Date(incident.confirmed_corrective_action_completion_date);
        return sum + Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      
      this.metrics.averageResolutionDays = Math.round(totalDays / closedIncidents.length);
    }

    // Resolution time trend (last 6 months)
    this.metrics.resolutionTrend = this.calculateResolutionTrend();

    // Time of day analysis
    this.metrics.timeOfDayData = this.calculateTimeOfDayData();

    // Action owners analysis
    this.metrics.actionOwners = this.calculateActionOwners();
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
      
      const count = data.filter(incident => {
        const incidentDate = new Date(incident.date_of_incident);
        return incidentDate.getMonth() === date.getMonth() && 
               incidentDate.getFullYear() === date.getFullYear();
      }).length;
      
      last12Months.push({ month, count, year });
    }
    
    return last12Months;
  }

  private setupCharts() {
    this.setupMonthlyTrendChart();
    this.setupIncidentTypeChart();
    this.setupLocationChart();
    this.setupStatusChart();
    this.setupResolutionTimeChart();
    this.setupTimeOfDayChart();
    this.setupActionOwnerChart();
  }

  private setupMonthlyTrendChart() {
    const incidentData = this.metrics.monthlyTrend.map(m => m.count);
    const average = incidentData.reduce((sum, count) => sum + count, 0) / incidentData.length;
    const averageData = new Array(incidentData.length).fill(Math.round(average * 10) / 10);

    this.monthlyTrendChart = {
      series: [
        {
          name: 'Incidents',
          data: incidentData
        },
        {
          name: 'Average',
          data: averageData
        }
      ],
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: false },
        background: 'transparent'
      },
      colors: ['#28a745', '#dc3545'],
      stroke: {
        curve: 'smooth',
        width: [4, 2],
        dashArray: [0, 5]
      },
      markers: {
        size: [6, 0],
        colors: ['#28a745', '#dc3545'],
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
          text: 'Number of Incidents',
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
        text: 'Monthly Incident Trend',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    };
  }

  private setupIncidentTypeChart() {
    this.incidentTypeChart = {
      series: this.metrics.incidentTypes.map(t => t.count),
      chart: {
        type: 'donut',
        height: 350,
        toolbar: { show: false }
      },
      labels: this.metrics.incidentTypes.map(t => t.type),
      colors: this.metrics.incidentTypes.map(t => t.color),
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
        text: 'Incidents by Type',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    } as any;
  }

  private setupLocationChart() {
    this.locationChart = {
      series: [{
        name: 'Incidents',
        data: this.metrics.locations.map(l => l.count)
      }],
      chart: {
        type: 'bar',
        height: 350,
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
        categories: this.metrics.locations.map(l => l.location),
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
        text: 'Incidents by Location',
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
      series: this.metrics.closedVsOpen.map(s => s.count),
      chart: {
        type: 'pie',
        height: 300,
        toolbar: { show: false }
      },
      labels: this.metrics.closedVsOpen.map(s => s.status),
      colors: ['#28a745', '#dc3545', '#ffc107'],
      legend: {
        position: 'bottom',
        fontSize: '14px'
      },
      title: {
        text: 'Resolution Status',
        align: 'center',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }
      }
    } as any;
  }

  public refresh() {
    this.loadSafetyData();
  }

  public openDisplayMode() {
    console.log('Display mode button clicked!'); // Debug log
    try {
      // Try to open in new window/tab first
      const newWindow = window.open('/safety-dashboard-display', '_blank', 'width=1920,height=1080,scrollbars=yes,resizable=yes');
      
      // Fallback if popup blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        console.log('Popup blocked, using router navigation');
        // Navigate in current window
        this.router.navigate(['/safety-dashboard-display']);
      }
    } catch (error) {
      console.error('Error opening display mode:', error);
      // Fallback navigation
      this.router.navigate(['/safety-dashboard-display']);
    }
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
    if (this.metrics.daysSinceLastIncident > 30) return 'text-success';
    if (this.metrics.daysSinceLastIncident > 14) return 'text-warning';
    return 'text-danger';
  }

  private navigateToList(): void {
    this.router.navigate(['/operations/forms/safety-incident/list']);
  }

  private navigateToCreate(): void {
    this.router.navigate(['/operations/forms/safety-incident/create']);
  }

  private calculateResolutionTrend(): { month: string; avgDays: number }[] {
    const monthlyData = new Map<string, { totalTime: number; count: number }>();
    
    this.data.forEach(incident => {
      if (incident.status === 'Closed' && incident.created_date && incident.confirmed_corrective_action_completion_date) {
        const created = new Date(incident.created_date);
        const resolved = new Date(incident.confirmed_corrective_action_completion_date);
        const monthKey = created.toISOString().substring(0, 7); // YYYY-MM format
        const resolutionTime = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { totalTime: 0, count: 0 });
        }
        
        const data = monthlyData.get(monthKey)!;
        data.totalTime += resolutionTime;
        data.count += 1;
      }
    });
    
    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        avgDays: Math.round(data.totalTime / data.count * 10) / 10
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }

  private calculateTimeOfDayData(): { hour: string; count: number }[] {
    const hourlyData = new Map<number, number>();
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyData.set(i, 0);
    }
    
    this.data.forEach(incident => {
      if (incident.time_of_incident) {
        // Parse time string like "11:05:00" or "08:30:00"
        const timeParts = incident.time_of_incident.split(':');
        const hour = parseInt(timeParts[0], 10);
        if (hour >= 0 && hour <= 23) {
          hourlyData.set(hour, hourlyData.get(hour)! + 1);
        }
      }
    });
    
    return Array.from(hourlyData.entries())
      .map(([hour, count]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        count
      }));
  }

  private calculateActionOwners(): { owner: string; count: number }[] {
    const ownerData = new Map<string, number>();
    
    this.data.forEach(incident => {
      if (incident.corrective_action_owner) {
        const owner = incident.corrective_action_owner;
        ownerData.set(owner, (ownerData.get(owner) || 0) + 1);
      }
    });
    
    return Array.from(ownerData.entries())
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }

  private setupResolutionTimeChart(): void {
    const data = this.calculateResolutionTrend();
    
    if (data.length === 0) {
      this.resolutionTimeChart = {
        series: [],
        chart: {
          type: 'line',
          height: 350,
          background: '#ffffff',
          toolbar: { show: false }
        },
        title: {
          text: 'Resolution Time Trend',
          style: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }
        },
        noData: {
          text: 'No resolution data available'
        }
      };
      return;
    }
    
    this.resolutionTimeChart = {
      series: [{
        name: 'Avg Days to Resolve',
        data: data.map(d => d.avgDays)
      }],
      chart: {
        type: 'line',
        height: 350,
        background: '#ffffff',
        toolbar: { show: false }
      },
      colors: ['#17a2b8'],
      title: {
        text: 'Resolution Time Trend',
        style: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      markers: {
        size: 5,
        colors: ['#17a2b8'],
        strokeColors: '#fff',
        strokeWidth: 2
      },
      xaxis: {
        categories: data.map(d => d.month),
        labels: {
          style: { fontSize: '12px', fontWeight: 'bold' }
        }
      },
      yaxis: {
        title: {
          text: 'Days',
          style: { fontSize: '14px', fontWeight: 'bold' }
        }
      },
      grid: {
        borderColor: '#e7e7e7'
      }
    };
  }

  private setupTimeOfDayChart(): void {
    const data = this.calculateTimeOfDayData();
    const hasData = data.some(d => d.count > 0);
    
    if (!hasData) {
      this.timeOfDayChart = {
        series: [],
        chart: {
          type: 'bar',
          height: 350,
          background: '#ffffff',
          toolbar: { show: false }
        },
        title: {
          text: 'Incidents by Time of Day',
          style: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }
        },
        noData: {
          text: 'No time data available'
        }
      };
      return;
    }
    
    this.timeOfDayChart = {
      series: [{
        name: 'Incidents',
        data: data.map(d => d.count)
      }],
      chart: {
        type: 'bar',
        height: 350,
        background: '#ffffff',
        toolbar: { show: false }
      },
      colors: ['#fd7e14'],
      title: {
        text: 'Incidents by Time of Day',
        style: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false
        }
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: data.map(d => d.hour),
        labels: {
          style: { fontSize: '12px', fontWeight: 'bold' }
        }
      },
      yaxis: {
        title: {
          text: 'Number of Incidents',
          style: { fontSize: '14px', fontWeight: 'bold' }
        }
      },
      grid: {
        borderColor: '#e7e7e7'
      }
    };
  }

  private setupActionOwnerChart(): void {
    const data = this.calculateActionOwners();
    
    if (data.length === 0) {
      this.actionOwnerChart = {
        series: [0],
        chart: {
          type: 'pie',
          height: 350,
          background: '#ffffff'
        },
        labels: ['No Data'],
        colors: ['#e9ecef'],
        title: {
          text: 'Top Action Owners',
          style: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }
        },
        noData: {
          text: 'No corrective action owners found'
        }
      };
      return;
    }
    
    this.actionOwnerChart = {
      series: [{
        name: 'Actions',
        data: data.map(d => d.count)
      }],
      chart: {
        type: 'bar',
        height: 350,
        background: '#ffffff',
        toolbar: { show: false }
      },
      colors: ['#28a745'],
      title: {
        text: 'Top Action Owners',
        style: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: true
        }
      },
      dataLabels: {
        enabled: true
      },
      xaxis: {
        categories: data.map(d => d.owner),
        labels: {
          style: { fontSize: '12px', fontWeight: 'bold' }
        }
      },
      yaxis: {
        title: {
          text: 'Action Owner',
          style: { fontSize: '14px', fontWeight: 'bold' }
        }
      },
      grid: {
        borderColor: '#e7e7e7'
      }
    };
  }

  private calculateLongestSafetyStreak(sortedIncidents: any[]): number {
    if (sortedIncidents.length === 0) {
      // No incidents means we don't have a historical record to beat yet
      // Return 0 so current streak becomes the record
      return 0;
    }

    if (sortedIncidents.length === 1) {
      // Only one incident, the record would be the days before that first incident
      // Assume company started operations some reasonable time before (e.g., 90 days)
      const incidentDate = new Date(sortedIncidents[0].date_of_incident);
      const assumedStart = new Date(incidentDate);
      assumedStart.setDate(assumedStart.getDate() - 90); // 90 days before first incident
      const daysBeforeFirstIncident = Math.floor((incidentDate.getTime() - assumedStart.getTime()) / (1000 * 60 * 60 * 24));
      return daysBeforeFirstIncident;
    }

    let maxStreak = 0;
    
    // Check streak before first incident (assume company started 90 days before first incident)
    const firstIncidentDate = new Date(sortedIncidents[0].date_of_incident);
    const assumedCompanyStart = new Date(firstIncidentDate);
    assumedCompanyStart.setDate(assumedCompanyStart.getDate() - 90);
    const initialStreak = Math.floor((firstIncidentDate.getTime() - assumedCompanyStart.getTime()) / (1000 * 60 * 60 * 24));
    maxStreak = Math.max(maxStreak, initialStreak);

    // Check streaks between incidents (this is the key part - gaps between accidents)
    for (let i = 0; i < sortedIncidents.length - 1; i++) {
      const currentIncidentDate = new Date(sortedIncidents[i].date_of_incident);
      const nextIncidentDate = new Date(sortedIncidents[i + 1].date_of_incident);
      
      const streakDays = Math.floor((nextIncidentDate.getTime() - currentIncidentDate.getTime()) / (1000 * 60 * 60 * 24));
      maxStreak = Math.max(maxStreak, streakDays);
    }

    // Do NOT include current streak in the record - that's what we're trying to beat!
    // The record is the longest COMPLETED streak between past incidents

    return maxStreak;
  }
}