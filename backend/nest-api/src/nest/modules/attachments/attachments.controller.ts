import { Controller, Delete, Get, ParseIntPipe, Query } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Get('find')
  async find(@Query() query: Record<string, string>) {
    return this.service.find(query);
  }

  @Delete('deleteById')
  async deleteById(@Query('id', ParseIntPipe) id: number) {
    return this.service.deleteById(id);
  }
}
