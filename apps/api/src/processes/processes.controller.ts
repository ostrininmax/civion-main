import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ProcessesService } from './processes.service';
import type { ProcessStatus } from './processes.types';

@Controller('processes')
export class ProcessesController {
  constructor(@Inject(ProcessesService) private readonly processes: ProcessesService) {}

  @Get('catalog')
  catalog(@Query('country') country = 'cy') {
    return this.processes.listAvailable(country);
  }

  @Get('instances')
  async instances() {
    return this.processes.listInstances();
  }

  @Get('instances/by-process/:processId')
  async instanceByProcess(@Param('processId') processId: string) {
    return this.processes.getInstanceByProcessId(processId);
  }

  @Get('flow/:processId')
  async flow(@Param('processId') processId: string) {
    return this.processes.getFlow(processId);
  }

  @Post('instances')
  async start(@Body() body: { processId: string; forceNew?: boolean }) {
    return this.processes.start(body.processId, { forceNew: Boolean(body.forceNew) });
  }

  @Post('instances/:id/steps/:stepIndex/complete')
  async completeStep(@Param('id') id: string, @Param('stepIndex', ParseIntPipe) stepIndex: number) {
    return this.processes.completeStep(id, stepIndex);
  }

  @Post('instances/:id/submit')
  async submit(@Param('id') id: string) {
    return this.processes.submit(id);
  }

  @Post('instances/:id/complete')
  async complete(@Param('id') id: string) {
    return this.processes.complete(id);
  }

  @Patch('instances/:id')
  async update(@Param('id') id: string, @Body() body: { status: ProcessStatus }) {
    return this.processes.updateStatus(id, body.status);
  }
}
