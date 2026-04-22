import { Module } from '@nestjs/common';
import { MenuBadgeRepository } from './menu-badge.repository';
import { MenuBadgeService } from './menu-badge.service';
import { MenuBadgeCacheRefreshService } from './menu-badge-cache-refresh.service';

@Module({
  providers: [MenuBadgeRepository, MenuBadgeService, MenuBadgeCacheRefreshService],
  exports: [MenuBadgeService],
})
export class MenuBadgeModule {}
