import { Body, Controller, Inject, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(@Inject(AiService) private readonly ai: AiService) {}

  @Post('ask')
  ask(@Body() body: { question: string }) {
    return this.ai.answer(body.question);
  }
}
