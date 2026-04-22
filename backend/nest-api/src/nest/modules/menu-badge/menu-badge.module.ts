import { Module } from '@nestjs/common';
import { MenuBadgeRepository } from './menu-badge.repository';
import { MenuBadgeService } from './menu-badge.service';

@Module({
  providers: [MenuBadgeRepository, MenuBadgeService],
  exports: [MenuBadgeService],
})
export class MenuBadgeModule {}
