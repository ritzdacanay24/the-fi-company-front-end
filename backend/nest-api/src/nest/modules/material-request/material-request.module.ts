import { Module } from '@nestjs/common';
import { MaterialRequestController } from './material-request.controller';
import { MaterialRequestService } from './material-request.service';
import { MaterialRequestRepository } from './material-request.repository';
import { EmailNotificationsModule } from '../email-notifications';
import { WebsocketModule } from '../websocket/websocket.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';

@Module({
  imports: [EmailNotificationsModule, WebsocketModule, PushNotificationsModule],
  controllers: [MaterialRequestController],
  providers: [MaterialRequestService, MaterialRequestRepository],
  exports: [MaterialRequestService],
})
export class MaterialRequestModule {}
