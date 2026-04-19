import { Module } from '@nestjs/common';
import { PageAccessController } from './page-access.controller';
import { PageAccessService } from './page-access.service';
import { PageAccessRepository } from './page-access.repository';

@Module({
  controllers: [PageAccessController],
  providers: [PageAccessService, PageAccessRepository],
  exports: [PageAccessService],
})
export class PageAccessModule {}
