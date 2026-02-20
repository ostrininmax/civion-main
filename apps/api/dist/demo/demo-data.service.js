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
var DemoDataService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoDataService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../db/prisma.service");
let DemoDataService = DemoDataService_1 = class DemoDataService {
    prisma;
    seedLock = null;
    logger = new common_1.Logger(DemoDataService_1.name);
    fallbackUser = {
        id: 'demo-resident',
        email: 'demo@civic.local',
        role: 'resident'
    };
    fallbackDocuments = [
        {
            id: 'doc-passport',
            category: 'passport',
            filename: 'passport_main_page.jpg',
            issueDate: '2021-05-15',
            expiryDate: '2031-05-15',
            metadata: {
                documentNumber: '76 2225219',
                fullName: 'Roman Kochetov',
                dateOfBirth: '1997-04-12',
                nationality: 'RUS',
                scanConfidence: 0.99,
                source: 'government_registry'
            },
            version: 1,
            status: 'active'
        },
        {
            id: 'doc-residence',
            category: 'residence_permit',
            filename: 'residence_permit_front.jpg',
            issueDate: '2025-03-01',
            expiryDate: '2026-03-01',
            metadata: {
                documentNumber: 'CYRP-992734',
                fullName: 'Roman Kochetov',
                dateOfBirth: '1997-04-12',
                nationality: 'RUS',
                scanConfidence: 0.98,
                source: 'government_registry'
            },
            version: 1,
            status: 'active'
        },
        {
            id: 'doc-taxid',
            category: 'tax_id',
            filename: 'tax_certificate.pdf',
            issueDate: '2024-01-22',
            metadata: {
                documentNumber: '3853706672',
                fullName: 'Roman Kochetov',
                source: 'government_registry'
            },
            version: 1,
            status: 'active'
        },
        {
            id: 'doc-health',
            category: 'health_insurance',
            filename: 'health_insurance_policy.pdf',
            issueDate: '2025-01-01',
            expiryDate: '2026-01-01',
            metadata: {
                documentNumber: 'HI-CY-334920',
                fullName: 'Roman Kochetov',
                source: 'government_registry'
            },
            version: 1,
            status: 'active'
        },
        {
            id: 'doc-rent',
            category: 'rental_agreement',
            filename: 'rental_agreement_larnaca.pdf',
            issueDate: '2025-02-01',
            expiryDate: '2026-01-31',
            metadata: {
                documentNumber: 'LEASE-18420',
                fullName: 'Roman Kochetov',
                source: 'government_registry'
            },
            version: 1,
            status: 'active'
        },
        {
            id: 'doc-company',
            category: 'company_document',
            filename: 'company_articles.pdf',
            issueDate: '2025-05-09',
            metadata: {
                documentNumber: 'CY-ART-302119',
                fullName: 'Roman Kochetov',
                source: 'government_registry'
            },
            version: 1,
            status: 'active'
        },
        {
            id: 'doc-address',
            category: 'proof_of_address',
            filename: 'utility_bill_august.pdf',
            issueDate: '2026-01-10',
            metadata: {
                documentNumber: 'ADDR-66012',
                fullName: 'Roman Kochetov',
                source: 'government_registry'
            },
            version: 1,
            status: 'active'
        },
        {
            id: 'doc-bank',
            category: 'bank_statement',
            filename: 'bank_statement_q4.pdf',
            issueDate: '2026-01-05',
            metadata: {
                documentNumber: 'BANK-4811',
                fullName: 'Roman Kochetov',
                source: 'government_registry'
            },
            version: 1,
            status: 'active'
        }
    ];
    fallbackProcesses = [
        {
            id: 'proc-tax-id',
            processId: 'tax-id',
            status: 'completed',
            completedSteps: [0, 1, 2],
            currentStep: 3,
            startedAt: '2025-12-01T00:00:00.000Z',
            submittedAt: '2025-12-05T11:00:00.000Z',
            completedAt: '2025-12-08T15:25:00.000Z',
            updatedAt: '2026-02-11T19:49:05.544Z'
        }
    ];
    fallbackTimeline = [
        {
            id: 'tl-ltd-decision',
            title: 'LTD registration expected decision',
            dueDate: '2026-02-20T09:00:00.000Z',
            severity: 'informational',
            source: 'process'
        },
        {
            id: 'tl-biometrics',
            title: 'Residence permit biometrics appointment',
            dueDate: '2026-02-27T09:00:00.000Z',
            severity: 'critical',
            source: 'process'
        },
        {
            id: 'tl-passport-expiry',
            title: 'Passport expiry warning (90 days)',
            dueDate: '2026-03-15T09:00:00.000Z',
            severity: 'important',
            source: 'document'
        },
        {
            id: 'tl-insurance-renewal',
            title: 'Health insurance renewal check',
            dueDate: '2026-03-25T09:00:00.000Z',
            severity: 'important',
            source: 'document'
        },
        {
            id: 'tl-annual-return',
            title: 'Annual return preparation',
            dueDate: '2026-11-15T09:00:00.000Z',
            severity: 'informational',
            source: 'manual'
        }
    ];
    fallbackConsents = [
        {
            id: 'consent-doc-core',
            scope: ['passport', 'residence_permit', 'tax_id'],
            status: 'granted',
            createdAt: '2026-02-11T19:49:05.557Z'
        },
        {
            id: 'consent-doc-secondary',
            scope: ['health_insurance', 'rental_agreement'],
            status: 'granted',
            createdAt: '2026-02-11T19:49:05.557Z'
        }
    ];
    constructor(prisma) {
        this.prisma = prisma;
    }
    getFallbackUser() {
        return { ...this.fallbackUser };
    }
    getFallbackWalletDocuments() {
        return this.fallbackDocuments.map((item) => ({ ...item, metadata: item.metadata ? { ...item.metadata } : undefined }));
    }
    getFallbackProcessInstances() {
        return this.fallbackProcesses.map((item) => ({ ...item, completedSteps: [...item.completedSteps] }));
    }
    getFallbackTimelineEvents() {
        return this.fallbackTimeline.map((item) => ({ ...item }));
    }
    getFallbackConsents(ownerId = this.fallbackUser.id) {
        return this.fallbackConsents.map((item) => ({
            id: item.id,
            ownerId,
            scope: [...item.scope],
            status: item.status,
            createdAt: new Date(item.createdAt)
        }));
    }
    async ensureGovernmentPrefilledResident() {
        if (this.seedLock)
            return this.seedLock;
        const runner = async () => {
            try {
                const user = await this.prisma.user.upsert({
                    where: { email: 'demo@civic.local' },
                    update: {},
                    create: { email: 'demo@civic.local', role: 'resident' }
                });
                await Promise.all([
                    this.seedDocuments(user.id),
                    this.seedProcesses(user.id),
                    this.seedTimeline(user.id),
                    this.seedConsents(user.id)
                ]);
                return user.id;
            }
            catch (error) {
                this.logger.error('Database seeding unavailable. Falling back to in-memory demo data.', error);
                return this.fallbackUser.id;
            }
        };
        this.seedLock = runner();
        try {
            return await this.seedLock;
        }
        finally {
            this.seedLock = null;
        }
    }
    async seedDocuments(ownerId) {
        const seed = this.fallbackDocuments.map((item) => ({
            ownerId,
            category: item.category,
            filename: item.filename,
            issueDate: item.issueDate ? new Date(item.issueDate) : undefined,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
            metadata: item.metadata
        }));
        const existing = await this.prisma.document.findMany({
            where: { ownerId },
            select: { category: true, filename: true }
        });
        const existingKeys = new Set(existing.map((item) => `${item.category}:${item.filename}`));
        const missing = seed.filter((item) => !existingKeys.has(`${item.category}:${item.filename}`));
        if (missing.length === 0)
            return;
        await this.prisma.document.createMany({ data: missing });
    }
    async seedProcesses(ownerId) {
        const seed = this.fallbackProcesses.map((item) => ({
            ownerId,
            processId: item.processId,
            status: item.status,
            completedSteps: item.completedSteps.map(String),
            currentStep: item.currentStep,
            startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
            submittedAt: item.submittedAt ? new Date(item.submittedAt) : undefined,
            completedAt: item.completedAt ? new Date(item.completedAt) : undefined
        }));
        const existing = await this.prisma.processInstance.findMany({
            where: { ownerId },
            select: { processId: true }
        });
        const existingIds = new Set(existing.map((item) => item.processId));
        const missing = seed.filter((item) => !existingIds.has(item.processId));
        if (missing.length === 0)
            return;
        await this.prisma.processInstance.createMany({ data: missing });
    }
    async seedTimeline(ownerId) {
        const seed = this.fallbackTimeline.map((item) => ({
            ownerId,
            title: item.title,
            dueDate: new Date(item.dueDate),
            severity: item.severity,
            source: item.source
        }));
        const existing = await this.prisma.timelineEvent.findMany({
            where: { ownerId },
            select: { title: true }
        });
        const existingTitles = new Set(existing.map((item) => item.title));
        const missing = seed.filter((item) => !existingTitles.has(item.title));
        if (missing.length === 0)
            return;
        await this.prisma.timelineEvent.createMany({ data: missing });
    }
    async seedConsents(ownerId) {
        const seed = this.fallbackConsents.map((item) => ({
            ownerId,
            scope: item.scope,
            status: item.status
        }));
        const existing = await this.prisma.consent.findMany({
            where: { ownerId },
            select: { scope: true, status: true }
        });
        const signature = (scope, status) => `${status}:${[...scope].sort((a, b) => a.localeCompare(b)).join('|')}`;
        const existingSignatures = new Set(existing.map((item) => signature(item.scope, item.status)));
        const missing = seed.filter((item) => !existingSignatures.has(signature(item.scope, item.status)));
        if (missing.length === 0)
            return;
        await this.prisma.consent.createMany({ data: missing });
    }
};
exports.DemoDataService = DemoDataService;
exports.DemoDataService = DemoDataService = DemoDataService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DemoDataService);
