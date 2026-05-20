import { useState, useRef, useEffect } from 'react';
import { MdMoreVert } from 'react-icons/md';

export interface MoreAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MoreActionsMenuProps {
  actions: MoreAction[];
  /** Controls trigger button icon size; default 'sm' (14px) */
  size?: 'sm' | 'md';
}

export default function MoreActionsMenu({ actions, size = 'sm' }: MoreActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visibleActions = actions.filter(Boolean);
  if (visibleActions.length === 0) return null;

  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-gray-100 bg-transparent border-none cursor-pointer transition-colors"
        title="More actions"
      >
        <MdMoreVert size={iconSize} />
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-1 z-[400] bg-bg-paper border border-divider rounded-xl shadow-lg py-1 min-w-[148px]">
          {visibleActions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (!action.disabled) {
                  action.onClick();
                  setOpen(false);
                }
              }}
              disabled={action.disabled}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-start border-none transition-colors
                ${action.disabled
                  ? 'opacity-40 cursor-not-allowed bg-transparent'
                  : 'cursor-pointer hover:bg-gray-50 bg-transparent'
                }
                ${action.danger ? 'text-danger' : 'text-text-primary'}`}
            >
              {action.icon && <span className="shrink-0 flex items-center">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
