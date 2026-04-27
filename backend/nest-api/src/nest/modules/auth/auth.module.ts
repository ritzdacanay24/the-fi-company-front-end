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
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // TODO(legacy-compat): Prefer APP_SECRET_KEY only while legacy clients are active.
        // After full migration, simplify to a single new JWT secret.
        secret:
          configService.get<string>('APP_SECRET_KEY') ||
          configService.get<string>('JWT_SECRET') ||
          'your-secret-key-change-in-production',
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
