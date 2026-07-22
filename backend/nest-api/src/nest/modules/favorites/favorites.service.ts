import { BadRequestException, Injectable } from '@nestjs/common';
import { FavoritesRepository } from './favorites.repository';

export interface FavoritePayload {
  path: string;
  label?: string | null;
  icon?: string | null;
}

export interface FavoriteDto {
  id: number;
  path: string;
  label: string;
  icon: string;
  sort_order: number;
}

@Injectable()
export class FavoritesService {
  constructor(private readonly repo: FavoritesRepository) {}

  private normalizePath(path: unknown): string {
    const value = String(path ?? '').trim();
    if (!value) {
      throw new BadRequestException('path is required');
    }

    return value.replace(/\?.+$/, '');
  }

  private mapRowToDto(row: {
    id: number;
    path: string;
    label: string;
    icon: string;
    sort_order: number;
  }): FavoriteDto {
    return {
      id: row.id,
      path: row.path,
      label: row.label?.trim() || row.path,
      icon: row.icon?.trim() || 'ri-star-line',
      sort_order: row.sort_order ?? 0,
    };
  }

  async getMine(userId: number): Promise<FavoriteDto[]> {
    const rows = await this.repo.listByUserId(userId);
    return rows.map((row) => this.mapRowToDto(row));
  }

  async addMine(userId: number, payload: FavoritePayload): Promise<FavoriteDto[]> {
    const normalizedPath = this.normalizePath(payload?.path);
    const label = payload?.label?.trim() || normalizedPath;
    const icon = payload?.icon?.trim() || 'ri-star-line';
    const sortOrder = await this.repo.countByUserId(userId);

    await this.repo.create(userId, normalizedPath, label, icon, sortOrder);

    return this.getMine(userId);
  }

  async removeMineByPath(userId: number, path: string): Promise<FavoriteDto[]> {
    const normalizedPath = this.normalizePath(path);
    await this.repo.removeByPath(userId, normalizedPath);
    return this.getMine(userId);
  }

  async clearMine(userId: number): Promise<FavoriteDto[]> {
    await this.repo.clearByUserId(userId);
    return [];
  }

  async reorderMine(userId: number, orderedPaths: string[]): Promise<FavoriteDto[]> {
    if (!Array.isArray(orderedPaths) || orderedPaths.length === 0) {
      return this.getMine(userId);
    }

    const normalized = orderedPaths.map((p) => this.normalizePath(p));
    await this.repo.reorder(userId, normalized);
    return this.getMine(userId);
  }

  async importMine(userId: number, favorites: Array<Partial<FavoritePayload>>): Promise<FavoriteDto[]> {
    if (!Array.isArray(favorites) || favorites.length === 0) {
      return this.getMine(userId);
    }

    let sortOrder = await this.repo.countByUserId(userId);

    for (const favorite of favorites) {
      const normalizedPath = this.normalizePath(favorite?.path);
      const label = (favorite as FavoritePayload)?.label?.trim() || normalizedPath;
      const icon = (favorite as FavoritePayload)?.icon?.trim() || 'ri-star-line';
      await this.repo.create(userId, normalizedPath, label, icon, sortOrder);
      sortOrder++;
    }

    return this.getMine(userId);
  }
}
