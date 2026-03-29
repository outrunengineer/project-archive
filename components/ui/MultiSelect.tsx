'use client';

import { useRef, useState, useEffect } from 'react';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function toggle(optValue: string) {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  }

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  return (
    <div ref={containerRef} className={`flex flex-col gap-[0.4rem] relative ${className}`}>
      {label && (
        <span className="text-xs text-on-surface-variant font-medium">{label}</span>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className={`h-7 px-2 text-xs rounded-md text-left transition-colors outline-none flex items-center justify-between gap-2
          ${open
            ? 'bg-surface-container-lowest border border-surface-tint'
            : 'bg-surface-container-high border border-transparent'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={open ? { boxShadow: '0 20px 40px rgba(25, 28, 29, 0.06)' } : {}}
      >
        <span className={`truncate ${selectedLabels.length === 0 ? 'text-on-surface-variant' : 'text-on-surface'}`}>
          {selectedLabels.length === 0 ? placeholder : selectedLabels.join(', ')}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-on-surface-variant shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface-bright rounded-md overflow-hidden"
          style={{ backdropFilter: 'blur(12px)', boxShadow: '0 20px 40px rgba(25, 28, 29, 0.06)' }}
        >
          {options.map((opt) => {
            const checked = value.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-container-low transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  className="accent-primary w-3.5 h-3.5"
                />
                <span className="text-sm text-on-surface">{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {selectedLabels.map((lbl, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface-container text-on-surface-variant"
            >
              {lbl}
              <button
                type="button"
                onClick={() => toggle(options.find((o) => o.label === lbl)!.value)}
                className="hover:text-on-surface leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
