import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AttachmentsService } from '../attachments/attachments.service';
import { RequestCommentsService } from '../request-comments';
import { RequestService } from '../request';
import { CreatePublicRequestCommentDto } from './dto/create-public-request-comment.dto';
import { CreatePublicRequestDto } from './dto/create-public-request.dto';

@Injectable()
export class PublicFieldServiceService {
  constructor(
    private readonly requestService: RequestService,
    private readonly requestCommentsService: RequestCommentsService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  private normalizeToken(token?: string): string {
    return String(token || '').trim();
  }

  async getRequestByToken(token?: string) {
    const normalizedToken = this.normalizeToken(token);
    if (!normalizedToken) {
      throw new NotFoundException('Request not found');
    }

    const row = (await this.requestService.getByToken(normalizedToken)) as Record<string, unknown> | null;
    if (!row) {
      throw new NotFoundException('Request not found');
    }

    return row;
  }

  private async getTokenBoundRequest(requestId: number, token?: string): Promise<Record<string, unknown>> {
    const normalizedToken = this.normalizeToken(token);
    if (!normalizedToken) {
      throw new NotFoundException('Request not found');
    }

    const row = (await this.requestService.getByIdAndToken(requestId, normalizedToken)) as
      | Record<string, unknown>
      | null;

    if (!row) {
      throw new NotFoundException('Request not found');
    }

    return row;
  }

  async createRequest(payload: CreatePublicRequestDto) {
    const token = randomBytes(24).toString('hex');
    const createdDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const requestPayload: Record<string, unknown> = {
      customer: payload.customer_name,
      onsite_customer_name: payload.onsite_customer_name,
      onsite_customer_phone_number: payload.onsite_customer_phone_number,
      email: payload.email,
      cc_email: Array.isArray(payload.cc_email) ? payload.cc_email.join(',') : payload.cc_email,
      type_of_service: payload.service_type,
      special_instruction: payload.description,
      created_date: createdDate,
      token,
      active: 1,
    };

    const created = (await this.requestService.create(requestPayload)) as Record<string, unknown>;
    const id = Number(created?.id || 0) || null;

    return {
      id,
      requestId: id,
      token,
      tokenExpiresAt: null,
      message: 'Request submitted',
    };
  }

  async getRequestStatus(requestId: number, token?: string) {
    const request = await this.getTokenBoundRequest(requestId, token);

    return {
      id: requestId,
      status: String(request?.active) === '0' ? 'Cancelled' : 'Pending',
      created_date: request?.created_date ?? null,
      request_date: request?.date_of_service ?? null,
      start_time: request?.start_time ?? null,
      published: request?.published ?? 0,
    };
  }

  async listComments(requestId: number, token?: string) {
    await this.getTokenBoundRequest(requestId, token);
    const comments = await this.requestCommentsService.getByRequestId(requestId);

    return {
      id: requestId,
      comments,
    };
  }

  async createComment(requestId: number, token: string | undefined, payload: CreatePublicRequestCommentDto) {
    const request = await this.getTokenBoundRequest(requestId, token);
    const toEmail = String(request?.email || '').trim() || undefined;
    const createdDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const created = await this.requestCommentsService.createComment(token, toEmail, {
      name: payload.name,
      comment: payload.comment,
      request_change: payload.request_change ? 1 : 0,
      fs_request_id: requestId,
      created_date: createdDate,
    });

    return {
      id: (created as Record<string, unknown> | null)?.id ?? null,
      requestId,
      message: 'Comment submitted',
    };
  }

  async uploadAttachment(
    requestId: number,
    token: string | undefined,
    file?: { originalname?: string; size?: number; buffer?: Buffer },
  ) {
    await this.getTokenBoundRequest(requestId, token);

    const result = await this.attachmentsService.create(
      {
        field: 'Field Service Request',
        uniqueId: requestId,
        uniqueData: requestId,
        subFolder: 'fieldService',
        createdDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
      file,
    );

    return {
      id: result?.insertId ?? null,
      requestId,
      fileName: file?.originalname ?? null,
      size: file?.size ?? null,
      message: 'Attachment uploaded',
    };
  }

  async listAttachments(requestId: number, token?: string) {
    await this.getTokenBoundRequest(requestId, token);
    const [requestAttachments, schedulerAttachments] = await Promise.all([
      this.attachmentsService.find({ field: 'Field Service Request', uniqueId: String(requestId) }),
      this.attachmentsService.find({ field: 'Field Service', uniqueId: String(requestId) }),
    ]);

    return {
      id: requestId,
      attachments: [...requestAttachments, ...schedulerAttachments],
    };
  }
}
