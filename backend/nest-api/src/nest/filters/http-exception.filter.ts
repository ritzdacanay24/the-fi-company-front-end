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
  private static readonly DI_ERROR_PATTERNS: RegExp[] = [
    /Nest can't resolve dependencies/i,
    /can't resolve dependencies/i,
    /Cannot read properties of undefined \(reading '.+'\)/i,
    /Undefined dependency/i,
    /UnknownDependenciesException/i,
  ];

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

    const details =
      responseBody?.details ??
      responseBody?.error ??
      undefined;

    const endpoint =
      typeof responseBody?.endpoint === 'string'
        ? (responseBody.endpoint as string)
        : undefined;

    const additionalPayload = responseBody
      ? Object.entries(responseBody).reduce<Record<string, unknown>>((acc, [key, value]) => {
          // These keys are normalized explicitly below.
          if (key === 'message' || key === 'statusCode' || key === 'error') {
            return acc;
          }

          // details/endpoint/code are also normalized explicitly below.
          if (key === 'details' || key === 'endpoint' || key === 'code') {
            return acc;
          }

          acc[key] = value;
          return acc;
        }, {})
      : {};

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string })?.message ||
          (typeof details === 'string' ? details : undefined) ||
          (exception instanceof Error ? exception.message : 'Internal server error');

    const isDependencyInjectionFailure = this.isLikelyDependencyInjectionFailure(
      exception,
      message,
      details,
    );

    const code = isDependencyInjectionFailure
      ? 'RC_DEPENDENCY_INJECTION_FAILED'
      : (responseBody?.code as string | undefined) ||
        this.mapStatusToCode(status, request.url);

    const normalizedMessage = isDependencyInjectionFailure
      ? 'Dependency injection failure in backend runtime'
      : message;

    const normalizedDetails = isDependencyInjectionFailure
      ? {
          originalMessage: message,
          path: request.url,
          hint:
            'Verify provider registration, module exports/imports, and runtime metadata support for decorators.',
        }
      : details;

    this.logger.error(
      `${request.method} ${request.url} failed with ${status}: ${normalizedMessage}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      ok: false,
      code,
      statusCode: status,
      message: normalizedMessage,
      ...(normalizedDetails !== undefined ? { details: normalizedDetails } : {}),
      ...(endpoint ? { endpoint } : {}),
      ...additionalPayload,
      path: request.url,
      requestId: request.requestId || null,
      timestamp: new Date().toISOString(),
    });
  }

  private isLikelyDependencyInjectionFailure(
    exception: unknown,
    message: string,
    details: unknown,
  ): boolean {
    const detailMessage =
      typeof details === 'string'
        ? details
        : details && typeof details === 'object' && 'message' in details
          ? String((details as { message?: unknown }).message ?? '')
          : '';

    const stack = exception instanceof Error ? exception.stack || '' : '';
    const combined = `${message}\n${detailMessage}\n${stack}`;

    return GlobalHttpExceptionFilter.DI_ERROR_PATTERNS.some((pattern) =>
      pattern.test(combined),
    );
  }

  private mapStatusToCode(status: number, path: string): string {
    if (path.startsWith('/api/vehicle') || path.startsWith('/apiV2/vehicle')) {
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
