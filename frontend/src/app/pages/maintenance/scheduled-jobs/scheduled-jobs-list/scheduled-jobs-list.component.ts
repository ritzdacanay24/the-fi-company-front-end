import { Component, OnInit, ViewEncapsulation } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import {
  ScheduledJobRecipient,
  ScheduledJobRow,
  ScheduledJobLastRun,
  ScheduledJobsService,
} from "@app/core/api/scheduled-jobs/scheduled-jobs.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { EditCronJobModalComponent } from "../edit-cron-job-modal/edit-cron-job-modal.component";
import { EditJobRecipientsModalComponent } from "../edit-job-recipients-modal/edit-job-recipients-modal.component";

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-scheduled-jobs-list",
  templateUrl: "./scheduled-jobs-list.component.html",
  encapsulation: ViewEncapsulation.None,
  styles: [
    ".subscriber-preview-popover .popover-body { white-space: pre-line; }",
  ],
})
export class ScheduledJobsListComponent implements OnInit {
  constructor(
    private readonly scheduledJobsApi: ScheduledJobsService,
    private readonly modalService: NgbModal
  ) {}

  runningJobIds = new Set<string>();
  jobs: ScheduledJobRow[] = [];
  recipientSummaryByJobId: Record<
    string,
    { text: string; preview: string; loading: boolean; error: boolean }
  > = {};

  title = "Scheduled Jobs";

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.scheduledJobsApi.list();
      if (Array.isArray(data) && data.length) {
        this.jobs = this.sortJobs(data);
        await this.loadRecipientSummaries();
      }
    } catch {
      this.jobs = [];
    }
  }

  get activeCount(): number {
    return this.jobs.filter((job) => job.active).length;
  }

  get environmentBlockedCount(): number {
    return this.jobs.filter((job) => job.environmentBlocked).length;
  }

  isRunning(id: string): boolean {
    return this.runningJobIds.has(id);
  }

  canRunJob(job: ScheduledJobRow): boolean {
    return !!job?.id && !job.environmentBlocked && !this.isRunning(job.id);
  }

  canManageRecipients(job: ScheduledJobRow): boolean {
    return job.supportsRecipients !== false;
  }

  statusBadgeClass(job: ScheduledJobRow): string {
    if (job.environmentBlocked) {
      return "bg-warning text-dark";
    }

    return job.active ? "bg-success" : "bg-secondary";
  }

  statusLabel(job: ScheduledJobRow): string {
    if (job.environmentBlocked) {
      return "Dev Blocked";
    }

    return job.active ? "Enabled" : "Disabled";
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
    if (!lastRun?.durationMs) {
      return "";
    }

    const ms = lastRun.durationMs;
    if (ms < 1000) {
      return `${ms}ms`;
    }

    return `${(ms / 1000).toFixed(1)}s`;
  }

  getRecipientSummaryText(job: ScheduledJobRow): string {
    if (!this.canManageRecipients(job)) {
      return "System job";
    }

    const summary = this.recipientSummaryByJobId[job.id];
    if (!summary || summary.loading) {
      return "Loading...";
    }

    if (summary.error) {
      return "Unable to load";
    }

    return summary.text;
  }

  getRecipientSummaryPreview(job: ScheduledJobRow): string {
    const summary = this.recipientSummaryByJobId[job.id];
    if (!summary || summary.loading || summary.error) {
      return "";
    }

    return summary.preview;
  }

  async runJob(job: ScheduledJobRow): Promise<void> {
    if (!this.canRunJob(job)) {
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

  async testJob(job: ScheduledJobRow): Promise<void> {
    if (!this.canRunJob(job)) {
      return;
    }

    this.runningJobIds.add(job.id);
    try {
      const result = await this.scheduledJobsApi.testRun(job.id);
      const jobIndex = this.jobs.findIndex((row) => row.id === job.id);
      if (jobIndex >= 0 && result.lastRun) {
        this.jobs[jobIndex] = {
          ...this.jobs[jobIndex],
          lastRun: result.lastRun,
        };
      }

      if (!result.ok) {
        console.warn(`Scheduled job ${job.id} test returned non-success:`, result);
      }
    } catch (error) {
      console.warn(`Scheduled job ${job.id} test failed`, error);
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
    } catch (error: any) {
      if (error?.dismissed !== true) {
        console.error("Unexpected error:", error);
      }
    }
  }

  async openRecipientsModal(job: ScheduledJobRow): Promise<void> {
    if (!this.canManageRecipients(job)) {
      return;
    }

    try {
      const recipients = await this.scheduledJobsApi.listRecipients(job.id);

      const modalRef = this.modalService.open(EditJobRecipientsModalComponent, {
        size: "xl",
        centered: true,
      });

      modalRef.componentInstance.job = job;
      modalRef.componentInstance.recipients = recipients;

      const payload = await modalRef.result;
      await this.scheduledJobsApi.updateRecipients(job.id, payload);
      await this.loadRecipientSummaryForJob(job);
      alert("Recipients updated successfully");
    } catch (error: any) {
      if (error?.dismissed === true) {
        return;
      }

      const message = String(error?.message || "Failed to update recipients");
      console.error(`Failed to update recipients for ${job.id}:`, error);
      alert(`Error: ${message}`);
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
        this.jobs = this.sortJobs(this.jobs);
      }
      console.log(`Job ${id} updated successfully`);
      alert("Job updated successfully");
    } catch (error: any) {
      const message = error?.message || "Failed to update job";
      console.error(`Failed to update job ${id}:`, error);
      alert(`Error: ${message}`);
      throw error;
    }
  }

  cronToHuman(cron: string): string {
    if (!cron) {
      return "";
    }

    const parts = cron.trim().split(/\s+/);
    const f = parts.length === 6 ? parts.slice(1) : parts;
    if (f.length !== 5) {
      return cron;
    }

    const [min, hour, dom, , dow] = f;

    const DAYS: Record<string, string> = {
      "0": "Sun",
      "1": "Mon",
      "2": "Tue",
      "3": "Wed",
      "4": "Thu",
      "5": "Fri",
      "6": "Sat",
    };

    const fmtTime = (h: string, m: string): string => {
      const hh = parseInt(h, 10);
      const mm = parseInt(m, 10);
      const period = hh >= 12 ? "PM" : "AM";
      const h12 = hh % 12 === 0 ? 12 : hh % 12;
      return `${h12}:${mm.toString().padStart(2, "0")} ${period}`;
    };

    const fmtDow = (d: string): string => {
      if (d === "*") {
        return "every day";
      }
      if (d === "1-5") {
        return "Mon-Fri";
      }
      if (d === "0-4") {
        return "Sun-Thu";
      }
      return d
        .split(",")
        .map((x) => DAYS[x] ?? x)
        .join(", ");
    };

    if (min.startsWith("*/") && hour === "*" && dom === "*" && dow === "*") {
      const n = min.slice(2);
      return `Every ${n} minute${n === "1" ? "" : "s"}`;
    }

    if (min === "0" && hour.startsWith("*/") && dom === "*" && dow === "*") {
      const n = hour.slice(2);
      return `Every ${n} hour${n === "1" ? "" : "s"}`;
    }

    if (min === "0" && hour === "*" && dom === "*" && dow === "*") {
      return "Every hour";
    }

    if (min.startsWith("*/") && hour === "*" && dom === "*") {
      const n = min.slice(2);
      return `Every ${n} min${n === "1" ? "" : "s"}, ${fmtDow(dow)}`;
    }

    if (
      !min.includes("*") &&
      !min.includes("/") &&
      !hour.includes("*") &&
      !hour.includes("/") &&
      dow === "*"
    ) {
      return `Daily at ${fmtTime(hour, min)}`;
    }

    if (!min.includes("*") && !min.includes("/") && !hour.includes("*") && !hour.includes("/")) {
      return `${fmtTime(hour, min)}, ${fmtDow(dow)}`;
    }

    return cron;
  }

  private buildRecipientSummary(recipients: ScheduledJobRecipient[]): string {
    if (!recipients.length) {
      return "No managed recipients configured";
    }

    const activeSubscribers = recipients.filter((row) => row.active && row.isSubscribed).length;
    const assignees = recipients.filter((row) => row.active && row.isAssignee).length;
    return `${activeSubscribers} subscriber(s), ${assignees} assignee(s)`;
  }

  private buildRecipientPreview(recipients: ScheduledJobRecipient[]): string {
    const activeSubscribers = recipients
      .filter((row) => row.active && row.isSubscribed)
      .map((row) => row.displayName || row.resolvedName || row.email || row.resolvedEmail || "Unknown")
      .filter((value) => String(value).trim().length > 0);

    if (!activeSubscribers.length) {
      return "No active subscribers";
    }

    const unique = [...new Set(activeSubscribers.map((value) => String(value).trim()))];
    return unique.join("\n");
  }

  private async loadRecipientSummaries(): Promise<void> {
    const jobs = this.jobs.filter((job) => this.canManageRecipients(job));
    await Promise.all(jobs.map((job) => this.loadRecipientSummaryForJob(job)));
  }

  private async loadRecipientSummaryForJob(job: ScheduledJobRow): Promise<void> {
    if (!this.canManageRecipients(job)) {
      return;
    }

    this.recipientSummaryByJobId[job.id] = {
      text: "Loading...",
      preview: "",
      loading: true,
      error: false,
    };

    try {
      const recipients = await this.scheduledJobsApi.listRecipients(job.id);
      this.recipientSummaryByJobId[job.id] = {
        text: this.buildRecipientSummary(recipients),
        preview: this.buildRecipientPreview(recipients),
        loading: false,
        error: false,
      };
    } catch {
      this.recipientSummaryByJobId[job.id] = {
        text: "Unable to load",
        preview: "",
        loading: false,
        error: true,
      };
    }
  }

  private sortJobs(items: ScheduledJobRow[]): ScheduledJobRow[] {
    const sorted = [...items];
    sorted.sort((a, b) => {
      const aGroup = this.getJobSortGroup(a);
      const bGroup = this.getJobSortGroup(b);

      if (aGroup !== bGroup) {
        return aGroup - bGroup;
      }

      return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
    });

    return sorted;
  }

  private getJobSortGroup(job: ScheduledJobRow): number {
    if (!this.canManageRecipients(job)) {
      return 2;
    }

    return job.active ? 0 : 1;
  }
}
