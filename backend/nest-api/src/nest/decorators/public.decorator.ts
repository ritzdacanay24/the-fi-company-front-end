import { SetMetadata } from '@nestjs/common';

/**
 * @Public() Decorator
 * Marks a route as public, skipping JWT authentication
 * Use on controllers or individual route handlers
 */
export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
