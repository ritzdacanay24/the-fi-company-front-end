import { Injectable } from '@angular/core';
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
  private readonly storageKey = 'pm_tasks_state_v1';

  loadState(projectId = ''): ProjectManagerTasksState {
    if (this.isApiMode) {
      return this.loadStateFromApi(projectId);
    }

    const raw = localStorage.getItem(this.getStorageKey(projectId));
    if (!raw) {
      return this.createDefaultState();
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ProjectManagerTasksState>;
      if (!parsed || !Array.isArray(parsed.taskRecords)) {
        return this.createDefaultState();
      }

      const nextId = Number(parsed.nextId || 0);
      const safeNextId = Number.isFinite(nextId) && nextId > 0 ? nextId : this.computeNextId(parsed.taskRecords as PmTaskRecord[]);
      const subgroupCatalog = this.normalizeSubgroupCatalog(parsed.subgroupCatalog || {});

      return {
        nextId: safeNextId,
        taskRecords: this.normalizeTaskRecords(parsed.taskRecords as PmTaskRecord[]),
        subgroupCatalog
      };
    } catch {
      return this.createDefaultState();
    }
  }

  saveState(state: ProjectManagerTasksState, projectId = ''): void {
    if (this.isApiMode) {
      this.saveStateToApi(state, projectId);
      return;
    }

    try {
      localStorage.setItem(this.getStorageKey(projectId), JSON.stringify(state));
    } catch {
      // Ignore storage quota/storage access errors in test mode.
    }
  }

  private get isApiMode(): boolean {
    return environment.projectManagerDataSource === 'api';
  }

  private loadStateFromApi(projectId: string): ProjectManagerTasksState {
    // TODO: Replace with HttpClient integration when PM Tasks API is ready.
    return this.loadStateFromLocalStorage(projectId);
  }

  private saveStateToApi(state: ProjectManagerTasksState, projectId: string): void {
    // TODO: Replace with HttpClient integration when PM Tasks API is ready.
    this.saveStateToLocalStorage(state, projectId);
  }

  private loadStateFromLocalStorage(projectId: string): ProjectManagerTasksState {
    const raw = localStorage.getItem(this.getStorageKey(projectId));
    if (!raw) {
      return this.createDefaultState();
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ProjectManagerTasksState>;
      if (!parsed || !Array.isArray(parsed.taskRecords)) {
        return this.createDefaultState();
      }

      const nextId = Number(parsed.nextId || 0);
      const safeNextId = Number.isFinite(nextId) && nextId > 0 ? nextId : this.computeNextId(parsed.taskRecords as PmTaskRecord[]);
      const subgroupCatalog = this.normalizeSubgroupCatalog(parsed.subgroupCatalog || {});

      return {
        nextId: safeNextId,
        taskRecords: this.normalizeTaskRecords(parsed.taskRecords as PmTaskRecord[]),
        subgroupCatalog
      };
    } catch {
      return this.createDefaultState();
    }
  }

  private saveStateToLocalStorage(state: ProjectManagerTasksState, projectId: string): void {
    try {
      localStorage.setItem(this.getStorageKey(projectId), JSON.stringify(state));
    } catch {
      // Ignore storage quota/storage access errors in test mode.
    }
  }

  private createDefaultState(): ProjectManagerTasksState {
    return {
      nextId: 1,
      taskRecords: [],
      subgroupCatalog: {}
    };
  }

  private getStorageKey(projectId: string): string {
    return `${this.storageKey}_${projectId || '__default__'}`;
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
