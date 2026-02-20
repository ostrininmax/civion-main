'use client';

import Link from 'next/link';
import { useTranslation } from '../../lib/i18n/context';

export type GlobalSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  type: 'document' | 'service' | 'request';
  href: string;
};

export function SearchBar({
  query,
  onQueryChange,
  results,
  emptyLabel,
  placeholder,
  label
}: {
  query: string;
  onQueryChange: (value: string) => void;
  results: GlobalSearchResult[];
  emptyLabel: string;
  placeholder: string;
  label: string;
}) {
  const { t: tt } = useTranslation();
  const typeLabel = {
    document: tt('type.document'),
    service: tt('type.service'),
    request: tt('type.request')
  };

  return (
    <div className="dashboard-search-shell">
      <label htmlFor="dashboard-search" className="wallet-query-label">
        {label}
      </label>
      <input
        id="dashboard-search"
        className="wallet-field dashboard-search-input"
        placeholder={placeholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />

      {query.trim() ? (
        <div className="dashboard-search-results" role="listbox" aria-label={tt('common.search_results')}>
          {results.length === 0 ? (
            <p className="dashboard-search-empty">{emptyLabel}</p>
          ) : (
            results.map((item) => (
              <Link key={item.id} href={item.href} className="dashboard-search-item" role="option">
                <span className={`dashboard-search-badge dashboard-search-badge-${item.type}`}>{typeLabel[item.type]}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
