import { ReactNode } from 'react';

interface StatusChipProps {
  variant: 'positive' | 'negative' | 'neutral' | 'custom';
  label: string;
  icon?: ReactNode;
}

const ARROW = {
  positive: '↑',
  negative: '↓',
  neutral: '↕',
  custom: null,
};

const STYLES = {
  positive: 'bg-primary-fixed text-on-primary-container',
  negative: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  neutral: 'bg-surface-container-high text-on-surface-variant',
  custom: 'bg-surface-container-high text-on-surface',
};

export function StatusChip({ variant, label, icon }: StatusChipProps) {
  const arrow = ARROW[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STYLES[variant]}`}
    >
      {icon ?? (arrow && <span aria-hidden="true">{arrow}</span>)}
      {label}
    </span>
  );
}
