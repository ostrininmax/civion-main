type StatusTone = 'neutral' | 'success' | 'warning' | 'critical';

const toneClass: Record<StatusTone, string> = {
  neutral: 'status-pill status-pill-neutral',
  success: 'status-pill status-pill-success',
  warning: 'status-pill status-pill-warning',
  critical: 'status-pill status-pill-critical'
};

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return <span className={toneClass[tone]}>{label}</span>;
}
