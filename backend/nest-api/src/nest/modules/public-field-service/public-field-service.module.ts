import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { RequestCommentsModule } from '../request-comments';
import { RequestModule } from '../request';
import { EmailNotificationsModule } from '../email-notifications';
import { PublicFieldServiceController } from './public-field-service.controller';
import { PublicRequestTokenGuard } from './public-request-token.guard';
import { PublicFieldServiceService } from './public-field-service.service';

@Module({
  imports: [RequestModule, RequestCommentsModule, AttachmentsModule, EmailNotificationsModule],
  controllers: [PublicFieldServiceController],
  providers: [PublicFieldServiceService, PublicRequestTokenGuard],
  exports: [PublicFieldServiceService],
})
export class PublicFieldServiceModule {}
