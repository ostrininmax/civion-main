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
exports.PrivacyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../db/prisma.service");
const demo_user_1 = require("../common/demo-user");
const audit_service_1 = require("../audit/audit.service");
const demo_data_service_1 = require("../demo/demo-data.service");
let PrivacyService = class PrivacyService {
    prisma;
    audit;
    demoData;
    constructor(prisma, audit, demoData) {
        this.prisma = prisma;
        this.audit = audit;
        this.demoData = demoData;
    }
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
        }
        catch {
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
    async requestDeletion(reason) {
        const ownerId = await (0, demo_user_1.ensureDemoUserId)(this.prisma);
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
};
exports.PrivacyService = PrivacyService;
exports.PrivacyService = PrivacyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __param(2, (0, common_1.Inject)(demo_data_service_1.DemoDataService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        demo_data_service_1.DemoDataService])
], PrivacyService);
