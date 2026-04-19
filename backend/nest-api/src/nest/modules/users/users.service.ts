import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRecord, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getList(active?: number): Promise<UserRecord[]> {
    return this.usersRepository.getList(active);
  }

  async getById(id: number): Promise<UserRecord> {
    const user = await this.usersRepository.getById(id);

    if (!user) {
      throw new NotFoundException({
        code: 'RC_USER_NOT_FOUND',
        message: `User with id ${id} not found`,
      });
    }

    return user;
  }

  async find(filters: Record<string, unknown>): Promise<UserRecord[]> {
    return this.usersRepository.find(filters);
  }

  async create(payload: Record<string, unknown>): Promise<UserRecord> {
    const safe = this.usersRepository.sanitizePayload(payload);
    const insertId = await this.usersRepository.create(safe);
    return this.getById(insertId);
  }

  async update(id: number, payload: Record<string, unknown>): Promise<UserRecord> {
    await this.getById(id); // throws if not found
    const safe = this.usersRepository.sanitizePayload(payload);
    await this.usersRepository.updateById(id, safe);
    return this.getById(id);
  }

  async resetPassword(email: string, newPassword: string): Promise<{ message: string; type: string }> {
    const updated = await this.usersRepository.resetPasswordByEmail(email, newPassword);

    if (!updated) {
      return { message: 'Email not found', type: 'danger' };
    }

    return { message: 'Password is now reset.', type: 'success' };
  }
}
