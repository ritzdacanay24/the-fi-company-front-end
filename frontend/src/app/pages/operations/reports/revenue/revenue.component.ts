import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RevenueService } from '@app/core/api/operations/report/revenue.service';
import { SharedModule } from '@app/shared/shared.module';
import { RevenueChartComponent } from './revenue-chart.component';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';
import moment from 'moment';

@Component({
    standalone: true,
    imports: [SharedModule, RevenueChartComponent, DateRangeComponent],
    selector: 'app-revenue',
    templateUrl: './revenue.component.html',
    styleUrls: []
})
export class RevenueComponent implements OnInit {


    constructor(
        public route: ActivatedRoute,
        public router: Router,
        private revenueService: RevenueService
    ) {
    }

    ngOnInit(): void {
        this.getData()
    }


    dateFrom = moment().subtract(12, 'months').startOf('month').format('YYYY-MM-DD');;
    dateTo = moment().add(6, 'months').endOf('month').format('YYYY-MM-DD');
    dateRange = [this.dateFrom, this.dateTo];

    onChangeDate($event) {
        this.dateFrom = $event['dateFrom']
        this.dateTo = $event['dateTo']
        this.getData()
    }

    typeOfView = 'Monthly'
    data
    isLoading = false;
    async getData() {
        try {
            this.isLoading = true;
            let data = await this.revenueService.getChartData(this.dateFrom, this.dateTo, this.typeOfView);
            this.data = data.chartData;
            this.isLoading = false;
        } catch (err) {
            this.isLoading = false;
        }
    }
}
