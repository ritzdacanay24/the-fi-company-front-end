import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-report-main',
  templateUrl: './report-main.component.html',
  styleUrls: []
})
export class ReportMainComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,

  ) {
  }

  ngOnInit(): void {
  }

  reports = [
    {
      name: 'Jobs',
      children: [
        { name: "Job By Location", description: "", link: "/field-service/reports/jobs-by-location" },
        { name: "Platform Avg", description: "", link: "/field-service/reports/platform-avg" }
      ]
    }
  ]

  goToView(link) {
    this.router.navigate([link])
  }
}
