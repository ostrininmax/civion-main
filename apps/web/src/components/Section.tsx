export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card section-shell">
      <div className="section-title">
        <h2>{title}</h2>
        {typeof action === 'string' ? <span className="mono">{action}</span> : action ?? null}
      </div>
      {children}
    </section>
  );
}
