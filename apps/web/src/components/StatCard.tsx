import type { ReactNode } from 'react';

export function StatCard({ label, value, hint }: { label: string; value: string; hint: ReactNode }) {
  return (
    <div className="card stat-card">
      <div className="badge">{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, marginTop: 12 }}>{value}</div>
      <div className="stat-card-hint">{hint}</div>
    </div>
  );
}
