import { useState, useRef, useEffect, useMemo } from 'react';
import { MdKeyboardArrowDown, MdSearch, MdClose } from 'react-icons/md';
import { useTranslation } from 'react-i18next';

export interface SearchableSelectOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder,
    disabled,
}: SearchableSelectProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
        if (!open) {
            setSearch('');
        }
    }, [open]);

    const filteredOptions = useMemo(() => {
        if (!search) return options;
        const lower = search.toLowerCase();
        return options.filter((o) => o.label.toLowerCase().includes(lower));
    }, [options, search]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-4 py-2.5 border border-divider rounded-xl text-sm bg-bg-paper text-start transition-colors cursor-pointer ${disabled ? 'opacity-60 cursor-default' : 'hover:border-gray-400'
                    } ${open ? 'border-primary' : ''} ${selected ? 'text-text-primary' : 'text-text-secondary'
                    }`}
            >
                <span className="truncate">
                    {selected ? selected.label : placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {selected && !disabled && (
                        <div
                            className="p-0.5 rounded-full hover:bg-gray-200 text-text-secondary cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                        >
                            <MdClose size={16} />
                        </div>
                    )}
                    <MdKeyboardArrowDown
                        size={20}
                        className={`shrink-0 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full max-h-60 bg-bg-paper border border-divider rounded-xl shadow-lg flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-divider bg-gray-50">
                        <div className="relative">
                            <MdSearch
                                size={18}
                                className="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary"
                            />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('common.search', 'Search...')}
                                className="w-full ps-9 pe-3 py-2 text-sm border border-divider rounded-lg bg-white focus:outline-none focus:border-primary text-text-primary"
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-text-secondary text-center">
                                {t('common.noResults', 'No results found')}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={`w-full px-4 py-2 text-sm text-start rounded-lg border-none cursor-pointer transition-colors ${option.value === value
                                        ? 'bg-primary-light text-primary font-medium'
                                        : 'text-text-primary hover:bg-gray-100'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
