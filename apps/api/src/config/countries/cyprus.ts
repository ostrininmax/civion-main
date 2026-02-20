import type { CountryConfig } from '../country.types';

export const cyprusConfig: CountryConfig = {
  id: 'cy',
  name: 'Cyprus',
  languages: ['en', 'el', 'ru'],
  agencies: {
    migrations: 'Civil Registry and Migration Department',
    tax: 'Tax Department',
    companies: 'Department of Registrar of Companies'
  },
  processes: [
    {
      id: 'register-ltd',
      name: 'Register LTD',
      category: 'business',
      eligibilitySummary: 'Adults with valid identity and local service address.',
      steps: [
        'Name reservation',
        'Prepare incorporation documents',
        'Submit to Registrar',
        'Obtain certificates'
      ],
      requiredDocuments: ['passport', 'proof_of_address', 'company_articles'],
      estimatedDays: 21
    },
    {
      id: 'temp-residence',
      name: 'Temporary Residence Permit',
      category: 'immigration',
      eligibilitySummary: 'Non-citizen residents with legal entry and accommodation proof.',
      steps: [
        'Collect required documents',
        'Schedule appointment',
        'Submit biometrics',
        'Await decision'
      ],
      requiredDocuments: ['passport', 'health_insurance', 'rental_agreement'],
      estimatedDays: 45
    },
    {
      id: 'tax-id',
      name: 'Tax Identification Number',
      category: 'tax',
      eligibilitySummary: 'Residents or business founders with verified identity.',
      steps: ['Prepare application', 'Submit to Tax Department', 'Receive TIN'],
      requiredDocuments: ['passport', 'proof_of_address'],
      estimatedDays: 7
    }
  ]
};
