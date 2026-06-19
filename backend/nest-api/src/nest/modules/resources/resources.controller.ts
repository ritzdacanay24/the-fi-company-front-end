import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permissions, RolePermissionGuard } from '../access-control';
import { ResourcesService } from './resources.service';

@Controller('resources')
@UseGuards(RolePermissionGuard)
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Get()
  async list(@Query('activeOnly') activeOnly?: string) {
    const onlyActive = String(activeOnly || '1') !== '0';
    return this.service.list(onlyActive);
  }

  @Get(':id/signed-url')
  async getSignedUrl(
    @Param('id', ParseIntPipe) id: number,
    @Query('mode') mode?: 'inline' | 'attachment',
  ) {
    return this.service.getSignedUrl(id, mode || 'inline');
  }

  @Get(':id/download')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const target = await this.service.resolveDownloadTarget(id);
    if (!target) {
      throw new NotFoundException('Resource file not found');
    }

    if (target.url) {
      return res.redirect(target.url);
    }

    if (!target.filePath) {
      throw new NotFoundException('Resource file not found');
    }

    res.setHeader('Content-Type', target.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(target.displayName)}"`);
    res.download(target.filePath, target.displayName);
  }

  @Post()
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() payload: Record<string, unknown>,
    @CurrentUserId() currentUserId: number,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number },
  ) {
    return this.service.create(payload, file, currentUserId);
  }

  @Put(':id')
  @Permissions('write')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer; mimetype?: string; size?: number },
  ) {
    return this.service.update(id, payload, file);
  }

  @Delete(':id')
  @Permissions('write')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }
}
