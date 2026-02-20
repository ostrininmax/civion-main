import { Module } from '@nestjs/common';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TimelineController],
  providers: [TimelineService]
})
export class TimelineModule {}
