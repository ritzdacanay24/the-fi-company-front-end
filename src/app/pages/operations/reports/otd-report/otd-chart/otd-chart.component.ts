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

        fill: {
            opacity: [0.85, 0.25, 1],
            gradient: {
                inverseColors: false,
                shade: 'light',
                type: "vertical",
                opacityFrom: 0.85,
                opacityTo: 0.55,
                stops: [0, 100, 100, 100]
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
                hideOverlappingLabels: true
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
            // tooltip: {
            //     enabled: true,
            //     offsetY: -35
            // }
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
        // title: {
        //     text: "Shipped Orders",
        //     offsetY: 0,
        //     display: false,
        //     align: "center",
        //     style: {
        //         color: "#444"
        //     }
        // }
    };

    constructor() {

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
            //ee.push(sum / total.length)
            ee.push(this.average)
            goalArray.push(goal)
        }


        this.chartOptions.series = [];
        let labelsTest = [];

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


        this.chart?.updateOptions({
            grid: {
                padding: {
                    bottom: 20
                }
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
                    formatter: (value) => {
                        if (goalArray?.length <= 7) {
                            for (let i = 0; i < labelsTest.length; i++) {
                                if (labelsTest[i]?.data == moment(value).format('YYYY-MM-DD')) {
                                    return [value, labelsTest[i]?.test]
                                }
                            }
                        }
                        return [value]
                    }
                },
            },
            colors: [
                function ({ value, seriesIndex, dataPointIndex, w }) {
                    if (seriesIndex == 0) {
                        return "#74C365";
                    } else if (seriesIndex == 1) {
                        return "#00693E";
                    }
                    return "#FFAC1C";
                }
            ],
            stroke: {
                width: [null, 2, 1],
                curve: 'smooth'
            },
            labels: this.labels,
            tooltip: {
                shared: true,
                intersect: false,
                followCursor: false
            },
            title: {
                text: this.title == "Show All" || !this.title ? "Overall OTD " + this.average + '%' : this.typeOfView + ' ' + this.title + " OTD " + this.average + '%',
                offsetY: 0,
                display: true,
                align: "center",
                style: {
                    color: "#444"
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
                    if (val)
                        return val.toFixed(0) + '%';
                    return "";
                },
                offsetY: -10, style: {
                    fontSize: "10px",
                    colors: [
                        (data) => {
                            if (data.series[data.seriesIndex][data.dataPointIndex] >= this.goal) {
                                return 'green'
                            } else {
                                return 'red'
                            }
                        }, (data) => {
                            if (data.series[data.seriesIndex][data.dataPointIndex] >= this.goal) {
                                return 'green'
                            } else {
                                return 'red'
                            }
                        }
                    ]
                },

            },
        }, true, true, true)

    }
}
