import { Module } from '@nestjs/common';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';
import { ConfigModule } from '../config/config.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ConfigModule, AuditModule],
  controllers: [ProcessesController],
  providers: [ProcessesService]
})
export class ProcessesModule {}
