import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ScheduledJobRow {
  id: string;
  name: string;
  cron: string;
  url: string;
  active: boolean;
  note?: string;
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
  url?: string;
  responseSnippet?: string;
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

  async update(
    id: string,
    data: { cron: string; active: boolean; note?: string }
  ): Promise<ScheduledJobRow> {
    return firstValueFrom(
      this.http.patch<ScheduledJobRow>(`${this.baseUrl}/${id}`, data)
    );
  }
}
