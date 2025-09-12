import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
export class SafetyDashboardComponent implements OnInit {
  
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

  constructor(private safetyService: SafetyIncidentService, private router: Router) {}

  async ngOnInit() {
    await this.loadSafetyData();
    setInterval(() => {
      this.lastUpdated = new Date();
    }, 60000); // Update timestamp every minute
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
    
    // Days since last incident
    const latestIncident = data.sort((a, b) => 
      new Date(b.date_of_incident).getTime() - new Date(a.date_of_incident).getTime()
    )[0];
    
    if (latestIncident) {
      const lastIncidentDate = new Date(latestIncident.date_of_incident);
      const today = new Date();
      this.metrics.daysSinceLastIncident = Math.floor(
        (today.getTime() - lastIncidentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
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
    this.monthlyTrendChart = {
      series: [{
        name: 'Incidents',
        data: this.metrics.monthlyTrend.map(m => m.count)
      }],
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: false },
        background: 'transparent'
      },
      colors: ['#28a745'],
      stroke: {
        curve: 'smooth',
        width: 4
      },
      markers: {
        size: 6,
        colors: ['#28a745'],
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
        theme: 'dark'
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
}