import { Controller, Get, InternalServerErrorException, Query } from '@nestjs/common';
import { WipService } from './wip.service';

@Controller()
export class WipController {
  constructor(private readonly wipService: WipService) {}

  @Get('api/WipReport/index')
  async getWipReport(@Query('limit') limitRaw?: string) {
    const raw = Number(limitRaw || 0);
    const limit = Number.isFinite(raw) ? Math.max(0, Math.min(raw, 500)) : 0;

    try {
      return await this.wipService.getWipReport(limit);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException({
        ok: false,
        endpoint: '/api/WipReport/index',
        error,
      });
    }
  }

  @Get('server/ApiV2/WipReport/index')
  async getWipReportCompat(@Query('limit') limitRaw?: string) {
    return this.getWipReport(limitRaw);
  }
}
