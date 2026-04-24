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

  @Post('index.php')
  @Permissions('manage')
  async postCompatibility(
    @Query('mode') mode: string,
    @Body() payload: { password?: string; expiryHours?: number; userId?: number; tokenId?: number },
    @Headers('authorization') authorization?: string,
  ) {
    if (mode === 'generate') {
      this.requireAuthorization(authorization);
      return this.service.generateToken(payload || {});
    }

    if (mode === 'revoke') {
      this.requireAuthorization(authorization);
      return this.service.revokeToken(Number(payload?.tokenId));
    }

    return {
      success: false,
      error: 'Invalid mode parameter',
    };
  }

  @Get('index.php')
  async getCompatibility(
    @Query('mode') mode: string,
    @Query('token') token?: string,
    @Query('password') password?: string,
    @Headers('authorization') authorization?: string,
  ) {
    if (mode === 'validate') {
      return this.service.validateToken(token || '', password);
    }

    if (mode === 'list') {
      this.requireAuthorization(authorization);
      return this.service.listTokens();
    }

    return {
      success: false,
      error: 'Invalid mode parameter',
    };
  }

  private requireAuthorization(authorization?: string) {
    if (!authorization) {
      throw new UnauthorizedException({ error: 'Unauthorized' });
    }
  }
}
