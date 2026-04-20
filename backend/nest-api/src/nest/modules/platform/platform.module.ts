import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformRepository } from './platform.repository';

@Module({
  imports: [MysqlModule],
  controllers: [PlatformController],
  providers: [PlatformService, PlatformRepository],
  exports: [PlatformService],
})
export class PlatformModule {}
