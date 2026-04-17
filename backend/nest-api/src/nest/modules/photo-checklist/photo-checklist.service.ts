import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { PhotoChecklistRepository } from './photo-checklist.repository';

type ChecklistItemRow = RowDataPacket & {
  id?: number | string;
  parent_id?: number | string | null;
  sample_images?: unknown;
  sample_videos?: unknown;
  photo_requirements?: unknown;
  video_requirements?: unknown;
  links?: unknown;
};

type ChecklistItemNode = Record<string, unknown> & {
  id: number | string;
  parent_id?: number | string | null;
  children: ChecklistItemNode[];
};

@Injectable()
export class PhotoChecklistService {
  constructor(private readonly repository: PhotoChecklistRepository) {}

  async getTemplates() {
    return this.repository.getTemplates();
  }

  async getTemplateById(id: number) {
    const template = await this.repository.getTemplateById(id);
    if (!template) {
      throw new NotFoundException({
        code: 'RC_CHECKLIST_TEMPLATE_NOT_FOUND',
        message: `Checklist template with id ${id} not found`,
      });
    }

    const items = await this.repository.getTemplateItems(id);
    return {
      ...template,
      items: this.buildNestedItems(items),
    };
  }

  async getInstances(filters?: { status?: string; workOrder?: string }) {
    return this.repository.getInstances(filters);
  }

  async createInstance(payload: {
    template_id: number;
    work_order_number: string;
    part_number?: string;
    serial_number?: string;
    operator_id?: number | null;
    operator_name?: string;
    status?: string;
  }) {
    const insertId = await this.repository.createInstance(payload);
    return {
      success: true,
      instance_id: insertId,
    };
  }

  private buildNestedItems(items: RowDataPacket[]): ChecklistItemNode[] {
    const normalized: ChecklistItemNode[] = [];

    for (const item of items as ChecklistItemRow[]) {
      const id = item.id;
      if (id == null || id === '') {
        continue;
      }

      normalized.push({
        ...(item as Record<string, unknown>),
        id,
        parent_id: item.parent_id ?? null,
        sample_images: this.safeParseJson(item.sample_images, []),
        sample_videos: this.safeParseJson(item.sample_videos, []),
        photo_requirements: this.safeParseJson(item.photo_requirements, {}),
        video_requirements: this.safeParseJson(item.video_requirements, {}),
        links: this.safeParseJson(item.links, []),
        children: [],
      });
    }

    const byId = new Map<number, ChecklistItemNode>();
    normalized.forEach((item) => byId.set(Number(item.id), item));

    const roots: ChecklistItemNode[] = [];
    normalized.forEach((item) => {
      const parentId = Number(item.parent_id || 0);
      if (parentId > 0 && byId.has(parentId)) {
        const parent = byId.get(parentId);
        const children = parent?.children || [];
        children.push(item);
        if (parent) {
          parent.children = children;
        }
      } else {
        roots.push(item);
      }
    });

    return roots;
  }

  private safeParseJson<T>(value: unknown, fallback: T): T {
    if (value == null || value === '') {
      return fallback;
    }

    if (typeof value === 'object') {
      return value as T;
    }

    try {
      return JSON.parse(String(value)) as T;
    } catch {
      return fallback;
    }
  }
}
