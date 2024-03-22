import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LogisiticsDailyReportService } from '@app/core/api/operations/logisitics/daily-report.service';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-daily-report',
  templateUrl: './daily-report.component.html',
  styleUrls: []
})
export class DailyReportComponent implements OnInit {


  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private logisiticsDailyReportService: LogisiticsDailyReportService
  ) {
  }

  ngOnInit(): void {
    this.getData()
  }

  title: string = 'daily-report';

  icon = 'mdi-account-group';

  data;

  async getData() {
    this.data = await this.logisiticsDailyReportService.getDailyReport();
  }
}
