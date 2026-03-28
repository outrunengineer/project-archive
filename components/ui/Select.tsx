'use client';

import { SelectHTMLAttributes, useState } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

export function Select({
  label,
  error,
  id,
  disabled,
  options,
  placeholder,
  value,
  onChange,
  className = '',
}: SelectProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-[0.4rem]">
      {label && (
        <label htmlFor={id} className="text-xs text-on-surface-variant font-medium">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange?.(e.target.value)}
        style={focused ? { boxShadow: '0 20px 40px rgba(25, 28, 29, 0.06)' } : {}}
        className={`h-9 px-3 text-sm rounded-md border transition-colors outline-none appearance-none cursor-pointer
          ${focused
            ? 'bg-surface-container-lowest border border-surface-tint'
            : 'bg-surface-container-high border-transparent'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-tertiary-fixed-dim">{error}</span>}
    </div>
  );
}
