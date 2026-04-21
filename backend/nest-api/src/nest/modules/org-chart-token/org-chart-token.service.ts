import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { scryptSync, timingSafeEqual } from 'crypto';
import { OrgChartTokenRepository } from './org-chart-token.repository';

@Injectable()
export class OrgChartTokenService {
  constructor(
    private readonly repository: OrgChartTokenRepository,
    private readonly configService: ConfigService,
  ) {}

  async generateToken(payload: { password?: string; expiryHours?: number; userId?: number }) {
    const token = randomBytes(32).toString('hex');
    const expiryHours = Number(payload.expiryHours || 24);
    const expiresAtDate = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    const expiresAt = this.formatDateTime(expiresAtDate);
    const passwordHash = payload.password ? this.hashPassword(payload.password) : null;

    const tokenId = await this.repository.createToken({
      token,
      passwordHash,
      expiresAt,
      generatedBy: payload.userId ?? null,
    });

    return {
      success: true,
      tokenId,
      token,
      shareUrl: new URL(
        `/standalone/org-chart?token=${encodeURIComponent(token)}`,
        this.configService.getOrThrow<string>('DASHBOARD_WEB_BASE_URL'),
      ).toString(),
      expiresAt,
      hasPassword: Boolean(passwordHash),
    };
  }

  async validateToken(token: string, password?: string) {
    if (!token) {
      return {
        isValid: false,
        error: 'Token is required',
      };
    }

    const tokenData = await this.repository.getActiveTokenByValue(token);
    if (!tokenData) {
      return {
        isValid: false,
        error: 'Invalid token',
      };
    }

    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      return {
        isValid: false,
        error: 'Token expired',
      };
    }

    if (tokenData.password_hash) {
      if (!password) {
        return {
          isValid: false,
          requiresPassword: true,
          error: 'Password required',
        };
      }

      const matched = this.verifyPassword(password, tokenData.password_hash);
      if (!matched) {
        return {
          isValid: false,
          requiresPassword: true,
          error: 'Invalid password',
        };
      }
    }

    await this.repository.incrementAccessCount(tokenData.id);

    return {
      isValid: true,
      expiresAt: tokenData.expires_at,
    };
  }

  async revokeToken(tokenId: number) {
    await this.repository.revokeToken(tokenId);
    return {
      success: true,
      message: 'Token revoked successfully',
    };
  }

  async listTokens() {
    const tokens = await this.repository.listActiveTokens();
    return { tokens };
  }

  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const parts = String(storedHash || '').split(':');
    if (parts.length !== 2) {
      return false;
    }

    const [salt, hash] = parts;
    const computed = scryptSync(password, salt, 64);
    const stored = Buffer.from(hash, 'hex');

    if (stored.length !== computed.length) {
      return false;
    }

    return timingSafeEqual(stored, computed);
  }
}
