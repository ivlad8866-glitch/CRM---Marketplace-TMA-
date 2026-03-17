import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Ensures the :wid route param matches the JWT's workspaceId.
 * Attach AFTER JwtAuthGuard on any workspace-scoped controller.
 */
@Injectable()
export class WorkspaceScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const paramWid = req.params?.wid;

    if (!paramWid) return true; // no :wid param, skip

    if (user.workspaceId && user.workspaceId !== paramWid) {
      throw new ForbiddenException('FORBIDDEN');
    }

    // Attach resolved workspaceId for downstream use
    req.workspaceId = paramWid;
    return true;
  }
}
