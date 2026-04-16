import { Injectable } from '@nestjs/common';
import { EyeFiAssetNumbersRepository } from './eyefi-asset-numbers.repository';
import { GenerateAssetNumbersDto } from './dto/generate-asset-numbers.dto';

@Injectable()
export class EyeFiAssetNumbersService {
  constructor(private readonly repo: EyeFiAssetNumbersRepository) {}

  async generate(dto: GenerateAssetNumbersDto) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const assetNumbers = await this.repo.generate(today, dto.quantity, dto.category ?? 'New');
    return {
      success: true,
      data: assetNumbers.map((n) => ({ asset_number: n })),
      count: assetNumbers.length,
    };
  }

  async getAvailable(status?: string, category?: string, limit?: number) {
    const data = await this.repo.getAvailable(status ?? 'available', category, limit ?? 100);
    return { success: true, data, count: data.length };
  }
}
