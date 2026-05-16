import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type ScheduledJobRunStatus = 'success' | 'failure';

export interface ScheduledJobLastRun {
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  status: ScheduledJobRunStatus;
  triggerType: 'manual' | 'cron';
  errorMessage: string | null;
}

export interface ScheduledJobRow {
  id: string;
  name: string;
  cron: string;
  url: string;
  active: boolean;
  supportsRecipients?: boolean;
  note?: string;
  environmentBlocked?: boolean;
  environmentBlockMessage?: string;
  lastRun?: ScheduledJobLastRun;
  command?: string;
  source?: 'cron-file' | 'nest-cron';
  runnerEnabled?: boolean;
}

export interface ScheduledJobRunResult {
  id: string;
  name: string;
  trigger: 'manual' | 'cron';
  ok: boolean;
  statusCode: number;
  durationMs: number;
  message: string;
  lastRun?: ScheduledJobLastRun;
  url?: string;
  responseSnippet?: string;
}

export type ScheduledJobRecipientType = 'internal_user' | 'external_email';
export type ScheduledJobNotificationScope = 'always' | 'on_failure';

export interface ScheduledJobRecipient {
  id: number;
  jobId: string;
  recipientType: ScheduledJobRecipientType;
  userId: number | null;
  email: string | null;
  displayName: string | null;
  isSubscribed: boolean;
  isAssignee: boolean;
  notificationScope: ScheduledJobNotificationScope;
  active: boolean;
  resolvedEmail: string | null;
  resolvedName: string | null;
}

export interface UpsertScheduledJobRecipient {
  recipientType: ScheduledJobRecipientType;
  userId?: number | null;
  email?: string | null;
  displayName?: string | null;
  isSubscribed?: boolean;
  isAssignee?: boolean;
  notificationScope?: ScheduledJobNotificationScope;
  active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduledJobsService {
  private readonly baseUrl = 'apiV2/scheduled-jobs';

  constructor(private readonly http: HttpClient) {}

  async list(): Promise<ScheduledJobRow[]> {
    return firstValueFrom(this.http.get<ScheduledJobRow[]>(this.baseUrl));
  }

  async run(id: string): Promise<ScheduledJobRunResult> {
    return firstValueFrom(this.http.post<ScheduledJobRunResult>(`${this.baseUrl}/${id}/run`, {}));
  }

  async testRun(id: string): Promise<ScheduledJobRunResult> {
    return firstValueFrom(this.http.post<ScheduledJobRunResult>(`${this.baseUrl}/${id}/test-run`, {}));
  }

  async update(
    id: string,
    data: { cron: string; active: boolean; note?: string }
  ): Promise<ScheduledJobRow> {
    return firstValueFrom(
      this.http.patch<ScheduledJobRow>(`${this.baseUrl}/${id}`, data)
    );
  }

  async listRecipients(id: string): Promise<ScheduledJobRecipient[]> {
    return firstValueFrom(
      this.http.get<ScheduledJobRecipient[]>(`${this.baseUrl}/${id}/recipients`)
    );
  }

  async updateRecipients(id: string, recipients: UpsertScheduledJobRecipient[]): Promise<ScheduledJobRecipient[]> {
    return firstValueFrom(
      this.http.patch<ScheduledJobRecipient[]>(`${this.baseUrl}/${id}/recipients`, { recipients })
    );
  }
}
