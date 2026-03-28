'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: 'ghost' | 'filled';
  size?: 'default' | 'sm';
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'default',
  className = '',
  ...props
}: IconButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2';
  const sizes = { default: 'w-9 h-9', sm: 'w-7 h-7' };
  const variants = {
    ghost: 'hover:bg-surface-container-high text-on-surface-variant',
    filled: 'bg-surface-container-high text-on-surface hover:bg-surface-container',
  };

  return (
    <button
      aria-label={label}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
