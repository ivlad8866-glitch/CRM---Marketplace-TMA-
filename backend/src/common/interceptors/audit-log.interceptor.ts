import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only audit mutations
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const user = req.user;
          const workspaceId = req.params?.wid || user?.workspaceId;
          if (!workspaceId) return;

          await this.prisma.auditLog.create({
            data: {
              action: `${req.method} ${req.route?.path || req.url}`,
              entityType: this.extractEntityType(req.route?.path || req.url),
              entityId: req.params?.tid || req.params?.mid || req.params?.sid || req.params?.cid || '',
              userId: user?.userId,
              workspaceId,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            },
          });
        } catch {
          // Audit logging should never break the request
        }
      }),
    );
  }

  private extractEntityType(path: string): string {
    if (path.includes('ticket')) return 'ticket';
    if (path.includes('message')) return 'message';
    if (path.includes('customer')) return 'customer';
    if (path.includes('service')) return 'service';
    if (path.includes('team')) return 'team';
    if (path.includes('macro')) return 'macro';
    return 'unknown';
  }
}
