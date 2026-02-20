import { Controller, Get, Inject } from '@nestjs/common';
import { RequireRoles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  @RequireRoles('admin')
  async list() {
    return this.audit.list();
  }
}
