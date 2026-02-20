"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../db/prisma.service");
const demo_user_1 = require("../common/demo-user");
const audit_service_1 = require("../audit/audit.service");
const demo_data_service_1 = require("../demo/demo-data.service");
let WalletService = class WalletService {
    prisma;
    audit;
    demoData;
    shares = new Map();
    constructor(prisma, audit, demoData) {
        this.prisma = prisma;
        this.audit = audit;
        this.demoData = demoData;
    }
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
                metadata: doc.metadata ?? undefined,
                version: doc.version,
                status: doc.status
            }));
            const governmentPrefilled = mapped.filter((doc) => doc.metadata?.source === 'government_registry');
            return governmentPrefilled.length > 0 ? governmentPrefilled : mapped;
        }
        catch {
            return this.demoData.getFallbackWalletDocuments();
        }
    }
    async upload(payload) {
        const ownerId = await (0, demo_user_1.ensureDemoUserId)(this.prisma);
        const created = await this.prisma.document.create({
            data: {
                ownerId,
                category: payload.category,
                filename: payload.filename,
                issueDate: payload.issueDate ? new Date(payload.issueDate) : undefined,
                expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : undefined,
                issuingAuthority: payload.issuingAuthority,
                metadata: payload.metadata ?? undefined
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
            metadata: created.metadata ?? undefined,
            version: created.version,
            status: created.status
        };
    }
    async softDelete(id) {
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
            metadata: updated.metadata ?? undefined,
            version: updated.version,
            status: updated.status
        };
    }
    async createShareLink(documentId, ttlHours = 24, role = 'advisor') {
        let documentExists = false;
        try {
            const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
            documentExists = Boolean(doc && doc.status !== 'deleted');
        }
        catch {
            documentExists = this.demoData.getFallbackWalletDocuments().some((item) => item.id === documentId);
        }
        if (!documentExists)
            return null;
        const shareId = `shr_${Math.random().toString(36).slice(2, 10)}`;
        const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
        const link = {
            shareId,
            documentId,
            url: `https://demo.civic.local/share/${shareId}`,
            expiresAt,
            role
        };
        const createdLog = {
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
        }
        catch {
            // Ignore audit write failures in demo mode.
        }
        return link;
    }
    listAccessLog(documentId) {
        const logs = [];
        for (const record of this.shares.values()) {
            if (record.link.documentId === documentId) {
                logs.push(...record.log);
            }
        }
        return logs.sort((a, b) => (a.at < b.at ? 1 : -1));
    }
    async accessShare(shareId, actor = 'external-user') {
        const record = this.shares.get(shareId);
        if (!record)
            return null;
        if (new Date(record.link.expiresAt).getTime() < Date.now()) {
            return { error: 'expired' };
        }
        const accessLog = {
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
        }
        catch {
            // Ignore audit write failures in demo mode.
        }
        try {
            const doc = await this.prisma.document.findUnique({ where: { id: record.link.documentId } });
            if (!doc)
                return null;
            return {
                share: record.link,
                document: {
                    id: doc.id,
                    category: doc.category,
                    filename: doc.filename,
                    expiryDate: doc.expiryDate?.toISOString().slice(0, 10)
                }
            };
        }
        catch {
            const doc = this.demoData.getFallbackWalletDocuments().find((item) => item.id === record.link.documentId);
            if (!doc)
                return null;
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
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __param(2, (0, common_1.Inject)(demo_data_service_1.DemoDataService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        demo_data_service_1.DemoDataService])
], WalletService);
