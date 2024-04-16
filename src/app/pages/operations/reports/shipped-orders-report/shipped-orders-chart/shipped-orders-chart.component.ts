import { Component, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { RootReducerState } from '@app/store';
import { Store } from '@ngrx/store';
import { ChartOptions, ChartType } from 'chart.js';
import { ChartComponent } from 'ng-apexcharts';
import { NgChartsModule } from 'ng2-charts';
import { currency, currencyFormatter } from 'src/assets/js/util';


@Component({
    standalone: true,
    imports: [SharedModule, NgChartsModule],
    selector: 'app-shipped-order-chart',
    templateUrl: './shipped-orders-chart.component.html',
})
export class ShippedOrdersChartComponent implements OnInit {

    @Input() public data: any;
    @Input() public stacked: boolean = true;
    @Input() public labels: any;

    @Input() public totalCost: any;

    @ViewChild("chart") chart: ChartComponent;

    convertToInternationalCurrencySystem(labelValue) {

        // Nine Zeroes for Billions
        return Math.abs(Number(labelValue)) >= 1.0e+9

            ? (Math.abs(Number(labelValue)) / 1.0e+9).toFixed(2) + "B"
            // Six Zeroes for Millions 
            : Math.abs(Number(labelValue)) >= 1.0e+6

                ? (Math.abs(Number(labelValue)) / 1.0e+6).toFixed(2) + "M"
                // Three Zeroes for Thousands
                : Math.abs(Number(labelValue)) >= 1.0e+3

                    ? (Math.abs(Number(labelValue)) / 1.0e+3).toFixed(2) + "K"

                    : Math.abs(Number(labelValue));

    }


    public barChartOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        hover: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            x:
            {
                display: true,
                ticks: {
                    minRotation: 0,
                    maxRotation: 0,
                    autoSkip: true,
                    autoSkipPadding: 50
                },
                stacked: this.stacked
            },
            y:
            {
                display: true,
                title: {
                    display: true,
                    text: 'Total Value'
                },
                ticks: {
                    callback: function (value: any, index, values) {
                        return currency(value)
                    },
                },
                stacked: this.stacked
            }
        },
        //         var chartInstance = this.chart;
        //         var ctx = chartInstance.ctx;
        //         ctx.textAlign = "left";
        //         ctx.font = "9px Open Sans";
        //         ctx.fillStyle = "#fff";

        //         Chart.helpers.each(
        //             this.data.datasets.forEach(function (dataset, i) {
        //                 var meta = chartInstance.controller.getDatasetMeta(i);
        //                 Chart.helpers.each(
        //                     meta.data.forEach(function (bar, index) {
        //                         let data = dataset.data[index];
        //                         if (i == 0) {
        //                             ctx.fillText(data, 50, bar._model.y + 4);
        //                         } else {
        //                             ctx.fillText(data, bar._model.x - 25, bar._model.y + 4);
        //                         }
        //                     }),
        //                     this
        //                 );
        //             }),
        //             this
        //         );

        //         // draw total count
        //         this.data.datasets[0].data.forEach(function (data, index) {
        //             var total = data + this.data.datasets[1].data[index];
        //             var meta = chartInstance.controller.getDatasetMeta(1);
        //             var posX = meta.data[index]._model.x;
        //             var posY = meta.data[index]._model.y;

        //             ctx.fillStyle = "black";
        //             ctx.fillText(total, posX + 4, posY + 4);
        //         }, this);
        //     }
        // },
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {

                    label: function (tooltipItem: any) {
                        return [
                            tooltipItem.dataset.label +
                            ' : $' + tooltipItem.formattedValue
                        ];
                    },
                    footer: (tooltipItem: any) => {
                        let total = tooltipItem.reduce((a, e: any) => a + parseInt(e.raw), 0);
                        return 'Total: ' + total.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                    }
                },
            },
            datalabels: {
                display: (context: any) => {
                    var index = context.dataIndex;
                    var value = context.dataset.data[index];
                    return false
                },
                anchor: 'end',
                align: 'end',
                clip: false,
                color: (context) => {
                    var index = context.dataIndex;
                    var value = context.dataset.data[index];
                    return 'white'
                }, formatter: function (context, ctx) {
                    var index = context.dataIndex;
                    return index;
                },
            }
        },
    };




    public barChartLabels: any[] = [];
    public barChartType: ChartType = 'bar';
    public barChartLegend = true;
    public barChartPlugins = [];

    getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    public barChartData = [

    ];
    e;
    constructor(
        private store: Store<RootReducerState>
    ) { }

    colors = [
        '#7CB9E8',
        '#0066b2',
        '#A3C1AD',
        '#00CED1',
        '#008E97',
        '#0071c5',
        '#72A0C1',
    ]

    ngOnChanges(data: SimpleChanges) {

        if (!this.data) return;

        this.barChartData = [];

        this.barChartLabels = this.labels;
        let count = 0;
        for (const key in this.data) {
            let color = this.data[key].backgroundColor;
            this.barChartData.push(
                {
                    data: this.data[key].dataset,
                    label: this.data[key].label,
                    backgroundColor: color,
                    hoverBackgroundColor: color,
                    borderColor: color,
                    borderWidth: 1,
                    hoverColor: color,
                    type: this.data[key].type,
                    pointRadius: 0.5,
                    tension: 1,
                    order: count,
                    fill: false
                });
            count++
        }
    }


    ngOnInit(): void {
    };

    ngOnDestroy() {
        //Chart.scaleService.updateScaleDefaults('linear', {});
    }

}