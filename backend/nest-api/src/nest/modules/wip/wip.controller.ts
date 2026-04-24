import { Controller, Get, Inject, InternalServerErrorException, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { WipService } from './wip.service';

@Controller('wip-report')
@UseGuards(RolePermissionGuard)
export class WipController {
  constructor(
    @Inject(WipService)
    private readonly wipService: WipService,
  ) {}

  @Get()
  async getWipReport(@Query('limit') limitRaw?: string) {
    const raw = Number(limitRaw || 0);
    const limit = Number.isFinite(raw) ? Math.max(0, Math.min(raw, 500)) : 0;

    try {
      return await this.wipService.getWipReport(limit);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException({
        code: 'RC_WIP_QUERY_FAILED',
        message: error,
        details: error,
        endpoint: '/apiV2/wip-report',
      });
    }
  }
}
