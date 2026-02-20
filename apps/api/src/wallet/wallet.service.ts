import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { WalletDocument, WalletShareAccess, WalletShareLink } from './wallet.types';
import { PrismaService } from '../db/prisma.service';
import { ensureDemoUserId } from '../common/demo-user';
import { AuditService } from '../audit/audit.service';
import { DemoDataService } from '../demo/demo-data.service';

type ShareRecord = {
  link: WalletShareLink;
  log: WalletShareAccess[];
};

@Injectable()
export class WalletService {
  private readonly shares = new Map<string, ShareRecord>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DemoDataService) private readonly demoData: DemoDataService
  ) {}

  async list() {
    try {
      const ownerId = await this.demoData.ensureGovernmentPrefilledResident();
      const docs = await this.prisma.document.findMany({
        where: { ownerId, status: 'active' },
        orderBy: { createdAt: 'desc' }
      });

      const mapped = docs.map((doc) => ({
        id: doc.id,
        category: doc.category,
        filename: doc.filename,
        issueDate: doc.issueDate?.toISOString().slice(0, 10),
        expiryDate: doc.expiryDate?.toISOString().slice(0, 10),
        issuingAuthority: doc.issuingAuthority ?? undefined,
        metadata: (doc.metadata as WalletDocument['metadata']) ?? undefined,
        version: doc.version,
        status: doc.status
      } satisfies WalletDocument));

      const governmentPrefilled = mapped.filter((doc) => doc.metadata?.source === 'government_registry');
      return governmentPrefilled.length > 0 ? governmentPrefilled : mapped;
    } catch {
      return this.demoData.getFallbackWalletDocuments();
    }
  }

  async upload(payload: Omit<WalletDocument, 'id' | 'version' | 'status'>) {
    const ownerId = await ensureDemoUserId(this.prisma);
    const created = await this.prisma.document.create({
      data: {
        ownerId,
        category: payload.category,
        filename: payload.filename,
        issueDate: payload.issueDate ? new Date(payload.issueDate) : undefined,
        expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : undefined,
        issuingAuthority: payload.issuingAuthority,
        metadata: (payload.metadata as Prisma.InputJsonValue | undefined) ?? undefined
      }
    });

    await this.audit.log({
      actorRole: 'resident',
      action: 'document_uploaded',
      target: created.id,
      metadata: { category: created.category }
    });

    return {
      id: created.id,
      category: created.category,
      filename: created.filename,
      issueDate: created.issueDate?.toISOString().slice(0, 10),
      expiryDate: created.expiryDate?.toISOString().slice(0, 10),
      issuingAuthority: created.issuingAuthority ?? undefined,
      metadata: (created.metadata as WalletDocument['metadata']) ?? undefined,
      version: created.version,
      status: created.status
    } satisfies WalletDocument;
  }

  async softDelete(id: string) {
    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: 'deleted' }
    });
    await this.audit.log({
      actorRole: 'resident',
      action: 'document_deleted',
      target: updated.id
    });
    return {
      id: updated.id,
      category: updated.category,
      filename: updated.filename,
      issueDate: updated.issueDate?.toISOString().slice(0, 10),
      expiryDate: updated.expiryDate?.toISOString().slice(0, 10),
      issuingAuthority: updated.issuingAuthority ?? undefined,
      metadata: (updated.metadata as WalletDocument['metadata']) ?? undefined,
      version: updated.version,
      status: updated.status
    } satisfies WalletDocument;
  }

  async createShareLink(documentId: string, ttlHours = 24, role: 'advisor' | 'admin' = 'advisor') {
    let documentExists = false;
    try {
      const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
      documentExists = Boolean(doc && doc.status !== 'deleted');
    } catch {
      documentExists = this.demoData.getFallbackWalletDocuments().some((item) => item.id === documentId);
    }

    if (!documentExists) return null;

    const shareId = `shr_${Math.random().toString(36).slice(2, 10)}`;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    const link: WalletShareLink = {
      shareId,
      documentId,
      url: `https://demo.civic.local/share/${shareId}`,
      expiresAt,
      role
    };

    const createdLog: WalletShareAccess = {
      id: `acc_${Math.random().toString(36).slice(2, 10)}`,
      shareId,
      documentId,
      actor: 'resident',
      action: 'created',
      at: new Date().toISOString()
    };

    this.shares.set(shareId, { link, log: [createdLog] });

    try {
      await this.audit.log({
        actorRole: 'resident',
        action: 'document_shared',
        target: documentId,
        metadata: { shareId, ttlHours, role }
      });
    } catch {
      // Ignore audit write failures in demo mode.
    }

    return link;
  }

  listAccessLog(documentId: string) {
    const logs: WalletShareAccess[] = [];
    for (const record of this.shares.values()) {
      if (record.link.documentId === documentId) {
        logs.push(...record.log);
      }
    }
    return logs.sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  async accessShare(shareId: string, actor = 'external-user') {
    const record = this.shares.get(shareId);
    if (!record) return null;

    if (new Date(record.link.expiresAt).getTime() < Date.now()) {
      return { error: 'expired' as const };
    }

    const accessLog: WalletShareAccess = {
      id: `acc_${Math.random().toString(36).slice(2, 10)}`,
      shareId,
      documentId: record.link.documentId,
      actor,
      action: 'accessed',
      at: new Date().toISOString()
    };

    record.log.unshift(accessLog);

    try {
      await this.audit.log({
        actorRole: 'advisor',
        action: 'document_share_accessed',
        target: record.link.documentId,
        metadata: { shareId, actor }
      });
    } catch {
      // Ignore audit write failures in demo mode.
    }

    try {
      const doc = await this.prisma.document.findUnique({ where: { id: record.link.documentId } });
      if (!doc) return null;

      return {
        share: record.link,
        document: {
          id: doc.id,
          category: doc.category,
          filename: doc.filename,
          expiryDate: doc.expiryDate?.toISOString().slice(0, 10)
        }
      };
    } catch {
      const doc = this.demoData.getFallbackWalletDocuments().find((item) => item.id === record.link.documentId);
      if (!doc) return null;

      return {
        share: record.link,
        document: {
          id: doc.id,
          category: doc.category,
          filename: doc.filename,
          expiryDate: doc.expiryDate
        }
      };
    }
  }
}
