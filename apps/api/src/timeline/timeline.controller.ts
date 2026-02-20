import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { TimelineService } from './timeline.service';

@Controller('timeline')
export class TimelineController {
  constructor(@Inject(TimelineService) private readonly timeline: TimelineService) {}

  @Get('events')
  async list() {
    return this.timeline.list();
  }

  @Post('events')
  async create(
    @Body()
    body: {
      title: string;
      dueDate: string;
      severity: 'informational' | 'important' | 'critical';
      source?: 'document' | 'process' | 'manual';
    }
  ) {
    return this.timeline.create(body);
  }
}
