import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateSupportTicketAttachmentDto,
  CreateSupportTicketCommentDto,
  CreateSupportTicketDto,
  SupportTicket,
  SupportTicketAttachment,
  SupportTicketComment,
  SupportTicketFilters,
  SupportTicketStatus,
  UpdateSupportTicketCommentDto,
  UpdateSupportTicketDto,
} from './support-tickets.types';
import { SupportTicketsRepository } from './support-tickets.repository';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';

interface RequestUser {
  id: number;
}

@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(
    private readonly repository: SupportTicketsRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateSupportTicketDto, user: RequestUser): Promise<SupportTicket> {
    const userContext = await this.requireUserContext(user.id);
    const screenshotPath = this.extractScreenshotPath(dto.screenshot);

    const ticketId = await this.repository.create({
      ...dto,
      user_id: userContext.id,
      user_email: userContext.email,
      screenshot_path: screenshotPath,
      metadata: {
        ...(dto.metadata || {}),
        ...(dto.steps ? { steps: dto.steps } : {}),
      },
    });

    const ticket = await this.repository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found after creation');
    }

    await this.sendTicketCreatedNotification(ticket, userContext);

    return ticket;
  }

  async findAll(filters: SupportTicketFilters, user: RequestUser): Promise<SupportTicket[]> {
    const userContext = await this.requireUserContext(user.id);

    if (!this.isAdmin(userContext.admin)) {
      filters.user_id = userContext.id;
    }

    return this.repository.findAll(filters);
  }

  async findOne(id: number, user: RequestUser): Promise<SupportTicket> {
    const userContext = await this.requireUserContext(user.id);
    const ticket = await this.repository.findById(id);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!this.isAdmin(userContext.admin) && ticket.user_id !== userContext.id) {
      throw new ForbiddenException('You do not have permission to view this ticket');
    }

    return ticket;
  }

  async update(id: number, dto: UpdateSupportTicketDto, user: RequestUser): Promise<SupportTicket> {
    const userContext = await this.requireUserContext(user.id);
    const ticket = await this.findOne(id, user);
    const keys = Object.keys(dto || {}).filter((key) => (dto as Record<string, unknown>)[key] !== undefined);

    if (keys.length === 0) {
      throw new BadRequestException('No ticket fields were provided to update');
    }

    if (this.isAdmin(userContext.admin)) {
      await this.repository.update(id, dto);
      const updated = (await this.repository.findById(id)) as SupportTicket;
      if (dto.status && dto.status !== ticket.status) {
        await this.sendStatusUpdatedNotification(updated, ticket.status);
      }
      return updated;
    }

    const onlyStatusUpdate = keys.length === 1 && keys[0] === 'status';
    if (!onlyStatusUpdate || dto.status !== 'closed') {
      throw new ForbiddenException('Only administrators can update ticket details');
    }

    if (ticket.status === 'closed') {
      return ticket;
    }

    await this.repository.update(id, { status: 'closed' });
    const updated = (await this.repository.findById(id)) as SupportTicket;
    await this.sendStatusUpdatedNotification(updated, ticket.status);
    return updated;
  }

  async delete(id: number, user: RequestUser): Promise<void> {
    const userContext = await this.requireUserContext(user.id);
    await this.findOne(id, user);

    if (!this.isAdmin(userContext.admin)) {
      throw new ForbiddenException('Only administrators can delete tickets');
    }

    await this.repository.delete(id);
  }

  async getComments(ticketId: number, user: RequestUser): Promise<SupportTicketComment[]> {
    const userContext = await this.requireUserContext(user.id);
    await this.findOne(ticketId, user);

    return this.repository.getComments(ticketId, this.isAdmin(userContext.admin));
  }

  async addComment(dto: CreateSupportTicketCommentDto, user: RequestUser): Promise<SupportTicketComment> {
    const userContext = await this.requireUserContext(user.id);
    await this.findOne(dto.ticket_id, user);

    const comments = await this.repository.getComments(dto.ticket_id, true);
    if (this.isAdmin(userContext.admin) && comments.length === 0) {
      await this.repository.createSystemComment(dto.ticket_id, 'Support team is now reviewing your ticket', userContext.id);
      await this.repository.update(dto.ticket_id, { status: 'in_progress' as SupportTicketStatus });
    }

    const commentId = await this.repository.createComment(dto, userContext);
    const created = await this.repository.findCommentById(commentId);

    if (!created) {
      throw new NotFoundException('Comment not found after creation');
    }

    // Skip system-generated comments for email
    if (!dto.is_internal) {
      const ticket = await this.repository.findById(dto.ticket_id);
      if (ticket) {
        await this.sendCommentNotification(ticket, created, userContext, this.isAdmin(userContext.admin));
      }
    }

    return created;
  }

  async updateComment(commentId: number, dto: UpdateSupportTicketCommentDto, user: RequestUser): Promise<SupportTicketComment> {
    const userContext = await this.requireUserContext(user.id);
    const comment = await this.repository.findCommentById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (!this.isAdmin(userContext.admin) && Number(comment.user_id) !== userContext.id) {
      throw new ForbiddenException('You do not have permission to edit this comment');
    }

    if (Number(comment.is_system_generated) === 1) {
      throw new ForbiddenException('Cannot edit system-generated comments');
    }

    await this.repository.updateComment(commentId, dto);
    return (await this.repository.findCommentById(commentId)) as SupportTicketComment;
  }

  async deleteComment(commentId: number, user: RequestUser): Promise<void> {
    const userContext = await this.requireUserContext(user.id);
    const comment = await this.repository.findCommentById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (!this.isAdmin(userContext.admin) && Number(comment.user_id) !== userContext.id) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    if (Number(comment.is_system_generated) === 1) {
      throw new ForbiddenException('Cannot delete system-generated comments');
    }

    await this.repository.deleteComment(commentId);
  }

  async getAttachments(ticketId: number, user: RequestUser): Promise<SupportTicketAttachment[]> {
    await this.findOne(ticketId, user);
    return this.repository.getAttachments(ticketId);
  }

  async addAttachment(
    ticketId: number,
    dto: CreateSupportTicketAttachmentDto,
    user: RequestUser,
  ): Promise<SupportTicketAttachment> {
    const userContext = await this.requireUserContext(user.id);
    await this.findOne(ticketId, user);

    if (!dto.file_name || !dto.file_url) {
      throw new BadRequestException('file_name and file_url are required');
    }

    const attachmentId = await this.repository.createAttachment(ticketId, dto, userContext.id);
    const created = await this.repository.findAttachmentById(attachmentId);

    if (!created) {
      throw new NotFoundException('Attachment not found after creation');
    }

    return created;
  }

  async deleteAttachment(attachmentId: number, user: RequestUser): Promise<void> {
    const userContext = await this.requireUserContext(user.id);
    const attachment = await this.repository.findAttachmentById(attachmentId);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.findOne(attachment.ticket_id, user);

    if (!this.isAdmin(userContext.admin) && Number(attachment.uploaded_by) !== userContext.id) {
      throw new ForbiddenException('You do not have permission to delete this attachment');
    }

    await this.repository.deleteAttachment(attachmentId);
  }

  private async requireUserContext(userId: number) {
    const userContext = await this.repository.getUserContext(userId);
    if (!userContext) {
      throw new ForbiddenException('Authenticated user context was not found');
    }

    return userContext;
  }

  private isAdmin(value: number | null | undefined): boolean {
    return Number(value) === 1;
  }

  private extractScreenshotPath(raw: string | undefined): string | null {
    if (!raw || typeof raw !== 'string') {
      return null;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    // Keep parity with creorx flow where screenshot can be a base64 data URL; this module stores only a compact value.
    if (trimmed.startsWith('data:image/')) {
      return '[inline-base64-image]';
    }

    return trimmed.slice(0, 500);
  }

  private buildTicketLink(ticketId: number): string {
    const base = String(this.configService.get<string>('DASHBOARD_WEB_BASE_URL') || '').replace(/\/+$/, '');
    return base ? `${base}/support-tickets/${ticketId}` : '';
  }

  private getAdminRecipients(): string[] {
    const configured = this.configService.get<string>('SUPPORT_TICKET_NOTIFICATION_EMAILS') || '';
    const fallback = this.configService.get<string>('DEV_EMAIL_REROUTE_TO') || '';
    return [
      ...configured.split(/[;,]/).map((v) => v.trim()).filter(Boolean),
      ...fallback.split(/[;,]/).map((v) => v.trim()).filter(Boolean),
    ].filter((email, index, list) => list.indexOf(email) === index);
  }

  private async sendCommentNotification(
    ticket: SupportTicket,
    comment: SupportTicketComment,
    commenter: { email: string | null; first: string | null; last: string | null; admin: number | null },
    commenterIsAdmin: boolean,
  ): Promise<void> {
    try {
      const link = this.buildTicketLink(ticket.id);
      const commenterName =
        [commenter.first, commenter.last].filter(Boolean).join(' ').trim() ||
        commenter.email ||
        'Support Team';
      const safeComment = (comment.comment || '').replace(/<[^>]*>/g, '');
      const html = this.emailTemplateService.render('support-ticket-comment', {
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        commenterName,
        comment: safeComment,
        link,
      });

      if (commenterIsAdmin && ticket.user_email) {
        // Admin replied — notify the requester
        await this.emailService.sendMail({
          to: [ticket.user_email],
          subject: `[Support Ticket] ${ticket.ticket_number} — New Reply`,
          html,
        });
      } else if (!commenterIsAdmin) {
        // Requester replied — notify admin recipients
        const recipients = this.getAdminRecipients();
        if (recipients.length > 0) {
          await this.emailService.sendMail({
            to: recipients,
            cc: commenter.email || undefined,
            subject: `[Support Ticket] ${ticket.ticket_number} — Requester Reply`,
            html,
          });
        }
      }
    } catch (error) {
      this.logger.warn(
        `Support ticket comment email failed for ${ticket.ticket_number}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async sendStatusUpdatedNotification(
    ticket: SupportTicket,
    previousStatus: string,
  ): Promise<void> {
    try {
      if (!ticket.user_email) {
        return;
      }

      const link = this.buildTicketLink(ticket.id);
      const html = this.emailTemplateService.render('support-ticket-status-updated', {
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        previousStatus,
        newStatus: ticket.status,
        link,
      });

      await this.emailService.sendMail({
        to: [ticket.user_email],
        subject: `[Support Ticket] ${ticket.ticket_number} — Status Updated`,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Support ticket status email failed for ${ticket.ticket_number}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async sendTicketCreatedNotification(
    ticket: SupportTicket,
    userContext: { email: string | null; first: string | null; last: string | null },
  ): Promise<void> {
    try {
      const recipients = this.getAdminRecipients();

      if (recipients.length === 0) {
        this.logger.warn(`Support ticket ${ticket.ticket_number} email skipped: no recipients configured`);
        return;
      }

      const submittedBy =
        [userContext.first, userContext.last].filter(Boolean).join(' ').trim() ||
        userContext.email ||
        `User #${ticket.user_id || 'unknown'}`;
      const safeDescription = (ticket.description || '').replace(/<[^>]*>/g, '').slice(0, 1200);
      const link = this.buildTicketLink(ticket.id);
      const html = this.emailTemplateService.render('support-ticket-created', {
        ticketNumber: ticket.ticket_number,
        title: ticket.title,
        type: ticket.type,
        priority: ticket.priority,
        status: ticket.status,
        submittedBy,
        requesterEmail: ticket.user_email || 'N/A',
        description: safeDescription || 'No description provided.',
        link,
      });

      await this.emailService.sendMail({
        to: recipients,
        cc: userContext.email || undefined,
        subject: `[Support Ticket] ${ticket.ticket_number} - ${ticket.title}`,
        html,
      });
    } catch (error) {
      this.logger.warn(
        `Support ticket create email failed for ${ticket.ticket_number}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
