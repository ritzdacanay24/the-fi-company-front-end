import { Body, Controller, Delete, Get, Headers, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { RolePermissionGuard } from '../access-control';
import {
  PushNotificationsService,
  PushSubscriptionPayload,
  PushSubscriptionStatusPayload,
} from './push-notifications.service';

@Controller('push-notifications')
@UseGuards(RolePermissionGuard)
export class PushNotificationsController {
  constructor(private readonly service: PushNotificationsService) {}

  @Get('public-key')
  getPublicKey(): { publicKey: string } {
    return {
      publicKey: this.service.getPublicKey(),
    };
  }

  @Get('me/status')
  getStatus(@CurrentUserId() userId: number): Promise<PushSubscriptionStatusPayload> {
    return this.service.getStatus(userId);
  }

  @Put('me/subscription')
  async saveSubscription(
    @CurrentUserId() userId: number,
    @Body() payload: PushSubscriptionPayload,
    @Headers('user-agent') userAgent?: string,
  ): Promise<{ success: true }> {
    await this.service.saveMySubscription(userId, payload, userAgent);
    return { success: true };
  }

  @Delete('me/subscription')
  async deleteSubscription(
    @CurrentUserId() userId: number,
    @Body('endpoint') endpoint?: string,
  ): Promise<{ success: true }> {
    await this.service.deleteMySubscription(userId, String(endpoint || ''));
    return { success: true };
  }

  @Post('me/test')
  sendTest(@CurrentUserId() userId: number): Promise<{ sent: number }> {
    return this.service.sendTestNotification(userId);
  }
}