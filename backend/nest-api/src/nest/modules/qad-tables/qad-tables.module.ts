import { Module } from '@nestjs/common';
import { QadTablesController } from './qad-tables.controller';
import { QadTablesService } from './qad-tables.service';
import { QadTablesRepository } from './qad-tables.repository';

@Module({
  controllers: [QadTablesController],
  providers: [QadTablesService, QadTablesRepository],
})
export class QadTablesModule {}
