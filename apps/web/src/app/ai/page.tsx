import { Section } from '../../components/Section';
import { askAssistant } from '../../lib/api';
import { normalizeLocale, t, ti } from '../../lib/i18n';

function readLocale(searchParams?: { lang?: string | string[] }) {
  const candidate = Array.isArray(searchParams?.lang) ? searchParams?.lang[0] : searchParams?.lang;
  return normalizeLocale(candidate);
}

export default async function AiPage({
  searchParams
}: {
  searchParams?: { lang?: string | string[] };
}) {
  const locale = readLocale(searchParams);
  const question = t(locale, 'ai.default_question');
  const response = await askAssistant(question);

  return (
    <Section title={t(locale, 'ai.title')} action={t(locale, 'ai.action')}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="card" style={{ background: 'var(--surface-2)' }}>
          <p style={{ color: 'var(--ink-700)' }}>{question}</p>
        </div>
        <div className="card">
          <p style={{ color: 'var(--ink-700)', lineHeight: 1.6 }}>
            {response?.answer ?? t(locale, 'ai.unavailable')}
          </p>
          <p className="mono" style={{ marginTop: 12 }}>
            {ti(locale, 'ai.next_required', { value: response?.nextRequiredAction ?? t(locale, 'ai.default_next_action') })}
          </p>
        </div>
      </div>
    </Section>
  );
}
