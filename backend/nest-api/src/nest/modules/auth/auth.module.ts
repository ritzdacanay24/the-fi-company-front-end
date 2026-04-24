import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MysqlModule } from '@/shared/database/mysql.module';

/**
 * AuthModule
 * Handles user authentication, JWT tokens, and login flows
 *
 * Features:
 * - User login with email/password
 * - JWT token generation
 * - Password hashing with bcrypt
 * - Integrates with access-control/RBAC system
 *
 * Controllers:
 * - AuthController: Public login endpoint
 *
 * Exports:
 * - AuthService: For other modules to validate users
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
        signOptions: {
           expiresIn: 86400, // 24 hours in seconds
        },
      }),
    }),
    MysqlModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
