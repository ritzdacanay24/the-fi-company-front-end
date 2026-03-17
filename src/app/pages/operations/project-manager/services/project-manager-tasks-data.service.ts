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

  loadState(): ProjectManagerTasksState {
    if (this.isApiMode) {
      return this.loadStateFromApi();
    }

    const raw = localStorage.getItem(this.storageKey);
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

  saveState(state: ProjectManagerTasksState): void {
    if (this.isApiMode) {
      this.saveStateToApi(state);
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage quota/storage access errors in test mode.
    }
  }

  private get isApiMode(): boolean {
    return environment.projectManagerDataSource === 'api';
  }

  private loadStateFromApi(): ProjectManagerTasksState {
    // TODO: Replace with HttpClient integration when PM Tasks API is ready.
    return this.loadStateFromLocalStorage();
  }

  private saveStateToApi(state: ProjectManagerTasksState): void {
    // TODO: Replace with HttpClient integration when PM Tasks API is ready.
    this.saveStateToLocalStorage(state);
  }

  private loadStateFromLocalStorage(): ProjectManagerTasksState {
    const raw = localStorage.getItem(this.storageKey);
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

  private saveStateToLocalStorage(state: ProjectManagerTasksState): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage quota/storage access errors in test mode.
    }
  }

  private createDefaultState(): ProjectManagerTasksState {
    const taskRecords = this.defaultMockTasks();
    return {
      nextId: this.computeNextId(taskRecords),
      taskRecords,
      subgroupCatalog: this.catalogFromTasks(taskRecords)
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

  private defaultMockTasks(): PmTaskRecord[] {
    return [
      { id: 1,  gate: 'G4', groupName: 'Engineering', subGroupName: 'CAD',              taskName: '3D CAD Model for VWL-035XX-XXX',                              project: 'VWL-035XX-XXX',          assignedTo: ['Ankit Batra'],                   durationDays: 28, startDate: '2026-02-09', finishDate: '2026-03-08', dependsOn: '',    bucket: 'Overall',     status: 'In Process',  completion: 52,  source: 'manual' },
      { id: 2,  gate: 'G3', groupName: 'Engineering', subGroupName: 'Sourcing',          taskName: 'New LED Sourcing 2.5p (320mm x 80 mm)',                       project: 'VWL-035XX-XXX',          assignedTo: ['Aldo Verber'],                   durationDays: 28, startDate: '2026-03-02', finishDate: '2026-03-29', dependsOn: '',    bucket: 'Overall',     status: 'In Process',  completion: 38,  source: 'manual' },
      { id: 3,  gate: 'G2', groupName: 'PM',          subGroupName: 'Customer Inputs',   taskName: 'Quote for Proto/ PO from Customer',                          project: 'VWL-035XX-XXX',          assignedTo: ['Brice Cutspec'],                 durationDays: 21, startDate: '2026-02-09', finishDate: '2026-03-01', dependsOn: '',    bucket: 'Overall',     status: 'Completed',   completion: 100, source: 'manual' },
      { id: 4,  gate: 'G4', groupName: 'Engineering', subGroupName: 'CAD',              taskName: 'VWL-035XX-XXX CAD Approve',                                   project: 'VWL-035XX-XXX',          assignedTo: ['Aldo Verber'],                   durationDays: 2,  startDate: '2026-03-09', finishDate: '2026-03-10', dependsOn: '3FS', bucket: 'Overall',     status: 'In Process',  completion: 30,  source: 'manual' },
      { id: 5,  gate: 'G4', groupName: 'Engineering', subGroupName: 'Software',          taskName: 'Pixel Mapping and FI Content',                                project: 'VWL-035XX-XXX',          assignedTo: ['Ankit Batra'],                   durationDays: 21, startDate: '2026-03-09', finishDate: '2026-03-29', dependsOn: '3FS', bucket: 'Overall',     status: 'Open',        completion: 0,   source: 'manual' },
      { id: 6,  gate: 'G5', groupName: 'PM',          subGroupName: 'Approvals',         taskName: 'VWL-035XX-XXX Release to Proto (Approved by Customer)',       project: 'VWL-035XX-XXX',          assignedTo: ['Mike Bristol'],                  durationDays: 1,  startDate: '2026-03-11', finishDate: '2026-03-11', dependsOn: '6FS', bucket: 'Overall',     status: 'Open',        completion: 0,   source: 'manual' },
      { id: 7,  gate: 'G4', groupName: 'Engineering', subGroupName: 'Electrical',        taskName: 'Electrical Schematics from JX (Internal)',                    project: 'VWL-035XX-XXX',          assignedTo: ['Aldo Verber'],                   durationDays: 7,  startDate: '2026-03-12', finishDate: '2026-03-18', dependsOn: '8FS', bucket: 'Overall',     status: 'Open',        completion: 0,   source: 'manual' },
      { id: 8,  gate: 'G4', groupName: 'Engineering', subGroupName: 'BOM',               taskName: "VWL-035XX-XXX BOM's Release (Internal)",                      project: 'VWL-035XX-XXX',          assignedTo: ['Aldo Verber'],                   durationDays: 14, startDate: '2026-03-09', finishDate: '2026-03-22', dependsOn: '3FS', bucket: 'Overall',     status: 'Open',        completion: 0,   source: 'manual' },
      { id: 9,  gate: 'G5', groupName: 'Engineering', subGroupName: 'Documentation',     taskName: 'Installation Instruction + PKG (F.S.) Internal',              project: 'VWL-035XX-XXX',          assignedTo: ['Temenuga Terziev'],              durationDays: 42, startDate: '2026-03-12', finishDate: '2026-04-22', dependsOn: '8FS', bucket: 'Overall',     status: 'Open',        completion: 0,   source: 'manual' },
      { id: 10, gate: 'G6', groupName: 'Quality',     subGroupName: 'QA',                taskName: 'QA Requirements Internal',                                   project: 'VWL-035XX-XXX',          assignedTo: ['Dana L.'],                       durationDays: 28, startDate: '2026-03-12', finishDate: '2026-04-08', dependsOn: '8FS', bucket: 'Overall',     status: 'Open',        completion: 0,   source: 'manual' },
      { id: 11, gate: 'G5', groupName: 'Engineering', subGroupName: 'Supplier Actions',  taskName: 'Supplier feedback loop and resolution',                       project: 'Cost Down CD-Outdoor 2.0', assignedTo: ['Carlos M.'],                   durationDays: 10, startDate: '2026-03-16', finishDate: '2026-03-26', dependsOn: 'G5',  bucket: 'Engineering', status: 'Review',      completion: 20,  source: 'manual' },
      { id: 12, gate: 'G4', groupName: 'Engineering', subGroupName: 'DFM',               taskName: 'DFM review with customer',                                   project: 'Pixel Pitch Revision P3.9', assignedTo: ['James K.'],                  durationDays: 5,  startDate: '2026-03-10', finishDate: '2026-03-14', dependsOn: 'G4',  bucket: 'Engineering', status: 'In Process',  completion: 64,  source: 'manual' }
    ];
  }
}
