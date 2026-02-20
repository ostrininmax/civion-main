import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      // Keep API alive in demo mode even if database is temporarily unavailable.
      this.logger.error('Prisma connection failed at startup. Continuing in degraded mode.', error as Error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
