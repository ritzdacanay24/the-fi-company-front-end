import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { ReceiptCategoryController } from './receipt-category.controller';
import { ReceiptCategoryService } from './receipt-category.service';
import { ReceiptCategoryRepository } from './receipt-category.repository';

@Module({
  imports: [MysqlModule],
  controllers: [ReceiptCategoryController],
  providers: [ReceiptCategoryService, ReceiptCategoryRepository],
  exports: [ReceiptCategoryService],
})
export class ReceiptCategoryModule {}
