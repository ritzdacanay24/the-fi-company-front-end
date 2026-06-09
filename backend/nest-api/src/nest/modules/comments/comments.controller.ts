import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { Permissions, RolePermissionGuard } from '../access-control';
import { CommentsService } from './comments.service';
import { CommentRemindersService } from './comment-reminders.service';

@Controller('comments')
@UseGuards(RolePermissionGuard)
export class CommentsController {
  constructor(
    private readonly service: CommentsService,
    private readonly remindersService: CommentRemindersService,
  ) {}

  @Get('find')
  async find(
    @CurrentUserId() currentUserId: number,
    @Query('orderNum') orderNum?: string,
    @Query('type') type?: string,
    @Query('active') active?: string,
  ) {
    return this.service.find(currentUserId, orderNum, type, active);
  }

  @Post('create')
  @Permissions('write')
  async create(
    @CurrentUserId() currentUserId: number,
    @Body()
    payload: {
      comments?: string;
      orderNum?: string;
      type?: string;
      locationPath?: string;
      pageName?: string;
      comments_html?: string;
      pid?: string | number | null;
      active?: number | string;
    },
  ) {
    return this.service.create(payload, currentUserId);
  }

  @Post('delete')
  @Permissions('write')
  async delete(
    @CurrentUserId() currentUserId: number,
    @Body() payload: { id?: number | string; active?: number | string },
  ) {
    return this.service.delete(payload, currentUserId);
  }

  // ── Reminders ──────────────────────────────────────────────────────────

  @Post('reminders/set')
  @Permissions('write')
  async setReminder(
    @CurrentUserId() currentUserId: number,
    @Body() payload: { commentId: number; remindAt: string; note?: string },
  ) {
    return this.remindersService.setReminder({
      commentId: Number(payload.commentId),
      userId: currentUserId,
      remindAt: String(payload.remindAt),
      note: payload.note ?? null,
    });
  }

  @Delete('reminders/:commentId')
  @Permissions('write')
  async cancelReminder(
    @CurrentUserId() currentUserId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.remindersService.cancelReminder(commentId, currentUserId);
  }

  @Get('reminders/active')
  async getActiveReminders(
    @CurrentUserId() currentUserId: number,
    @Query('commentIds') commentIds?: string,
  ) {
    const ids = (commentIds || '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);
    return this.remindersService.getActiveRemindersForComments(ids, currentUserId);
  }
}
