import { Injectable } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

@Injectable({
  providedIn: 'root'
})
export class ChartService {

  constructor() {
    Chart.register(...registerables);
  }

  // QIR Status Distribution Chart
  createQirStatusChart(data: any[]): ChartConfiguration {
    const statusCounts = this.processStatusData(data);
    
    return {
      type: 'doughnut' as ChartType,
      data: {
        labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
        datasets: [{
          data: [
            statusCounts.open,
            statusCounts.inProgress,
            statusCounts.resolved,
            statusCounts.closed
          ],
          backgroundColor: [
            '#dc3545', // Red for Open
            '#ffc107', // Yellow for In Progress
            '#17a2b8', // Blue for Resolved
            '#28a745'  // Green for Closed
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      }
    };
  }

  // QIR Trends Over Time Chart
  createQirTrendsChart(data: any[]): ChartConfiguration {
    const monthlyData = this.processMonthlyData(data);
    
    return {
      type: 'line' as ChartType,
      data: {
        labels: monthlyData.labels,
        datasets: [
          {
            label: 'New QIRs',
            data: monthlyData.newQirs,
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
          },
          {
            label: 'Resolved QIRs',
            data: monthlyData.resolvedQirs,
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          },
          x: {
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          }
        }
      }
    };
  }

  // Vehicle Inspection Status Chart
  createVehicleInspectionChart(data: any[]): ChartConfiguration {
    const inspectionData = this.processInspectionData(data);
    
    return {
      type: 'bar' as ChartType,
      data: {
        labels: inspectionData.labels,
        datasets: [{
          label: 'Pass Rate (%)',
          data: inspectionData.passRates,
          backgroundColor: inspectionData.passRates.map(rate => 
            rate >= 95 ? '#28a745' : 
            rate >= 85 ? '#ffc107' : '#dc3545'
          ),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `Pass Rate: ${context.parsed.y}%`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`
            }
          }
        }
      }
    };
  }

  // Priority Distribution Chart
  createPriorityChart(data: any[]): ChartConfiguration {
    const priorityData = this.processPriorityData(data);
    
    return {
      type: 'polarArea' as ChartType,
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [
            priorityData.critical,
            priorityData.high,
            priorityData.medium,
            priorityData.low
          ],
          backgroundColor: [
            'rgba(220, 53, 69, 0.8)',   // Critical - Red
            'rgba(255, 193, 7, 0.8)',   // High - Yellow
            'rgba(23, 162, 184, 0.8)',  // Medium - Blue
            'rgba(40, 167, 69, 0.8)'    // Low - Green
          ],
          borderColor: [
            '#dc3545',
            '#ffc107',
            '#17a2b8',
            '#28a745'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };
  }

  // Helper methods for data processing
  private processStatusData(data: any[]) {
    return {
      open: data.filter(item => item.status === 'Open').length,
      inProgress: data.filter(item => item.status === 'In Progress').length,
      resolved: data.filter(item => item.status === 'Resolved').length,
      closed: data.filter(item => item.status === 'Closed').length
    };
  }

  private processMonthlyData(data: any[]) {
    // Process data to get monthly trends
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const newQirs = new Array(12).fill(0);
    const resolvedQirs = new Array(12).fill(0);

    data.forEach(item => {
      const month = new Date(item.createdDate).getMonth();
      newQirs[month]++;
      
      if (item.resolvedDate) {
        const resolvedMonth = new Date(item.resolvedDate).getMonth();
        resolvedQirs[resolvedMonth]++;
      }
    });

    return {
      labels: months,
      newQirs,
      resolvedQirs
    };
  }

  private processInspectionData(data: any[]) {
    // Group by vehicle and calculate pass rates
    const vehicleStats = {};
    
    data.forEach(inspection => {
      const vehicleId = inspection.vehicle_id;
      if (!vehicleStats[vehicleId]) {
        vehicleStats[vehicleId] = {
          name: inspection.vehicle_name,
          total: 0,
          passed: 0
        };
      }
      
      vehicleStats[vehicleId].total++;
      if (inspection.overall_status === 'Pass') {
        vehicleStats[vehicleId].passed++;
      }
    });

    const labels = [];
    const passRates = [];

    Object.values(vehicleStats).forEach((stats: any) => {
      labels.push(stats.name);
      passRates.push(((stats.passed / stats.total) * 100).toFixed(1));
    });

    return { labels, passRates };
  }

  private processPriorityData(data: any[]) {
    return {
      critical: data.filter(item => item.priority === 'Critical').length,
      high: data.filter(item => item.priority === 'High').length,
      medium: data.filter(item => item.priority === 'Medium').length,
      low: data.filter(item => item.priority === 'Low').length
    };
  }
}
