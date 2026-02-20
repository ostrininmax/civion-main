import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PrivacyController],
  providers: [PrivacyService]
})
export class PrivacyModule {}
