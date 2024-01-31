import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OverviewService } from '@app/core/api/quality/overview.service';
import { SharedModule } from '@app/shared/shared.module';
import moment from 'moment';
import { NcrSummaryComponent } from '../ncr-summary/ncr-summary.component';
import { QirSummaryComponent } from '../qir-summary/qir-summary.component';
import { DateRangeComponent } from '@app/shared/components/date-range/date-range.component';

@Component({
  standalone: true,
  imports: [SharedModule, QirSummaryComponent, NcrSummaryComponent, DateRangeComponent],
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['summary.component.scss']
})
export class SummaryComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private overviewService: OverviewService
  ) {
  }

  ngOnInit(): void {
    this.getAll();
  }

  isLoading = false;

  time = moment().fromNow();

  async getAll() {
    try {
      this.isLoading = true;

      await this.getOverviewService()
      await this.getOpenInvoice()
      await this.getOpenJobs()
      await this.getOpenTickets()
      await this.getInvoiceSummary()
      await this.getJobSummary()

      this.isLoading = false;
    } catch (err) {
      this.isLoading = false;
    }

  }

  openRequests: any
  async getOverviewService() {
    this.openRequests = await this.overviewService.getOpenRequests()
  }

  openJobs: any
  async getOpenJobs() {
    this.openJobs = await this.overviewService.getOpenJobs()
  }

  openTickets
  async getOpenTickets() {
    this.openTickets = await this.overviewService.getOpenTickets()
  }

  openInvoices
  async getOpenInvoice() {
    this.openInvoices = await this.overviewService.getOpenInvoice()
  }

  invoiceSummary;
  dateFrom = moment().subtract(12, 'months').startOf('month').format('YYYY-MM-DD');
  dateTo = moment().endOf('month').format('YYYY-MM-DD');
  dateRange = [this.dateFrom, this.dateTo];
  async getInvoiceSummary() {
    this.invoiceSummary = await this.overviewService.getInvoiceSummary(this.dateFrom, this.dateTo)
  }

  onChangeDate($event) {
    this.dateFrom = $event['dateFrom']
    this.dateTo = $event['dateTo']
    this.getInvoiceSummary()
  }


  jobSummary;
  dateFrom1 = moment().subtract(24, 'months').startOf('month').format('YYYY-MM-DD')
  dateTo1 = moment().endOf('month').format('YYYY-MM-DD')
  dateRange1 = [this.dateFrom1, this.dateTo1];
  async getJobSummary() {
    this.jobSummary = await this.overviewService.getJobSummary(this.dateFrom1, this.dateTo1)
  }

  onChangeDate1($event) {
    this.dateFrom1 = $event['dateFrom']
    this.dateTo1 = $event['dateTo']
    this.getJobSummary()
  }

}
