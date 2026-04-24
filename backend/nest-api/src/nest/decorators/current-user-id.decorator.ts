import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<{
      user?: { id?: number | string };
      headers?: Record<string, string | string[] | undefined>;
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

    throw new ForbiddenException('User context is required');
  },
);