import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { StatusCategoryController } from './status-category.controller';
import { StatusCategoryService } from './status-category.service';
import { StatusCategoryRepository } from './status-category.repository';

@Module({
  imports: [MysqlModule],
  controllers: [StatusCategoryController],
  providers: [StatusCategoryService, StatusCategoryRepository],
  exports: [StatusCategoryService],
})
export class StatusCategoryModule {}
