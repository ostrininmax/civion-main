import { Module } from '@nestjs/common';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ConsentController],
  providers: [ConsentService]
})
export class ConsentModule {}
