import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { FsQirController } from './fs-qir.controller';
import { FsQirService } from './fs-qir.service';
import { FsQirRepository } from './fs-qir.repository';

@Module({
  imports: [MysqlModule],
  controllers: [FsQirController],
  providers: [FsQirService, FsQirRepository],
  exports: [FsQirService],
})
export class FsQirModule {}
