import { Component, Input, SimpleChanges, ViewChild } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
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
    ApexTooltip
} from "ng-apexcharts";
import { NgChartsModule } from "ng2-charts";
import { currency } from "src/assets/js/util";


function convertToInternationalCurrencySystem(labelValue) {

    // Nine Zeroes for Billions
    return Math.abs(Number(labelValue)) >= 1.0e+9

        ? (Math.abs(Number(labelValue)) / 1.0e+9).toFixed(0) + "B"
        // Six Zeroes for Millions 
        : Math.abs(Number(labelValue)) >= 1.0e+6

            ? (Math.abs(Number(labelValue)) / 1.0e+6).toFixed(0) + "M"
            // Three Zeroes for Thousands
            : Math.abs(Number(labelValue)) >= 1.0e+3

                ? (Math.abs(Number(labelValue)) / 1.0e+3).toFixed(0) + "K"

                : Math.abs(Number(labelValue));

}

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
};

@Component({
    standalone: true,
    imports: [
        SharedModule,
        NgChartsModule,
        NgApexchartsModule,
    ],
    selector: 'app-shipped-order-chart',
    templateUrl: './shipped-orders-chart.component.html',
})
export class ShippedOrdersChartComponent {
    @ViewChild("chart") chart: ChartComponent;

    @Input() data
    @Input() labels
    @Input() stacked

    chartOptions: Partial<ChartOptions> = {
        series: [],
        chart: {
            height: 350,
            type: "bar",
            stacked: true,
        },
        tooltip: {
            shared: true,
            intersect: false,
            followCursor: false,

        },
        plotOptions: {
            bar: {
                dataLabels: {
                    position: "top" // top, center, bottom
                }
            }
        },
        dataLabels: {
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
            enabled: false,
            formatter: (val) => {
                return convertToInternationalCurrencySystem(val);
            },
            offsetY: -20,
            style: {
                fontSize: "12px",
                colors: ["#304758"]
            }
        },

        xaxis: {
            type: 'datetime',
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
            axisBorder: {
                show: true
            },
            axisTicks: {
                show: true
            },
            labels: {
                show: true,
                formatter: function (val) {
                    return currency(val);
                }
            }
        },
        title: {
            text: "Shipped Orders",
            offsetY: 0,
            align: "center",
            style: {
                color: "#444"
            }
        }
    };

    constructor() {

    }


    ngOnChanges(data: SimpleChanges) {

        if (!this.data) return;
        this.chartOptions.series = [];

        for (const key in this.data) {
            this.chartOptions.series.push(
                {
                    name: this.data[key].label,
                    data: this.data[key].dataset,
                    type: "column",
                });
        }


        this.chart.updateOptions({
            labels: this.labels,
            tooltip: {
                shared: true,
                intersect: false,
                followCursor: false,

            },
        }, true, true, true)
    }
}
