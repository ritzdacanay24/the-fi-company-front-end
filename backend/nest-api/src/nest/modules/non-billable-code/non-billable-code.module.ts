import { Module } from '@nestjs/common';
import { MysqlModule } from '@/shared/database/mysql.module';
import { NonBillableCodeController } from './non-billable-code.controller';
import { NonBillableCodeService } from './non-billable-code.service';
import { NonBillableCodeRepository } from './non-billable-code.repository';

@Module({
  imports: [MysqlModule],
  controllers: [NonBillableCodeController],
  providers: [NonBillableCodeService, NonBillableCodeRepository],
  exports: [NonBillableCodeService],
})
export class NonBillableCodeModule {}
