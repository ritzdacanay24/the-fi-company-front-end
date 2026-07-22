import { Injectable, Logger } from '@nestjs/common';
import { ActivityEntityType, InsertActivityLogDto, PmActivityLogRepository } from './pm-activity-log.repository';

export interface LogActivityOptions {
  projectId: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  action: string;
  fieldName?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  userId?: number | null;
  userName?: string | null;
}

export interface LogFieldChangesOptions {
  projectId: string;
  entityType: ActivityEntityType;
  entityId?: string | null;
  userId?: number | null;
  userName?: string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  /** Fields to skip comparing (e.g. timestamps, internal flags) */
  skipFields?: string[];
  /** Human-readable label overrides for field names */
  fieldLabels?: Record<string, string>;
}

@Injectable()
export class PmActivityLogService {
  private readonly logger = new Logger(PmActivityLogService.name);

  constructor(private readonly repo: PmActivityLogRepository) {}

  /** Log a single activity entry. Errors are swallowed — logging must never break business logic. */
  async log(options: LogActivityOptions): Promise<void> {
    try {
      const userName = options.userName ?? await this.repo.resolveUserName(options.userId);
      await this.repo.insert({ ...options, userName } as InsertActivityLogDto);
    } catch (err) {
      this.logger.error('Failed to write pm_activity_log entry', err);
    }
  }

  /** Diff two objects and log one entry per changed field. */
  async logFieldChanges(options: LogFieldChangesOptions): Promise<void> {
    const {
      projectId, entityType, entityId, userId, userName,
      before, after, skipFields = [], fieldLabels = {},
    } = options;

    const ignoredFields = new Set([
      'updated_at', 'created_at', 'updatedAt', 'createdAt',
      'readinessScore', 'readinessStatus', 'gateCompletion', 'gateCompletedAt',
      ...skipFields,
    ]);

    const entries: InsertActivityLogDto[] = [];

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (ignoredFields.has(key)) continue;

      const oldVal = before[key];
      const newVal = after[key];

      const oldStr = oldVal !== null && oldVal !== undefined ? String(oldVal) : '';
      const newStr = newVal !== null && newVal !== undefined ? String(newVal) : '';

      if (oldStr === newStr) continue;

      entries.push({
        projectId,
        entityType,
        entityId: entityId ?? null,
        action: 'field_changed',
        fieldName: fieldLabels[key] ?? key,
        oldValue: oldStr || null,
        newValue: newStr || null,
        userId: userId ?? null,
        userName: userName ?? null,
      });
    }

    if (entries.length === 0) return;

    try {
      const resolvedUserName = userName ?? await this.repo.resolveUserName(userId);
      await this.repo.insertMany(entries.map(e => ({ ...e, userName: resolvedUserName })));
    } catch (err) {
      this.logger.error('Failed to write pm_activity_log field change entries', err);
    }
  }

  async getForProject(
    projectId: string,
    filters: { entityType?: ActivityEntityType; entityId?: string; limit?: number } = {},
  ) {
    const rows = await this.repo.findByProject(projectId, filters);

    return rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      fieldName: row.field_name,
      oldValue: row.old_value,
      newValue: row.new_value,
      userId: row.user_id,
      userName: row.user_name,
      createdAt: row.created_at,
    }));
  }
}
