import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MysqlService } from '@/shared/database/mysql.service';
import { PasswordUtil } from '@/shared/utils/password.util';
import { RowDataPacket } from 'mysql2/promise';
import { createHash } from 'crypto';

const REFRESH_TOKEN_EXPIRY = '30d';

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  first?: string;
  last?: string;
  pass?: string | null;
  card_number?: number | null;
  active?: number;
  admin?: number;
  employeeType?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CardLoginRequest {
  card_number?: string | number;
  cardNumber?: string | number;
}

export interface LoginResponse {
  token: string;
  access_token: string;
  refresh_token: string;
  message: string;
  status: 'success';
  status_code: 1;
  user: {
    id: number;
    email: string;
    card_number?: string;
    first?: string;
    last?: string;
    admin?: boolean;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    token?: string;
    isAdmin?: number;
    employeeType?: number;
  };
}

/**
 * AuthService
 * Handles user authentication and JWT token generation
 * Follows creorx patterns but adapted for modern's schema
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly mysqlService: MysqlService,
    private readonly configService: ConfigService,
  ) {}

  private verifyPassword(plainTextPassword: string, storedPasswordHash: string | null | undefined): boolean {
    if (!storedPasswordHash) {
      return false;
    }

    const normalizedPassword = String(plainTextPassword ?? '');
    const normalizedStoredHash = String(storedPasswordHash ?? '').trim();

    if (!normalizedStoredHash) {
      return false;
    }

    // New format support: bcrypt hashes ($2a$, $2b$, $2y$)
    if (normalizedStoredHash.startsWith('$2')) {
      return PasswordUtil.compare(normalizedPassword, normalizedStoredHash);
    }

    // Some historical records may store plaintext (very old accounts); keep as final fallback.
    if (normalizedStoredHash === normalizedPassword) {
      return true;
    }

    // Legacy hash compatibility. Prioritize APP_HASH_PASS if present, then infer from hash length.
    const algorithmCandidates = new Set<string>();
    const configuredAlgo = (process.env.APP_HASH_PASS || '').trim().toLowerCase();
    if (configuredAlgo) {
      algorithmCandidates.add(configuredAlgo);
    }

    if (normalizedStoredHash.length === 32) {
      algorithmCandidates.add('md5');
    } else if (normalizedStoredHash.length === 40) {
      algorithmCandidates.add('sha1');
    } else if (normalizedStoredHash.length === 64) {
      algorithmCandidates.add('sha256');
    } else if (normalizedStoredHash.length === 128) {
      algorithmCandidates.add('sha512');
    }

    // Safe defaults if length-based inference is inconclusive.
    algorithmCandidates.add('sha512');
    algorithmCandidates.add('sha256');
    algorithmCandidates.add('sha1');
    algorithmCandidates.add('md5');

    for (const algo of algorithmCandidates) {
      try {
        const candidate = createHash(algo).update(normalizedPassword).digest('hex');
        if (candidate === normalizedStoredHash) {
          return true;
        }
      } catch {
        // Ignore unsupported algorithms and continue fallback chain.
      }
    }

    return false;
  }

  private buildLoginResponse(user: UserRow): LoginResponse {
    const token = this.jwtService.sign(
      {
        id: user.id,
        email: user.email,
      },
      {
        expiresIn: '24h',
      },
    );

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'refresh-secret-change-in-production';

    const refresh_token = this.jwtService.sign(
      { id: user.id, email: user.email, type: 'refresh' },
      { secret: refreshSecret, expiresIn: REFRESH_TOKEN_EXPIRY },
    );

    const fullName = [user.first, user.last].filter(Boolean).join(' ').trim();

    return {
      token,
      access_token: token,
      refresh_token,
      message: 'Successfully logged in',
      status: 'success',
      status_code: 1,
      user: {
        id: user.id,
        email: user.email,
        card_number: user.card_number != null ? String(user.card_number) : undefined,
        first: user.first,
        last: user.last,
        admin: user.admin === 1,
        full_name: fullName,
        first_name: user.first,
        last_name: user.last,
        token,
        isAdmin: user.admin === 1 ? 1 : 0,
        employeeType: user.employeeType ?? undefined,
      },
    };
  }

  /**
   * Authenticate user by email and password
   * Returns JWT token if valid
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const email = String(loginData?.email || '').trim();
    const password = String(loginData?.password || '');

    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    // Find user by email
    const users = await this.mysqlService.query<UserRow[]>(
      `SELECT id, email, first, last, pass, card_number, active, admin, employeeType 
       FROM db.users 
       WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) AND active = 1 
       LIMIT 1`,
      [email],
    );

    if (!users || users.length === 0) {
      this.logger.warn(`Login attempt for non-existent user: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const passwordMatch = this.verifyPassword(password, user.pass);

    if (!passwordMatch) {
      this.logger.warn(`Failed login attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.debug(`User logged in: ${email}`);
    return this.buildLoginResponse(user);
  }

  async loginByCard(payload: CardLoginRequest): Promise<LoginResponse> {
    const cardNumber = String(payload?.card_number ?? payload?.cardNumber ?? '').trim();
    if (!cardNumber) {
      throw new UnauthorizedException('Card number is required');
    }

    const users = await this.mysqlService.query<UserRow[]>(
      `SELECT id, email, first, last, pass, card_number, active, admin, employeeType
       FROM db.users
       WHERE card_number = ? AND active = 1
       LIMIT 1`,
      [cardNumber],
    );

    if (!users || users.length === 0) {
      this.logger.warn(`Card login attempt for unknown card: ${cardNumber}`);
      throw new UnauthorizedException('Invalid card number');
    }

    const user = users[0];
    this.logger.debug(`User card login: ${user.email || user.id}`);
    return this.buildLoginResponse(user);
  }

  /**
   * Exchange a valid refresh token for a new access token.
   */
  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'refresh-secret-change-in-production';

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload?.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const newAccessToken = this.jwtService.sign(
      { id: payload.id, email: payload.email },
      { expiresIn: '24h' },
    );

    // Rotate the refresh token so each usage yields a fresh 30-day window
    const newRefreshToken = this.jwtService.sign(
      { id: payload.id, email: payload.email, type: 'refresh' },
      { secret: refreshSecret, expiresIn: REFRESH_TOKEN_EXPIRY },
    );

    return { access_token: newAccessToken, refresh_token: newRefreshToken };
  }

  /**
   * Validate JWT token and return user data
   * Called by AuthGuard
   */
  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded;
    } catch (error) {
      this.logger.warn('Token validation failed');
      throw new UnauthorizedException('Invalid token');
    }
  }
}
