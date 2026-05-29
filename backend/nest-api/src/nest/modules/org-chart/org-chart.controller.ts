import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { OrgChartService } from './org-chart.service';

@Controller('org-chart')
@UseGuards(RolePermissionGuard)
export class OrgChartController {
  constructor(private readonly service: OrgChartService) {}

  @Get('orgchart')
  async getOrgChart(@Query() query: Record<string, string>) {
    return this.service.getOrgChart(query);
  }

  @Get('hasSubordinates')
  async hasSubordinates(@Query('id') id: string) {
    return this.service.hasSubordinates(id);
  }

  @Get('open-positions')
  async listOpenPositions(@Query() query: Record<string, string>) {
    return this.service.listOpenPositions(query);
  }

  @Post('open-positions')
  @Permissions('manage')
  async createOpenPosition(
    @Body()
    body: {
      title?: string;
      reportsToUserId?: number | null;
      department?: string | null;
      city?: string | null;
      state?: string | null;
      createdBy?: number | null;
    },
  ) {
    const title = String(body?.title || '').trim();
    if (!title) {
      throw new BadRequestException('title is required');
    }

    return this.service.createOpenPosition({
      title,
      reportsToUserId: body?.reportsToUserId ?? null,
      department: body?.department ?? null,
      city: body?.city ?? null,
      state: body?.state ?? null,
      createdBy: body?.createdBy ?? null,
    });
  }

  @Patch('open-positions/:id')
  @Permissions('manage')
  async updateOpenPosition(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      title?: string;
      reportsToUserId?: number | null;
      department?: string | null;
      city?: string | null;
      state?: string | null;
      active?: number;
      status?: 'open' | 'filled' | 'closed';
      filledByUserId?: number | null;
    },
  ) {
    return this.service.updateOpenPosition(id, body || {});
  }

  @Post('open-positions/:id/fill')
  @Permissions('manage')
  async fillOpenPosition(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { filledByUserId?: number | null },
  ) {
    return this.service.fillOpenPosition(id, body || {});
  }

  @Post('open-positions/:id/close')
  @Permissions('manage')
  async closeOpenPosition(@Param('id', ParseIntPipe) id: number) {
    return this.service.closeOpenPosition(id);
  }
}
