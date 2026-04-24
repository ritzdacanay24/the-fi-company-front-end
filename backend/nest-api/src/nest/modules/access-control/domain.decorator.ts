import { SetMetadata } from '@nestjs/common';

/** Key used to store the required domain in route metadata. */
export const REQUIRED_DOMAIN_KEY = 'required_domain';

/**
 * Declare which domain a route belongs to so the guard can enforce
 * domain-scoped access alongside flat permissions.
 *
 * Usage:
 *   @Domain('receiving')
 *   @Permissions('write')
 *   @UseGuards(RolePermissionGuard)
 *   create() {}
 *
 * Domain '*' is treated as "all domains" — only admin-level roles should
 * hold that scope in app_user_role_scopes.
 */
export const Domain = (domain: string) => SetMetadata(REQUIRED_DOMAIN_KEY, domain);
