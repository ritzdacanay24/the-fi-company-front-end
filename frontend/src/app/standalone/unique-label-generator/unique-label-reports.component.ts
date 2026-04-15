import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UniqueLabelGeneratorApiService } from './unique-label-generator-api.service';

@Component({
  selector: 'app-unique-label-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unique-label-reports.component.html',
})
export class UniqueLabelReportsComponent implements OnInit {
  private readonly api = inject(UniqueLabelGeneratorApiService);
  private readonly toastr = inject(ToastrService);

  days = 30;
  isLoading = false;
  totals: any = null;
  topParts: any[] = [];
  weekUsage: any[] = [];

  async ngOnInit(): Promise<void> {
    await this.loadReport();
  }

  async loadReport(): Promise<void> {
    this.isLoading = true;
    try {
      const response = await this.api.getReportSummary(this.days);
      if (!response.success || !response.data) {
        this.toastr.warning(response.message || 'No report data found.');
        return;
      }

      const data = response.data as any;
      this.totals = data.totals || null;
      this.topParts = data.top_parts || [];
      this.weekUsage = data.week_usage || [];
    } catch (error) {
      this.toastr.error('Failed to load report summary.');
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }
}
