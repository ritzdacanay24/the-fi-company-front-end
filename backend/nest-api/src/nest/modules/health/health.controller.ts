import { Controller, Get } from '@nestjs/common';
import { Public } from '@/nest/decorators/public.decorator';

@Controller()
@Public()
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
