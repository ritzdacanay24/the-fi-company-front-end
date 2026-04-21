import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { LateReasonCodesService } from './late-reason-codes.service';

@Controller('late-reason-codes')
export class LateReasonCodesController {
  constructor(private readonly service: LateReasonCodesService) {}

  @Get('read')
  async read(@Query('department') department?: string) {
    return this.service.read(department || '');
  }

  @Post('save')
  async save(@Body() payload: { newItem?: string; department?: string }) {
    return this.service.save(payload || {});
  }

  @Post('remove')
  async remove(@Body() payload: { id?: number | string }) {
    return this.service.remove(payload || {});
  }

  @Get('kpi')
  async kpi(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('typeOfView') typeOfView?: string,
    @Query('displayCustomers') displayCustomers?: string,
    @Query('queue') queue?: string,
  ) {
    return this.service.kpi({
      dateFrom: dateFrom || '',
      dateTo: dateTo || '',
      typeOfView: typeOfView || 'Weekly',
      displayCustomers: displayCustomers !== undefined,
      queue: queue || 'All',
    });
  }
}
