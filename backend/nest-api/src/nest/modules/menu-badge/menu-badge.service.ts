import { Injectable } from '@nestjs/common';
import { MenuBadgeRepository, SidebarMenuBadgeCounts } from './menu-badge.repository';

@Injectable()
export class MenuBadgeService {
  constructor(private readonly repository: MenuBadgeRepository) {}

  async getSidebarBadgeCounts(): Promise<SidebarMenuBadgeCounts> {
    return this.repository.getSidebarBadgeCounts();
  }
}
