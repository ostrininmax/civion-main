import Link from 'next/link';

export type NextStepItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

export function NextStepsCard({ title, subtitle, items }: { title: string; subtitle: string; items: NextStepItem[] }) {
  return (
    <article className="card next-steps-card" data-tour="dashboard-main">
      <div className="wallet-rights-head">
        <div>
          <p className="wallet-stat-label">{subtitle}</p>
          <h3>{title}</h3>
        </div>
      </div>

      <div className="next-steps-list">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="next-step-item">
            <div>
              <p className="next-step-title">{item.title}</p>
              <p className="next-step-description">{item.description}</p>
            </div>
            <span className="section-action-link" aria-label={item.ctaLabel}>
              {item.ctaLabel}
            </span>
          </Link>
        ))}
      </div>
    </article>
  );
}
