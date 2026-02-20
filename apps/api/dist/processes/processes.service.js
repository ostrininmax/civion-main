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
exports.ProcessesService = void 0;
const common_1 = require("@nestjs/common");
const config_service_1 = require("../config/config.service");
const prisma_service_1 = require("../db/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const demo_data_service_1 = require("../demo/demo-data.service");
let ProcessesService = class ProcessesService {
    config;
    prisma;
    audit;
    demoData;
    constructor(config, prisma, audit, demoData) {
        this.config = config;
        this.prisma = prisma;
        this.audit = audit;
        this.demoData = demoData;
    }
    listAvailable(country) {
        return this.config.getCountry(country)?.processes ?? [];
    }
    async listInstances() {
        try {
            const ownerId = await this.demoData.ensureGovernmentPrefilledResident();
            const items = await this.prisma.processInstance.findMany({
                where: { ownerId },
                orderBy: { createdAt: 'desc' }
            });
            return items.map((item) => this.toProcessInstance(item));
        }
        catch {
            return this.demoData.getFallbackProcessInstances();
        }
    }
    async getInstanceByProcessId(processId) {
        try {
            const ownerId = await this.demoData.ensureGovernmentPrefilledResident();
            const item = await this.prisma.processInstance.findFirst({
                where: { ownerId, processId },
                orderBy: { createdAt: 'desc' }
            });
            if (!item)
                return null;
            return this.toProcessInstance(item);
        }
        catch {
            return this.demoData.getFallbackProcessInstances().find((item) => item.processId === processId) ?? null;
        }
    }
    async getFlow(processId) {
        const process = this.findProcessDefinition(processId);
        if (!process) {
            throw new common_1.NotFoundException(`Process '${processId}' is not configured`);
        }
        try {
            const ownerId = await this.demoData.ensureGovernmentPrefilledResident();
            const [instanceRow, docs] = await Promise.all([
                this.prisma.processInstance.findFirst({
                    where: { ownerId, processId },
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.document.findMany({
                    where: {
                        ownerId,
                        status: 'active',
                        category: { in: process.requiredDocuments }
                    },
                    orderBy: { updatedAt: 'desc' }
                })
            ]);
            const documentByCategory = this.pickDocumentsByCategory(docs);
            return this.buildFlowState(process, instanceRow ? this.toProcessInstance(instanceRow) : null, documentByCategory);
        }
        catch {
            const instance = this.demoData.getFallbackProcessInstances().find((item) => item.processId === processId) ?? null;
            const fallbackDocs = this.demoData.getFallbackWalletDocuments().filter((item) => item.status === 'active');
            const documentByCategory = this.pickDocumentsByCategory(fallbackDocs);
            return this.buildFlowState(process, instance, documentByCategory);
        }
    }
    async start(processId, options) {
        const process = this.findProcessDefinition(processId);
        if (!process) {
            throw new common_1.NotFoundException(`Process '${processId}' is not configured`);
        }
        const ownerId = await this.demoData.ensureGovernmentPrefilledResident();
        const existing = await this.prisma.processInstance.findFirst({
            where: { ownerId, processId },
            orderBy: { createdAt: 'desc' }
        });
        if (existing && !options?.forceNew && (existing.status === 'in_progress' || existing.status === 'submitted')) {
            return this.toProcessInstance(existing);
        }
        const created = await this.prisma.processInstance.create({
            data: {
                ownerId,
                processId,
                status: 'in_progress',
                completedSteps: [],
                currentStep: 0,
                startedAt: new Date()
            }
        });
        await this.audit.log({
            actorRole: 'resident',
            action: 'process_started',
            target: created.id,
            metadata: {
                processId: created.processId,
                forceNew: Boolean(options?.forceNew),
                previousInstanceId: existing?.id
            }
        });
        return this.toProcessInstance(created);
    }
    async completeStep(id, stepIndex) {
        if (!Number.isInteger(stepIndex) || stepIndex < 0) {
            throw new common_1.BadRequestException('Step index must be a non-negative integer');
        }
        const instance = await this.prisma.processInstance.findUnique({ where: { id } });
        if (!instance)
            throw new common_1.NotFoundException('Process instance not found');
        if (instance.status !== 'in_progress') {
            throw new common_1.BadRequestException('Step completion is only available while process is in progress');
        }
        const process = this.findProcessDefinition(instance.processId);
        if (!process) {
            throw new common_1.NotFoundException(`Process '${instance.processId}' is not configured`);
        }
        if (stepIndex >= process.steps.length) {
            throw new common_1.BadRequestException(`Step index out of range. Max step is ${process.steps.length - 1}`);
        }
        const completed = new Set(this.parseCompletedSteps(instance.completedSteps));
        if (stepIndex > instance.currentStep) {
            throw new common_1.BadRequestException('Complete previous step first');
        }
        completed.add(stepIndex);
        const completedSteps = [...completed].sort((a, b) => a - b);
        const currentStep = Math.min(process.steps.length, Math.max(instance.currentStep, stepIndex + 1));
        await this.prisma.processInstance.update({
            where: { id: instance.id },
            data: {
                completedSteps: completedSteps.map(String),
                currentStep
            }
        });
        await this.audit.log({
            actorRole: 'resident',
            action: 'process_step_completed',
            target: instance.id,
            metadata: {
                processId: instance.processId,
                stepIndex,
                stepName: process.steps[stepIndex]
            }
        });
        return this.getFlow(instance.processId);
    }
    async submit(id) {
        const instance = await this.prisma.processInstance.findUnique({ where: { id } });
        if (!instance)
            throw new common_1.NotFoundException('Process instance not found');
        if (instance.status !== 'in_progress') {
            throw new common_1.BadRequestException('Only in-progress processes can be submitted');
        }
        const process = this.findProcessDefinition(instance.processId);
        if (!process) {
            throw new common_1.NotFoundException(`Process '${instance.processId}' is not configured`);
        }
        const ownerId = instance.ownerId;
        const docs = await this.prisma.document.findMany({
            where: {
                ownerId,
                status: 'active',
                category: { in: process.requiredDocuments }
            },
            orderBy: { updatedAt: 'desc' }
        });
        const flow = this.buildFlowState(process, this.toProcessInstance(instance), this.pickDocumentsByCategory(docs));
        if (!flow.canSubmit) {
            throw new common_1.BadRequestException(flow.blockers.join(' '));
        }
        const completedSteps = Array.from({ length: process.steps.length }, (_, idx) => String(idx));
        const updated = await this.prisma.processInstance.update({
            where: { id: instance.id },
            data: {
                status: 'submitted',
                completedSteps,
                currentStep: process.steps.length,
                submittedAt: new Date()
            }
        });
        await this.audit.log({
            actorRole: 'resident',
            action: 'process_submitted',
            target: updated.id,
            metadata: { processId: updated.processId }
        });
        return this.toProcessInstance(updated);
    }
    async complete(id) {
        const instance = await this.prisma.processInstance.findUnique({ where: { id } });
        if (!instance)
            throw new common_1.NotFoundException('Process instance not found');
        if (instance.status !== 'submitted') {
            throw new common_1.BadRequestException('Only submitted processes can be completed');
        }
        const updated = await this.prisma.processInstance.update({
            where: { id: instance.id },
            data: {
                status: 'completed',
                completedAt: new Date()
            }
        });
        await this.audit.log({
            actorRole: 'resident',
            action: 'process_completed',
            target: updated.id,
            metadata: { processId: updated.processId }
        });
        return this.toProcessInstance(updated);
    }
    async updateStatus(id, status) {
        if (status === 'submitted') {
            return this.submit(id);
        }
        if (status === 'completed') {
            return this.complete(id);
        }
        const instance = await this.prisma.processInstance.findUnique({ where: { id } });
        if (!instance)
            throw new common_1.NotFoundException('Process instance not found');
        const resetData = status === 'not_started'
            ? {
                completedSteps: [],
                currentStep: 0,
                startedAt: null,
                submittedAt: null,
                completedAt: null
            }
            : {};
        const updated = await this.prisma.processInstance.update({
            where: { id },
            data: {
                status,
                ...(status === 'in_progress' && !instance.startedAt ? { startedAt: new Date() } : {}),
                ...resetData
            }
        });
        await this.audit.log({
            actorRole: 'resident',
            action: 'process_status_updated',
            target: updated.id,
            metadata: { status }
        });
        return this.toProcessInstance(updated);
    }
    findProcessDefinition(processId) {
        const country = this.config.getCountry('cy');
        return country?.processes.find((item) => item.id === processId);
    }
    parseCompletedSteps(rawSteps) {
        const values = rawSteps
            .map((item) => Number(item))
            .filter((item) => Number.isInteger(item) && item >= 0);
        return [...new Set(values)].sort((a, b) => a - b);
    }
    pickDocumentsByCategory(documents) {
        const map = new Map();
        for (const doc of documents) {
            if (!map.has(doc.category)) {
                map.set(doc.category, { id: doc.id, filename: doc.filename });
            }
        }
        return map;
    }
    toReadableCategory(category) {
        return category
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
    buildFlowState(process, instance, docs) {
        const totalStepCount = process.steps.length;
        const completedIndices = new Set((instance?.completedSteps ?? []).filter((idx) => idx >= 0 && idx < totalStepCount && Number.isInteger(idx)));
        if (instance && (instance.status === 'submitted' || instance.status === 'completed')) {
            for (let i = 0; i < totalStepCount; i += 1) {
                completedIndices.add(i);
            }
        }
        const completedStepCount = completedIndices.size;
        let currentStep = instance?.currentStep ?? 0;
        if (currentStep < 0)
            currentStep = 0;
        if (currentStep > totalStepCount)
            currentStep = totalStepCount;
        const status = instance?.status ?? 'not_started';
        const steps = process.steps.map((title, index) => {
            const completed = completedIndices.has(index);
            return {
                index,
                title,
                completed,
                available: completed || (status === 'in_progress' && index <= currentStep)
            };
        });
        const requiredDocuments = process.requiredDocuments.map((category) => {
            const doc = docs.get(category);
            return {
                category,
                present: Boolean(doc),
                filename: doc?.filename,
                documentId: doc?.id
            };
        });
        const missingCategories = requiredDocuments.filter((item) => !item.present).map((item) => item.category);
        const canSubmit = Boolean(instance) && status === 'in_progress' && completedStepCount === totalStepCount && missingCategories.length === 0;
        const canComplete = Boolean(instance) && status === 'submitted';
        const blockers = [];
        if (!instance) {
            blockers.push('Start this service to begin the flow.');
        }
        if (missingCategories.length > 0) {
            blockers.push(`Missing required documents: ${missingCategories.map((item) => this.toReadableCategory(item)).join(', ')}.`);
        }
        if (instance && status === 'in_progress' && completedStepCount < totalStepCount) {
            blockers.push(`Complete all ${totalStepCount} process steps before submitting.`);
        }
        return {
            processId: process.id,
            status,
            instance,
            steps,
            requiredDocuments,
            completedStepCount,
            totalStepCount,
            progressPercent: totalStepCount === 0 ? 0 : Math.round((completedStepCount / totalStepCount) * 100),
            canSubmit,
            canComplete,
            blockers
        };
    }
    toProcessInstance(item) {
        return {
            id: item.id,
            processId: item.processId,
            status: item.status,
            completedSteps: this.parseCompletedSteps(item.completedSteps),
            currentStep: item.currentStep,
            startedAt: item.startedAt?.toISOString(),
            submittedAt: item.submittedAt?.toISOString(),
            completedAt: item.completedAt?.toISOString(),
            updatedAt: item.updatedAt.toISOString()
        };
    }
};
exports.ProcessesService = ProcessesService;
exports.ProcessesService = ProcessesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(config_service_1.ConfigService)),
    __param(1, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(2, (0, common_1.Inject)(audit_service_1.AuditService)),
    __param(3, (0, common_1.Inject)(demo_data_service_1.DemoDataService)),
    __metadata("design:paramtypes", [config_service_1.ConfigService,
        prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        demo_data_service_1.DemoDataService])
], ProcessesService);
