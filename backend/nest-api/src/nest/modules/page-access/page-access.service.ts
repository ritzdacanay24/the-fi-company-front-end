import { BadRequestException, Injectable } from '@nestjs/common';
import { PageAccessRecord, PageAccessRepository } from './page-access.repository';

@Injectable()
export class PageAccessService {
  constructor(private readonly pageAccessRepository: PageAccessRepository) {}

  async getByUserId(userId: number): Promise<PageAccessRecord[]> {
    return this.pageAccessRepository.getByUserId(userId);
  }

  /**
   * Toggle page access for a user+menu combination.
   * - If not exists → INSERT with active=1
   * - If exists AND active=0 → UPDATE SET active=1  (approve/activate)
   * - If exists AND active=1 → DELETE               (revoke)
   */
  async toggle(userId: number, menuId: number): Promise<{ action: string }> {
    const existing = await this.pageAccessRepository.findByUserAndMenu(userId, menuId);

    if (!existing) {
      await this.pageAccessRepository.create({ user_id: userId, menu_id: menuId, active: 1 });
      return { action: 'created' };
    }

    if (existing.active === 0) {
      await this.pageAccessRepository.activate(existing.id);
      return { action: 'activated' };
    }

    await this.pageAccessRepository.deactivate(existing.id);
    return { action: 'deleted' };
  }

  /**
   * Request access — inserts a record with active=0 if one doesn't already exist.
   * Mirrors: request-access.php
   */
  async requestAccess(userId: number, menuId: number): Promise<{ action: string }> {
    const existing = await this.pageAccessRepository.findByUserAndMenu(userId, menuId);

    if (existing) {
      return { action: 'already_exists' };
    }

    await this.pageAccessRepository.requestAccess(userId, menuId);
    return { action: 'requested' };
  }
}
