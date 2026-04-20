import { Injectable } from '@nestjs/common';
import { TripDetailRepository } from './trip-detail.repository';

@Injectable()
export class TripDetailService {
  constructor(private readonly repository: TripDetailRepository) {}

  async findByFsId(id: number) {
    return this.repository.findByFsId(id);
  }

  async findByGroupFsId(id: number) {
    return this.repository.findByGroupFsId(id);
  }
}
