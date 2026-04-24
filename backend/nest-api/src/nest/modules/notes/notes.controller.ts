import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { NotesService } from './notes.service';

@Controller('notes')
@UseGuards(RolePermissionGuard)
export class NotesController {
  constructor(private readonly service: NotesService) {}

  @Get('index')
  async index(
    @Query('getById') getById?: string,
    @Query('so') so?: string,
    @Query('userId') userId?: string,
  ): Promise<Record<string, unknown>[]> {
    if (getById && so && userId) {
      return this.service.getById(so, userId);
    }

    return [];
  }

  @Post('index')
  @Permissions('write')
  async save(@Body() body: Record<string, unknown>): Promise<number | Record<string, unknown>> {
    if (body.insert) {
      return this.service.insert(body);
    }

    return { success: false, error: 'Unsupported Notes action' };
  }
}
