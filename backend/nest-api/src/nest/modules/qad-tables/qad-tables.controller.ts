import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { QadTablesService } from './qad-tables.service';

@Controller('qad-tables')
export class QadTablesController {
  constructor(private readonly service: QadTablesService) {}

  @Get()
  get(@Query('test') test?: string, @Query('test1') test1?: string) {
    if (test !== undefined) {
      return this.service.test(test);
    }

    if (test1 !== undefined) {
      return this.service.read();
    }

    return [];
  }

  @Post()
  post(@Body() payload: { query?: string }) {
    return this.service.runQuery(payload?.query || '');
  }
}
