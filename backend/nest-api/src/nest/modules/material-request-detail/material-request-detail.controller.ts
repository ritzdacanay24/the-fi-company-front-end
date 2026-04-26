import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { MaterialRequestDetailService } from './material-request-detail.service';

@Controller('material-request-detail')
@UseGuards(RolePermissionGuard)
export class MaterialRequestDetailController {
  constructor(private readonly service: MaterialRequestDetailService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Get('find')
  async find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get('getAll')
  async getAll() {
    return this.service.getAll();
  }

  @Get('getById')
  async getByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get('getById/:id')
  async getByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Get('validation-stats')
  async getValidationStats(@Query('mrf_id', ParseIntPipe) mrfId: number) {
    return this.service.getValidationStats(mrfId);
  }

  @Get('reviewer-dashboard')
  async getReviewerDashboard(@Query('reviewer_id', ParseIntPipe) reviewerId: number) {
    return this.service.getReviewerDashboard(reviewerId);
  }

  @Get('reviews')
  async getReviews(@Query() query: Record<string, unknown>) {
    return this.service.getReviews(query);
  }

  @Get('item-reviews')
  async getItemReviews(@Query('item_id', ParseIntPipe) itemId: number) {
    return this.service.getItemReviews(itemId);
  }

  @Get('bulk-item-reviews')
  async getBulkItemReviews(@Query('item_ids') itemIds: string) {
    return this.service.getBulkItemReviews(itemIds);
  }

  @Get('bulk-request-reviews')
  async getBulkRequestReviews(@Query('request_ids') requestIds: string) {
    return this.service.getBulkRequestReviews(requestIds);
  }

  @Get('history')
  async getReviewHistory(@Query('item_id', ParseIntPipe) itemId: number) {
    return this.service.getReviewHistory(itemId);
  }

  @Get('material-request-admin-reviews-api/admin-dashboard')
  async getAdminDashboard() {
    return this.service.getAdminDashboard();
  }

  @Get(':id')
  async getByIdRest(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post('create')
  @Permissions('write')
  async create(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Post()
  @Permissions('write')
  async createRest(@Body() payload: Record<string, unknown>) {
    return this.service.create(payload);
  }

  @Post('reviews')
  @Permissions('write')
  async createReview(@Body() payload: Record<string, unknown>) {
    return this.service.createReview(payload);
  }

  @Post('review-actions')
  @Permissions('write')
  async executeReviewAction(@Body() payload: Record<string, unknown>) {
    return this.service.executeReviewAction(payload);
  }

  @Post('material-request-admin-reviews-api/review-actions')
  @Permissions('write')
  async executeAdminReviewAction(@Body() payload: Record<string, unknown>) {
    return this.service.executeAdminReviewAction(payload);
  }

  @Put('updateById')
  @Permissions('write')
  async updateByIdQuery(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Put('updateById/:id')
  @Permissions('write')
  async updateByIdPath(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Put('reviews')
  @Permissions('write')
  async updateReviewQuery(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateReview(id, payload);
  }

  @Put(':id')
  @Permissions('write')
  async updateRest(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById')
  @Permissions('delete')
  async deleteByIdQuery(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Delete('deleteById/:id')
  @Permissions('delete')
  async deleteByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }

  @Delete('reviews')
  @Permissions('delete')
  async deleteReview(
    @Query('id', ParseIntPipe) id: number,
    @Query('hard_delete') hardDelete?: string,
  ) {
    return this.service.deleteReview(id, hardDelete === 'true');
  }

  @Delete(':id')
  @Permissions('delete')
  async deleteRest(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}
