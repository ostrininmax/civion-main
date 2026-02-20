import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { PrivacyService } from './privacy.service';

@Controller('privacy')
export class PrivacyController {
  constructor(@Inject(PrivacyService) private readonly privacy: PrivacyService) {}

  @Get('export')
  async exportData() {
    return this.privacy.exportData();
  }

  @Post('delete')
  async requestDeletion(@Body() body: { reason?: string }) {
    return this.privacy.requestDeletion(body.reason);
  }
}
