import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { ensureDemoUserId } from '../common/demo-user';
import { AuditService } from '../audit/audit.service';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable()
export class PrivacyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DemoDataService) private readonly demoData: DemoDataService
  ) {}

  async exportData() {
    try {
      const ownerId = await this.demoData.ensureGovernmentPrefilledResident();

      const [user, documents, processes, timeline, consents] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: ownerId } }),
        this.prisma.document.findMany({ where: { ownerId } }),
        this.prisma.processInstance.findMany({ where: { ownerId } }),
        this.prisma.timelineEvent.findMany({ where: { ownerId } }),
        this.prisma.consent.findMany({ where: { ownerId } })
      ]);

      await this.audit.log({
        actorRole: 'resident',
        action: 'data_export_requested',
        target: ownerId
      });

      return {
        user,
        documents,
        processes,
        timeline,
        consents
      };
    } catch {
      const user = this.demoData.getFallbackUser();
      return {
        user,
        documents: this.demoData.getFallbackWalletDocuments(),
        processes: this.demoData.getFallbackProcessInstances(),
        timeline: this.demoData.getFallbackTimelineEvents(),
        consents: this.demoData.getFallbackConsents(user.id)
      };
    }
  }

  async requestDeletion(reason?: string) {
    const ownerId = await ensureDemoUserId(this.prisma);
    const request = await this.prisma.deletionRequest.create({
      data: { ownerId, reason }
    });

    await this.audit.log({
      actorRole: 'resident',
      action: 'data_deletion_requested',
      target: request.id,
      metadata: { reason }
    });

    return request;
  }
}
