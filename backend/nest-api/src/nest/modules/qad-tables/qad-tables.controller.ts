import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { QadTablesService } from './qad-tables.service';

@Controller('qad-tables')
@UseGuards(RolePermissionGuard)
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
  @Permissions('manage')
  post(@Body() payload: { query?: string }) {
    return this.service.runQuery(payload?.query || '');
  }
}
