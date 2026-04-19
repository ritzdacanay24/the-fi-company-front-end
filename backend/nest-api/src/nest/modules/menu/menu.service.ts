import { Injectable, NotFoundException } from '@nestjs/common';
import { MenuRecord, MenuRepository } from './menu.repository';

@Injectable()
export class MenuService {
  constructor(private readonly menuRepository: MenuRepository) {}

  async menuAndByUserId(userId: number): Promise<MenuRecord[]> {
    return this.menuRepository.menuAndByUserId(userId);
  }

  async checkUserPermission(userId: number, link: string): Promise<{ hasAccess: boolean }> {
    const hasAccess = await this.menuRepository.checkUserPermission(userId, link);
    return { hasAccess };
  }

  async getById(id: number): Promise<MenuRecord> {
    const row = await this.menuRepository.findOne({ id });
    if (!row) {
      throw new NotFoundException({ code: 'RC_MENU_NOT_FOUND', message: `Menu item ${id} not found` });
    }
    return row;
  }

  async update(id: number, payload: Record<string, unknown>): Promise<MenuRecord> {
    await this.getById(id);
    const safe = this.menuRepository.sanitizePayload(payload);
    await this.menuRepository.updateById(id, safe);
    return this.getById(id);
  }
}
