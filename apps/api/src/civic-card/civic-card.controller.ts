import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { CivicCardService } from './civic-card.service';
import type { CivicCardScope } from './civic-card.types';

@Controller('civic-card')
export class CivicCardController {
  constructor(@Inject(CivicCardService) private readonly civicCard: CivicCardService) {}

  @Post('token')
  issueToken(@Body() body?: { scopes?: CivicCardScope[] }) {
    const scopes = Array.isArray(body?.scopes) && body?.scopes.length > 0 ? body.scopes : undefined;
    return this.civicCard.issueToken(scopes);
  }

  @Get('verify')
  verifyToken(@Query('token') token?: string) {
    return this.civicCard.verifyToken(token);
  }
}
