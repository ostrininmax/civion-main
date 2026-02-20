import { Inject, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';

export type AuditEvent = {
  id: string;
  actorRole: string;
  action: string;
  target: string;
  time: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async log(event: Omit<AuditEvent, 'id' | 'time'>) {
    const entry = await this.prisma.auditEvent.create({
      data: {
        actorRole: event.actorRole as Role,
        action: event.action,
        target: event.target,
        metadata: (event.metadata as Prisma.InputJsonValue | undefined) ?? undefined
      }
    });

    return {
      id: entry.id,
      actorRole: entry.actorRole,
      action: entry.action,
      target: entry.target,
      time: entry.createdAt.toISOString(),
      metadata: (entry.metadata ?? undefined) as Record<string, unknown> | undefined
    };
  }

  async list() {
    const events = await this.prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return events.map((evt) => ({
      id: evt.id,
      actorRole: evt.actorRole,
      action: evt.action,
      target: evt.target,
      time: evt.createdAt.toISOString(),
      metadata: (evt.metadata ?? undefined) as Record<string, unknown> | undefined
    }));
  }
}
