import { Global, Module } from '@nestjs/common';
import { MysqlService } from './mysql.service';
import { QadOdbcService } from './qad-odbc.service';

@Global()
@Module({
  providers: [MysqlService, QadOdbcService],
  exports: [MysqlService, QadOdbcService],
})
export class MysqlModule {}
