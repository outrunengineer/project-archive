'use client';

import { InputHTMLAttributes, useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, disabled, className = '', ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-[0.4rem]">
      {label && (
        <label
          htmlFor={id}
          className="text-xs text-on-surface-variant font-medium"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`h-9 px-3 text-sm rounded-md border transition-colors outline-none
          ${focused
            ? 'bg-surface-container-lowest border border-surface-tint'
            : 'bg-surface-container-high border-transparent'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-tertiary-fixed-dim">{error}</span>}
    </div>
  );
}
