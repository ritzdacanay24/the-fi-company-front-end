import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, map, catchError, of } from 'rxjs';
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
  projectTaskName?: string;
  gate: TaskGate | '';
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
  hasPersistedState?: boolean;
  subgroupCatalog: Record<string, string[]>;
  defaultTaskTemplates?: string[];
  projectTaskBoardName?: string;
  taskBoardNames?: string[];
  taskAttachmentCounts?: Record<number, number>;
  taskCommentCounts?: Record<number, number>;
}

@Injectable({ providedIn: 'root' })
export class ProjectManagerTasksDataService {
  private readonly apiUrl = environment.pmApiUrl;
  private readonly stateCache = new Map<string, ProjectManagerTasksState>();
  readonly saveFallback$ = new Subject<string>();

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
        hasPersistedState: !!res.hasPersistedState,
        subgroupCatalog: this.normalizeSubgroupCatalog(res.subgroupCatalog || {}),
        defaultTaskTemplates: this.normalizeTaskTemplates(res.defaultTaskTemplates || []),
        projectTaskBoardName: this.normalizeBoardName(res.projectTaskBoardName),
        taskBoardNames: this.normalizeBoardList(res.taskBoardNames || []),
        taskAttachmentCounts: this.normalizeCountMap(res.taskAttachmentCounts),
        taskCommentCounts: this.normalizeCountMap(res.taskCommentCounts),
      })),
      catchError(() => of(this.loadStateFromCache(projectId))),
    );
  }

  /** Observable API: save task state to server. Falls back to in-memory cache on error. */
  saveState$(state: ProjectManagerTasksState, projectId: string): Observable<void> {
    return this.saveStateWithStatus$(state, projectId).pipe(
      map(() => undefined),
    );
  }

  /** Observable API: save task state and return true only when persisted to API. */
  saveStateWithStatus$(state: ProjectManagerTasksState, projectId: string): Observable<boolean> {
    if (!this.isApiMode || !projectId) {
      this.saveStateToCache(state, projectId);
      return of(true);
    }
    const payload: ProjectManagerTasksState = {
      nextId: state.nextId,
      taskRecords: this.normalizeTaskRecords(state.taskRecords || []),
      hasPersistedState: state.hasPersistedState,
      subgroupCatalog: this.normalizeSubgroupCatalog(state.subgroupCatalog || {}),
      defaultTaskTemplates: this.normalizeTaskTemplates(state.defaultTaskTemplates || []),
      projectTaskBoardName: this.normalizeBoardName(state.projectTaskBoardName),
      taskBoardNames: this.normalizeBoardList(state.taskBoardNames || []),
      taskAttachmentCounts: this.normalizeCountMap(state.taskAttachmentCounts),
      taskCommentCounts: this.normalizeCountMap(state.taskCommentCounts),
    };

    return this.http.put<void>(`${this.apiUrl}/${projectId}/tasks`, payload).pipe(
      map(() => true),
      catchError(() => {
        this.saveStateToCache(state, projectId);
        this.saveFallback$.next(projectId);
        return of(false);
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
      hasPersistedState: !!cached.hasPersistedState,
      subgroupCatalog: this.normalizeSubgroupCatalog(cached.subgroupCatalog),
      defaultTaskTemplates: this.normalizeTaskTemplates(cached.defaultTaskTemplates || []),
      projectTaskBoardName: this.normalizeBoardName(cached.projectTaskBoardName),
      taskBoardNames: this.normalizeBoardList(cached.taskBoardNames || []),
      taskAttachmentCounts: this.normalizeCountMap(cached.taskAttachmentCounts),
      taskCommentCounts: this.normalizeCountMap(cached.taskCommentCounts),
    };
  }

  private saveStateToCache(state: ProjectManagerTasksState, projectId: string): void {
    this.stateCache.set(projectId, {
      nextId: state.nextId,
      taskRecords: this.normalizeTaskRecords(state.taskRecords),
      hasPersistedState: !!state.hasPersistedState,
      subgroupCatalog: this.normalizeSubgroupCatalog(state.subgroupCatalog),
      defaultTaskTemplates: this.normalizeTaskTemplates(state.defaultTaskTemplates || []),
      projectTaskBoardName: this.normalizeBoardName(state.projectTaskBoardName),
      taskBoardNames: this.normalizeBoardList(state.taskBoardNames || []),
      taskAttachmentCounts: this.normalizeCountMap(state.taskAttachmentCounts),
      taskCommentCounts: this.normalizeCountMap(state.taskCommentCounts),
    });
  }

  private createDefaultState(): ProjectManagerTasksState {
    return {
      nextId: 1,
      taskRecords: [],
      hasPersistedState: false,
      subgroupCatalog: {},
      defaultTaskTemplates: [],
      projectTaskBoardName: 'Project Tasks',
      taskBoardNames: ['Project Tasks'],
      taskAttachmentCounts: {},
      taskCommentCounts: {}
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
      projectTaskName: this.normalizeBoardName(task.projectTaskName),
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

  private normalizeTaskTemplates(input: string[]): string[] {
    if (!Array.isArray(input)) {
      return [];
    }
    const normalized = input
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 100);
    return Array.from(new Set(normalized));
  }

  private normalizeBoardName(input: unknown): string {
    const value = String(input || '').trim();
    return value || 'Project Tasks';
  }

  private normalizeBoardList(input: string[]): string[] {
    if (!Array.isArray(input)) {
      return ['Project Tasks'];
    }
    const normalized = Array.from(new Set(
      input
        .map((item) => this.normalizeBoardName(item))
        .filter(Boolean)
        .slice(0, 100)
    ));
    return normalized.length ? normalized : ['Project Tasks'];
  }

  private normalizeCountMap(input: unknown): Record<number, number> {
    if (!input || typeof input !== 'object') {
      return {};
    }

    const map: Record<number, number> = {};
    Object.entries(input as Record<string, unknown>).forEach(([rawKey, rawValue]) => {
      const key = Number(rawKey);
      if (!Number.isFinite(key) || key <= 0) {
        return;
      }

      const value = Number(rawValue);
      map[key] = Number.isFinite(value) && value > 0 ? value : 0;
    });

    return map;
  }

}
