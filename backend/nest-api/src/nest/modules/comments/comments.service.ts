import { Injectable } from '@nestjs/common';
import { CommentsRepository } from './comments.repository';

@Injectable()
export class CommentsService {
  constructor(private readonly repository: CommentsRepository) {}

  async find(orderNum?: string, type?: string, active?: string) {
    const normalizedOrderNum = String(orderNum || '').trim();
    const normalizedType = String(type || '').trim();
    const normalizedActive = Number(active ?? 1);

    return this.repository.find({
      orderNum: normalizedOrderNum || undefined,
      type: normalizedType || undefined,
      active: Number.isNaN(normalizedActive) ? 1 : normalizedActive,
    });
  }

  async create(payload: {
    comments?: string;
    orderNum?: string;
    userId?: number | string;
    type?: string;
    locationPath?: string;
    pageName?: string;
    comments_html?: string;
    pid?: string | number | null;
  }) {
    const comments = String(payload?.comments || '').trim();
    const orderNum = String(payload?.orderNum || '').trim();
    const type = String(payload?.type || '').trim();
    const userId = Number(payload?.userId);

    if (!comments || !orderNum || !type || !userId) {
      return { success: false, message: 'comments, orderNum, type and userId are required' };
    }

    const insertId = await this.repository.create({
      comments,
      orderNum,
      userId,
      type,
      pageApplied: String(payload?.locationPath || ''),
      pageName: String(payload?.pageName || ''),
      commentsHtml: String(payload?.comments_html || ''),
      pid: payload?.pid === null || payload?.pid === undefined ? null : String(payload.pid),
    });

    return { success: true, insertId };
  }

  async delete(payload: { id?: number | string; active?: number | string }) {
    const id = Number(payload?.id);
    if (!id) {
      return { success: false, message: 'Comment id is required' };
    }

    const active = Number(payload?.active ?? 0);
    await this.repository.softDelete(id, Number.isNaN(active) ? 0 : active);

    return { success: true, id, active: Number.isNaN(active) ? 0 : active };
  }
}
