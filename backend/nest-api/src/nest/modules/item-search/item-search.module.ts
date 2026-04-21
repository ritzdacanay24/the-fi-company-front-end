import { Module } from '@nestjs/common';
import { ItemSearchController } from './item-search.controller';
import { ItemSearchService } from './item-search.service';

@Module({
  controllers: [ItemSearchController],
  providers: [ItemSearchService],
})
export class ItemSearchModule {}
