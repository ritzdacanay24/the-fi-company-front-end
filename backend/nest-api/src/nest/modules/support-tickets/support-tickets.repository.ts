import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';
import {
  CreateSupportTicketAttachmentDto,
  CreateSupportTicketCommentDto,
  CreateSupportTicketDto,
  SupportTicket,
  SupportTicketAttachment,
  SupportTicketComment,
  SupportTicketFilters,
  UpdateSupportTicketCommentDto,
  UpdateSupportTicketDto,
} from './support-tickets.types';

interface UserContext extends RowDataPacket {
  id: number;
  email: string | null;
  first: string | null;
  last: string | null;
  admin: number | null;
}

@Injectable()
export class SupportTicketsRepository {
  constructor(@Inject(MysqlService) private readonly mysqlService: MysqlService) {}

  async getUserContext(userId: number): Promise<UserContext | null> {
    const rows = await this.mysqlService.query<UserContext[]>(
      `SELECT id, email, first, last, admin FROM db.users WHERE id = ? LIMIT 1`,
      [userId],
    );

    return rows[0] ?? null;
  }

  async create(ticket: CreateSupportTicketDto & { user_id: number | null; user_email: string | null; screenshot_path: string | null; metadata: Record<string, unknown> | null }): Promise<number> {
    const ticketNumber = await this.generateTicketNumber();

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `
        INSERT INTO eyefidb.support_tickets
          (ticket_number, type, title, description, user_id, user_email, status, priority, screenshot_path, metadata)
        VALUES
          (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
      `,
      [
        ticketNumber,
        ticket.type,
        ticket.title,
        ticket.description,
        ticket.user_id,
        ticket.user_email,
        ticket.priority || 'medium',
        ticket.screenshot_path,
        ticket.metadata ? JSON.stringify(ticket.metadata) : null,
      ],
    );

    return result.insertId;
  }

  async findAll(filters: SupportTicketFilters): Promise<SupportTicket[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (filters.type) {
      where.push('type = ?');
      params.push(filters.type);
    }

    if (filters.status) {
      where.push('status = ?');
      params.push(filters.status);
    }

    if (filters.priority) {
      where.push('priority = ?');
      params.push(filters.priority);
    }

    if (filters.user_id) {
      where.push('user_id = ?');
      params.push(filters.user_id);
    }

    if (filters.assigned_to !== undefined) {
      where.push('assigned_to = ?');
      params.push(filters.assigned_to);
    }

    if (filters.search) {
      where.push('(title LIKE ? OR description LIKE ? OR ticket_number LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const page = Number.isFinite(Number(filters.page)) && Number(filters.page) > 0 ? Math.floor(Number(filters.page)) : 1;
    const limitRaw = Number.isFinite(Number(filters.limit)) && Number(filters.limit) > 0 ? Math.floor(Number(filters.limit)) : 50;
    const limit = Math.min(Math.max(limitRaw, 1), 200);
    const offset = (page - 1) * limit;

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT
          id,
          ticket_number,
          type,
          title,
          description,
          user_id,
          user_email,
          status,
          priority,
          assigned_to,
          screenshot_path,
          metadata,
          created_at,
          updated_at,
          resolved_at,
          closed_at
        FROM eyefidb.support_tickets
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      params,
    );

    return rows.map((row) => this.mapTicket(row));
  }

  async findById(id: number): Promise<SupportTicket | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT * FROM eyefidb.support_tickets WHERE id = ? LIMIT 1`,
      [id],
    );

    if (!rows[0]) {
      return null;
    }

    return this.mapTicket(rows[0]);
  }

  async update(id: number, update: UpdateSupportTicketDto): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (update.type !== undefined) {
      sets.push('type = ?');
      params.push(update.type);
    }

    if (update.title !== undefined) {
      sets.push('title = ?');
      params.push(update.title);
    }

    if (update.description !== undefined) {
      sets.push('description = ?');
      params.push(update.description);
    }

    if (update.status !== undefined) {
      sets.push('status = ?');
      params.push(update.status);

      if (update.status === 'resolved') {
        sets.push('resolved_at = NOW()');
      }

      if (update.status === 'closed') {
        sets.push('closed_at = NOW()');
      }
    }

    if (update.priority !== undefined) {
      sets.push('priority = ?');
      params.push(update.priority);
    }

    if (update.assigned_to !== undefined) {
      sets.push('assigned_to = ?');
      params.push(update.assigned_to);
    }

    if (update.metadata !== undefined) {
      sets.push('metadata = ?');
      params.push(JSON.stringify(update.metadata));
    }

    if (sets.length === 0) {
      return;
    }

    params.push(id);

    await this.mysqlService.execute(
      `UPDATE eyefidb.support_tickets SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
  }

  async delete(id: number): Promise<void> {
    await this.mysqlService.execute(`DELETE FROM eyefidb.support_tickets WHERE id = ?`, [id]);
  }

  async getComments(ticketId: number, includeInternal: boolean): Promise<SupportTicketComment[]> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT *
        FROM eyefidb.support_ticket_comments
        WHERE ticket_id = ? ${includeInternal ? '' : 'AND is_internal = 0'}
        ORDER BY created_at ASC
      `,
      [ticketId],
    );

    return rows as SupportTicketComment[];
  }

  async findCommentById(commentId: number): Promise<SupportTicketComment | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT * FROM eyefidb.support_ticket_comments WHERE id = ? LIMIT 1`,
      [commentId],
    );

    return (rows[0] as SupportTicketComment) ?? null;
  }

  async createComment(dto: CreateSupportTicketCommentDto, user: UserContext): Promise<number> {
    const fullName = [user.first, user.last].filter(Boolean).join(' ').trim();

    const result = await this.mysqlService.execute<ResultSetHeader>(
      `
        INSERT INTO eyefidb.support_ticket_comments
          (ticket_id, user_id, user_name, user_email, comment, is_internal, is_system_generated)
        VALUES
          (?, ?, ?, ?, ?, ?, 0)
      `,
      [
        dto.ticket_id,
        user.id,
        fullName || user.email || `User ${user.id}`,
        user.email,
        dto.comment,
        dto.is_internal ? 1 : 0,
      ],
    );

    return result.insertId;
  }

  async createSystemComment(ticketId: number, message: string, userId: number): Promise<void> {
    await this.mysqlService.execute(
      `
        INSERT INTO eyefidb.support_ticket_comments
          (ticket_id, user_id, user_name, user_email, comment, is_internal, is_system_generated)
        VALUES
          (?, ?, 'System', NULL, ?, 0, 1)
      `,
      [ticketId, userId, message],
    );
  }

  async updateComment(commentId: number, dto: UpdateSupportTicketCommentDto): Promise<void> {
    await this.mysqlService.execute(
      `
        UPDATE eyefidb.support_ticket_comments
        SET comment = ?, edited_at = NOW()
        WHERE id = ?
      `,
      [dto.comment, commentId],
    );
  }

  async deleteComment(commentId: number): Promise<void> {
    await this.mysqlService.execute(`DELETE FROM eyefidb.support_ticket_comments WHERE id = ?`, [commentId]);
  }

  async getAttachments(ticketId: number): Promise<SupportTicketAttachment[]> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT *
        FROM eyefidb.support_ticket_attachments
        WHERE ticket_id = ?
        ORDER BY created_at DESC
      `,
      [ticketId],
    );

    return rows as SupportTicketAttachment[];
  }

  async findAttachmentById(attachmentId: number): Promise<SupportTicketAttachment | null> {
    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `SELECT * FROM eyefidb.support_ticket_attachments WHERE id = ? LIMIT 1`,
      [attachmentId],
    );

    return (rows[0] as SupportTicketAttachment) ?? null;
  }

  async createAttachment(
    ticketId: number,
    dto: CreateSupportTicketAttachmentDto,
    uploadedBy: number,
  ): Promise<number> {
    const result = await this.mysqlService.execute<ResultSetHeader>(
      `
        INSERT INTO eyefidb.support_ticket_attachments
          (ticket_id, comment_id, file_name, file_url, mime_type, file_size, uploaded_by)
        VALUES
          (?, ?, ?, ?, ?, ?, ?)
      `,
      [ticketId, dto.comment_id ?? null, dto.file_name, dto.file_url, dto.mime_type ?? null, dto.file_size ?? null, uploadedBy],
    );

    return result.insertId;
  }

  async deleteAttachment(attachmentId: number): Promise<void> {
    await this.mysqlService.execute(`DELETE FROM eyefidb.support_ticket_attachments WHERE id = ?`, [attachmentId]);
  }

  private async generateTicketNumber(): Promise<string> {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const rows = await this.mysqlService.query<RowDataPacket[]>(
      `
        SELECT ticket_number
        FROM eyefidb.support_tickets
        WHERE ticket_number LIKE ?
        ORDER BY ticket_number DESC
        LIMIT 1
      `,
      [`TKT-${yyyymm}-%`],
    );

    let nextNumber = 1;
    if (rows[0]?.ticket_number) {
      const split = String(rows[0].ticket_number).split('-');
      const parsed = Number(split[2]);
      if (Number.isFinite(parsed)) {
        nextNumber = parsed + 1;
      }
    }

    return `TKT-${yyyymm}-${String(nextNumber).padStart(5, '0')}`;
  }

  private mapTicket(row: RowDataPacket): SupportTicket {
    let metadata: Record<string, unknown> | null = null;
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch {
        metadata = null;
      }
    }

    return {
      id: Number(row.id),
      ticket_number: String(row.ticket_number),
      type: row.type,
      title: String(row.title),
      description: String(row.description),
      user_id: row.user_id == null ? null : Number(row.user_id),
      user_email: row.user_email ?? null,
      status: row.status,
      priority: row.priority,
      assigned_to: row.assigned_to == null ? null : Number(row.assigned_to),
      screenshot_path: row.screenshot_path ?? null,
      metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
      resolved_at: row.resolved_at ?? null,
      closed_at: row.closed_at ?? null,
    };
  }
}
