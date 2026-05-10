import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { DeployStatusService } from '../modules/health/deploy-status.service';

@Injectable()
export class DeployMaintenanceInterceptor implements NestInterceptor {
  constructor(private readonly deployStatusService: DeployStatusService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{ method?: string; url?: string; originalUrl?: string }>();
    if (!request) {
      return next.handle();
    }

    const method = (request.method || '').toUpperCase();
    if (!this.isWriteMethod(method)) {
      return next.handle();
    }

    const url = request.originalUrl || request.url || '';
    if (this.isExemptWriteRoute(url)) {
      return next.handle();
    }

    const deployStatus = await this.deployStatusService.getStatus();
    if (!deployStatus.deploying) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<{ setHeader?: (name: string, value: string) => void }>();
    response?.setHeader?.('Retry-After', String(deployStatus.retryAfterSeconds));

    throw new ServiceUnavailableException({
      message: deployStatus.message,
      deployInProgress: true,
      retryAfterSeconds: deployStatus.retryAfterSeconds,
      updatedAt: deployStatus.updatedAt,
    });
  }

  private isWriteMethod(method: string): boolean {
    return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  }

  private isExemptWriteRoute(url: string): boolean {
    return (
      url.includes('/health')
      || url.includes('/auth/login')
      || url.includes('/auth/refresh')
    );
  }
}
