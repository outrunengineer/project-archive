import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
}

export function Card({ children, header, className = '' }: CardProps) {
  return (
    <div className={`bg-surface-container-lowest rounded-xl p-6 ${className}`}>
      {header && (
        <div className="mb-[0.45rem]">
          <div className="text-base font-semibold text-on-surface font-display">{header}</div>
        </div>
      )}
      {children}
    </div>
  );
}
