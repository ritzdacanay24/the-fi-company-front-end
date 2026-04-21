import { Controller, Get, Query } from '@nestjs/common';
import { ItemSearchService } from './item-search.service';

@Controller('item-search')
export class ItemSearchController {
  constructor(private readonly service: ItemSearchService) {}

  @Get('read-single')
  async readSingle(
    @Query('readSingle') readSingle?: string,
    @Query('typeOfItemSearch') typeOfItemSearch?: string,
  ) {
    return this.service.readByItem(readSingle || '', typeOfItemSearch || 'partNumber');
  }
}
