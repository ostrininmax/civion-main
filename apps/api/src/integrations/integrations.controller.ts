import { Controller, Get } from '@nestjs/common';
import { RequireRoles } from '../auth/roles.decorator';

@Controller('integrations')
@RequireRoles('admin')
export class IntegrationsController {
  @Get('overview')
  getOverview() {
    return {
      status: 'demo-ready',
      endpoints: [
        { name: 'Registry lookup', path: '/registry/mock' },
        { name: 'Consent check', path: '/consent/mock' },
        { name: 'Audit log', path: '/audit' }
      ]
    };
  }

  @Get('registry/mock')
  mockRegistry() {
    return {
      registry: 'Companies Registry',
      response: {
        companyId: 'CY-123456',
        status: 'active',
        lastUpdated: new Date().toISOString()
      }
    };
  }

  @Get('consent/mock')
  mockConsent() {
    return {
      consentId: 'consent_demo_01',
      scope: ['passport', 'proof_of_address'],
      status: 'granted'
    };
  }

  @Get('health')
  health() {
    return {
      services: [
        { name: 'Identity Service', status: 'ok' },
        { name: 'Registry Gateway', status: 'ok' },
        { name: 'Audit Ledger', status: 'ok' }
      ]
    };
  }
}
