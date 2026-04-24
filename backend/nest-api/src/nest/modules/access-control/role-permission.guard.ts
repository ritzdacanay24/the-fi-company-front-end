import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants';
import { AccessControlService } from './access-control.service';
import { REQUIRED_ROLES_KEY } from './roles.decorator';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';
import { REQUIRED_DOMAIN_KEY } from './domain.decorator';

@Injectable()
export class RolePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    let requiredDomain =
      this.reflector.getAllAndOverride<string | undefined>(REQUIRED_DOMAIN_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? null;

    const moduleKey = this.getControllerModuleKey(context);
    const mappedModuleDomain = moduleKey
      ? await this.accessControlService.getModuleDomain(moduleKey)
      : null;

    // If a controller does not provide @Domain, use the module mapping as source of truth.
    if (!requiredDomain && mappedModuleDomain) {
      requiredDomain = mappedModuleDomain;
    }

    if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const userId = this.getUserIdFromRequest(request);

    if (!userId) {
      throw new ForbiddenException('User context is required — please include x-user-id header');
    }

    if (requiredRoles.length > 0) {
      const hasRole = await this.accessControlService.userHasRoles(userId, requiredRoles);
      if (!hasRole) {
        await this.throwAccessDenied(userId, requiredRoles, requiredPermissions, requiredDomain, 'role');
      }
    }

    if (requiredPermissions.length > 0) {
      // When @Domain is specified, check each permission against the domain scope
      // (role scopes + active grants). Without @Domain, fall back to flat permission check.
      if (requiredDomain) {
        for (const perm of requiredPermissions) {
          const allowed = await this.accessControlService.userHasPermissionForDomain(
            userId,
            perm,
            requiredDomain,
          );
          if (!allowed) {
            await this.throwAccessDenied(
              userId,
              requiredRoles,
              requiredPermissions,
              requiredDomain,
              'permission',
              moduleKey,
              mappedModuleDomain,
            );
          }
        }
      } else {
        const hasPermissions = await this.accessControlService.userHasPermissions(
          userId,
          requiredPermissions,
        );
        if (!hasPermissions) {
          await this.throwAccessDenied(
            userId,
            requiredRoles,
            requiredPermissions,
            requiredDomain,
            'permission',
            moduleKey,
            mappedModuleDomain,
          );
        }
      }
    }

    return true;
  }

  private getControllerModuleKey(context: ExecutionContext): string | null {
    const rawPath = Reflect.getMetadata(PATH_METADATA, context.getClass()) as string | undefined;
    const normalized = String(rawPath || '').trim().replace(/^\/+|\/+$/g, '');
    return normalized.length > 0 ? normalized : null;
  }

  private getUserIdFromRequest(request: Record<string, unknown>): number | null {
    const reqAny = request as {
      user?: { id?: number | string };
      headers?: Record<string, string | string[] | undefined>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
    };

    const fromUser = Number(reqAny.user?.id);
    if (Number.isInteger(fromUser) && fromUser > 0) {
      return fromUser;
    }

    const headerValue = reqAny.headers?.['x-user-id'];
    const normalizedHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const fromHeader = Number(normalizedHeader);
    if (Number.isInteger(fromHeader) && fromHeader > 0) {
      return fromHeader;
    }

    const fromQuery = Number(reqAny.query?.['user_id']);
    if (Number.isInteger(fromQuery) && fromQuery > 0) {
      return fromQuery;
    }

    const fromBody = Number(reqAny.body?.['user_id']);
    if (Number.isInteger(fromBody) && fromBody > 0) {
      return fromBody;
    }

    return null;
  }

  private async throwAccessDenied(
    userId: number,
    requiredRoles: string[],
    requiredPermissions: string[],
    requiredDomain: string | null,
    failedCheck: 'role' | 'permission',
    moduleKey?: string | null,
    configuredModuleDomain?: string | null,
  ): Promise<never> {
    const [currentRoles, currentPermissions, currentGrants] = await Promise.all([
      this.accessControlService.getUserRoles(userId),
      this.accessControlService.getUserPermissions(userId),
      this.accessControlService.getUserActiveGrants(userId, requiredDomain ?? undefined),
    ]);

    throw new ForbiddenException({
      message: 'You do not have permission to perform this action.',
      failedCheck,
      userId,
      requiredRoles,
      requiredPermissions,
      requiredDomain,
      moduleKey: moduleKey ?? null,
      configuredModuleDomain: configuredModuleDomain ?? null,
      currentRoles: currentRoles.map((role) => role.name),
      currentPermissions: currentPermissions.map((permission) => permission.name),
      currentDomainGrants: currentGrants.map((grant) => ({
        permission: grant.permission_name,
        domain: grant.domain,
        expiresAt: grant.expires_at,
      })),
    });
  }
}
