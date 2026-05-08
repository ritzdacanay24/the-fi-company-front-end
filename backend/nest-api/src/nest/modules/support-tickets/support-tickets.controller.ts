import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@/nest/guards/auth.guard';
import { SupportTicketsService } from './support-tickets.service';
import {
  CreateSupportTicketAttachmentDto,
  CreateSupportTicketCommentDto,
  CreateSupportTicketDto,
  SupportTicketFilters,
  UpdateSupportTicketCommentDto,
  UpdateSupportTicketDto,
} from './support-tickets.types';

@Controller('support-tickets')
@UseGuards(AuthGuard)
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Post()
  async create(@Body() dto: CreateSupportTicketDto, @Req() req: Request) {
    return this.supportTicketsService.create(dto, this.getRequestUser(req));
  }

  @Get()
  async findAll(@Query() filters: SupportTicketFilters, @Req() req: Request) {
    return this.supportTicketsService.findAll(filters, this.getRequestUser(req));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.supportTicketsService.findOne(id, this.getRequestUser(req));
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupportTicketDto,
    @Req() req: Request,
  ) {
    return this.supportTicketsService.update(id, dto, this.getRequestUser(req));
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.supportTicketsService.delete(id, this.getRequestUser(req));
  }

  @Get(':id/comments')
  async getComments(@Param('id', ParseIntPipe) ticketId: number, @Req() req: Request) {
    return this.supportTicketsService.getComments(ticketId, this.getRequestUser(req));
  }

  @Post(':id/comments')
  async addComment(
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() dto: CreateSupportTicketCommentDto,
    @Req() req: Request,
  ) {
    return this.supportTicketsService.addComment({ ...dto, ticket_id: ticketId }, this.getRequestUser(req));
  }

  @Put(':ticketId/comments/:commentId')
  async updateComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateSupportTicketCommentDto,
    @Req() req: Request,
  ) {
    return this.supportTicketsService.updateComment(commentId, dto, this.getRequestUser(req));
  }

  @Delete(':ticketId/comments/:commentId')
  async deleteComment(@Param('commentId', ParseIntPipe) commentId: number, @Req() req: Request) {
    return this.supportTicketsService.deleteComment(commentId, this.getRequestUser(req));
  }

  @Get(':id/attachments')
  async getAttachments(@Param('id', ParseIntPipe) ticketId: number, @Req() req: Request) {
    return this.supportTicketsService.getAttachments(ticketId, this.getRequestUser(req));
  }

  @Post(':id/attachments')
  async addAttachment(
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() dto: CreateSupportTicketAttachmentDto,
    @Req() req: Request,
  ) {
    return this.supportTicketsService.addAttachment(ticketId, dto, this.getRequestUser(req));
  }

  @Delete(':ticketId/attachments/:attachmentId')
  async deleteAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Req() req: Request,
  ) {
    return this.supportTicketsService.deleteAttachment(attachmentId, this.getRequestUser(req));
  }

  private getRequestUser(req: Request): { id: number } {
    const request = req as Request & {
      user?: { id?: number | string };
      headers?: Record<string, string | string[] | undefined>;
    };

    const userId = Number(request.user?.id);
    if (Number.isInteger(userId) && userId > 0) {
      return { id: userId };
    }

    const headerValue = request.headers?.['x-user-id'];
    const normalizedHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const fromHeader = Number(normalizedHeader);
    if (Number.isInteger(fromHeader) && fromHeader > 0) {
      return { id: fromHeader };
    }

    throw new Error('User context is required');
  }
}
