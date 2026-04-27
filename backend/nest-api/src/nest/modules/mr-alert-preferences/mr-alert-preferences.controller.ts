import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '@/nest/decorators/current-user-id.decorator';
import { RolePermissionGuard } from '../access-control';
import { MrAlertPreferencesPayload, MrAlertPreferencesService } from './mr-alert-preferences.service';

@Controller('mr-alert-preferences')
@UseGuards(RolePermissionGuard)
export class MrAlertPreferencesController {
  constructor(private readonly service: MrAlertPreferencesService) {}

  @Get('me')
  getMine(@CurrentUserId() userId: number): Promise<MrAlertPreferencesPayload> {
    return this.service.getMyPreferences(userId);
  }

  @Put('me')
  updateMine(
    @CurrentUserId() userId: number,
    @Body() payload: Partial<MrAlertPreferencesPayload>,
  ): Promise<MrAlertPreferencesPayload> {
    return this.service.updateMyPreferences(userId, payload);
  }
}
