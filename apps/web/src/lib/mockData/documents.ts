import type { CitizenDocument } from '../models/types';

const NOW = new Date('2026-02-19T09:00:00.000Z');

function withOffset(days: number) {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export const MOCK_DOCUMENTS: CitizenDocument[] = [
  {
    id: 'doc-passport',
    category: 'passport',
    title: 'Passport',
    filename: 'passport_roman_kochetov.pdf',
    issuer: 'Civil Registry Department',
    issueDate: withOffset(-1700),
    expiryDate: withOffset(320),
    documentNumber: 'P1237734',
    status: 'active',
    tags: ['identity'],
    lastUpdated: withOffset(-20)
  },
  {
    id: 'doc-residence',
    category: 'residence_permit',
    title: 'Residence Permit',
    filename: 'residence_permit.pdf',
    issuer: 'Migration Department',
    issueDate: withOffset(-350),
    expiryDate: withOffset(10),
    documentNumber: 'TRP902198',
    status: 'active',
    tags: ['migration', 'identity'],
    lastUpdated: withOffset(-2)
  },
  {
    id: 'doc-tax',
    category: 'tax_id',
    title: 'Tax ID',
    filename: 'tax_id_card.pdf',
    issuer: 'Tax Department',
    issueDate: withOffset(-2200),
    expiryDate: undefined,
    documentNumber: 'TAX445123',
    status: 'active',
    tags: ['finance'],
    lastUpdated: withOffset(-45)
  },
  {
    id: 'doc-student',
    category: 'student_id',
    title: 'Student ID',
    filename: 'student_card_2025.pdf',
    issuer: 'University of Cyprus',
    issueDate: withOffset(-170),
    expiryDate: withOffset(160),
    documentNumber: 'STD331009',
    status: 'active',
    tags: ['identity', 'migration'],
    lastUpdated: withOffset(-6)
  },
  {
    id: 'doc-health',
    category: 'health_insurance',
    title: 'Health Insurance',
    filename: 'gesy_insurance.pdf',
    issuer: 'GESY',
    issueDate: withOffset(-500),
    expiryDate: withOffset(45),
    documentNumber: 'GHS59110',
    status: 'active',
    tags: ['health'],
    lastUpdated: withOffset(-10)
  },
  {
    id: 'doc-address',
    category: 'proof_of_address',
    title: 'Proof of Address',
    filename: 'address_confirmation.pdf',
    issuer: 'Larnaca Municipality',
    issueDate: withOffset(-120),
    expiryDate: withOffset(-21),
    documentNumber: 'ADR772900',
    status: 'active',
    tags: ['migration', 'finance'],
    lastUpdated: withOffset(-21)
  },
  {
    id: 'doc-company',
    category: 'company_document',
    title: 'Company Registry Extract',
    filename: 'company_extract.pdf',
    issuer: 'Registrar of Companies',
    issueDate: withOffset(-140),
    expiryDate: withOffset(250),
    documentNumber: 'CO144950',
    status: 'active',
    tags: ['business'],
    lastUpdated: withOffset(-15)
  }
];
