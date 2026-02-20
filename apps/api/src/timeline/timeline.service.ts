import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { ensureDemoUserId } from '../common/demo-user';
import { AuditService } from '../audit/audit.service';
import { DemoDataService } from '../demo/demo-data.service';

export type TimelineEvent = {
  id: string;
  title: string;
  dueDate: string;
  severity: 'informational' | 'important' | 'critical';
  source: 'document' | 'process' | 'manual';
};

@Injectable()
export class TimelineService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DemoDataService) private readonly demoData: DemoDataService
  ) {}

  async list() {
    try {
      const ownerId = await this.demoData.ensureGovernmentPrefilledResident();

      const items = await this.prisma.timelineEvent.findMany({
        where: { ownerId },
        orderBy: { dueDate: 'asc' }
      });

      return items.map((evt) => ({
        id: evt.id,
        title: evt.title,
        dueDate: evt.dueDate.toISOString(),
        severity: evt.severity,
        source: evt.source as 'document' | 'process' | 'manual'
      } satisfies TimelineEvent));
    } catch {
      return this.demoData.getFallbackTimelineEvents();
    }
  }

  async create(payload: {
    title: string;
    dueDate: string;
    severity: 'informational' | 'important' | 'critical';
    source?: 'document' | 'process' | 'manual';
  }) {
    const ownerId = await ensureDemoUserId(this.prisma);
    const event = await this.prisma.timelineEvent.create({
      data: {
        ownerId,
        title: payload.title,
        dueDate: new Date(payload.dueDate),
        severity: payload.severity,
        source: payload.source ?? 'manual'
      }
    });

    await this.audit.log({
      actorRole: 'resident',
      action: 'timeline_reminder_created',
      target: event.id,
      metadata: {
        title: event.title,
        dueDate: event.dueDate.toISOString(),
        severity: event.severity
      }
    });

    return {
      id: event.id,
      title: event.title,
      dueDate: event.dueDate.toISOString(),
      severity: event.severity,
      source: event.source as 'document' | 'process' | 'manual'
    } satisfies TimelineEvent;
  }
}
