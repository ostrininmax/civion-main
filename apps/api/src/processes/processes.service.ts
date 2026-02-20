import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import type { ProcessConfig } from '../config/country.types';
import type { ProcessFlow, ProcessInstance, ProcessStatus } from './processes.types';
import { PrismaService } from '../db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable()
export class ProcessesService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DemoDataService) private readonly demoData: DemoDataService
  ) {}

  listAvailable(country: string) {
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
    } catch {
      return this.demoData.getFallbackProcessInstances();
    }
  }

  async getInstanceByProcessId(processId: string) {
    try {
      const ownerId = await this.demoData.ensureGovernmentPrefilledResident();
      const item = await this.prisma.processInstance.findFirst({
        where: { ownerId, processId },
        orderBy: { createdAt: 'desc' }
      });

      if (!item) return null;
      return this.toProcessInstance(item);
    } catch {
      return this.demoData.getFallbackProcessInstances().find((item) => item.processId === processId) ?? null;
    }
  }

  async getFlow(processId: string) {
    const process = this.findProcessDefinition(processId);
    if (!process) {
      throw new NotFoundException(`Process '${processId}' is not configured`);
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
    } catch {
      const instance = this.demoData.getFallbackProcessInstances().find((item) => item.processId === processId) ?? null;
      const fallbackDocs = this.demoData.getFallbackWalletDocuments().filter((item) => item.status === 'active');
      const documentByCategory = this.pickDocumentsByCategory(fallbackDocs);
      return this.buildFlowState(process, instance, documentByCategory);
    }
  }

  async start(processId: string, options?: { forceNew?: boolean }) {
    const process = this.findProcessDefinition(processId);
    if (!process) {
      throw new NotFoundException(`Process '${processId}' is not configured`);
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

  async completeStep(id: string, stepIndex: number) {
    if (!Number.isInteger(stepIndex) || stepIndex < 0) {
      throw new BadRequestException('Step index must be a non-negative integer');
    }

    const instance = await this.prisma.processInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundException('Process instance not found');
    if (instance.status !== 'in_progress') {
      throw new BadRequestException('Step completion is only available while process is in progress');
    }

    const process = this.findProcessDefinition(instance.processId);
    if (!process) {
      throw new NotFoundException(`Process '${instance.processId}' is not configured`);
    }

    if (stepIndex >= process.steps.length) {
      throw new BadRequestException(`Step index out of range. Max step is ${process.steps.length - 1}`);
    }

    const completed = new Set(this.parseCompletedSteps(instance.completedSteps));
    if (stepIndex > instance.currentStep) {
      throw new BadRequestException('Complete previous step first');
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

  async submit(id: string) {
    const instance = await this.prisma.processInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundException('Process instance not found');
    if (instance.status !== 'in_progress') {
      throw new BadRequestException('Only in-progress processes can be submitted');
    }

    const process = this.findProcessDefinition(instance.processId);
    if (!process) {
      throw new NotFoundException(`Process '${instance.processId}' is not configured`);
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
      throw new BadRequestException(flow.blockers.join(' '));
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

  async complete(id: string) {
    const instance = await this.prisma.processInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundException('Process instance not found');
    if (instance.status !== 'submitted') {
      throw new BadRequestException('Only submitted processes can be completed');
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

  async updateStatus(id: string, status: ProcessStatus) {
    if (status === 'submitted') {
      return this.submit(id);
    }
    if (status === 'completed') {
      return this.complete(id);
    }

    const instance = await this.prisma.processInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundException('Process instance not found');

    const resetData =
      status === 'not_started'
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

  private findProcessDefinition(processId: string) {
    const country = this.config.getCountry('cy');
    return country?.processes.find((item) => item.id === processId);
  }

  private parseCompletedSteps(rawSteps: string[]) {
    const values = rawSteps
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0);

    return [...new Set(values)].sort((a, b) => a - b);
  }

  private pickDocumentsByCategory(documents: Array<{ id: string; category: string; filename: string }>) {
    const map = new Map<string, { id: string; filename: string }>();
    for (const doc of documents) {
      if (!map.has(doc.category)) {
        map.set(doc.category, { id: doc.id, filename: doc.filename });
      }
    }
    return map;
  }

  private toReadableCategory(category: string) {
    return category
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private buildFlowState(
    process: ProcessConfig,
    instance: ProcessInstance | null,
    docs: Map<string, { id: string; filename: string }>
  ): ProcessFlow {
    const totalStepCount = process.steps.length;
    const completedIndices = new Set(
      (instance?.completedSteps ?? []).filter((idx) => idx >= 0 && idx < totalStepCount && Number.isInteger(idx))
    );

    if (instance && (instance.status === 'submitted' || instance.status === 'completed')) {
      for (let i = 0; i < totalStepCount; i += 1) {
        completedIndices.add(i);
      }
    }

    const completedStepCount = completedIndices.size;
    let currentStep = instance?.currentStep ?? 0;
    if (currentStep < 0) currentStep = 0;
    if (currentStep > totalStepCount) currentStep = totalStepCount;

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

    const blockers: string[] = [];
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
    } satisfies ProcessFlow;
  }

  private toProcessInstance(item: {
    id: string;
    processId: string;
    status: ProcessStatus;
    completedSteps: string[];
    currentStep: number;
    startedAt: Date | null;
    submittedAt: Date | null;
    completedAt: Date | null;
    updatedAt: Date;
  }) {
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
    } satisfies ProcessInstance;
  }
}
