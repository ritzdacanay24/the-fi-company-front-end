import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const responseBody =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? (exceptionResponse as Record<string, unknown>)
        : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string })?.message ||
          (exception instanceof Error ? exception.message : 'Internal server error');

    const code =
      (responseBody?.code as string | undefined) ||
      this.mapStatusToCode(status, request.url);

    this.logger.error(
      `${request.method} ${request.url} failed with ${status}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      ok: false,
      code,
      statusCode: status,
      message,
      path: request.url,
      requestId: request.requestId || null,
      timestamp: new Date().toISOString(),
    });
  }

  private mapStatusToCode(status: number, path: string): string {
    if (path.startsWith('/api/vehicle')) {
      if (status >= 500) {
        return 'RC_VEHICLE_INTERNAL_ERROR';
      }

      if (status === HttpStatus.NOT_FOUND) {
        return 'RC_VEHICLE_NOT_FOUND';
      }

      if (status === HttpStatus.BAD_REQUEST) {
        return 'RC_VEHICLE_VALIDATION_FAILED';
      }

      return 'RC_VEHICLE_HTTP_ERROR';
    }

    if (status >= 500) {
      return 'RC_INTERNAL_SERVER_ERROR';
    }

    if (status === HttpStatus.NOT_FOUND) {
      return 'RC_RESOURCE_NOT_FOUND';
    }

    if (status === HttpStatus.BAD_REQUEST) {
      return 'RC_BAD_REQUEST';
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      return 'RC_UNAUTHORIZED';
    }

    if (status === HttpStatus.FORBIDDEN) {
      return 'RC_FORBIDDEN';
    }

    return 'RC_HTTP_ERROR';
  }
}
