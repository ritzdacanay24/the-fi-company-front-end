import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { PhotoChecklistService } from './photo-checklist.service';

@Controller('photo-checklist')
@UseGuards(RolePermissionGuard)
export class PhotoChecklistController {
  constructor(private readonly service: PhotoChecklistService) {}

  @Get('templates')
  async getTemplates() {
    return this.service.getTemplates();
  }

  @Get('templates/:id')
  async getTemplateById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getTemplateById(id);
  }

  @Get('instances')
  async getInstances(@Query('status') status?: string, @Query('work_order') workOrder?: string) {
    return this.service.getInstances({ status, workOrder });
  }

  @Post('instances')
  @Permissions('write')
  async createInstance(
    @Body()
    payload: {
      template_id: number;
      work_order_number: string;
      part_number?: string;
      serial_number?: string;
      operator_id?: number | null;
      operator_name?: string;
      status?: string;
    },
  ) {
    return this.service.createInstance(payload);
  }
}
