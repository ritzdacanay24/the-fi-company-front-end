import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(
    @Inject(MenuService)
    private readonly menuService: MenuService,
  ) {}

  @Get('menuAndByUserId')
  async menuAndByUserId(@Query('id', ParseIntPipe) id: number) {
    return this.menuService.menuAndByUserId(id);
  }

  @Get('checkUserPermission')
  async checkUserPermission(
    @Query('user_id', ParseIntPipe) userId: number,
    @Query('link') link: string,
  ) {
    return this.menuService.checkUserPermission(userId, link);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.getById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.menuService.update(id, body);
  }
}
