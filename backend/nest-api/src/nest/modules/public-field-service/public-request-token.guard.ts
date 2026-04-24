import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { MysqlService } from '@/shared/database/mysql.service';

interface PublicRequestTokenRow extends RowDataPacket {
  id: number;
}

@Injectable()
export class PublicRequestTokenGuard implements CanActivate {
  constructor(private readonly mysqlService: MysqlService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params?: Record<string, string>;
      headers?: Record<string, string | string[] | undefined>;
      query?: Record<string, unknown>;
      publicRequest?: { id: number };
    }>();

    const requestIdRaw = String(request?.params?.id || '').trim();
    const requestId = Number(requestIdRaw);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      throw new UnauthorizedException('Invalid request id');
    }

    const headerValue = request?.headers?.authorization;
    const authHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const queryToken = String(request?.query?.token || '').trim();
    const token = bearerToken || queryToken;

    if (!token) {
      throw new UnauthorizedException('Request token is required');
    }

    const rows = await this.mysqlService.query<PublicRequestTokenRow[]>(
      `
        SELECT id
        FROM eyefidb.fs_request
        WHERE id = ? AND token = ?
        LIMIT 1
      `,
      [requestId, token],
    );

    if (!rows[0]) {
      throw new UnauthorizedException('Invalid request token');
    }

    request.publicRequest = { id: rows[0].id };
    return true;
  }
}
