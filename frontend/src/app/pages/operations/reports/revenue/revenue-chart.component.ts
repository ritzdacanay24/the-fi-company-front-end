import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { SharedModule } from '@app/shared/shared.module';
import { ChartType } from 'ag-grid-community';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';

@Component({
    standalone: true,
    imports: [SharedModule, NgChartsModule],
    selector: 'app-revenue-chart',
    templateUrl: `./revenue-chart.component.html`,
})
export class RevenueChartComponent implements OnInit {

    @Input() public data: any;
    @Input() public label: any;

    @Output() setChart: EventEmitter<any> = new EventEmitter();

    constructor() { }

    ngOnInit(): void { }

    ngOnChanges(data: SimpleChanges) {
        if (!this.data) return;
        this.barChartData = {
            labels: this.label,
            datasets: [],
        };

        for (const key in this.data) {
            let color = this.data[key].backgroundColor;
            let borderColor = this.data[key].borderColor || 'red';
            this.barChartData.datasets.push(
                {
                    data: this.data[key].dataset,
                    label: this.data[key].label,
                    backgroundColor: color,
                    hoverBackgroundColor: color,
                    borderColor: color,
                    type: 'bar',
                    borderWidth: 1,

                    lineTension: 0,
                    pointRadius: 1,
                    tension: 1,
                    fill: true,
                });
        }
        this.setChart.emit(this.chart)
    }

    @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

    hides() {
        let e = this.chart.isDatasetHidden(5) ? false : true;
        this.chart.hideDataset(5, e); // hides dataset at index 1
        this.chart.update(); // chart now renders with dataset hidden
    }


    public barChartOptions: ChartConfiguration['options'] = {
        // We use these empty structures as placeholders for dynamic theming.

        responsive: true,
        maintainAspectRatio: false,

        scales: {
            y: {
                min: 0,
                stacked: true,
                ticks: {
                    callback: (value: any, index, values) => {
                        return (new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                        })).format(value);
                    },
                },
                title: {
                    display: true,
                    text: 'Total Value'
                }
            },
            x: {
                stacked: true,
                ticks: {
                    autoSkip: true,
                    maxRotation: 0,
                    minRotation: 0
                }
            },
        },
        hover: {
            mode: 'index',
            intersect: true,
        },
        plugins: {
            title: {
                display: false,
                text: 'Revenue & Projected'
            },
            datalabels: {
                anchor: 'end',
                align: 'end',
                display: false,
                clamp: false,
                formatter: (c) => {
                    return (new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                    })).format(c);
                },
            },
            legend: {
                position: "top",
                align: "center"
            },
            tooltip: {
                borderWidth: 5,
                caretPadding: 10,
                displayColors: true,
                enabled: true,
                intersect: false,
                mode: 'x',
                titleMarginBottom: 10,
                callbacks: {
                    label: function (tooltipIte: any,) {
                        return tooltipIte.dataset.label + ': ' + (new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                        })).format(tooltipIte.raw);
                    },
                }
            },
        },
    };
    public barChartType: ChartType = 'line';
    public barChartPlugins = [ChartDataLabels];

    public barChartData: any

}
