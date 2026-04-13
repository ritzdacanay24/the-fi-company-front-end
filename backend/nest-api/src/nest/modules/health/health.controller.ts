import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      ok: true,
      service: 'nest-api',
      qadDsn: process.env.QAD_DSN || 'DEV',
    };
  }
}
