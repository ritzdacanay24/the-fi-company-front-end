import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export interface PmTaskRow extends RowDataPacket {
  id: number;
  project_id: string;
  gate: string;
  group_name: string;
  sub_group_name: string;
  task_name: string;
  assigned_to: string | null; // JSON array string
  duration_days: number;
  start_date: string | null;
  finish_date: string | null;
  depends_on: string;
  bucket: string;
  status: string;
  completion: number;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface PmTaskCommentRow extends RowDataPacket {
  id: number;
  task_id: number;
  author: string;
  text: string;
  created_at: string;
}

export interface PmTaskAttachmentRow extends RowDataPacket {
  id: number;
  task_id: number;
  name: string;
  type: string;
  size_label: string;
  data_url: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

@Injectable()
export class PmTasksRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getTasksByProject(projectId: string): Promise<PmTaskRow[]> {
    return this.mysqlService.query<PmTaskRow[]>(
      `SELECT * FROM eyefidb.pm_tasks WHERE project_id = ? ORDER BY id ASC`,
      [projectId],
    );
  }

  async getCommentsByProject(projectId: string): Promise<PmTaskCommentRow[]> {
    return this.mysqlService.query<PmTaskCommentRow[]>(
      `SELECT c.* FROM eyefidb.pm_task_comments c
       INNER JOIN eyefidb.pm_tasks t ON t.id = c.task_id
       WHERE t.project_id = ? ORDER BY c.id ASC`,
      [projectId],
    );
  }

  async getAttachmentsByProject(projectId: string): Promise<PmTaskAttachmentRow[]> {
    return this.mysqlService.query<PmTaskAttachmentRow[]>(
      `SELECT a.* FROM eyefidb.pm_task_attachments a
       INNER JOIN eyefidb.pm_tasks t ON t.id = a.task_id
       WHERE t.project_id = ? ORDER BY a.id ASC`,
      [projectId],
    );
  }

  async insertTask(projectId: string, task: Omit<PmTaskRow, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO eyefidb.pm_tasks
         (project_id, gate, group_name, sub_group_name, task_name, assigned_to,
          duration_days, start_date, finish_date, depends_on, bucket, status, completion, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        task.gate,
        task.group_name,
        task.sub_group_name,
        task.task_name,
        task.assigned_to || null,
        task.duration_days,
        task.start_date || null,
        task.finish_date || null,
        task.depends_on,
        task.bucket,
        task.status,
        task.completion,
        task.source,
      ],
    );
    return result.insertId;
  }

  async updateTask(id: number, patch: Partial<Omit<PmTaskRow, 'id' | 'project_id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const fields = Object.keys(patch).map(k => `${k} = ?`).join(', ');
    if (!fields) return;
    await this.mysqlService.query(
      `UPDATE eyefidb.pm_tasks SET ${fields} WHERE id = ?`,
      [...Object.values(patch), id],
    );
  }

  async deleteTask(id: number): Promise<void> {
    await this.mysqlService.query(`DELETE FROM eyefidb.pm_tasks WHERE id = ?`, [id]);
  }

  async deleteTasksByProject(projectId: string): Promise<void> {
    await this.mysqlService.query(`DELETE FROM eyefidb.pm_tasks WHERE project_id = ?`, [projectId]);
  }

  async insertComment(taskId: number, author: string, text: string): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO eyefidb.pm_task_comments (task_id, author, text) VALUES (?, ?, ?)`,
      [taskId, author, text],
    );
    return result.insertId;
  }

  async insertAttachment(
    taskId: number,
    attachment: Omit<PmTaskAttachmentRow, 'id' | 'task_id' | 'uploaded_at'>,
  ): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO eyefidb.pm_task_attachments (task_id, name, type, size_label, data_url, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [taskId, attachment.name, attachment.type, attachment.size_label, attachment.data_url || null, attachment.uploaded_by],
    );
    return result.insertId;
  }

  /** Count open tasks assigned to a given user (by name match in JSON array). */
  async countOpenTasksAssignedTo(assignee: string): Promise<number> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt
       FROM eyefidb.pm_tasks t
       WHERE t.status NOT IN ('Completed', 'Locked')
         AND JSON_CONTAINS(t.assigned_to, ?, '$')`,
      [JSON.stringify(assignee)],
    );
    return Number((rows[0] as any)?.cnt || 0);
  }

  /** Count all open tasks globally (not completed/locked). */
  async countAllOpenTasks(): Promise<number> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM eyefidb.pm_tasks WHERE status NOT IN ('Completed', 'Locked')`,
    );
    return Number((rows[0] as any)?.cnt || 0);
  }

  /** Replace all tasks for a project (used when syncing full state from frontend). */
  async replaceTasksForProject(projectId: string, tasks: Omit<PmTaskRow, 'created_at' | 'updated_at'>[]): Promise<void> {
    await this.deleteTasksByProject(projectId);
    for (const task of tasks) {
      await this.insertTask(projectId, task);
    }
  }
}
