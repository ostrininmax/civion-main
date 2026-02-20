import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ConfigService } from './config.service';

@Controller('config')
export class ConfigController {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  @Get('countries')
  listCountries() {
    return this.config.listCountries();
  }

  @Get('countries/:id')
  getCountry(@Param('id') id: string) {
    return this.config.getCountry(id);
  }
}
