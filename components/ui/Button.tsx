'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'default' | 'sm';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'default',
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const sizes = {
    default: 'h-9 px-4 text-sm rounded-md',
    sm: 'h-7 px-3 text-xs rounded-md',
  };

  const variants = {
    primary:
      'text-on-primary rounded-md',
    secondary:
      'bg-surface-container-high text-on-surface rounded-md',
    tertiary:
      'text-primary-fixed-dim bg-transparent',
  };

  const primaryStyle =
    variant === 'primary'
      ? { background: 'linear-gradient(135deg, #000000, #648d78)' }
      : {};

  return (
    <button
      {...props}
      disabled={disabled}
      style={primaryStyle}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </button>
  );
}
