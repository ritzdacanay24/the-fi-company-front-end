import { Controller, Get } from '@nestjs/common';
import { Public } from '@/nest/decorators/public.decorator';
import { QadOdbcService } from '@/shared/database/qad-odbc.service';
import { DeployStatusService } from './deploy-status.service';

@Controller()
@Public()
export class HealthController {
  constructor(
    private readonly qadOdbcService: QadOdbcService,
    private readonly deployStatusService: DeployStatusService,
  ) {}

  @Get('health')
  getHealth() {
    return {
      ok: true,
      service: 'nest-api',
      qadDsn: process.env.QAD_DSN || 'DEV',
    };
  }

  @Get('health/qadConnectionStatus')
  async getQadConnectionStatus() {
    const probes = ['SELECT TOP 1 * FROM sod_det'];

    const probeErrors: string[] = [];

    for (const sql of probes) {
      try {
        await this.qadOdbcService.query(sql);
        return {
          isConnected: true,
          message: 'QAD is online.',
        };
      } catch (error) {
        probeErrors.push(error instanceof Error ? error.message : String(error));
      }
    }

    return {
      isConnected: false,
      message: 'QAD is currently unreachable. QAD-dependent features will be bypassed until connectivity is restored.',
      details: probeErrors,
    };
  }

  @Get('health/deploy-status')
  async getDeployStatus() {
    return this.deployStatusService.getStatus();
  }
}
