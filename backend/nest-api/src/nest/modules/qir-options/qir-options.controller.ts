import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { QirOptionsService } from './qir-options.service';

@Controller('qir-options')
export class QirOptionsController {
  constructor(private readonly service: QirOptionsService) {}

  /**
   * Public — used by the QIR form on load.
   * Returns same groupable shape as old qir_settings/find?active=1.
   * No auth guard so the form works for external users.
   */
  @Get('form-settings')
  getFormSettings() {
    return this.service.getFormSettings();
  }

  // ── Admin / manage endpoints below — require manage permission ─────────────

  @Get('categories')
  getCategories() {
    return this.service.getCategories();
  }

  @Put('categories/:id')
  @UseGuards(RolePermissionGuard)
  @Permissions('manage')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateCategory(id, payload);
  }

  @Get()
  getOptions(
    @Query('category_id') categoryId?: string,
    @Query('active') active?: string,
  ) {
    return this.service.getOptions({
      category_id: categoryId ? Number(categoryId) : undefined,
      active: active !== undefined ? Number(active) : undefined,
    });
  }

  @Get(':id')
  getOptionById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOptionById(id);
  }

  @Post()
  @UseGuards(RolePermissionGuard)
  @Permissions('manage')
  createOption(@Body() payload: Record<string, unknown>) {
    return this.service.createOption(payload as any);
  }

  @Put(':id')
  @UseGuards(RolePermissionGuard)
  @Permissions('manage')
  updateOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.updateOption(id, payload);
  }

  @Delete(':id')
  @UseGuards(RolePermissionGuard)
  @Permissions('manage')
  deleteOption(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteOption(id);
  }
}
