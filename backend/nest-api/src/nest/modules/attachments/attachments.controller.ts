import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body('folder') folder?: string,
    @Body('subFolder') subFolder?: string,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    return this.service.uploadToFolder(file, folder || subFolder);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() payload: Record<string, unknown>,
    @UploadedFile() file?: { originalname?: string; buffer?: Buffer },
  ) {
    return this.service.create(payload, file);
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

  @Put('updateById')
  async updateById(
    @Query('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateById(id, payload);
  }

  @Delete('deleteById')
  async deleteById(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}
