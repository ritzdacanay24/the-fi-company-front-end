import { Body, Controller, Get, Inject, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { PageAccessService } from './page-access.service';

@Controller('page-access')
@UseGuards(RolePermissionGuard)
export class PageAccessController {
  constructor(
    @Inject(PageAccessService)
    private readonly pageAccessService: PageAccessService,
  ) {}

  @Get('getByUserId')
  async getByUserId(@Query('user_id', ParseIntPipe) userId: number) {
    return this.pageAccessService.getByUserId(userId);
  }

  /** Toggle access (create/activate/delete). */
  @Post()
  @Permissions('manage')
  async toggle(@Body('user_id', ParseIntPipe) userId: number, @Body('menu_id', ParseIntPipe) menuId: number) {
    return this.pageAccessService.toggle(userId, menuId);
  }

  /** Request access (active=0 record). */
  @Post('requestAccess')
  @Permissions('write')
  async requestAccess(
    @Query('user_id', ParseIntPipe) userId: number,
    @Query('menu_id', ParseIntPipe) menuId: number,
  ) {
    return this.pageAccessService.requestAccess(userId, menuId);
  }
}
