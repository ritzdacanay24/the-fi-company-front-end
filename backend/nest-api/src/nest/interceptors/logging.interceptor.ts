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

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      requestId?: string;
    }>();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `[${request.requestId || '-'}] ${request.method} ${request.url} ${Date.now() - now}ms`,
          );
        },
        error: (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `[${request.requestId || '-'}] ${request.method} ${request.url} failed ${Date.now() - now}ms: ${message}`,
          );
        },
      }),
    );
  }
}
