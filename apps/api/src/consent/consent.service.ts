import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { ensureDemoUserId } from '../common/demo-user';
import { AuditService } from '../audit/audit.service';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable()
export class ConsentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DemoDataService) private readonly demoData: DemoDataService
  ) {}

  async list() {
    try {
      const ownerId = await this.demoData.ensureGovernmentPrefilledResident();
      return this.prisma.consent.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
    } catch {
      return this.demoData.getFallbackConsents();
    }
  }

  async create(scope: string[]) {
    const ownerId = await ensureDemoUserId(this.prisma);
    const consent = await this.prisma.consent.create({
      data: { ownerId, scope, status: 'granted' }
    });

    await this.audit.log({
      actorRole: 'resident',
      action: 'consent_granted',
      target: consent.id,
      metadata: { scope }
    });

    return consent;
  }

  async revoke(id: string) {
    const consent = await this.prisma.consent.update({
      where: { id },
      data: { status: 'revoked' }
    });

    await this.audit.log({
      actorRole: 'resident',
      action: 'consent_revoked',
      target: consent.id
    });

    return consent;
  }
}
