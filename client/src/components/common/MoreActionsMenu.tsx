import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
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
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setMenuPos(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !containerRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open, closeMenu]);

  const visibleActions = actions.filter(Boolean);
  if (visibleActions.length === 0) return null;

  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          if (open) {
            closeMenu();
          } else {
            const el = triggerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setMenuPos({
              top: rect.bottom + 4,
              right: window.innerWidth - rect.right,
            });
            setOpen(true);
          }
        }}
        className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-default bg-transparent border-none cursor-pointer transition-colors"
        title="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MdMoreVert size={iconSize} />
      </button>

      {open && menuPos && ReactDOM.createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 400 }}
          className="bg-bg-paper border border-divider rounded-xl shadow-lg py-1 min-w-[148px]"
        >
          {visibleActions.map((action) => (
            <button
              key={action.label}
              onClick={(e) => {
                e.stopPropagation();
                if (!action.disabled) {
                  action.onClick();
                  closeMenu();
                }
              }}
              disabled={action.disabled}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-start border-none transition-colors
                ${action.disabled
                  ? 'opacity-40 cursor-not-allowed bg-transparent'
                  : 'cursor-pointer hover:bg-bg-default bg-transparent'
                }
                ${action.danger ? 'text-danger' : 'text-text-primary'}`}
            >
              {action.icon && <span className="shrink-0 flex items-center">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
