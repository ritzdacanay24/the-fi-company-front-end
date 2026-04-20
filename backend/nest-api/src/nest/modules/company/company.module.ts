import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanyRepository } from './company.repository';

@Module({
  imports: [MysqlModule],
  controllers: [CompanyController],
  providers: [CompanyService, CompanyRepository],
  exports: [CompanyService],
})
export class CompanyModule {}
