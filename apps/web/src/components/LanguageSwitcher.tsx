'use client';

import type { LocaleCode } from '../lib/models/types';
import { useTranslation } from '../lib/i18n/context';

const localeOptions: Array<{ value: LocaleCode; label: string; flag: string }> = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'el', label: 'Greek', flag: '🇬🇷' },
  { value: 'ru', label: 'Russian', flag: '🇷🇺' },
  { value: 'uk', label: 'Ukrainian', flag: '🇺🇦' },
  { value: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { value: 'ar', label: 'Arabic', flag: '🇪🇬' }
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useTranslation();

  return (
    <label className={compact ? 'language-switcher language-switcher-compact' : 'language-switcher'} data-tour="language-switcher">
      {compact ? null : <span className="wallet-query-label">Language</span>}
      <select
        aria-label="Language"
        data-tour="language-switcher-select"
        className="wallet-field language-select"
        value={locale}
        onChange={(event) => setLocale(event.target.value as LocaleCode)}
      >
        {localeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.flag} {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
