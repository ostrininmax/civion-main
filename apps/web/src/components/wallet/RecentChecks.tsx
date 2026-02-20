'use client';

import { useEffect, useMemo, useState } from 'react';
import { StatusPill } from '../StatusPill';
import {
  BASE_RECENT_CHECKS,
  RECENT_CHECKS_EVENT,
  mergeRecentChecks,
  readRecentChecks,
  type RecentCheck
} from '../../lib/recent-checks';
import { t, ti } from '../../lib/i18n';
import { useTranslation } from '../../lib/i18n/context';
import { useDemoState } from '../../lib/storage/use-demo-state';
import type { LocaleCode } from '../../lib/models/types';

function toTone(result: RecentCheck['result']) {
  return result === 'Valid' ? 'success' : 'critical';
}

function localizedResult(locale: LocaleCode, result: RecentCheck['result']) {
  return result === 'Valid' ? t(locale, 'status.valid') : t(locale, 'status.invalid');
}

function localizedVerifier(locale: LocaleCode, verifier: string) {
  if (verifier === 'Police') return t(locale, 'wallet.verifier_police');
  if (verifier === 'Transport Gate') return t(locale, 'wallet.verifier_transport_gate');
  if (verifier === 'University Portal') return t(locale, 'wallet.verifier_university_portal');
  if (verifier === 'Civic Card Scanner') return t(locale, 'civic.scanner', verifier);
  if (verifier === 'Tax Department') return t(locale, 'issuer.tax_department');
  if (verifier === 'Migration Department') return t(locale, 'issuer.migration_department');
  if (verifier === 'Citizen App') return t(locale, 'wallet.verifier_citizen_app');
  if (verifier === 'Cyprus Services Portal') return t(locale, 'wallet.verifier_cyprus_portal');
  return verifier;
}

function localizedDataShown(locale: LocaleCode, value: string) {
  if (value === 'Status + validity only') return t(locale, 'wallet.checks_data_status_validity');
  if (value === 'Status + validity + issuer') return t(locale, 'wallet.checks_data_status_validity_issuer');
  if (value === 'Student eligibility + expiry date') return t(locale, 'wallet.checks_data_student_eligibility');
  if (value === 'Identity status + tax id validity') return t(locale, 'wallet.checks_data_identity_tax');

  if (value.startsWith('Update request: ')) {
    const reason = value.slice('Update request: '.length).trim();
    return ti(locale, 'wallet.checks_data_update_request', { reason }, value);
  }

  const renewalMatch = value.match(/^Renewal submitted \((.+)\)$/);
  if (renewalMatch?.[1]) {
    return ti(locale, 'wallet.checks_data_renewal_submitted', { reference: renewalMatch[1] }, value);
  }

  return value;
}

export function RecentChecks({ initialChecks = [] }: { initialChecks?: RecentCheck[] }) {
  const state = useDemoState();
  const { formatDateTime } = useTranslation();
  const [dynamicChecks, setDynamicChecks] = useState<RecentCheck[]>([]);

  useEffect(() => {
    const sync = () => setDynamicChecks(readRecentChecks());
    sync();

    window.addEventListener(RECENT_CHECKS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(RECENT_CHECKS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const rows = useMemo(
    () => mergeRecentChecks(dynamicChecks, initialChecks, BASE_RECENT_CHECKS).slice(0, 5),
    [dynamicChecks, initialChecks]
  );

  if (rows.length === 0) {
    return (
      <div className="wallet-empty-card">
        <h3>{t(state.locale, 'wallet.no_recent_checks')}</h3>
        <p>{t(state.locale, 'wallet.no_recent_checks_desc')}</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{t(state.locale, 'wallet.checks_verifier')}</th>
            <th>{t(state.locale, 'wallet.checks_result')}</th>
            <th>{t(state.locale, 'wallet.checks_shown')}</th>
            <th className="mobile-hide">{t(state.locale, 'wallet.checks_timestamp')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>{localizedVerifier(state.locale, item.verifier)}</td>
              <td>
                <StatusPill label={localizedResult(state.locale, item.result)} tone={toTone(item.result)} />
              </td>
              <td>{localizedDataShown(state.locale, item.dataShown)}</td>
              <td className="mobile-hide">{formatDateTime(item.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
