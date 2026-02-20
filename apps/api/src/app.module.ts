import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { WalletModule } from './wallet/wallet.module';
import { ProcessesModule } from './processes/processes.module';
import { TimelineModule } from './timeline/timeline.module';
import { AiModule } from './ai/ai.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './db/prisma.module';
import { ConsentModule } from './consent/consent.module';
import { PrivacyModule } from './privacy/privacy.module';
import { DemoModule } from './demo/demo.module';
import { CivicCardModule } from './civic-card/civic-card.module';

@Module({
  imports: [
    PrismaModule,
    DemoModule,
    CivicCardModule,
    ConfigModule,
    AuthModule,
    AuditModule,
    HealthModule,
    WalletModule,
    ProcessesModule,
    TimelineModule,
    AiModule,
    IntegrationsModule,
    ConsentModule,
    PrivacyModule
  ]
})
export class AppModule {}
