import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ReportQueryDto } from '../dto/reports.dto';

const CSV_EXPORT_LIMIT = 10_000;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpiSummary(workspaceId: string, query: ReportQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const [rawKpi] = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::bigint AS total_tickets,
        COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::bigint AS resolved_tickets,
        AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60)
          FILTER (WHERE "firstResponseAt" IS NOT NULL) AS avg_first_response_minutes,
        AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60)
          FILTER (WHERE "resolvedAt" IS NOT NULL) AS avg_resolution_minutes,
        COUNT(*) FILTER (WHERE "slaDeadline" IS NOT NULL AND "resolvedAt" > "slaDeadline")::bigint AS sla_breached
      FROM "Ticket"
      WHERE "workspaceId" = ${workspaceId}
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
        AND "isDeleted" = false
    `;

    const byStatus = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: {
        workspaceId,
        createdAt: { gte: from, lte: to },
        isDeleted: false,
      },
      _count: { id: true },
    });

    return {
      totalTickets: Number(rawKpi.total_tickets),
      resolvedTickets: Number(rawKpi.resolved_tickets),
      avgFirstResponseMinutes: rawKpi.avg_first_response_minutes
        ? Math.round(rawKpi.avg_first_response_minutes * 10) / 10
        : null,
      avgResolutionMinutes: rawKpi.avg_resolution_minutes
        ? Math.round(rawKpi.avg_resolution_minutes * 10) / 10
        : null,
      slaBreached: Number(rawKpi.sla_breached),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  }

  async exportTicketsCsv(workspaceId: string, query: ReportQueryDto): Promise<string> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        workspaceId,
        createdAt: { gte: from, lte: to },
        isDeleted: false,
        ...(query.agentId ? { assigneeId: query.agentId } : {}),
        ...(query.serviceId ? { serviceId: query.serviceId } : {}),
      },
      include: {
        assignee: { select: { user: { select: { firstName: true, lastName: true } } } },
        service: { select: { name: true } },
        customer: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: CSV_EXPORT_LIMIT,
    });

    const header =
      'id,ticketNumber,title,status,priority,assignee,service,customer,createdAt,firstResponseAt,resolvedAt,closedAt,slaDeadline';

    const rows = tickets.map((t) => {
      const assigneeName = t.assignee
        ? [t.assignee.user.firstName, t.assignee.user.lastName].filter(Boolean).join(' ')
        : '';
      const customerName = t.customer
        ? [t.customer.user.firstName, t.customer.user.lastName].filter(Boolean).join(' ')
        : '';
      const serviceName = t.service?.name ?? '';

      return [
        t.id,
        t.ticketNumber,
        csvSafe(t.title ?? ''),
        t.status,
        t.priority,
        csvSafe(assigneeName),
        csvSafe(serviceName),
        csvSafe(customerName),
        t.createdAt.toISOString(),
        t.firstResponseAt?.toISOString() ?? '',
        t.resolvedAt?.toISOString() ?? '',
        t.closedAt?.toISOString() ?? '',
        t.slaDeadline?.toISOString() ?? '',
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }
}

/**
 * Sanitize a value for CSV output.
 * - Escapes internal double-quotes by doubling them.
 * - Strips a leading dangerous formula character (=, +, -, @, \t, \r) and
 *   replaces it with a tab prefix so spreadsheet applications will not execute
 *   it as a formula (CSV injection prevention — B6 fix).
 * - Always wraps the value in double-quotes so commas in values are safe.
 */
function csvSafe(value: string): string {
  const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];
  const needsSanitize = DANGEROUS_PREFIXES.some((p) => value.startsWith(p));
  // Strip the leading dangerous character, then escape remaining double-quotes.
  const sanitized = needsSanitize ? value.slice(1) : value;
  const escaped = sanitized.replace(/"/g, '""');
  return needsSanitize ? `"\t${escaped}"` : `"${escaped}"`;
}
