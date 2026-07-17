import { Injectable } from '@nestjs/common';
import { PmTasksRepository, PmTaskRow } from './pm-tasks.repository';

export interface UpsertTaskDto {
  id?: number; // omit for new tasks
  projectTaskName?: string;
  gate: string;
  groupName: string;
  subGroupName: string;
  taskName: string;
  assignedTo: string[];
  durationDays: number;
  startDate: string;
  finishDate: string;
  dependsOn: string;
  bucket: string;
  status: string;
  completion: number;
  source: string;
}

export interface AddCommentDto {
  author: string;
  text: string;
}

export interface AddAttachmentDto {
  name: string;
  type: string;
  sizeLabel: string;
  dataUrl?: string;
  uploadedBy: string;
}

export interface TaskStateDto {
  nextId?: number;
  taskRecords: UpsertTaskDto[];
  subgroupCatalog?: Record<string, string[]>;
  defaultTaskTemplates?: string[];
  projectTaskBoardName?: string;
  taskBoardNames?: string[];
}

@Injectable()
export class PmTasksService {
  constructor(private readonly repository: PmTasksRepository) {}

  async getState(projectId: string): Promise<object> {
    const [tasks, comments, attachments, meta, globalMaxTaskId] = await Promise.all([
      this.repository.getTasksByProject(projectId),
      this.repository.getCommentsByProject(projectId),
      this.repository.getAttachmentsByProject(projectId),
      this.repository.getTaskStateByProject(projectId),
      this.repository.getGlobalMaxTaskId(),
    ]);

    const commentsByTask = this.groupBy(comments, c => c.task_id);
    const attachmentsByTask = this.groupBy(attachments, a => a.task_id);

    const taskRecords = tasks.map(t => ({
      id: t.id,
      projectTaskName: String(t.project_task_name || '').trim() || 'Project Tasks',
      gate: t.gate,
      groupName: t.group_name,
      subGroupName: t.sub_group_name,
      taskName: t.task_name,
      assignedTo: this.parseJson<string[]>(t.assigned_to, []),
      durationDays: t.duration_days,
      startDate: t.start_date || '',
      finishDate: t.finish_date || '',
      dependsOn: t.depends_on,
      bucket: t.bucket,
      status: t.status,
      completion: t.completion,
      source: t.source,
      comments: (commentsByTask[t.id] || []).map(c => ({
        id: c.id, taskId: c.task_id, author: c.author, text: c.text, createdAt: c.created_at,
      })),
      attachments: (attachmentsByTask[t.id] || []).map(a => ({
        id: a.id, taskId: a.task_id, name: a.name, type: a.type,
        sizeLabel: a.size_label, dataUrl: a.data_url, uploadedBy: a.uploaded_by, uploadedAt: a.uploaded_at,
      })),
    }));

    const taskAttachmentCounts = await this.getTaskAttachmentCounts(projectId, tasks);
    const taskCommentCounts = await this.getTaskCommentCounts(projectId, tasks);

    const boardNames = Array.from(new Set([
      ...this.parseJson<string[]>(meta?.task_board_names || null, []),
      ...taskRecords.map((task) => String(task.projectTaskName || '').trim()).filter(Boolean),
      String(meta?.project_task_board_name || '').trim() || 'Project Tasks',
    ]));

    return {
      nextId: Math.max(1, Number(globalMaxTaskId || 0) + 1),
      taskRecords,
      hasPersistedState: !!meta || tasks.length > 0,
      taskAttachmentCounts,
      taskCommentCounts,
      subgroupCatalog: this.buildSubgroupCatalog(tasks),
      defaultTaskTemplates: this.parseJson<string[]>(meta?.default_task_templates || null, []),
      projectTaskBoardName: String(meta?.project_task_board_name || '').trim() || 'Project Tasks',
      taskBoardNames: boardNames
    };
  }

  /** Replace all tasks for a project with the provided list. */
  async saveState(projectId: string, dto: TaskStateDto): Promise<void> {
    const rows: Omit<PmTaskRow, 'created_at' | 'updated_at'>[] = (dto.taskRecords || []).map((t, index) => ({
      id: t.id || 0,
      project_id: projectId,
      project_task_name: String(t.projectTaskName || '').trim() || 'Project Tasks',
      gate: t.gate,
      group_name: t.groupName,
      sub_group_name: t.subGroupName,
      task_name: t.taskName,
      assigned_to: JSON.stringify(t.assignedTo || []),
      duration_days: t.durationDays,
      start_date: t.startDate || null,
      finish_date: t.finishDate || null,
      depends_on: t.dependsOn || '',
      bucket: t.bucket || '',
      status: t.status,
      completion: t.completion,
      source: t.source,
      sort_order: index + 1,
    } as any));

    const normalizedTemplates = Array.from(new Set((dto.defaultTaskTemplates || [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 100)));

    const normalizedBoards = Array.from(new Set((dto.taskBoardNames || [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 100)));

    const activeBoardName = String(dto.projectTaskBoardName || '').trim() || 'Project Tasks';
    if (!normalizedBoards.includes(activeBoardName)) {
      normalizedBoards.unshift(activeBoardName);
    }

    await this.repository.replaceProjectState(projectId, rows, {
      project_task_board_name: activeBoardName,
      default_task_templates: JSON.stringify(normalizedTemplates),
      task_board_names: JSON.stringify(normalizedBoards),
    });
  }

  async addComment(taskId: number, dto: AddCommentDto): Promise<number> {
    return this.repository.insertComment(taskId, dto.author, dto.text);
  }

  async addAttachment(taskId: number, dto: AddAttachmentDto): Promise<number> {
    return this.repository.insertAttachment(taskId, {
      name: dto.name,
      type: dto.type,
      size_label: dto.sizeLabel,
      data_url: dto.dataUrl || null,
      uploaded_by: dto.uploadedBy,
    });
  }

  async countOpenTasksForUser(assignee: string): Promise<number> {
    if (!assignee) return this.repository.countAllOpenTasks();
    return this.repository.countOpenTasksAssignedTo(assignee);
  }

  private groupBy<T extends Record<string, any>>(arr: T[], keyFn: (item: T) => any): Record<number, T[]> {
    return arr.reduce((acc, item) => {
      const k = keyFn(item);
      (acc[k] = acc[k] || []).push(item);
      return acc;
    }, {} as Record<number, T[]>);
  }

  private parseJson<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }

  private buildSubgroupCatalog(tasks: PmTaskRow[]): Record<string, string[]> {
    const map: Record<string, Set<string>> = {};
    for (const t of tasks) {
      if (!map[t.group_name]) map[t.group_name] = new Set();
      map[t.group_name].add(t.sub_group_name);
    }
    const out: Record<string, string[]> = {};
    for (const g of Object.keys(map)) out[g] = Array.from(map[g]);
    return out;
  }

  private async getTaskAttachmentCounts(projectId: string, tasks: PmTaskRow[]): Promise<Record<number, number>> {
    const out: Record<number, number> = {};
    if (!tasks.length) {
      return out;
    }

    const projectAttachmentBaseId = this.getProjectAttachmentBaseId(projectId);
    if (!projectAttachmentBaseId) {
      tasks.forEach((task) => {
        out[task.id] = 0;
      });
      return out;
    }

    const taskIdByMainId = new Map<number, number>();
    const mainIds: number[] = [];
    tasks.forEach((task) => {
      const mainId = (projectAttachmentBaseId * 100000) + task.id;
      taskIdByMainId.set(mainId, task.id);
      mainIds.push(mainId);
      out[task.id] = 0;
    });

    const rows = await this.repository.getAttachmentCountsByMainIds(mainIds);
    rows.forEach((row) => {
      const mainId = Number((row as any).main_id);
      const taskId = taskIdByMainId.get(mainId);
      if (!taskId) {
        return;
      }

      out[taskId] = Number((row as any).count || 0);
    });

    return out;
  }

  private async getTaskCommentCounts(projectId: string, tasks: PmTaskRow[]): Promise<Record<number, number>> {
    const out: Record<number, number> = {};
    if (!tasks.length) {
      return out;
    }

    const taskIdByOrderNum = new Map<string, number>();
    const orderNums: string[] = [];
    tasks.forEach((task) => {
      const orderNum = `${projectId}::task::${task.id}`;
      taskIdByOrderNum.set(orderNum, task.id);
      orderNums.push(orderNum);
      out[task.id] = 0;
    });

    const rows = await this.repository.getCommentCountsByOrderNums(orderNums);
    rows.forEach((row) => {
      const orderNum = String((row as any).order_num || '').trim();
      const taskId = taskIdByOrderNum.get(orderNum);
      if (!taskId) {
        return;
      }

      out[taskId] = Number((row as any).count || 0);
    });

    return out;
  }

  private getProjectAttachmentBaseId(projectId: string): number | null {
    const normalizedProjectId = String(projectId || '').trim();
    if (!normalizedProjectId) {
      return null;
    }

    const digitsOnly = normalizedProjectId.replace(/\D+/g, '');
    if (digitsOnly) {
      const parsed = Number.parseInt(digitsOnly.slice(-9), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    let hash = 0;
    for (let i = 0; i < normalizedProjectId.length; i += 1) {
      hash = ((hash * 31) + normalizedProjectId.charCodeAt(i)) >>> 0;
    }

    return hash > 0 ? hash : null;
  }
}
