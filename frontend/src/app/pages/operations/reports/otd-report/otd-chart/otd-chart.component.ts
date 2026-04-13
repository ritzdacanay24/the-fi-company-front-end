import { Component, Input, SimpleChanges, ViewChild } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
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
    ApexStroke
} from "ng-apexcharts";
import { NgChartsModule } from "ng2-charts";
import { jsPDF } from "jspdf";

export type ChartOptions = {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    dataLabels: ApexDataLabels;
    plotOptions: ApexPlotOptions;
    yaxis: ApexYAxis;
    xaxis: ApexXAxis;
    fill: ApexFill;
    title: ApexTitleSubtitle;
    subtitle: ApexTitleSubtitle;
    tooltip: ApexTooltip;
    stroke: ApexStroke;
};

@Component({
    standalone: true,
    imports: [
        SharedModule,
        NgChartsModule,
        NgApexchartsModule,
    ],
    selector: 'app-otd-chart',
    templateUrl: './otd-chart.component.html',
})
export class OtdChartComponent {
    @ViewChild("chart") chart: ChartComponent;

    @Input() data
    @Input() labels
    @Input() stacked
    @Input() title
    @Input() average
    @Input() typeOfView
    @Input() goal

    chartOptions: Partial<ChartOptions> = {
        series: [],
        chart: {
            height: 420,
            type: "line",
            stacked: false,
        },
        title: {
            text: '',
            style: {
                fontSize: '20px',
                fontWeight: 700,
                fontFamily: 'inherit',
                color: '#1e293b'
            }
        },
        subtitle: {
            text: '',
            style: {
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                color: '#64748b'
            }
        },
        tooltip: {
            shared: true,
            intersect: false,
            followCursor: false,
            fixed: {
                enabled: false,
                position: 'bottom'
            }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                dataLabels: {
                    position: 'top',
                    hideOverflowingLabels: true,
                }
            }
        },
        dataLabels: {
            enabledOnSeries: [0],
            textAnchor: "middle",
            background: {
                enabled: true,
                foreColor: '#fff',
                borderRadius: 2,
                padding: 4,
                opacity: 0.9,
                borderWidth: 1,
                borderColor: '#fff'
            },
            enabled: true,
            formatter: (val: any) => {
                return val.toFixed(0) + '%';
            },
            offsetY: -10,
            style: {
                fontSize: "10px"
            },

        },

        xaxis: {
            type: 'category',
            categories: [],
            position: "bottom",
            labels: {
                rotate: 0,
                trim: false,
                rotateAlways: false,
                hideOverlappingLabels: true,
                formatter: function(value, timestamp) {
                    if (!value) return '';
                    
                    // Try different date formats
                    let date = moment(value, ['MM/DD/YY', 'M/D/YY', 'MM/DD/YYYY', 'M/D/YYYY', 'YYYY-MM-DD'], true);
                    
                    if (date.isValid()) {
                        return date.format('MMM DD');
                    }
                    
                    // If moment parsing fails, try native Date parsing
                    const nativeDate = new Date(value);
                    if (!isNaN(nativeDate.getTime())) {
                        return moment(nativeDate).format('MMM DD');
                    }
                    
                    // Return original value if all parsing fails
                    return value;
                }
            },

            axisBorder: {
                show: true
            },
            axisTicks: {
                show: true
            },
            crosshairs: {
                fill: {
                    type: "gradient",
                    gradient: {
                        colorFrom: "#D8E3F0",
                        colorTo: "#BED1E6",
                        stops: [0, 100],
                        opacityFrom: 0.4,
                        opacityTo: 0.5
                    }
                }
            },
        },

        yaxis: {
            max: 100,
            min: 0,
            axisBorder: {
                show: true
            },
            axisTicks: {
                show: true
            },
            labels: {
                show: true,
                formatter: function (val) {
                    return val.toFixed(0) + '%';
                }
            },
            title: {
                text: "OTD Percentage"
            }
        },
    };

    constructor() {

    }

    testImage

    download() {
        this.chart.dataURI().then((data) => {
            var pdf: any = new jsPDF("l", "mm", "a4");
            var width = pdf.internal.pageSize.getWidth();
            var height = pdf.internal.pageSize.getHeight();

            // Draw chart image
            pdf.addImage(data.imgURI, 'PNG', 0, 0, width, height - 20);

            // Add average OTD text at the bottom
            pdf.setFontSize(14);
            pdf.setTextColor(30, 41, 59); // dark slate
            pdf.text(`Average OTD: ${this.average?.toFixed(1) ?? ''}%`, 10, height - 5);

            pdf.save("download.pdf");
        })
    }

    ngOnChanges(data: SimpleChanges) {
        if (!this.data) return;

        let total = []
        let sum = 0;

        for (const key in this.data) {
            total = this.data[key].dataset;
            sum += this.data[key].dataset.reduce((partialSum, a) => partialSum + a, 0);
        }

        let ee = []
        let goalArray = []

        let goal = this.goal
        for (let i = 0; i < total.length; i++) {
            ee.push(this.average)
            goalArray.push(goal)
        }

        this.chartOptions.series = [];
        let labelsTest = [];
        let dateCategories = [];

        // Set title and subtitle
        this.chartOptions.title = {
            text: this.title == "Show All" || !this.title ? "Overall OTD " + this.average?.toFixed(1) + '%' : this.typeOfView + ' ' + this.title + " OTD " + this.average?.toFixed(1) + '%',
            offsetY: 0,
            style: {
                fontSize: '20px',
                fontWeight: 700,
                fontFamily: 'inherit',
                color: '#1e293b'
            }
        };

        this.chartOptions.subtitle = {
            text: `Performance vs ${this.goal}% Target | Period Average: ${this.average?.toFixed(1)}%`,
            style: {
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                color: '#64748b'
            }
        };

        console.log('Chart data:', this.data);
        console.log('Chart labels:', this.labels);
        
        // Simply use the labels from obj.label - they're already properly formatted
        dateCategories = this.labels || [];
        console.log('Using dateCategories from this.labels:', dateCategories);
        
        for (const key in this.data) {
            sum += this.data[key].dataset
            labelsTest = this.data[key].labelTest;

            this.chartOptions.series.push(
                {
                    type: "column",
                    name: this.data[key].label,
                    data: this.data[key].dataset
                },
                {
                    type: "line",
                    name: 'Goal',
                    data: goalArray
                },
                {
                    type: "line",
                    name: 'Average OTD',
                    data: ee
                },
            );
        }

        // Set the x-axis categories with the extracted dates
        this.chartOptions.xaxis = {
            ...this.chartOptions.xaxis,
            categories: dateCategories
        };

        this.chart?.updateOptions({
            xaxis: {
                categories: dateCategories,
                type: 'category',
                position: "bottom",
                labels: {
                    rotate: 0,
                    trim: false,
                    rotateAlways: false,
                    hideOverlappingLabels: true,
                    formatter: function(value, timestamp) {
                        if (!value) return '';
                        
                        // Try different date formats
                        let date = moment(value, ['YYYY-MM-DD', 'MM/DD/YY', 'M/D/YY', 'MM/DD/YYYY', 'M/D/YYYY'], true);
                        
                        if (date.isValid()) {
                            return date.format('MMM DD');
                        }
                        
                        // If moment parsing fails, try native Date parsing
                        const nativeDate = new Date(value);
                        if (!isNaN(nativeDate.getTime())) {
                            return moment(nativeDate).format('MMM DD');
                        }
                        
                        // Return original value if all parsing fails
                        return value;
                    }
                },
                axisBorder: {
                    show: true
                },
                axisTicks: {
                    show: true
                }
            },
            grid: {
                padding: {
                    bottom: 20,
                    top: 20,
                    left: 20,
                    right: 20
                },
                borderColor: '#e2e8f0',
                strokeDashArray: 2,
                xaxis: {
                    lines: {
                        show: true
                    }
                },
                yaxis: {
                    lines: {
                        show: true
                    }
                }
            },
            yaxis: {
                title: {
                    text: "OTD Percentage",
                    style: {
                        color: '#1e293b',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        fontWeight: 600
                    }
                },
                labels: {
                    style: {
                        colors: '#475569',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        fontWeight: 500
                    },
                    formatter: function (val) {
                        if (val === null || val === undefined) return '';
                        return Math.round(val) + '%';
                    }
                },
                axisBorder: {
                    show: true,
                    color: '#cbd5e1'
                },
                axisTicks: {
                    show: true,
                    color: '#cbd5e1'
                },
                min: 0,
                max: 100
            },
            colors: [
                function ({ value, seriesIndex, dataPointIndex, w }) {
                    if (seriesIndex == 0) {
                        // Dynamic color based on performance vs goal
                        const goalValue = goal;
                        if (value >= goalValue) {
                            return "#10b981"; // Success green
                        } else if (value >= goalValue * 0.9) {
                            return "#f59e0b"; // Warning amber
                        } else {
                            return "#ef4444"; // Danger red
                        }
                    } else if (seriesIndex == 1) {
                        return "#1e293b"; // Goal line - dark slate
                    } else {
                        return "#3b82f6"; // Average line - blue
                    }
                }
            ],
            stroke: {
                width: [0, 3, 3],
                curve: 'smooth',
                dashArray: [0, 0, 5]
            },
            tooltip: {
                shared: true,
                intersect: false,
                followCursor: false,
                theme: 'light',
                style: {
                    fontSize: '12px',
                    fontFamily: 'inherit'
                },
                x: {
                    formatter: function(value) {
                        if (!value) return '';
                        
                        // Try different date formats, prioritizing YYYY-MM-DD since that's what we get from the API
                        let date = moment(value, ['YYYY-MM-DD', 'MM/DD/YY', 'M/D/YY', 'MM/DD/YYYY', 'M/D/YYYY'], true);
                        
                        if (date.isValid()) {
                            return date.format('MMM DD, YYYY');
                        }
                        
                        // If moment parsing fails, try native Date parsing
                        const nativeDate = new Date(value);
                        if (!isNaN(nativeDate.getTime())) {
                            return moment(nativeDate).format('MMM DD, YYYY');
                        }
                        
                        return value;
                    }
                },
                custom: function({ series, seriesIndex, dataPointIndex, w }) {
                    const categories = w.globals.categoryLabels;
                    const date = categories[dataPointIndex];
                    const formattedDate = (() => {
                        let parsedDate = moment(date, ['YYYY-MM-DD', 'MM/DD/YY', 'M/D/YY', 'MM/DD/YYYY', 'M/D/YYYY'], true);
                        
                        if (parsedDate.isValid()) {
                            return parsedDate.format('MMM DD, YYYY');
                        }
                        
                        // If moment parsing fails, try native Date parsing
                        const nativeDate = new Date(date);
                        if (!isNaN(nativeDate.getTime())) {
                            return moment(nativeDate).format('MMM DD, YYYY');
                        }
                        
                        return date;
                    })();
                    
                    let tooltipContent = `
                        <div class="custom-tooltip">
                            <div class="tooltip-header">
                                <i class="mdi mdi-calendar me-2"></i>${formattedDate}
                            </div>
                    `;
                    
                    series.forEach((ser, index) => {
                        const seriesName = w.globals.seriesNames[index];
                        const value = ser[dataPointIndex];
                        const color = w.globals.colors[index];
                        
                        if (value !== null && value !== undefined) {
                            tooltipContent += `
                                <div class="tooltip-row">
                                    <div class="tooltip-marker" style="background-color: ${color}"></div>
                                    <div class="tooltip-label">${seriesName}</div>
                                    <div class="tooltip-value">${value?.toFixed(1)}%</div>
                                </div>
                            `;
                        }
                    });
                    
                    tooltipContent += `
                            <div class="tooltip-footer">
                                <div class="goal-info">
                                    <i class="mdi mdi-target me-1"></i>Target: ${goal}%
                                </div>
                            </div>
                        </div>
                    `;
                    
                    return tooltipContent;
                }
            },
            title: {
                text: this.title == "Show All" || !this.title ? "Overall OTD " + this.average?.toFixed(1) + '%' : this.typeOfView + ' ' + this.title + " OTD " + this.average?.toFixed(1) + '%',
                offsetY: 0,
                style: {
                    fontSize: '20px',
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    color: '#1e293b'
                }
            },
            subtitle: {
                text: `Performance vs ${goal}% Target | Period Average: ${this.average?.toFixed(1)}%`,
                style: {
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    color: '#64748b'
                }
            },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '14px',
                fontFamily: 'inherit',
                fontWeight: 600,
                markers: {
                    width: 10,
                    height: 10,
                    radius: 3
                },
                itemMargin: {
                    horizontal: 15,
                    vertical: 5
                }
            },
            dataLabels: {
                enabledOnSeries: [0],
                textAnchor: "middle",
                background: {
                    enabled: true,
                    foreColor: '#fff',
                    borderRadius: 3,
                    padding: 6,
                    opacity: 0.9,
                    borderWidth: 2,
                    borderColor: '#fff',
                    dropShadow: {
                        enabled: true,
                        top: 1,
                        left: 1,
                        blur: 1,
                        color: '#000',
                        opacity: 0.2
                    }
                },
                enabled: true,
                formatter: (val: any) => {
                    if (val === null || val === undefined) return "";
                    return Math.round(val) + '%';
                },
                offsetY: -10,
                style: {
                    fontSize: "11px",
                    fontFamily: 'inherit',
                    fontWeight: 700
                }
            },
            annotations: {
                yaxis: [{
                    y: goal,
                    borderColor: '#1e293b',
                    borderWidth: 2,
                    strokeDashArray: 8,
                    label: {
                        borderColor: '#1e293b',
                        style: {
                            color: '#fff',
                            background: '#1e293b',
                            fontSize: '12px',
                            fontFamily: 'inherit',
                            fontWeight: 600
                        },
                        text: `Target: ${goal}%`
                    }
                }]
            },
            responsive: [{
                breakpoint: 768,
                options: {
                    chart: {
                        height: 350
                    },
                    legend: {
                        position: 'bottom',
                        fontSize: '12px'
                    },
                    dataLabels: {
                        style: {
                            fontSize: '10px'
                        }
                    },
                    xaxis: {
                        labels: {
                            style: {
                                fontSize: '10px'
                            },
                            formatter: (value) => {
                                if (!value) return '';
                                
                                // Try different date formats, prioritizing YYYY-MM-DD
                                let date = moment(value, ['YYYY-MM-DD', 'MM/DD/YY', 'M/D/YY', 'MM/DD/YYYY', 'M/D/YYYY'], true);
                                
                                if (date.isValid()) {
                                    return date.format('MM/DD');
                                }
                                
                                // If moment parsing fails, try native Date parsing
                                const nativeDate = new Date(value);
                                if (!isNaN(nativeDate.getTime())) {
                                    return moment(nativeDate).format('MM/DD');
                                }
                                
                                return value;
                            }
                        }
                    }
                }
            }]
    }, true, true, true)
    }
}
