import { Component, Input, SimpleChanges, ViewChild } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import _ from "lodash";

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
    ApexNoData
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
    noData: ApexNoData
};

@Component({
    standalone: true,
    imports: [
        SharedModule,
        NgChartsModule,
        NgApexchartsModule,
    ],
    selector: 'app-request-chart',
    templateUrl: './request-chart.component.html',
})
export class RequestChartComponent {
    @ViewChild("chart") chart: ChartComponent;

    @Input() data
    @Input() labels
    @Input() stacked
    @Input() title
    @Input() average
    @Input() typeOfView

    chartOptions: Partial<ChartOptions> = {
        series: [],
        chart: {
            height: 420,
            type: "bar",
            stacked: false,
        },
        tooltip: {
            shared: false,
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
            formatter: function (value, { seriesIndex, dataPointIndex, w }) {
                let indices = w.config.series.map((item, i) => i);
                indices = indices.filter(i => !w.globals.collapsedSeriesIndices.includes(i) && _.get(w.config.series, `${i}.data.${dataPointIndex}`) > 0);
                if (seriesIndex == _.max(indices))
                    return w.globals.stackedSeriesTotals[dataPointIndex];
                return '';
            },

            offsetY: -20,
            style: {
                fontSize: "10px",
                colors: ['bg-success']
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
                    return val.toFixed(0);
                }
            },
            title: {
                text: "Total Requests"
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

        let goal = 75
        for (let i = 0; i < total.length; i++) {
            //ee.push(sum / total.length)
            ee.push(this.average)
            goalArray.push(goal)
        }


        this.chartOptions.series = [];

        for (const key in this.data) {
            sum += this.data[key].dataset
            this.chartOptions.series.push(
                {
                    type: "column",
                    name: this.data[key].label,
                    data: this.data[key].dataset,

                }
            );
        }


        this.chart.updateOptions({

            labels: this.labels,
            tooltip: {
                shared: false,
                intersect: false,
                followCursor: false
            },
            stroke: {
                show: true,
                curve: 'straight',
                lineCap: 'butt',
                colors: undefined,
                width: 1,
                dashArray: 0,
            },

            title: {
                text: this.title == "Show All" || !this.title ? "All Requests ": this.typeOfView + ' Requests',
                offsetY: 0,
                display: true,
                align: "center",
                style: {
                    color: "#444"
                }
            }
        }, true, true, true)
    }
}
