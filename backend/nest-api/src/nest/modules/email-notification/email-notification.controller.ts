import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { EmailNotificationService } from './email-notification.service';

@Controller('email-notification')
export class EmailNotificationController {
  constructor(
    @Inject(EmailNotificationService)
    private readonly service: EmailNotificationService,
  ) {}

  @Get('getList')
  getList() {
    return this.service.getList();
  }

  @Get('find')
  find(@Query() query: Record<string, unknown>) {
    return this.service.find(query);
  }

  @Get('getOptions')
  getOptions() {
    return this.service.getOptions();
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
