import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  private readonly MAX_URL_LENGTH = 1000;
  private readonly MAX_USER_AGENT_LENGTH = 500;
  private readonly MAX_ERROR_MESSAGE_LENGTH = 1000;
  private readonly MAX_ERROR_STACK_LENGTH = 2000;
  private readonly PHI_ROUTES = ['/apiV2/medical-records', '/apiV2/patient'];

  private readonly isProd = process.env['NODE_ENV'] === 'production';

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      requestId?: string;
      headers?: Record<string, string | string[] | undefined>;
      ip?: string;
      socket?: { remoteAddress?: string };
      xForwardedFor?: string;
      originalUrl?: string;
      user?: {
        user_id?: number | string;
        id?: number | string;
        username?: string;
        user_name?: string;
        email?: string;
        role?: string;
        user_role?: string;
        law_firm_entity_id?: number | string;
        law_firm_entity_name?: string;
        law_firm_name?: string;
        lawyers_id?: number | string;
        client_id?: number | string;
      };
    }>();
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();
    const method = request.method;
    const url = request.originalUrl || request.url;
    const headers = request.headers || {};
    const actionType = this.getActionType(method);
    const resourceType = this.getResourceType(url);
    const phiAccessed = this.isPHIRoute(url);
    const ipAddress = this.getClientIp(request);
    const safeUrl = this.truncate(url, this.MAX_URL_LENGTH) || url;
    const rawUserAgent = headers['user-agent'];
    const userAgent = Array.isArray(rawUserAgent) ? rawUserAgent[0] : rawUserAgent;
    const safeUserAgent = this.truncate(userAgent, this.MAX_USER_AGENT_LENGTH);
    const userId = request.user?.user_id ?? request.user?.id ?? null;
    const username = request.user?.username ?? request.user?.user_name ?? request.user?.email ?? null;
    const userRole = request.user?.user_role ?? request.user?.role ?? null;
    const clientId = request.user?.client_id ?? null;

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = response.statusCode ?? 200;
          const payload = this.toJson({
            request_id: request.requestId || '-',
            method,
            url: safeUrl,
            action_type: actionType,
            resource_type: resourceType,
            user_id: userId,
            username,
            user_role: userRole,
            ip_address: ipAddress,
            user_agent: safeUserAgent,
            status_code: statusCode,
            response_time_ms: Date.now() - now,
            phi_accessed: phiAccessed,
            ...(clientId && { client_id: clientId }),
            timestamp: new Date().toISOString(),
          });

          if (statusCode >= 500) {
            this.logger.error({ ...JSON.parse(payload), level: 'error' });
          } else if (statusCode >= 400) {
            this.logger.warn({ ...JSON.parse(payload), level: 'warn' });
          } else if (method === 'GET') {
            // Routine reads: verbose — suppressed in production by default
            this.logger.verbose({ ...JSON.parse(payload), level: 'verbose' });
          } else {
            // Mutations (POST/PUT/PATCH/DELETE) are significant — always log
            this.logger.log({ ...JSON.parse(payload), level: 'info' });
          }
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(this.toJson({
            level: 'error',
            request_id: request.requestId || '-',
            method,
            url: safeUrl,
            action_type: actionType,
            resource_type: resourceType,
            user_id: userId,
            username,
            user_role: userRole,
            ip_address: ipAddress,
            user_agent: safeUserAgent,
            status_code: response.statusCode,
            response_time_ms: Date.now() - now,
            phi_accessed: phiAccessed,
            error_message: this.truncate(message, this.MAX_ERROR_MESSAGE_LENGTH),
            error_stack: this.truncate(error instanceof Error ? error.stack : undefined, this.MAX_ERROR_STACK_LENGTH),
            ...(clientId && { client_id: clientId }),
            timestamp: new Date().toISOString(),
          }));
        },
      }),
    );
  }

  /** Single-line JSON in production (log aggregator friendly); pretty in dev. */
  private toJson(payload: Record<string, unknown>): string {
    return this.isProd
      ? JSON.stringify(payload)
      : JSON.stringify(payload, null, 2);
  }

  private getActionType(method: string): string {
    const actionMap: Record<string, string> = {
      GET: 'READ',
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return actionMap[method] || method;
  }

  private getResourceType(url: string): string {
    const match = url.match(/\/apiV2\/([^/?]+)/i);
    return match ? match[1] : 'unknown';
  }

  private isPHIRoute(url: string): boolean {
    return this.PHI_ROUTES.some((route) => url.startsWith(route));
  }

  private truncate(value: string | undefined, maxLength: number): string | undefined {
    if (!value) {
      return value;
    }
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  }

  private getClientIp(request: {
    ip?: string;
    socket?: { remoteAddress?: string };
    headers?: Record<string, string | string[] | undefined>;
  }): string | undefined {
    const forwarded = request.headers?.['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (forwardedValue) {
      return forwardedValue.split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress;
  }
}
