import { Component, OnInit } from '@angular/core';
import { SerialNumberService } from '../services/serial-number.service';

@Component({
  selector: 'app-igt-serial-usage-report',
  templateUrl: './igt-serial-usage-report.component.html',
  styleUrls: ['./igt-serial-usage-report.component.css']
})
export class IgtSerialUsageReportComponent implements OnInit {
  statistics: any = null;
  loading = false;
  error: string | null = null;

  constructor(private serialService: SerialNumberService) {}

  ngOnInit(): void {
    this.fetchStatistics();
  }

  async fetchStatistics() {
    this.loading = true;
    this.error = null;
    try {
      this.statistics = await this.serialService.getUsageStatistics();
    } catch (err) {
      this.error = 'Failed to load usage statistics';
    } finally {
      this.loading = false;
    }
  }
}