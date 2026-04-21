import { Injectable } from '@nestjs/common';
import { NotesRepository } from './notes.repository';

type GenericRow = Record<string, unknown>;

@Injectable()
export class NotesService {
  constructor(private readonly repository: NotesRepository) {}

  /**
   * Get latest notes by unique IDs (SO numbers)
   */
  async getLatestByUniqueIds(ids: string[]): Promise<GenericRow[]> {
    return this.repository.getLatestByUniqueIds(ids);
  }
}
