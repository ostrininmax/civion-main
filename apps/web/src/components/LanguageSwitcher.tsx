'use client';

import type { LocaleCode } from '../lib/models/types';
import { useTranslation } from '../lib/i18n/context';

const localeOptions: Array<{ value: LocaleCode; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'el', label: 'Greek' },
  { value: 'ru', label: 'Russian' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' }
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useTranslation();

  return (
    <label className={compact ? 'language-switcher language-switcher-compact' : 'language-switcher'}>
      {compact ? null : <span className="wallet-query-label">Language</span>}
      <select
        aria-label="Language"
        className="wallet-field language-select"
        value={locale}
        onChange={(event) => setLocale(event.target.value as LocaleCode)}
      >
        {localeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
