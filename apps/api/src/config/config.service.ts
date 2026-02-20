import { Injectable } from '@nestjs/common';
import type { CountryConfig } from './country.types';
import { cyprusConfig } from './countries/cyprus';

@Injectable()
export class ConfigService {
  private readonly countries: Record<string, CountryConfig> = {
    cy: cyprusConfig
  };

  getCountry(id: string) {
    return this.countries[id];
  }

  listCountries() {
    return Object.values(this.countries);
  }
}
