import { Component, Input, SimpleChanges, ViewChild } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import jsPDF from "jspdf";
import moment from "moment";
import {
  ApexAxisChartSeries,
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexPlotOptions,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexXAxis,
  ApexFill,
  NgApexchartsModule,
  ApexTooltip,
  ApexStroke,
} from "ng-apexcharts";
import { NgChartsModule } from "ng2-charts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis;
  xaxis: ApexXAxis;
  fill: ApexFill;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
};

@Component({
  standalone: true,
  imports: [SharedModule, NgChartsModule, NgApexchartsModule],
  selector: "app-otd-reason-code-chart",
  templateUrl: "./otd-reason-code-chart.component.html",
})
export class OtdReasonCodeChartComponent {
  @ViewChild("chart") chart: ChartComponent;
  public chartOptions: any;

  constructor() {
    this.chartOptions = {
      series: [],
      chart: {
        width: 400,
        height: 400,
        type: "pie",
      },
      labels: [],
    };
  }

  @Input() data;

  download() {
    this.chart.dataURI().then((data) => {
        console.log(data)

        var pdf: any = new jsPDF("l", "px", "a4");
        
        var width = pdf.internal.pageSize.getWidth();
        var height = pdf.internal.pageSize.getHeight();

        pdf.addImage(data.imgURI, 'PNG', 0, 0, width, height);
        pdf.save("download.pdf");
    })
  }

  ngOnChanges(data: SimpleChanges) {
    if (!this.data) return;
    
    this.chartOptions = {
        chart: {
            width: '100%',
            height: 380,
            type: "pie",
            fontFamily: 'inherit',
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: false,
                    zoom: false,
                    zoomin: false,
                    zoomout: false,
                    pan: false,
                    reset: false
                }
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 150
                },
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
                }
            }
        },
        stroke: {
            show: true,
            width: 3,
            colors: ['#fff']
        },
        dataLabels: {
            enabled: true,
            formatter(val, opts) {
                const name = opts.w.globals.labels[opts.seriesIndex];
                const value = opts.w.globals.series[opts.seriesIndex];
                return [`${val.toFixed(1)}%`, `(${value})`];
            },
            style: {
                fontSize: '12px',
                fontFamily: 'inherit',
                fontWeight: 700,
                colors: ['#fff']
            },
            background: {
                enabled: false
            },
            dropShadow: {
                enabled: true,
                top: 1,
                left: 1,
                blur: 1,
                color: '#000',
                opacity: 0.45
            }
        },
        plotOptions: {
            pie: {
                startAngle: -90,
                endAngle: 270,
                expandOnClick: true,
                offsetX: 0,
                offsetY: 0,
                customScale: 1,
                dataLabels: {
                    offset: 0,
                    minAngleToShowLabel: 10
                },
                donut: {
                    size: '0%'
                }
            }
        },
        grid: {
            padding: {
                top: 20,
                bottom: 20,
                left: 20,
                right: 20
            }
        },
        legend: {
            position: "bottom",
            horizontalAlign: "center",
            fontSize: "13px",
            fontFamily: 'inherit',
            fontWeight: 600,
            markers: {
                width: 12,
                height: 12,
                radius: 3,
                offsetX: -3
            },
            itemMargin: {
                horizontal: 8,
                vertical: 4
            },
            formatter: function (val, opts) {
                const value = opts.w.globals.series[opts.seriesIndex];
                const total = opts.w.globals.series.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${val}: ${value} (${percentage}%)`;
            },
            onItemHover: {
                highlightDataSeries: true
            }
        },
        tooltip: {
            enabled: true,
            theme: 'light',
            style: {
                fontSize: '12px',
                fontFamily: 'inherit'
            },
            custom: function({ series, seriesIndex, w }) {
                const label = w.globals.labels[seriesIndex];
                const value = series[seriesIndex];
                const total = series.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                
                return `
                    <div class="custom-pie-tooltip">
                        <div class="tooltip-header">
                            <i class="mdi mdi-alert-circle me-2"></i>Delay Reason
                        </div>
                        <div class="tooltip-body">
                            <div class="tooltip-row">
                                <span class="tooltip-label">Reason:</span>
                                <span class="tooltip-value">${label}</span>
                            </div>
                            <div class="tooltip-row">
                                <span class="tooltip-label">Count:</span>
                                <span class="tooltip-value">${value}</span>
                            </div>
                            <div class="tooltip-row">
                                <span class="tooltip-label">Percentage:</span>
                                <span class="tooltip-value">${percentage}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        },
        states: {
            hover: {
                filter: {
                    type: 'lighten',
                    value: 0.15
                }
            },
            active: {
                allowMultipleDataPointsSelection: false,
                filter: {
                    type: 'darken',
                    value: 0.7
                }
            }
        },
        labels: this.data?.label,
        title: {
            text: "Delay Root Cause Analysis",
            align: "center",
            style: {
                fontSize: '18px',
                fontWeight: 700,
                fontFamily: 'inherit',
                color: '#1e293b'
            }
        },
        subtitle: {
            text: "Distribution of delivery delay reasons",
            align: "center",
            style: {
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                color: '#64748b'
            }
        },
        responsive: [{
            breakpoint: 768,
            options: {
                chart: {
                    height: 300
                },
                legend: {
                    position: 'bottom',
                    fontSize: '11px'
                },
                dataLabels: {
                    style: {
                        fontSize: '10px'
                    }
                }
            }
        }]
    };
    
    this.chartOptions.series = this.data?.value;
    
    // Professional color palette
    this.chartOptions.colors = [
        "#ef4444", // Red - Critical issues
        "#f97316", // Orange - High priority
        "#f59e0b", // Amber - Medium priority  
        "#eab308", // Yellow - Low priority
        "#84cc16", // Lime - Process issues
        "#22c55e", // Green - Minor issues
        "#10b981", // Emerald - Resolved
        "#06b6d4", // Cyan - External factors
        "#0ea5e9", // Sky blue - Weather/logistics
        "#3b82f6", // Blue - System issues
        "#6366f1", // Indigo - Communication
        "#8b5cf6", // Violet - Training needs
        "#a855f7", // Purple - Resource constraints
        "#d946ef", // Fuchsia - Vendor issues
        "#ec4899", // Pink - Quality issues
        "#f43f5e"  // Rose - Customer issues
    ];
  }
}