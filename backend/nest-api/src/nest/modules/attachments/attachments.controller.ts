import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { Public } from '@/nest/decorators/public.decorator';
import { AttachmentsService } from './attachments.service';

@Controller('attachments')
@UseGuards(RolePermissionGuard)
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  /**
   * Unified attachment upload endpoint for all features
   * Routes: /attachments/:feature/:id/upload
   * Examples: /attachments/support-tickets/123/upload, /attachments/parts-order/456/upload
   */
  @Post(':feature/:id/upload')
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachmentForFeature(
    @Param('feature') feature: string,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number },
    @CurrentUserId() userId?: number,
  ) {
    if (!userId) {
      throw new ForbiddenException('User ID is required');
    }

    return this.service.uploadAttachmentForFeature(
      feature,
      id,
      file,
      userId,
    );
  }

  @Public()
  @Post('public/qir/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadQirAttachmentPublic(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    const payload: Record<string, unknown> = {
      field: 'Capa Request',
      uniqueId: id,
      uniqueData: id,
      subFolder: 'qir',
      createdDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    return this.service.create(payload, file);
  }

  @Post('upload')
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body('folder') folder?: string,
    @Body('subFolder') subFolder?: string,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    return this.service.uploadToFolder(file, folder || subFolder);
  }

  @Post()
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() payload: Record<string, unknown>,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
    @CurrentUserId() userId?: number,
  ) {
    return this.service.create(payload, file, userId);
  }

  @Get('getByWorkOrderId')
  async getByWorkOrderId(@Query('workOrderId', ParseIntPipe) workOrderId: number) {
    return this.service.getByWorkOrderId(workOrderId);
  }

  @Get('find')
  async find(@Query() query: Record<string, string>) {
    return this.service.find(query);
  }

  @Get('getAllRelatedAttachments')
  async getAllRelatedAttachments(@Query('id', ParseIntPipe) id: number) {
    return this.service.getAllRelatedAttachments(id);
  }

  @Get('viewById')
  async viewById(@Query('id', ParseIntPipe) id: number) {
    return this.service.getViewById(id);
  }

  @Get('viewById/:id')
  async viewByIdPath(@Param('id', ParseIntPipe) id: number) {
    return this.service.getViewById(id);
  }

  /**
   * Slash-safe feature endpoint for environments where encoded slashes are rewritten by proxies.
    * Example: /attachments/by-feature?feature=forklift-inspection&id=5087
   */
  @Get('by-feature')
  async getAttachmentsByFeatureQuery(
    @Query('feature') feature: string,
    @Query('id', ParseIntPipe) id: number,
  ) {
    return this.service.getAttachmentsByFeature(feature, id);
  }

  /**
   * Slash-safe upload endpoint for features that contain '/'.
   */
  @Post('by-feature/upload')
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachmentByFeatureBody(
    @Body('feature') feature: string,
    @Body('id', ParseIntPipe) id: number,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number },
    @CurrentUserId() userId?: number,
  ) {
    if (!userId) {
      throw new ForbiddenException('User ID is required');
    }

    return this.service.uploadAttachmentForFeature(
      feature,
      id,
      file,
      userId,
    );
  }

  /**
   * Get attachments for a specific feature and resource ID
   * Handles legacy field names automatically for backward compatibility
   * Routes: /attachments/:feature/:id
   * Examples: /attachments/support-tickets/123, /attachments/parts-order/456
   */
  @Get(':feature/:id')
  async getAttachmentsByFeature(
    @Param('feature') feature: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getAttachmentsByFeature(feature, id);
  }

  @Put(':id')
  @Permissions('write')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete(':id')
  @Permissions('delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}
