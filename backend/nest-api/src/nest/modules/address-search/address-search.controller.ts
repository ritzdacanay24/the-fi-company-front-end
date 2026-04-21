import { Controller, Get, Query } from '@nestjs/common';
import { AddressSearchService } from './address-search.service';

@Controller('address-search')
export class AddressSearchController {
  constructor(private readonly service: AddressSearchService) {}

  @Get('addressSearch')
  async addressSearch(@Query('q') q?: string) {
    return this.service.addressSearch(q);
  }

  @Get('airportSearch')
  async airportSearch(
    @Query('q') q?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
    @Query('categorySet') categorySet?: string,
  ) {
    return this.service.airportSearch({
      q,
      lat,
      lon,
      radius,
      limit,
      categorySet,
    });
  }
}