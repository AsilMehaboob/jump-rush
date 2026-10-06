import type { ReactNode } from 'react';

interface Props { onClick: () => void; children: ReactNode; autoFocus?: boolean; variant?: 'primary' | 'ghost' }

export function ArcadeButton({ onClick, children, autoFocus, variant = 'primary' }: Props) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick} autoFocus={autoFocus}>
      {children}
    </button>
  );
}
