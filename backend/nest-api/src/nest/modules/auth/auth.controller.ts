import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AuthService, CardLoginRequest, LoginRequest, LoginResponse } from './auth.service';
import { Public } from '@/nest/decorators/public.decorator';

/**
 * AuthController
 * Public authentication endpoints
 * No authentication required
 */
@Controller('auth')
@Public()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * User login
    * POST /apiV2/auth/login
   * Returns JWT token and user info
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginData: LoginRequest): Promise<LoginResponse> {
    this.logger.debug(`Login attempt for email: ${loginData.email}`);
    return this.authService.login(loginData);
  }

  /**
   * Card number login.
   * POST /apiV2/auth/login/card
   */
  @Post('login/card')
  @HttpCode(HttpStatus.OK)
  async loginCard(@Body() payload: CardLoginRequest): Promise<LoginResponse> {
    this.logger.debug(`Card login attempt`);
    return this.authService.loginByCard(payload);
  }

  /**
   * Exchange a refresh token for a new access token.
   * POST /apiV2/auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refresh_token: string }): Promise<{ access_token: string; refresh_token: string }> {
    return this.authService.refreshAccessToken(body.refresh_token);
  }
}
