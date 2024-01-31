import { Injectable } from '@angular/core';
import { ChartOptions } from 'chart.js';
import { ThemeService } from 'ng2-charts';

@Injectable({ providedIn: 'root' })
export class ChartService {

    

    constructor(private themeService: ThemeService) {
        this.map['dark'] = {
            scales: {
                y: {
                    ticks: { color: '#F5F5F5' },
                    grid: { color: 'rgba(255,255,255,0.08)' },
                    title: {
                        color: '#F5F5F5'
                    }
                },
                x: {
                    ticks: { color: '#F5F5F5' },
                    grid: { color: 'rgba(255,255,255,0.08)' }
                },
            },
            plugins: {
                title: {
                    color: '#F5F5F5'
                },
                datalabels: {
                    color: '#F5F5F5'
                },
                legend: {
                    labels: {
                        color: '#F5F5F5'
                    }
                }
            },
        }

        this.map['light'] = {
            scales: {
                y: {
                    ticks: { color: '#666' },
                    grid: { color: 'rgba(0, 0, 0, 0.1)' },
                    title: {
                        color: '#666'
                    }
                },
                x: {
                    ticks: { color: '#666' },
                    grid: { color: 'rgba(0, 0, 0, 0.1)' }
                },
            },
            plugins: {
                title: {
                    color: '#666'
                },
                datalabels: {
                    color: '#666'
                },
                legend: {
                    labels: {
                        color: '#666'
                    }
                }
            },
        }
    }

    map: { [key: string]: ChartOptions } = {};



    /***
     * Cookie Language set
     */
    public setTheme(mode: any) {
        console.log(mode)
        this.themeService.setColorschemesOptions(this.map[mode]);
    }

}
