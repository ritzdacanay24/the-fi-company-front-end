import { Injectable } from '@nestjs/common';
import { StatusCategoryRepository } from './status-category.repository';

@Injectable()
export class StatusCategoryService {
  constructor(private readonly repository: StatusCategoryRepository) {}

  async find(query: Record<string, unknown>) {
    return this.repository.find(query);
  }

  async getAll() {
    return this.repository.find();
  }
}
