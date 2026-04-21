import { Module } from '@nestjs/common';
import { AddressSearchController } from './address-search.controller';
import { AddressSearchService } from './address-search.service';

@Module({
  controllers: [AddressSearchController],
  providers: [AddressSearchService],
})
export class AddressSearchModule {}