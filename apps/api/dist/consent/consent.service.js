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
exports.ConsentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../db/prisma.service");
const demo_user_1 = require("../common/demo-user");
const audit_service_1 = require("../audit/audit.service");
const demo_data_service_1 = require("../demo/demo-data.service");
let ConsentService = class ConsentService {
    prisma;
    audit;
    demoData;
    constructor(prisma, audit, demoData) {
        this.prisma = prisma;
        this.audit = audit;
        this.demoData = demoData;
    }
    async list() {
        try {
            const ownerId = await this.demoData.ensureGovernmentPrefilledResident();
            return this.prisma.consent.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
        }
        catch {
            return this.demoData.getFallbackConsents();
        }
    }
    async create(scope) {
        const ownerId = await (0, demo_user_1.ensureDemoUserId)(this.prisma);
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
    async revoke(id) {
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
};
exports.ConsentService = ConsentService;
exports.ConsentService = ConsentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __param(2, (0, common_1.Inject)(demo_data_service_1.DemoDataService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        demo_data_service_1.DemoDataService])
], ConsentService);
