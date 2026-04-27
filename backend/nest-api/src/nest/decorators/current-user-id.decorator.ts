import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

interface LegacyJwtPayload {
  id?: number;
  userId?: number;
  data?: {
    id?: number;
  };
}

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<{
      user?: { id?: number | string };
      headers?: Record<string, string | string[] | undefined>;
      url?: string;
      originalUrl?: string;
    }>();

    const fromUser = Number(request?.user?.id);
    if (Number.isInteger(fromUser) && fromUser > 0) {
      return fromUser;
    }

    const headerValue = request?.headers?.['x-user-id'];
    const normalizedHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const fromHeader = Number(normalizedHeader);
    if (Number.isInteger(fromHeader) && fromHeader > 0) {
      return fromHeader;
    }

    // TODO(legacy-compat): Remove legacy Bearer-token user-id fallback after frontend migration completes.
    const authHeaderRaw = request?.headers?.authorization;
    const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).replaceAll('"', '').trim();
      if (token) {
        // TODO(legacy-compat): Temporary decode-only read to support legacy JWT payload shape.
        const decoded = jwt.decode(token) as LegacyJwtPayload | null;
        const fromToken = Number(decoded?.data?.id ?? decoded?.id ?? decoded?.userId);
        if (Number.isInteger(fromToken) && fromToken > 0) {
          return fromToken;
        }
      }
    }

    throw new ForbiddenException('User context is required — include x-user-id or Authorization Bearer token');
  },
);