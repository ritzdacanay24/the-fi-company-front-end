import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@/shared/email/email.service';
import { EmailTemplateService } from '@/shared/email/email-template.service';
import { CommentRemindersRepository } from './comment-reminders.repository';

@Injectable()
export class CommentRemindersService {
  private readonly logger = new Logger(CommentRemindersService.name);

  constructor(
    private readonly repository: CommentRemindersRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async setReminder(params: {
    commentId: number;
    userId: number;
    remindAt: string;
    note?: string | null;
  }): Promise<{ success: boolean; reminderId: number }> {
    const reminderId = await this.repository.upsert({
      ...params,
      remindAt: this.normalizeToUtcSqlDatetime(params.remindAt),
    });
    return { success: true, reminderId };
  }

  async cancelReminder(commentId: number, userId: number): Promise<{ success: boolean }> {
    await this.repository.cancel(commentId, userId);
    return { success: true };
  }

  async getActiveReminder(commentId: number, userId: number) {
    return this.repository.findActiveForUser(commentId, userId);
  }

  async getActiveRemindersForComments(commentIds: number[], userId: number) {
    return this.repository.findActiveForComments(commentIds, userId);
  }

  /** Called by scheduled job every minute. */
  async processDueReminders(): Promise<void> {
    const due = await this.repository.findDueReminders();

    if (!due.length) {
      return;
    }

    this.logger.log(`Processing ${due.length} due comment reminder(s)`);

    for (const row of due) {
      try {
        const html = this.emailTemplateService.render('comment-reminder', {
          userName: String(row.user_name || 'there'),
          orderNum: String(row.order_num || '-'),
          commentType: String(row.comment_type || 'comment'),
          commentText: String(row.comments || '').replace(/<[^>]*>/g, '').slice(0, 500),
          note: row.note ? String(row.note) : null,
          commentUrl: this.buildReminderLink({
            locationPath: String(row.location_path || ''),
            orderNum: String(row.order_num || ''),
            commentId: Number(row.comment_id || 0),
            commentType: String(row.comment_type || ''),
          }),
          remindAt: new Date(row.remind_at).toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        });

        await this.emailService.sendMail({
          to: [String(row.user_email)],
          subject: `[Reminder] Comment on ${String(row.comment_type || 'Order')} ${String(row.order_num || '')}`,
          html,
        });

        await this.repository.markSent(Number(row.reminder_id));
        this.logger.log(`Reminder ${row.reminder_id} sent to ${row.user_email}`);
      } catch (error) {
        this.logger.error(
          `Failed to send reminder ${row.reminder_id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private buildReminderLink(params: {
    locationPath: string;
    orderNum: string;
    commentId: number;
    commentType: string;
  }): string {
    const dashboardBase = String(
      this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL'),
    ).replace(/\/+$/, '');

    const parsedLocation = this.parseLocationPath(params.locationPath);
    const pathOnly = parsedLocation.path || '/operations/master-scheduling/shipping';
    const query = new URLSearchParams(parsedLocation.query || '');

    if (params.orderNum) {
      query.set('comment', params.orderNum);
    }
    if (Number.isFinite(params.commentId) && params.commentId > 0) {
      query.set('commentId', String(params.commentId));
    }
    if (params.commentType) {
      query.set('type', params.commentType);
    }
    query.set('commentViewMode', 'offcanvas');

    const suffix = query.toString();
    return suffix ? `${dashboardBase}${pathOnly}?${suffix}` : `${dashboardBase}${pathOnly}`;
  }

  private parseLocationPath(value: string): { path: string; query: string } {
    const raw = String(value || '').trim();
    if (!raw) {
      return { path: '', query: '' };
    }

    try {
      const url = new URL(raw);
      return { path: url.pathname || '', query: url.search.replace(/^\?/, '') };
    } catch {
      const [path = '', query = ''] = raw.split('?');
      return { path: path.startsWith('/') ? path : `/${path}`, query };
    }
  }

  private normalizeToUtcSqlDatetime(raw: string): string {
    const parsed = new Date(String(raw || '').trim());
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid reminder date/time');
    }

    return parsed.toISOString().slice(0, 19).replace('T', ' ');
  }
}
