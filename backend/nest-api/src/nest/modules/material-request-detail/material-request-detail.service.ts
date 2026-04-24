import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MaterialRequestDetailRepository } from './material-request-detail.repository';

@Injectable()
export class MaterialRequestDetailService {
  constructor(private readonly repository: MaterialRequestDetailRepository) {}

  async find(filters: Record<string, unknown>) {
    return this.repository.find(filters);
  }

  async getAll() {
    return this.repository.find({});
  }

  async getById(id: number) {
    const row = await this.repository.findOne({ id });
    if (!row) {
      throw new NotFoundException({
        code: 'RC_MRF_DETAIL_NOT_FOUND',
        message: `Material request detail with id ${id} not found`,
      });
    }
    return row;
  }

  async list() {
    return this.find({});
  }

  async create(payload: Record<string, unknown>) {
    const insertId = await this.repository.create(payload);
    return { insertId };
  }

  async updateById(id: number, payload: Record<string, unknown>) {
    await this.getById(id);
    const rowCount = await this.repository.updateById(id, payload);
    return { rowCount };
  }

  async deleteById(id: number) {
    await this.getById(id);
    const rowCount = await this.repository.deleteById(id);
    return { rowCount };
  }

  async getValidationStats(mrfId: number) {
    if (!Number.isInteger(mrfId) || mrfId <= 0) {
      throw new BadRequestException({ message: 'Material request ID is required' });
    }
    return this.repository.getValidationStats(mrfId);
  }

  async getReviewerDashboard(reviewerId: number) {
    if (!Number.isInteger(reviewerId) || reviewerId <= 0) {
      throw new BadRequestException({ message: 'Reviewer ID is required' });
    }
    return this.repository.getReviewerDashboard(reviewerId);
  }

  async getReviews(query: Record<string, unknown>) {
    return this.repository.getReviews({
      id: this.toOptionalPositiveInteger(query.id),
      reviewerId: this.toOptionalPositiveInteger(query.reviewer_id),
      department: this.toOptionalString(query.department),
      reviewStatus: this.toOptionalString(query.review_status),
      priority: this.toOptionalString(query.priority),
      page: this.toOptionalPositiveInteger(query.page),
      limit: this.toOptionalPositiveInteger(query.limit),
    });
  }

  async createReview(payload: Record<string, unknown>) {
    const mrfDetId = this.toRequiredPositiveInteger(payload.mrf_det_id, 'mrf_det_id');
    const reviewerId = this.toRequiredPositiveInteger(payload.reviewerId, 'reviewerId');
    const department = this.toRequiredString(payload.department, 'department');
    const sentForReviewBy = this.toRequiredPositiveInteger(payload.sentForReviewBy, 'sentForReviewBy');

    try {
      const id = await this.repository.createReview({
        mrf_det_id: mrfDetId,
        reviewerId,
        department,
        sentForReviewBy,
        reviewStatus: this.toOptionalString(payload.reviewStatus),
        reviewNote: this.toOptionalString(payload.reviewNote),
        reviewPriority: this.toOptionalString(payload.reviewPriority),
      });

      return {
        id,
        message: 'Review assignment created successfully',
      };
    } catch (error) {
      throw this.mapRepositoryError(error);
    }
  }

  async updateReview(id: number, payload: Record<string, unknown>) {
    if (!await this.repository.getReviews({ id })) {
      throw new NotFoundException({ message: 'Review not found' });
    }

    const rowCount = await this.repository.updateReview(id, {
      reviewStatus: this.toNullableOptionalString(payload, 'reviewStatus'),
      reviewNote: this.toNullableOptionalString(payload, 'reviewNote'),
      reviewPriority: this.toNullableOptionalString(payload, 'reviewPriority'),
      reviewDecision: this.toNullableOptionalString(payload, 'reviewDecision'),
      reviewComment: this.toNullableOptionalString(payload, 'reviewComment'),
      reviewedAt: this.toNullableOptionalString(payload, 'reviewedAt'),
      department: this.toNullableOptionalString(payload, 'department'),
    });

    if (rowCount === 0) {
      throw new BadRequestException({ message: 'No valid fields to update' });
    }

    return { message: 'Review updated successfully' };
  }

  async deleteReview(id: number, hardDelete: boolean) {
    const rowCount = await this.repository.deleteReview(id, hardDelete);
    if (rowCount === 0) {
      throw new NotFoundException({ message: 'Review not found or already deleted' });
    }

    return {
      message: hardDelete ? 'Review permanently deleted' : 'Review deactivated successfully',
    };
  }

  async getItemReviews(itemId: number) {
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new BadRequestException({ message: 'Item ID is required' });
    }
    return this.repository.getItemReviews(itemId);
  }

  async getBulkItemReviews(itemIds: string) {
    const parsedIds = this.parseCsvIds(itemIds, 'Valid item IDs are required');
    return this.repository.getBulkItemReviews(parsedIds);
  }

  async getBulkRequestReviews(requestIds: string) {
    const parsedIds = this.parseCsvIds(requestIds, 'Valid request IDs are required');
    return this.repository.getBulkRequestReviews(parsedIds);
  }

  async getReviewHistory(itemId: number) {
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new BadRequestException({ message: 'Item ID is required' });
    }
    return this.repository.getReviewHistory(itemId);
  }

  async executeReviewAction(payload: Record<string, unknown>) {
    try {
      return await this.repository.executeReviewAction(payload);
    } catch (error) {
      throw this.mapRepositoryError(error);
    }
  }

  async getAdminDashboard() {
    return this.repository.getAdminDashboard();
  }

  async executeAdminReviewAction(payload: Record<string, unknown>) {
    try {
      return await this.repository.executeAdminReviewAction(payload);
    } catch (error) {
      throw this.mapRepositoryError(error);
    }
  }

  private parseCsvIds(rawValue: string, errorMessage: string): number[] {
    const ids = String(rawValue || '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (ids.length === 0) {
      throw new BadRequestException({ message: errorMessage });
    }

    return ids;
  }

  private toOptionalPositiveInteger(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  private toRequiredPositiveInteger(value: unknown, field: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException({ message: `Missing required field: ${field}` });
    }
    return parsed;
  }

  private toOptionalString(value: unknown): string | undefined {
    const text = String(value ?? '').trim();
    return text ? text : undefined;
  }

  private toRequiredString(value: unknown, field: string): string {
    const text = String(value ?? '').trim();
    if (!text) {
      throw new BadRequestException({ message: `Missing required field: ${field}` });
    }
    return text;
  }

  private toNullableOptionalString(payload: Record<string, unknown>, field: string): string | null | undefined {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      return undefined;
    }

    const value = payload[field];
    if (value === null) {
      return null;
    }

    return String(value ?? '');
  }

  private mapRepositoryError(error: unknown): BadRequestException {
    const message = error instanceof Error ? error.message : 'Request failed';
    return new BadRequestException({ message });
  }
}
