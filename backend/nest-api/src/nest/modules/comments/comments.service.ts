import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { CommentsRepository } from './comments.repository';
import { MysqlService } from '@/shared/database/mysql.service';
import { AccessControlService } from '../access-control';
import { EmailService } from '@/shared/email/email.service';

type GenericRow = Record<string, unknown>;

@Injectable()
export class CommentsService {
  constructor(
    private readonly repository: CommentsRepository,
    private readonly mysqlService: MysqlService,
    private readonly accessControlService: AccessControlService,
    private readonly emailService: EmailService,
  ) {}

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
    type?: string;
    locationPath?: string;
    pageName?: string;
    comments_html?: string;
    pid?: string | number | null;
  }, requesterUserId: number) {
    const comments = String(payload?.comments || '').trim();
    const orderNum = String(payload?.orderNum || '').trim();
    const type = String(payload?.type || '').trim();
    const userId = Number(requesterUserId);

    if (!comments || !orderNum || !type || !userId) {
      return { success: false, message: 'comments, orderNum, type and authenticated user context are required' };
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

    await this.sendMentionNotifications({
      comments,
      orderNum,
      type,
      locationPath: String(payload?.locationPath || ''),
      pageName: String(payload?.pageName || ''),
      createdBy: userId,
    });

    return { success: true, insertId };
  }

  async delete(payload: { id?: number | string; active?: number | string }, requesterUserId: number) {
    const id = Number(payload?.id);
    if (!id) {
      return { success: false, message: 'Comment id is required' };
    }

    if (!requesterUserId || Number.isNaN(requesterUserId)) {
      throw new ForbiddenException('Requester user id is required');
    }

    const comment = await this.repository.findOwnerById(id);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isOwner = Number(comment.userId) === Number(requesterUserId);
    const canDeleteAny = await this.accessControlService.userHasPermissions(requesterUserId, ['delete']);
    if (!isOwner && !canDeleteAny) {
      throw new ForbiddenException('Insufficient permission to delete this comment');
    }

    const active = Number(payload?.active ?? 0);
    const normalizedActive = Number.isNaN(active) ? 0 : active;
    await this.repository.softDelete(id, normalizedActive);

    return { success: true, id, active: normalizedActive };
  }

  /**
   * Get formatted comments for shipping report by order numbers
   */
  async getForShippingByOrderNumbers(ids: string[]): Promise<GenericRow[]> {
    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    const sql = `
      SELECT a.orderNum
        , comments_html
        , comments
        , a.createdDate
        , DATE(a.createdDate) byDate
        , CASE WHEN DATE(a.createdDate) = CURDATE() THEN 'text-success' ELSE 'text-info' END color_class_name
        , CASE WHEN DATE(a.createdDate) = CURDATE() THEN 'bg-success' ELSE 'bg-info' END bg_class_name
        , CONCAT('SO#:', ' ', a.orderNum) comment_title
        , CONCAT(c.first, ' ', c.last) created_by_name
      FROM eyefidb.comments a
      INNER JOIN (
        SELECT orderNum
          , MAX(id) id
          , MAX(DATE(createdDate)) createdDate
        FROM eyefidb.comments
        WHERE orderNum IN (${placeholders})
          AND active = 1
        GROUP BY orderNum
      ) b ON a.orderNum = b.orderNum AND a.id = b.id
      LEFT JOIN db.users c ON c.id = a.userId
      WHERE a.type = 'Sales Order'
        AND a.orderNum IN (${placeholders})
        AND a.active = 1
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, [...ids, ...ids]);
  }

  /**
   * Get mention comments by order numbers
   */
  async getMentionsByOrderNumbers(ids: string[]): Promise<GenericRow[]> {
    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    const sql = `
      SELECT GROUP_CONCAT(comments) all_comments
        , orderNum
      FROM eyefidb.comments
      WHERE orderNum IN (${placeholders})
        AND active = 1
      GROUP BY orderNum
    `;

    return this.mysqlService.query<RowDataPacket[]>(sql, ids);
  }

  private async sendMentionNotifications(input: {
    comments: string;
    orderNum: string;
    type: string;
    locationPath: string;
    pageName: string;
    createdBy: number;
  }): Promise<void> {
    const recipients = this.extractMentionRecipients(input.comments);

    if (recipients.length === 0) {
      return;
    }

    const safeComment = this.stripHtml(input.comments).slice(0, 2000);
    const link = input.locationPath || '';
    const subject = `[Comment Mention] ${input.type}: ${input.orderNum}`;

    await this.emailService.sendMail({
      to: recipients,
      subject,
      html: `
        <html>
          <body>
            <p>You were mentioned in a comment on <strong>${this.escapeHtml(input.type)}</strong> for <strong>${this.escapeHtml(input.orderNum)}</strong>.</p>
            <p><a href="${this.escapeHtml(link)}">Open the comment</a></p>
            <hr />
            <div>${this.escapeHtml(safeComment).replace(/\n/g, '<br />')}</div>
          </body>
        </html>
      `,
    });
  }

  private extractMentionRecipients(comments: string): string[] {
    if (!comments) {
      return [];
    }

    const recipients = new Set<string>();

    const mentionDataIdPattern = /class=["'][^"']*mention[^"']*["'][^>]*data-id=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = mentionDataIdPattern.exec(comments)) !== null) {
      const email = String(match[1] || '').trim();
      if (this.looksLikeEmail(email)) {
        recipients.add(email);
      }
    }

    if (recipients.size === 0) {
      const plainMentionEmailPattern = /@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
      while ((match = plainMentionEmailPattern.exec(comments)) !== null) {
        const email = String(match[1] || '').trim();
        if (this.looksLikeEmail(email)) {
          recipients.add(email);
        }
      }
    }

    return Array.from(recipients);
  }

  private looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private stripHtml(value: string): string {
    return String(value || '').replace(/<[^>]*>/g, '');
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
