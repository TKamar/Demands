import { useState, useRef, useEffect } from 'react';
import { MdKeyboardArrowDown } from 'react-icons/md';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function Select({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-2.5 border border-divider rounded-xl text-sm bg-bg-paper text-start transition-colors cursor-pointer ${
          disabled ? 'opacity-60 cursor-default' : 'hover:border-gray-400'
        } ${open ? 'border-primary' : ''} ${
          selected ? 'text-text-primary' : 'text-text-secondary'
        }`}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <MdKeyboardArrowDown
          size={20}
          className={`shrink-0 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-bg-paper border border-divider rounded-xl shadow-lg overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-sm text-start bg-transparent border-none cursor-pointer transition-colors ${
                option.value === value
                  ? 'bg-gray-100 text-text-primary font-medium'
                  : 'text-text-primary hover:bg-bg-default'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
