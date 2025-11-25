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
  thisemes?:any;
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
  selector: 'app-safety-dashboard-display',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="standalone-safety-display">
      <!-- Full Screen Toggle Button -->
      <div class="position-fixed top-0 end-0 p-3" style="z-index: 1050;">
        <button 
          class="btn btn-primary btn-sm shadow" 
          (click)="toggleFullscreen()"
          [title]="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'">
          <i class="mdi" [ngClass]="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"></i>
          {{isFullscreen ? 'Exit' : 'Fullscreen'}}
        </button>
      </div>

      <!-- Header Section - Optimized for Display -->
      <div class="dashboard-header text-center py-5 px-4 mb-4" 
           style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
        <div class="d-flex align-items-center justify-content-center mb-4">
          <div class="bg-white rounded-circle me-4 shadow d-flex align-items-center justify-content-center" 
               style="width: 100px; height: 100px;">
            <i class="mdi mdi-shield-check text-success" style="font-size: 3rem;"></i>
          </div>
          <div class="text-white">
            <h1 class="mb-0 display-2 fw-bold">Safety Dashboard</h1>
            <p class="mb-0 fs-3 opacity-90">Working Together for a Safer Tomorrow</p>
          </div>
        </div>
        
        <!-- Key Metrics Row - Large Display -->
        <div class="row text-center mt-4 g-3">
          <div class="col-lg-2 col-md-4">
            <div class="metric-card bg-white rounded-lg p-4 shadow h-100">
              <div class="metric-value display-4 fw-bold" [ngClass]="getDaysSinceColor()">
                {{metrics.daysSinceLastIncident}}
              </div>
              <div class="metric-label text-muted fs-5">Days Since Last Incident</div>
            </div>
          </div>
          <div class="col-lg-2 col-md-4">
            <div class="metric-card bg-white rounded-lg p-4 shadow h-100">
              <div class="metric-value display-4 fw-bold text-success">
                {{metrics.longestSafetyStreak}}
              </div>
              <div class="metric-label text-muted fs-5">Record to Beat</div>
            </div>
          </div>
          <div class="col-lg-2 col-md-4">
            <div class="metric-card bg-white rounded-lg p-4 shadow h-100">
              <div class="metric-value display-4 fw-bold text-primary">
                {{metrics.totalIncidents}}
              </div>
              <div class="metric-label text-muted fs-5">Total Incidents</div>
            </div>
          </div>
          <div class="col-lg-2 col-md-4">
            <div class="metric-card bg-white rounded-lg p-4 shadow h-100">
              <div class="metric-value display-4 fw-bold text-info">
                {{metrics.averageResolutionDays}}
              </div>
              <div class="metric-label text-muted fs-5">Avg. Resolution</div>
            </div>
          </div>
          <div class="col-lg-2 col-md-4">
            <div class="metric-card bg-white rounded-lg p-4 shadow h-100">
              <div class="d-flex align-items-center justify-content-center">
                <span class="metric-value display-4 fw-bold" [ngClass]="getPerformanceColor()">
                  {{Math.abs(metrics.improvementPercentage).toFixed(1)}}%
                </span>
                <i class="mdi ms-2" style="font-size: 2rem;" [ngClass]="getPerformanceIcon() + ' ' + getPerformanceColor()"></i>
              </div>
              <div class="metric-label text-muted fs-5">Monthly Performance</div>
            </div>
          </div>
          <div class="col-lg-2 col-md-4">
            <div class="metric-card bg-white rounded-lg p-4 shadow h-100">
              <div class="d-flex align-items-center justify-content-center">
                <i class="mdi mdi-trophy text-warning me-2" style="font-size: 2rem;"></i>
                <span class="metric-value fs-3 fw-bold" [ngClass]="metrics.daysSinceLastIncident >= metrics.longestSafetyStreak ? 'text-success' : 'text-muted'">
                  {{metrics.daysSinceLastIncident >= metrics.longestSafetyStreak ? 'NEW RECORD!' : 'In Progress'}}
                </span>
              </div>
              <div class="metric-label text-muted fs-5">Safety Challenge</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section - Optimized for Display -->
      <div class="container-fluid" *ngIf="!isLoading">
        <div class="row g-4">
          
          <!-- Monthly Trend Chart -->
          <div class="col-lg-8 mb-4">
            <div class="card shadow h-100">
              <div class="card-body">
                <apx-chart
                  [series]="monthlyTrendChart.series"
                  [chart]="monthlyTrendChart.chart"
                  [xaxis]="monthlyTrendChart.xaxis"
                  [yaxis]="monthlyTrendChart.yaxis"
                  [stroke]="monthlyTrendChart.stroke"
                  [markers]="monthlyTrendChart.markers"
                  [grid]="monthlyTrendChart.grid"
                  [colors]="monthlyTrendChart.colors"
                  [title]="monthlyTrendChart.title"
                  [tooltip]="monthlyTrendChart.tooltip">
                </apx-chart>
              </div>
            </div>
          </div>

          <!-- Status Chart -->
          <div class="col-lg-4 mb-4">
            <div class="card shadow h-100">
              <div class="card-body">
                <apx-chart
                  [series]="statusChart.series"
                  [chart]="statusChart.chart"
                  [labels]="statusChart.labels"
                  [colors]="statusChart.colors"
                  [legend]="statusChart.legend"
                  [title]="statusChart.title">
                </apx-chart>
              </div>
            </div>
          </div>

          <!-- Incident Types Chart -->
          <div class="col-lg-6 mb-4">
            <div class="card shadow h-100">
              <div class="card-body">
                <apx-chart
                  [series]="incidentTypeChart.series"
                  [chart]="incidentTypeChart.chart"
                  [labels]="incidentTypeChart.labels"
                  [colors]="incidentTypeChart.colors"
                  [plotOptions]="incidentTypeChart.plotOptions"
                  [legend]="incidentTypeChart.legend"
                  [title]="incidentTypeChart.title">
                </apx-chart>
              </div>
            </div>
          </div>

          <!-- Location Chart -->
          <div class="col-lg-6 mb-4">
            <div class="card shadow h-100">
              <div class="card-body">
                <apx-chart
                  [series]="locationChart.series"
                  [chart]="locationChart.chart"
                  [plotOptions]="locationChart.plotOptions"
                  [xaxis]="locationChart.xaxis"
                  [yaxis]="locationChart.yaxis"
                  [colors]="locationChart.colors"
                  [title]="locationChart.title">
                </apx-chart>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="container-fluid" *ngIf="isLoading">
        <div class="row">
          <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted fs-4">Loading safety data...</p>
          </div>
        </div>
      </div>

      <!-- Safety Message -->
      <div class="container-fluid mt-4">
        <div class="row">
          <div class="col-12">
            <div class="alert alert-info border-0 shadow">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0 me-3">
                  <i class="mdi mdi-lightbulb-on text-info" style="font-size: 2.5rem;"></i>
                </div>
                <div class="flex-grow-1">
                  <h4 class="alert-heading text-info mb-2">Safety Reminder</h4>
                  <p class="mb-2 fs-5">
                    <strong>Every incident is an opportunity to improve.</strong> 
                    Report all near-misses, incidents, and safety concerns immediately.
                  </p>
                  <p class="mb-0 fs-5">
                    <i class="mdi mdi-clock-outline me-1"></i>
                    Together we can maintain our goal of <strong>zero workplace incidents</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="container-fluid mt-4">
        <div class="row">
          <div class="col-12">
            <div class="text-center text-muted">
              <div class="d-flex align-items-center justify-content-between">
                <div class="fs-5">
                  <i class="mdi mdi-update me-1"></i>
                  Last updated: {{lastUpdated | date:'short'}}
                </div>
                <div>
                  <button class="btn btn-outline-primary" (click)="refresh()">
                    <i class="mdi mdi-refresh me-2"></i>Refresh Data
                  </button>
                </div>
                <div class="fs-5">
                  <i class="mdi mdi-shield-check me-1 text-success"></i>
                  Safety First - Always
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .standalone-safety-display {
      min-height: 100vh;
      background: #f8f9fa;
      padding: 20px;
    }
    
    .dashboard-header {
      border-radius: 20px;
    }
    
    .metric-card {
      transition: transform 0.2s ease;
      border-radius: 15px;
    }
    
    .metric-card:hover {
      transform: translateY(-5px);
    }
    
    .metric-value {
      font-weight: 900;
      letter-spacing: -1px;
    }
    
    .metric-label {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Fullscreen styles */
    .fullscreen-mode {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      background: #f8f9fa;
      overflow-y: auto;
    }
    
    @media (max-width: 768px) {
      .display-2 {
        font-size: 2.5rem;
      }
      
      .display-4 {
        font-size: 1.8rem;
      }
      
      .metric-card {
        margin-bottom: 1rem;
      }
    }
  `]
})
export class SafetyDashboardDisplayComponent implements OnInit {
  
  public Math = Math;
  public isFullscreen = false;
  
  public monthlyTrendChart: Partial<ChartOptions> = {};
  public incidentTypeChart: Partial<ChartOptions> = {};
  public locationChart: Partial<ChartOptions> = {};
  public statusChart: Partial<ChartOptions> = {};

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

  constructor(private safetyService: SafetyIncidentService) {}

  ngOnInit() {
    this.loadData();
    // Auto-refresh every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.refresh();
    }, 5 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    const element = document.querySelector('.standalone-safety-display') as HTMLElement;
    
    if (this.isFullscreen) {
      element.classList.add('fullscreen-mode');
      document.body.style.overflow = 'hidden';
    } else {
      element.classList.remove('fullscreen-mode');
      document.body.style.overflow = 'auto';
    }
  }

  async loadData() {
    try {
      this.isLoading = true;
      this.data = await this.safetyService.getList('all', '', '', true);
      this.processData(this.data);
      this.initializeCharts();
      this.lastUpdated = new Date();
    } catch (error) {
      console.error('Error loading safety data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  refresh() {
    this.loadData();
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

      // Calculate longest safety streak
      this.metrics.longestSafetyStreak = this.calculateLongestSafetyStreak(sortedIncidents);
    } else {
      // No incidents means we're still on our first streak
      this.metrics.daysSinceLastIncident = 365; // Assume 1 year if no incidents
      this.metrics.longestSafetyStreak = 365;
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

    // Average resolution days
    const resolvedIncidents = data.filter(incident => incident.date_resolved);
    if (resolvedIncidents.length > 0) {
      const totalResolutionDays = resolvedIncidents.reduce((sum, incident) => {
        const createdDate = new Date(incident.date_of_incident);
        const resolvedDate = new Date(incident.date_resolved);
        const resolutionDays = Math.floor((resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + resolutionDays;
      }, 0);
      this.metrics.averageResolutionDays = Math.round(totalResolutionDays / resolvedIncidents.length);
    }

    // Process other metrics for charts
    this.processIncidentTypes(data);
    this.processLocations(data);
    this.processClosedVsOpen(data);
  }

  private calculateLongestSafetyStreak(sortedIncidents: any[]): number {
    if (sortedIncidents.length === 0) {
      return 0; // No history means no streak record
    }

    if (sortedIncidents.length === 1) {
      // Only one incident, check time before it (assume company started 1 year before)
      const incidentDate = new Date(sortedIncidents[0].date_of_incident);
      const companyStart = new Date(incidentDate);
      companyStart.setFullYear(companyStart.getFullYear() - 1);
      return Math.floor((incidentDate.getTime() - companyStart.getTime()) / (1000 * 60 * 60 * 24));
    }

    let maxStreak = 0;
    
    // Check streak before first incident (assume company started 1 year before)
    const firstIncidentDate = new Date(sortedIncidents[0].date_of_incident);
    const assumedCompanyStart = new Date(firstIncidentDate);
    assumedCompanyStart.setFullYear(assumedCompanyStart.getFullYear() - 1);
    const initialStreak = Math.floor((firstIncidentDate.getTime() - assumedCompanyStart.getTime()) / (1000 * 60 * 60 * 24));
    maxStreak = Math.max(maxStreak, initialStreak);

    // Check streaks between incidents
    for (let i = 0; i < sortedIncidents.length - 1; i++) {
      const currentIncidentDate = new Date(sortedIncidents[i].date_of_incident);
      const nextIncidentDate = new Date(sortedIncidents[i + 1].date_of_incident);
      
      const streakDays = Math.floor((nextIncidentDate.getTime() - currentIncidentDate.getTime()) / (1000 * 60 * 60 * 24)) - 1;
      maxStreak = Math.max(maxStreak, streakDays);
    }

    return maxStreak;
  }

  private calculateMonthlyTrend(data: any[]) {
    const months = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthData = {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear(),
        count: 0
      };
      
      monthData.count = data.filter(incident => {
        const incidentDate = new Date(incident.date_of_incident);
        return incidentDate.getMonth() === date.getMonth() && 
               incidentDate.getFullYear() === date.getFullYear();
      }).length;
      
      months.push(monthData);
    }
    
    return months;
  }

  private processIncidentTypes(data: any[]) {
    const typeCount = new Map();
    data.forEach(incident => {
      const type = incident.type_of_incident || 'Other';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });

    const typeColors = ['#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'];
    this.metrics.incidentTypes = Array.from(typeCount.entries()).map(([type, count], index) => ({
      type,
      count,
      color: typeColors[index % typeColors.length]
    }));
  }

  private processLocations(data: any[]) {
    const locationCount = new Map();
    data.forEach(incident => {
      const location = incident.location || 'Unknown';
      locationCount.set(location, (locationCount.get(location) || 0) + 1);
    });

    this.metrics.locations = Array.from(locationCount.entries()).map(([location, count]) => ({
      location,
      count
    }));
  }

  private processClosedVsOpen(data: any[]) {
    const statusCount = new Map();
    data.forEach(incident => {
      const status = incident.date_resolved ? 'Closed' : 'Open';
      statusCount.set(status, (statusCount.get(status) || 0) + 1);
    });

    this.metrics.closedVsOpen = Array.from(statusCount.entries()).map(([status, count]) => ({
      status,
      count
    }));
  }

  private initializeCharts() {
    this.initializeMonthlyTrendChart();
    this.initializeIncidentTypeChart();
    this.initializeLocationChart();
    this.initializeStatusChart();
  }

  private initializeMonthlyTrendChart() {
    this.monthlyTrendChart = {
      series: [{
        name: 'Incidents',
        data: this.metrics.monthlyTrend.map(m => m.count)
      }],
      chart: {
        type: 'line',
        height: 400,
        background: '#ffffff',
        toolbar: { show: false }
      },
      colors: ['#dc3545'],
      stroke: {
        curve: 'smooth',
        width: 3
      },
      markers: {
        size: 6,
        colors: ['#ffffff'],
        strokeColors: '#dc3545',
        strokeWidth: 2,
        hover: { size: 8 }
      },
      xaxis: {
        categories: this.metrics.monthlyTrend.map(m => `${m.month} ${m.year}`),
        labels: {
          style: { fontSize: '14px', fontWeight: 'bold' }
        }
      },
      yaxis: {
        title: {
          text: 'Number of Incidents',
          style: { fontSize: '14px', fontWeight: 'bold' }
        }
      },
      title: {
        text: 'Monthly Incident Trend',
        style: { fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }
      },
      grid: {
        borderColor: '#e7e7e7'
      }
    };
  }

  private initializeIncidentTypeChart() {
    if (this.metrics.incidentTypes.length === 0) {
      this.incidentTypeChart = {
        series: [1],
        chart: { type: 'pie', height: 350 },
        labels: ['No Data'],
        colors: ['#e9ecef'],
        title: {
          text: 'Incident Types',
          style: { fontSize: '18px', fontWeight: 'bold' }
        }
      };
      return;
    }

    this.incidentTypeChart = {
      series: this.metrics.incidentTypes.map(t => t.count),
      chart: {
        type: 'pie',
        height: 350,
        background: '#ffffff'
      },
      labels: this.metrics.incidentTypes.map(t => t.type),
      colors: this.metrics.incidentTypes.map(t => t.color),
      title: {
        text: 'Incident Types',
        style: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }
      },
      legend: {
        position: 'bottom'
      }
    };
  }

  private initializeLocationChart() {
    if (this.metrics.locations.length === 0) {
      this.locationChart = {
        series: [{
          name: 'Incidents',
          data: [1]
        }],
        chart: { type: 'bar', height: 350 },
        xaxis: { categories: ['No Data'] },
        title: {
          text: 'Incidents by Location',
          style: { fontSize: '18px', fontWeight: 'bold' }
        }
      };
      return;
    }

    this.locationChart = {
      series: [{
        name: 'Incidents',
        data: this.metrics.locations.map(l => l.count)
      }],
      chart: {
        type: 'bar',
        height: 350,
        background: '#ffffff',
        toolbar: { show: false }
      },
      colors: ['#17a2b8'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false
        }
      },
      xaxis: {
        categories: this.metrics.locations.map(l => l.location),
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
      title: {
        text: 'Incidents by Location',
        style: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }
      }
    };
  }

  private initializeStatusChart() {
    if (this.metrics.closedVsOpen.length === 0) {
      this.statusChart = {
        series: [1],
        chart: { type: 'donut', height: 350 },
        labels: ['No Data'],
        colors: ['#e9ecef'],
        title: {
          text: 'Incident Status',
          style: { fontSize: '18px', fontWeight: 'bold' }
        }
      };
      return;
    }

    this.statusChart = {
      series: this.metrics.closedVsOpen.map(s => s.count),
      chart: {
        type: 'donut',
        height: 350,
        background: '#ffffff'
      },
      labels: this.metrics.closedVsOpen.map(s => s.status),
      colors: ['#28a745', '#ffc107'],
      title: {
        text: 'Incident Status',
        style: { fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }
      },
      legend: {
        position: 'bottom'
      }
    };
  }

  getDaysSinceColor(): string {
    if (this.metrics.daysSinceLastIncident > 30) return 'text-success';
    if (this.metrics.daysSinceLastIncident > 14) return 'text-warning';
    return 'text-danger';
  }

  getPerformanceColor(): string {
    if (this.metrics.improvementPercentage > 0) return 'text-success';
    if (this.metrics.improvementPercentage < 0) return 'text-danger';
    return 'text-muted';
  }

  getPerformanceIcon(): string {
    if (this.metrics.improvementPercentage > 0) return 'mdi-trending-up';
    if (this.metrics.improvementPercentage < 0) return 'mdi-trending-down';
    return 'mdi-trending-neutral';
  }
}