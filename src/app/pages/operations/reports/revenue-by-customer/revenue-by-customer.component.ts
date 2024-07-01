import { KeyValue } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RevenueService } from '@app/core/api/operations/report/revenue.service';
import { SharedModule } from '@app/shared/shared.module';

@Component({
    standalone: true,
    imports: [SharedModule],
    selector: 'app-revenue-by-customer',
    templateUrl: './revenue-by-customer.component.html',
    styleUrls: []
})
export class RevenueByCustomerComponent implements OnInit {
    data: any;

    constructor(
        private revenueService: RevenueService
    ) { }

    ngOnInit() {
        this.getData()
    }

    isLoading = false;
    async getData() {
        try {
            this.isLoading = true;
            this.data = await this.revenueService.getFutureRevenueByCustomer();
            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
        }
    }

    total = 0;
    getTotal(col) {
        this.total = 0;
        this.data.forEach((row, value) => {
            return this.getSumCol(row[col]);
        });
        return this.total;
    };

    getSumCol(score) {
        this.total += (score);
    }

    data1: any
    d: any
    isLoadingSubData = false;
    async getData1(d) {
        try {
            this.isLoadingSubData = true;
            this.data1 = []
            this.d = d;
            this.data1 = await this.revenueService.getFutureRevenueByCustomerByWeekly(d);
            this.isLoadingSubData = false;
        } catch (err) {
            this.isLoadingSubData = false;
        }
    }

    originalOrder = (a: KeyValue<number, string>, b: KeyValue<number, string>): number => {
        return 0;
    }
    
}