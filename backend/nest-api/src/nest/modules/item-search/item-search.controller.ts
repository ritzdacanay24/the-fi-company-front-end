import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolePermissionGuard } from '../access-control';
import { ItemSearchService } from './item-search.service';

@Controller('item-search')
@UseGuards(RolePermissionGuard)
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
