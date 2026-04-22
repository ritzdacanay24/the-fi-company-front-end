import { Module } from '@nestjs/common';
import { MenuBadgeModule } from '../menu-badge/menu-badge.module';
import { UnifiedWebSocketService } from '@/shared/services/unified-websocket.service';

@Module({
  imports: [MenuBadgeModule],
  providers: [UnifiedWebSocketService],
  exports: [UnifiedWebSocketService],
})
export class WebsocketModule {}
