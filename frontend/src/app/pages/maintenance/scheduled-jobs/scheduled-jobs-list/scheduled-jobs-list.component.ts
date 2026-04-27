import { Component, OnInit } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import {
  ScheduledJobRow,
  ScheduledJobLastRun,
  ScheduledJobsService,
} from "@app/core/api/scheduled-jobs/scheduled-jobs.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { EditCronJobModalComponent } from "../edit-cron-job-modal/edit-cron-job-modal.component";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-scheduled-jobs-list",
  templateUrl: "./scheduled-jobs-list.component.html",
})
export class ScheduledJobsListComponent implements OnInit {
  constructor(
    private readonly scheduledJobsApi: ScheduledJobsService,
    private readonly modalService: NgbModal
  ) {}

  runningJobIds = new Set<string>();
  jobs: ScheduledJobRow[] = [];

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.scheduledJobsApi.list();
      if (Array.isArray(data) && data.length) {
        this.jobs = data;
      }
    } catch {
      this.jobs = [];
    }
  }

  title = "Scheduled Jobs";

  get activeCount(): number {
    return this.jobs.filter((job) => job.active).length;
  }

  isRunning(id: string): boolean {
    return this.runningJobIds.has(id);
  }

  isExternalUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  formatLastRunAt(lastRun?: ScheduledJobLastRun): string {
    if (!lastRun?.startedAt) {
      return "Never";
    }

    const parsed = new Date(lastRun.startedAt);
    if (Number.isNaN(parsed.getTime())) {
      return "Unknown";
    }

    return parsed.toLocaleString();
  }

  formatLastRunDuration(lastRun?: ScheduledJobLastRun): string {
    if (!lastRun?.durationMs) return '';
    const ms = lastRun.durationMs;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  async runJob(job: ScheduledJobRow): Promise<void> {
    if (!job?.id || this.isRunning(job.id)) {
      return;
    }

    this.runningJobIds.add(job.id);
    try {
      const result = await this.scheduledJobsApi.run(job.id);
      const jobIndex = this.jobs.findIndex((row) => row.id === job.id);
      if (jobIndex >= 0 && result.lastRun) {
        this.jobs[jobIndex] = {
          ...this.jobs[jobIndex],
          lastRun: result.lastRun,
        };
      }

      if (!result.ok) {
        console.warn(`Scheduled job ${job.id} returned non-success:`, result);
      }
    } catch (error) {
      console.warn(`Scheduled job ${job.id} run failed`, error);
      if (this.isExternalUrl(job.url)) {
        window.open(job.url, "_blank");
      }
    } finally {
      this.runningJobIds.delete(job.id);
    }
  }

  async openEditModal(job: ScheduledJobRow): Promise<void> {
    const modalRef = this.modalService.open(EditCronJobModalComponent, {
      size: "lg",
      centered: true,
    });

    modalRef.componentInstance.job = job;

    try {
      const result = await modalRef.result;
      await this.updateJob(job.id, result);
    } catch {
      // Modal dismissed, do nothing
    }
  }

  private async updateJob(
    id: string,
    data: { cron: string; active: boolean; note?: string }
  ): Promise<void> {
    try {
      const updated = await this.scheduledJobsApi.update(id, data);
      const jobIndex = this.jobs.findIndex((j) => j.id === id);
      if (jobIndex >= 0) {
        this.jobs[jobIndex] = updated;
      }
      console.log(`Job ${id} updated successfully`);
    } catch (error) {
      console.error(`Failed to update job ${id}:`, error);
    }
  }
}
