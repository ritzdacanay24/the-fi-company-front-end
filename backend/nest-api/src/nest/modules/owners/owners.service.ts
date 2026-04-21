import { Injectable } from '@nestjs/common';
import { OwnersRepository } from './owners.repository';

type GenericRow = Record<string, unknown>;

@Injectable()
export class OwnersService {
  constructor(private readonly repository: OwnersRepository) {}

  /**
   * Get production status map for owners (name -> is_production)
   */
  async getProductionStatusMap(): Promise<Record<string, boolean>> {
    const rows = await this.repository.getActiveWithProductionStatus();
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      const key = String(row.name || '').trim().toUpperCase();
      if (key) {
        map[key] = Number(row.is_production) === 1;
      }
    }
    return map;
  }
}
