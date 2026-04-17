import { Body, Controller, Get, Headers, Post, Query, UnauthorizedException } from '@nestjs/common';
import { OrgChartTokenService } from './org-chart-token.service';

@Controller('org-chart-token')
export class OrgChartTokenController {
  constructor(private readonly service: OrgChartTokenService) {}

  @Post('generate')
  async generate(@Body() payload: { password?: string; expiryHours?: number; userId?: number }) {
    return this.service.generateToken(payload || {});
  }

  @Get('validate')
  async validate(@Query('token') token: string, @Query('password') password?: string) {
    return this.service.validateToken(token, password);
  }

  @Post('revoke')
  async revoke(
    @Body() payload: { tokenId: number },
    @Headers('authorization') authorization?: string,
  ) {
    this.requireAuthorization(authorization);
    return this.service.revokeToken(Number(payload.tokenId));
  }

  @Get('list')
  async list(@Headers('authorization') authorization?: string) {
    this.requireAuthorization(authorization);
    return this.service.listTokens();
  }

  @Post('index.php')
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
