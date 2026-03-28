'use client';

import { TextareaHTMLAttributes, useState } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  rows?: number;
}

export function Textarea({ label, error, id, disabled, rows = 3, className = '', ...props }: TextareaProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-[0.4rem]">
      {label && (
        <label htmlFor={id} className="text-xs text-on-surface-variant font-medium">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`px-3 py-2 text-sm rounded-md border transition-colors outline-none resize-none
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
