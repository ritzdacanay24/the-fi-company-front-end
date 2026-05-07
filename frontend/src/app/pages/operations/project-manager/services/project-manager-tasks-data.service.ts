import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from 'src/environments/environment';

export type TaskStatus = 'Open' | 'In Process' | 'Review' | 'Completed' | 'Locked';
export type TaskGate = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6';

export interface PmTaskComment {
  id: number;
  taskId: number;
  author: string;
  text: string;
  createdAt: string; // ISO date-time string
}

export type PmAttachmentType = 'Email' | 'Picture' | 'Document' | 'Other';

export interface PmTaskAttachment {
  id: number;
  taskId: number;
  name: string;
  type: PmAttachmentType;
  sizeLabel: string;   // e.g. "42 KB" — stored as string since we don't process files server-side yet
  dataUrl?: string;    // base64 data-URL for in-browser preview (images)
  uploadedBy: string;
  uploadedAt: string;  // ISO date-time string
}

export interface PmTaskRecord {
  id: number;
  gate: TaskGate;
  groupName: string;
  subGroupName: string;
  taskName: string;
  project: string;
  assignedTo: string[];
  durationDays: number;
  startDate: string;
  finishDate: string;
  dependsOn: string;
  bucket: string;
  status: TaskStatus;
  completion: number;
  source: 'manual' | 'bulk-engineering';
  comments?: PmTaskComment[];
  attachments?: PmTaskAttachment[];
}

export interface ProjectManagerTasksState {
  nextId: number;
  taskRecords: PmTaskRecord[];
  subgroupCatalog: Record<string, string[]>;
}

@Injectable({ providedIn: 'root' })
export class ProjectManagerTasksDataService {
  private readonly apiUrl = environment.pmApiUrl;
  private readonly stateCache = new Map<string, ProjectManagerTasksState>();

  constructor(private readonly http: HttpClient) {}

  /** Observable API: load task state from server. Falls back to in-memory cache on error. */
  loadState$(projectId: string): Observable<ProjectManagerTasksState> {
    if (!this.isApiMode || !projectId) {
      return of(this.loadStateFromCache(projectId));
    }
    return this.http.get<ProjectManagerTasksState>(`${this.apiUrl}/${projectId}/tasks`).pipe(
      map(res => ({
        nextId: res.nextId || 1,
        taskRecords: this.normalizeTaskRecords(res.taskRecords || []),
        subgroupCatalog: this.normalizeSubgroupCatalog(res.subgroupCatalog || {}),
      })),
      catchError(() => of(this.loadStateFromCache(projectId))),
    );
  }

  /** Observable API: save task state to server. Falls back to in-memory cache on error. */
  saveState$(state: ProjectManagerTasksState, projectId: string): Observable<void> {
    if (!this.isApiMode || !projectId) {
      this.saveStateToCache(state, projectId);
      return of(undefined);
    }
    return this.http.put<void>(`${this.apiUrl}/${projectId}/tasks`, { taskRecords: state.taskRecords }).pipe(
      catchError(() => {
        this.saveStateToCache(state, projectId);
        return of(undefined);
      }),
    );
  }

  /** Synchronous entry point — delegates to in-memory or API depending on mode. */
  loadState(projectId = ''): ProjectManagerTasksState {
    if (this.isApiMode) {
      return this.loadStateFromApi(projectId);
    }

    return this.loadStateFromCache(projectId);
  }

  saveState(state: ProjectManagerTasksState, projectId = ''): void {
    if (this.isApiMode) {
      this.saveStateToApi(state, projectId);
      return;
    }

    this.saveStateToCache(state, projectId);
  }

  private get isApiMode(): boolean {
    return environment.projectManagerDataSource === 'api';
  }

  private loadStateFromApi(projectId: string): ProjectManagerTasksState {
    // Synchronous callers get in-memory state; use loadState$() for API data.
    return this.loadStateFromCache(projectId);
  }

  private saveStateToApi(state: ProjectManagerTasksState, projectId: string): void {
    // Fire-and-forget via Observable; also persist to in-memory cache.
    this.saveStateToCache(state, projectId);
    this.saveState$(state, projectId).subscribe();
  }

  private loadStateFromCache(projectId: string): ProjectManagerTasksState {
    const cached = this.stateCache.get(projectId);
    if (!cached) {
      return this.createDefaultState();
    }

    return {
      nextId: cached.nextId,
      taskRecords: this.normalizeTaskRecords(cached.taskRecords),
      subgroupCatalog: this.normalizeSubgroupCatalog(cached.subgroupCatalog)
    };
  }

  private saveStateToCache(state: ProjectManagerTasksState, projectId: string): void {
    this.stateCache.set(projectId, {
      nextId: state.nextId,
      taskRecords: this.normalizeTaskRecords(state.taskRecords),
      subgroupCatalog: this.normalizeSubgroupCatalog(state.subgroupCatalog)
    });
  }

  private createDefaultState(): ProjectManagerTasksState {
    return {
      nextId: 1,
      taskRecords: [],
      subgroupCatalog: {}
    };
  }

  private computeNextId(records: PmTaskRecord[]): number {
    const maxId = records.reduce((acc, task) => Math.max(acc, task.id), 0);
    return maxId + 1;
  }

  private catalogFromTasks(records: PmTaskRecord[]): Record<string, string[]> {
    const map: Record<string, Set<string>> = {};
    records.forEach(task => {
      if (!map[task.groupName]) {
        map[task.groupName] = new Set<string>();
      }
      map[task.groupName].add(task.subGroupName);
    });

    const catalog: Record<string, string[]> = {};
    Object.keys(map).forEach(group => {
      catalog[group] = Array.from(map[group]);
    });
    return catalog;
  }

  private normalizeTaskRecords(records: PmTaskRecord[]): PmTaskRecord[] {
    return records.map(task => ({
      ...task,
      assignedTo: Array.isArray(task.assignedTo)
        ? task.assignedTo
        : (task.assignedTo ? [(task.assignedTo as unknown) as string] : [])
    }));
  }

  private normalizeSubgroupCatalog(input: Record<string, string[]>): Record<string, string[]> {
    const normalized: Record<string, string[]> = {};
    Object.keys(input || {}).forEach(group => {
      const values = Array.isArray(input[group]) ? input[group] : [];
      normalized[group] = Array.from(new Set(values.filter(Boolean)));
    });
    return normalized;
  }

}
