import { Injectable } from '@nestjs/common';
import { NotesRepository } from './notes.repository';

type GenericRow = Record<string, unknown>;

@Injectable()
export class NotesService {
  constructor(private readonly repository: NotesRepository) {}

  async getById(so: string, userId: string | number): Promise<GenericRow[]> {
    return this.repository.getById(so, userId);
  }

  async insert(data: Record<string, unknown>): Promise<number> {
    return this.repository.insert({
      notes: String(data.notes || ''),
      createdBy: String(data.createdBy || ''),
      uniqueId: String(data.uniqueId || ''),
      type: String(data.type || ''),
    });
  }

  /**
   * Get latest notes by unique IDs (SO numbers)
   */
  async getLatestByUniqueIds(ids: string[]): Promise<GenericRow[]> {
    return this.repository.getLatestByUniqueIds(ids);
  }
}
