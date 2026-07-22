import { Inject, Injectable } from '@nestjs/common';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

export interface PmTaskRow extends RowDataPacket {
  id: number;
  project_id: string;
  project_task_name: string;
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
  sort_order: number;
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

export interface PmTaskStateRow extends RowDataPacket {
  project_id: string;
  project_task_board_name: string;
  default_task_templates: string | null;
  task_board_names: string | null;
  updated_at: string;
}

export interface PmTaskStateUpsertInput {
  project_task_board_name: string;
  default_task_templates: string;
  task_board_names: string;
}

export interface PmTaskAssigneeSnapshotRow extends RowDataPacket {
  id: number;
  task_name: string;
  gate: string;
  assigned_to: string | null;
}

export interface UserEmailLookupRow extends RowDataPacket {
  display_name: string;
  email: string;
}

export interface UserDisplayNameLookupRow extends RowDataPacket {
  display_name: string;
}

interface CountByMainIdRow extends RowDataPacket {
  main_id: number;
  count: number;
}

interface CountByOrderNumRow extends RowDataPacket {
  order_num: string;
  count: number;
}

@Injectable()
export class PmTasksRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getTasksByProject(projectId: string): Promise<PmTaskRow[]> {
    return this.mysqlService.query<PmTaskRow[]>(
      `SELECT * FROM eyefidb.pm_tasks WHERE project_id = ? ORDER BY sort_order ASC, id ASC`,
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

  async getTaskStateByProject(projectId: string): Promise<PmTaskStateRow | null> {
    const rows = await this.mysqlService.query<PmTaskStateRow[]>(
      `SELECT * FROM eyefidb.pm_task_state WHERE project_id = ? LIMIT 1`,
      [projectId],
    );
    return rows[0] || null;
  }

  async projectExists(projectId: string): Promise<boolean> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT 1 AS found FROM eyefidb.pm_projects WHERE id = ? LIMIT 1`,
      [projectId],
    );
    return rows.length > 0;
  }

  async getTaskAssigneeSnapshotsByProject(projectId: string): Promise<PmTaskAssigneeSnapshotRow[]> {
    return this.mysqlService.query<PmTaskAssigneeSnapshotRow[]>(
      `SELECT id, task_name, gate, assigned_to
       FROM eyefidb.pm_tasks
       WHERE project_id = ?`,
      [projectId],
    );
  }

  async findActiveUsersByDisplayNames(displayNames: string[]): Promise<UserEmailLookupRow[]> {
    const normalized = Array.from(new Set(
      displayNames
        .map((name) => String(name || '').trim().toLowerCase())
        .filter(Boolean),
    ));

    if (!normalized.length) {
      return [];
    }

    const placeholders = normalized.map(() => '?').join(',');
    return this.mysqlService.query<UserEmailLookupRow[]>(
      `SELECT
         TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, ''))) AS display_name,
         TRIM(u.email) AS email
       FROM db.users u
       WHERE u.active = 1
         AND u.email IS NOT NULL
         AND TRIM(u.email) <> ''
         AND LOWER(TRIM(CONCAT(COALESCE(u.first, ''), ' ', COALESCE(u.last, '')))) IN (${placeholders})`,
      normalized,
    );
  }

  async getUserDisplayNameById(userId: number): Promise<string | null> {
    if (!Number.isFinite(userId) || userId <= 0) {
      return null;
    }

    const rows = await this.mysqlService.query<UserDisplayNameLookupRow[]>(
      `SELECT TRIM(CONCAT(COALESCE(first, ''), ' ', COALESCE(last, ''))) AS display_name
       FROM db.users
       WHERE id = ?
       LIMIT 1`,
      [userId],
    );

    const displayName = String(rows[0]?.display_name || '').trim();
    return displayName || null;
  }

  async getGlobalMaxTaskId(): Promise<number> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT COALESCE(MAX(id), 0) AS max_id FROM eyefidb.pm_tasks`,
    );
    return Number((rows[0] as any)?.max_id || 0);
  }

  async getAttachmentCountsByMainIds(mainIds: number[]): Promise<CountByMainIdRow[]> {
    const normalizedIds = Array.from(new Set(mainIds.filter((id) => Number.isFinite(id) && id > 0)));
    if (!normalizedIds.length) {
      return [];
    }

    const placeholders = normalizedIds.map(() => '?').join(',');
    return this.mysqlService.query<CountByMainIdRow[]>(
      `SELECT a.mainId AS main_id, COUNT(*) AS count
       FROM eyefidb.attachments a
       WHERE a.field = 'project_manager_task'
         AND a.active = 1
         AND a.mainId IN (${placeholders})
       GROUP BY a.mainId`,
      normalizedIds,
    );
  }

  async getCommentCountsByOrderNums(orderNums: string[]): Promise<CountByOrderNumRow[]> {
    const normalizedOrderNums = Array.from(new Set(
      orderNums
        .map((orderNum) => String(orderNum || '').trim())
        .filter(Boolean),
    ));
    if (!normalizedOrderNums.length) {
      return [];
    }

    const placeholders = normalizedOrderNums.map(() => '?').join(',');
    return this.mysqlService.query<CountByOrderNumRow[]>(
      `SELECT c.orderNum AS order_num, COUNT(*) AS count
       FROM eyefidb.comments c
       WHERE c.type = 'Project Manager Task'
         AND c.active = 1
         AND c.orderNum IN (${placeholders})
       GROUP BY c.orderNum`,
      normalizedOrderNums,
    );
  }

  async insertTask(projectId: string, task: Omit<PmTaskRow, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `INSERT INTO eyefidb.pm_tasks
         (project_id, project_task_name, gate, group_name, sub_group_name, task_name, assigned_to,
          duration_days, start_date, finish_date, depends_on, bucket, status, completion, source, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        task.project_task_name,
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
        Number.isFinite(task.sort_order) ? task.sort_order : 0,
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

  async replaceProjectState(
    projectId: string,
    tasks: Omit<PmTaskRow, 'created_at' | 'updated_at'>[],
    state: PmTaskStateUpsertInput,
  ): Promise<void> {
    await this.mysqlService.withTransaction(async (connection) => {
      const normalizedTaskIds = Array.from(new Set(
        tasks
          .map((task) => Number(task.id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ));

      // Remove rows not present in payload while preserving IDs for rows that remain.
      if (normalizedTaskIds.length) {
        const placeholders = normalizedTaskIds.map(() => '?').join(',');
        await connection.query(
          `DELETE FROM eyefidb.pm_task_comments
           WHERE task_id IN (
             SELECT id FROM (
               SELECT id FROM eyefidb.pm_tasks
               WHERE project_id = ? AND id NOT IN (${placeholders})
             ) stale
           )`,
          [projectId, ...normalizedTaskIds],
        );

        await connection.query(
          `DELETE FROM eyefidb.pm_task_attachments
           WHERE task_id IN (
             SELECT id FROM (
               SELECT id FROM eyefidb.pm_tasks
               WHERE project_id = ? AND id NOT IN (${placeholders})
             ) stale
           )`,
          [projectId, ...normalizedTaskIds],
        );

        await connection.query(
          `DELETE FROM eyefidb.pm_tasks WHERE project_id = ? AND id NOT IN (${placeholders})`,
          [projectId, ...normalizedTaskIds],
        );
      } else {
        await connection.query(
          `DELETE FROM eyefidb.pm_task_comments
           WHERE task_id IN (SELECT id FROM (SELECT id FROM eyefidb.pm_tasks WHERE project_id = ?) stale)`,
          [projectId],
        );
        await connection.query(
          `DELETE FROM eyefidb.pm_task_attachments
           WHERE task_id IN (SELECT id FROM (SELECT id FROM eyefidb.pm_tasks WHERE project_id = ?) stale)`,
          [projectId],
        );
        await connection.query(`DELETE FROM eyefidb.pm_tasks WHERE project_id = ?`, [projectId]);
      }

      for (let index = 0; index < tasks.length; index += 1) {
        const task = tasks[index];
        const id = Number(task.id);
        if (!Number.isFinite(id) || id <= 0) {
          continue;
        }

        const sortOrder = index + 1;

        await connection.execute(
          `INSERT INTO eyefidb.pm_tasks
             (id, project_id, project_task_name, gate, group_name, sub_group_name, task_name, assigned_to,
              duration_days, start_date, finish_date, depends_on, bucket, status, completion, source, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             project_id = VALUES(project_id),
             project_task_name = VALUES(project_task_name),
             gate = VALUES(gate),
             group_name = VALUES(group_name),
             sub_group_name = VALUES(sub_group_name),
             task_name = VALUES(task_name),
             assigned_to = VALUES(assigned_to),
             duration_days = VALUES(duration_days),
             start_date = VALUES(start_date),
             finish_date = VALUES(finish_date),
             depends_on = VALUES(depends_on),
             bucket = VALUES(bucket),
             status = VALUES(status),
             completion = VALUES(completion),
             source = VALUES(source),
             sort_order = VALUES(sort_order)` ,
          [
            id,
            projectId,
            task.project_task_name,
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
            sortOrder,
          ],
        );
      }

      await connection.execute(
        `INSERT INTO eyefidb.pm_task_state (project_id, project_task_board_name, default_task_templates, task_board_names)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           project_task_board_name = VALUES(project_task_board_name),
           default_task_templates = VALUES(default_task_templates),
           task_board_names = VALUES(task_board_names)`,
        [projectId, state.project_task_board_name, state.default_task_templates, state.task_board_names],
      );
    });
  }
}
