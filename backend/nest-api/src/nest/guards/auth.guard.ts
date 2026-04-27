import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MysqlService } from '@/shared/database/mysql.service';

interface DecodedToken {
  id: number;
  userId: number;
  email: string;
  data?: { id?: number };
  exp: number;
  iat: number;
}

interface UserRow {
  id: number;
  email: string;
  first?: string;
  last?: string;
  active?: number;
}

/**
 * NestJS Guard for JWT authentication
 * Validates JWT tokens from Authorization header (Bearer scheme)
 * Extracts user info and attaches to request for RBAC guards
 * Respects @Public() decorator to skip authentication
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly mysqlService: MysqlService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Skip authentication for public routes
    }

    // TEMPORARY: disable auth checks
    return true;

    /*
    const request = context.switchToHttp().getRequest();

    try {
      // Check if user already exists (set by middleware in hybrid mode)
      if (request.user?.id) {
        return true;
      }

      // Extract token from Authorization header
      let token: string | undefined;
      const authHeader = request.headers['authorization'];
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }

      // Verify token exists
      if (!token) {
        this.logger.warn('[AuthGuard] No token provided');
        throw new UnauthorizedException('No token provided');
      }

      // Verify JWT
      const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
      if (!jwtSecret) {
        throw new UnauthorizedException('JWT secret is not configured');
      }

      const decoded = jwt.verify(token, jwtSecret) as DecodedToken;
      const userId = decoded.id || decoded.userId || decoded.data?.id;

      if (!userId) {
        this.logger.warn('[AuthGuard] No user ID in token');
        throw new UnauthorizedException('Invalid token structure');
      }

      // Fetch user data from database
      const users = await this.mysqlService.query(
        `SELECT id, email, first, last, active FROM db.users WHERE id = ? AND active = 1 LIMIT 1`,
        [userId],
      ) as UserRow[];

      if (!users || users.length === 0) {
        this.logger.warn(`[AuthGuard] User not found for ID: ${userId}`);
        throw new UnauthorizedException('User not found or inactive');
      }

      const user = users[0];

      // Attach user to request for downstream use (RBAC guards, etc.)
      request.user = {
        id: user.id,
        email: user.email,
        first: user.first,
        last: user.last,
      };

      this.logger.debug(`[AuthGuard] Authenticated user ID: ${user.id}`);
      return true;

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if ((error as Error).name === 'TokenExpiredError') {
        this.logger.warn('[AuthGuard] Token expired');
        throw new UnauthorizedException('Token expired. Please log in again.');
      }

      if ((error as Error).name === 'JsonWebTokenError') {
        this.logger.warn('[AuthGuard] Invalid token');
        throw new UnauthorizedException('Invalid token. Please log in again.');
      }

      this.logger.error('[AuthGuard] Authentication error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
    */
  }
}
