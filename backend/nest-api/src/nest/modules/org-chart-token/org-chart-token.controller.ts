import { Body, Controller, Get, Headers, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Permissions, RolePermissionGuard } from '../access-control';
import { OrgChartTokenService } from './org-chart-token.service';

@Controller('org-chart-token')
@UseGuards(RolePermissionGuard)
export class OrgChartTokenController {
  constructor(private readonly service: OrgChartTokenService) {}

  @Post('generate')
  @Permissions('manage')
  async generate(@Body() payload: { password?: string; expiryHours?: number; userId?: number }) {
    return this.service.generateToken(payload || {});
  }

  @Get('validate')
  async validate(@Query('token') token: string, @Query('password') password?: string) {
    return this.service.validateToken(token, password);
  }

  @Post('revoke')
  @Permissions('manage')
  async revoke(
    @Body() payload: { tokenId: number },
    @Headers('authorization') authorization?: string,
  ) {
    this.requireAuthorization(authorization);
    return this.service.revokeToken(Number(payload.tokenId));
  }

  @Get('list')
  @Permissions('manage')
  async list(@Headers('authorization') authorization?: string) {
    this.requireAuthorization(authorization);
    return this.service.listTokens();
  }

  private requireAuthorization(authorization?: string) {
    if (!authorization) {
      throw new UnauthorizedException({ error: 'Unauthorized' });
    }
  }
}
