import { Body, Controller, Delete, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { RolePermissionGuard } from '../access-control';
import { FavoritePayload, FavoritesService } from './favorites.service';

@Controller(['favorites', 'Api/favorites'])
@UseGuards(RolePermissionGuard)
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get('me')
  getMine(@CurrentUserId() userId: number) {
    return this.service.getMine(userId);
  }

  @Post('me')
  addMine(@CurrentUserId() userId: number, @Body() payload: FavoritePayload) {
    return this.service.addMine(userId, payload);
  }

  @Post('me/import')
  importMine(
    @CurrentUserId() userId: number,
    @Body() payload: { favorites?: Array<Partial<FavoritePayload>> },
  ) {
    return this.service.importMine(userId, payload?.favorites ?? []);
  }

  @Delete('me/by-path')
  removeByPath(@CurrentUserId() userId: number, @Query('path') path: string) {
    return this.service.removeMineByPath(userId, path);
  }

  @Patch('me/rename')
  renameMine(
    @CurrentUserId() userId: number,
    @Body() payload: { path: string; label: string },
  ) {
    return this.service.renameMineByPath(userId, payload?.path, payload?.label);
  }

  @Patch('me/reorder')
  reorderMine(
    @CurrentUserId() userId: number,
    @Body() payload: { paths: string[] },
  ) {
    return this.service.reorderMine(userId, payload?.paths ?? []);
  }

  @Delete('me')
  clearMine(@CurrentUserId() userId: number) {
    return this.service.clearMine(userId);
  }
}
