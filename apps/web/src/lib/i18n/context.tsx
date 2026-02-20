'use client';

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { LocaleCode } from '../models/types';
import { setLocale as setDemoLocale } from '../storage/demo-store';
import { useDemoSelector } from '../storage/use-demo-state';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  formatDateTimeValue,
  formatDateValue,
  formatNumberValue,
  isSupportedLocale,
  localeDirection,
  normalizeLocale,
  t,
  ti
} from './index';

type TranslationContextValue = {
  locale: LocaleCode;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: LocaleCode) => void;
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

function applyDocumentLocale(locale: LocaleCode) {
  const dir = localeDirection(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
  document.body.dir = dir;
  document.body.dataset.locale = locale;
}

function resolvePreferredLocale(current: LocaleCode): LocaleCode {
  const url = new URL(window.location.href);
  const queryLocale = url.searchParams.get('lang');
  if (isSupportedLocale(queryLocale)) return queryLocale;

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isSupportedLocale(storedLocale)) return storedLocale;

  return current;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const localeValue = useDemoSelector((state) => state.locale);
  const locale = normalizeLocale(localeValue, DEFAULT_LOCALE);
  const dir = localeDirection(locale);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const preferredLocale = resolvePreferredLocale(locale);
      if (preferredLocale !== locale) {
        setDemoLocale(preferredLocale);
        return;
      }
    }

    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    const url = new URL(window.location.href);
    if (url.searchParams.get('lang') !== locale) {
      url.searchParams.set('lang', locale);
      window.history.replaceState(window.history.state, '', url.toString());
    }
    applyDocumentLocale(locale);
  }, [locale]);

  const value = useMemo<TranslationContextValue>(
    () => ({
      locale,
      dir,
      setLocale(nextLocale) {
        setDemoLocale(nextLocale);
      },
      t(key, params, fallback) {
        return params ? ti(locale, key, params, fallback) : t(locale, key, fallback);
      },
      formatDate(value, options) {
        return formatDateValue(locale, value, options);
      },
      formatDateTime(value, options) {
        return formatDateTimeValue(locale, value, options);
      },
      formatNumber(value, options) {
        return formatNumberValue(locale, value, options);
      }
    }),
    [dir, locale]
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used inside LanguageProvider.');
  }
  return context;
}
