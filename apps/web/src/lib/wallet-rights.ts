import { t } from './i18n';
import type { LocaleCode } from './models/types';

export type DocumentFilter = 'all' | 'expiring' | 'expired';

export type BaseDocumentLifecycle = 'active' | 'expiring' | 'expired';
export type DocumentLifecycle = BaseDocumentLifecycle | 'in_renewal';

export type DerivedRight = {
  id: string;
  label: string;
  active: boolean;
  sourceCategories: string[];
  reason?: string;
};

const RIGHTS_BY_CATEGORY: Record<string, string[]> = {
  passport: ['identity_verification', 'consular_services'],
  residence_permit: ['right_to_reside', 'eligible_for_services'],
  tax_id: ['tax_filing_access'],
  health_insurance: ['public_healthcare'],
  student_id: ['student_discount'],
  proof_of_address: ['address_proof_accepted'],
  rental_agreement: ['housing_proof'],
  company_document: ['business_registry_access']
};

const ISSUER_KEY_BY_CATEGORY: Record<string, string> = {
  passport: 'issuer.civil_registry_department',
  residence_permit: 'issuer.migration_department',
  tax_id: 'issuer.tax_department',
  health_insurance: 'issuer.general_healthcare_system',
  rental_agreement: 'issuer.land_registry_office',
  proof_of_address: 'issuer.municipality_registry',
  bank_statement: 'issuer.bank_of_cyprus',
  company_document: 'issuer.registrar_of_companies',
  student_id: 'issuer.university_registry'
};

const EXPLICIT_ISSUER_KEY_BY_VALUE: Record<string, string> = {
  'Civil Registry Department': 'issuer.civil_registry_department',
  'Migration Department': 'issuer.migration_department',
  'Tax Department': 'issuer.tax_department',
  'General Healthcare System': 'issuer.general_healthcare_system',
  'Land Registry Office': 'issuer.land_registry_office',
  'Municipality Registry': 'issuer.municipality_registry',
  'Bank of Cyprus': 'issuer.bank_of_cyprus',
  'Registrar of Companies': 'issuer.registrar_of_companies',
  'University Registry': 'issuer.university_registry',
  'University of Cyprus': 'issuer.university_of_cyprus',
  GESY: 'issuer.gesy',
  'Larnaca Municipality': 'issuer.larnaca_municipality'
};

const RENEWAL_CHECKLIST_BY_CATEGORY: Record<string, string[]> = {
  passport: ['biometric_photo', 'current_passport', 'address_confirmation'],
  residence_permit: ['passport_copy', 'proof_of_address', 'insurance_confirmation'],
  tax_id: ['proof_of_identity', 'address_confirmation'],
  health_insurance: ['policy_details', 'address_confirmation'],
  default: ['proof_of_identity', 'address_confirmation', 'recent_supporting_document']
};

export function toDocumentTitle(category: string) {
  return category
    .split('_')
    .map((chunk) => chunk.slice(0, 1).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function toSentenceCase(key: string) {
  const formatted = key
    .split('_')
    .join(' ')
    .trim();
  return formatted.slice(0, 1).toUpperCase() + formatted.slice(1);
}

export function resolveIssuer(category: string, explicitIssuer?: string, locale: LocaleCode = 'en') {
  if (explicitIssuer) {
    const explicitKey = EXPLICIT_ISSUER_KEY_BY_VALUE[explicitIssuer];
    if (explicitKey) {
      return t(locale, explicitKey, explicitIssuer);
    }
    return explicitIssuer;
  }

  const key = ISSUER_KEY_BY_CATEGORY[category];
  if (key) return t(locale, key, 'Cyprus Services Registry');
  return t(locale, 'issuer.cyprus_services_registry', 'Cyprus Services Registry');
}

export function daysToExpiry(expiryDate?: string) {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function lifecycleForExpiry(expiryDate?: string): BaseDocumentLifecycle {
  const days = daysToExpiry(expiryDate);
  if (days === null) return 'active';
  if (days < 0) return 'expired';
  if (days <= 90) return 'expiring';
  return 'active';
}

export function maskDocumentNumber(value?: string) {
  if (!value) return '****0000';
  const compact = value.replace(/\s+/g, '');
  if (compact.length <= 4) return `****${compact}`;
  return `****${compact.slice(-4)}`;
}

export function statusPillForLifecycle(lifecycle: DocumentLifecycle, locale: LocaleCode = 'en') {
  if (lifecycle === 'in_renewal') {
    return { label: t(locale, 'wallet.status_in_renewal'), tone: 'neutral' as const };
  }
  if (lifecycle === 'expired') {
    return { label: t(locale, 'wallet.status_expired'), tone: 'critical' as const };
  }
  if (lifecycle === 'expiring') {
    return { label: t(locale, 'wallet.status_expiring'), tone: 'warning' as const };
  }
  return { label: t(locale, 'wallet.status_active'), tone: 'success' as const };
}

export function deriveRightsForDocument(category: string, lifecycle: BaseDocumentLifecycle, locale: LocaleCode = 'en'): DerivedRight[] {
  const rightIds = RIGHTS_BY_CATEGORY[category] ?? [];
  return rightIds.map((rightId) => ({
    id: rightId,
    label: t(locale, `right.${rightId}`, toSentenceCase(rightId)),
    active: lifecycle !== 'expired',
    sourceCategories: [category],
    reason: lifecycle === 'expired' ? t(locale, 'wallet.document_expired') : undefined
  }));
}

export function deriveAggregateRights(
  documents: Array<{ category: string; lifecycle: BaseDocumentLifecycle }>,
  locale: LocaleCode = 'en'
) {
  const map = new Map<string, DerivedRight>();

  for (const document of documents) {
    for (const right of deriveRightsForDocument(document.category, document.lifecycle, locale)) {
      const existing = map.get(right.id);
      if (!existing) {
        map.set(right.id, right);
        continue;
      }

      const nextActive = existing.active || right.active;
      map.set(right.id, {
        ...existing,
        active: nextActive,
        reason: nextActive ? undefined : t(locale, 'wallet.document_expired'),
        sourceCategories: Array.from(new Set([...existing.sourceCategories, ...right.sourceCategories]))
      });
    }
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function renewalChecklistForCategory(category: string, locale: LocaleCode = 'en') {
  const checklist = RENEWAL_CHECKLIST_BY_CATEGORY[category] ?? RENEWAL_CHECKLIST_BY_CATEGORY.default;
  return checklist.map((item) => t(locale, `renew_checklist.${item}`, toSentenceCase(item)));
}
