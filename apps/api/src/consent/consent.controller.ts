import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ConsentService } from './consent.service';

@Controller('consents')
export class ConsentController {
  constructor(@Inject(ConsentService) private readonly consent: ConsentService) {}

  @Get()
  async list() {
    return this.consent.list();
  }

  @Post()
  async create(@Body() body: { scope: string[] }) {
    return this.consent.create(body.scope);
  }

  @Post(':id/revoke')
  async revoke(@Param('id') id: string) {
    return this.consent.revoke(id);
  }
}
