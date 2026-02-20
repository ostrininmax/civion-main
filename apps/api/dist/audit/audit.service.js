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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../db/prisma.service");
let AuditService = class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(event) {
        const entry = await this.prisma.auditEvent.create({
            data: {
                actorRole: event.actorRole,
                action: event.action,
                target: event.target,
                metadata: event.metadata ?? undefined
            }
        });
        return {
            id: entry.id,
            actorRole: entry.actorRole,
            action: entry.action,
            target: entry.target,
            time: entry.createdAt.toISOString(),
            metadata: (entry.metadata ?? undefined)
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
            metadata: (evt.metadata ?? undefined)
        }));
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
