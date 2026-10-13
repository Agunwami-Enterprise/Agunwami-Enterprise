'use client';

/**
 * The AE Workstation's one modal: rendered at the top of the page (so a card's
 * shadow or overflow never clips it), closes on Escape and on a click outside,
 * keeps keyboard focus inside while open and returns it afterwards, locks the
 * page scroll, and scrolls its own body on small screens.
 *
 * Also the confirmation dialog: wrap the app in <ConfirmProvider> and call
 * `const confirm = useConfirm(); if (await confirm({ ... })) …` instead of the
 * browser's confirm().
 */

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg' | 'xl';
const WIDTH: Record<Size, string> = { sm: 'max-w-[420px]', md: 'max-w-[560px]', lg: 'max-w-[720px]', xl: 'max-w-[960px]' };

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

let openCount = 0;

export interface AeModalProps {
  title: React.ReactNode;
  /** A line under the title. */
  description?: React.ReactNode;
  onClose: () => void;
  children?: React.ReactNode;
  /** Buttons, right-aligned at the bottom. */
  footer?: React.ReactNode;
  size?: Size;
  /** False while saving, so Escape or a click outside can't close it mid-save. */
  dismissible?: boolean;
  /** Extra classes for the body (padding, spacing). */
  bodyClassName?: string;
  /** Hide the close (X) button, e.g. for a confirmation. */
  hideClose?: boolean;
  /** A custom max width (e.g. "max-w-[640px]") instead of `size`. */
  widthClassName?: string;
}

/**
 * Modal behaviour shared by AeModal and AeOverlay: Escape closes (top-most
 * only), Tab stays inside, the page doesn't scroll, focus moves in on open
 * and back to where it was on close.
 */
function useModalBehaviour(root: React.RefObject<HTMLElement | null>, onClose: () => void, dismissible: boolean) {
  const closeRef = useRef(onClose);
  const dismissRef = useRef(dismissible);
  useEffect(() => { closeRef.current = onClose; dismissRef.current = dismissible; });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    openCount += 1;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the first field (or button), not the close X, unless something inside already has focus.
    const first = setTimeout(() => {
      if (!root.current || root.current.contains(document.activeElement)) return;
      const items = [...root.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      (items.find(el => !el.dataset.modalClose && el.getAttribute('aria-label') !== 'Close') ?? items[0] ?? root.current)?.focus();
    }, 0);

    function onKey(e: KeyboardEvent) {
      if (!root.current) return;
      const layers = document.querySelectorAll('[data-ae-modal]');
      if (layers[layers.length - 1] !== root.current) return;
      if (e.key === 'Escape' && dismissRef.current) {
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === 'Tab') {
        const items = [...root.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null);
        if (items.length === 0) return;
        const firstEl = items[0], lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(first);
      document.removeEventListener('keydown', onKey);
      openCount -= 1;
      if (openCount === 0) document.body.style.overflow = overflow;
      // Return focus to where it was, unless the dialog's action moved it on
      // (e.g. back into an editor at the insertion point); never scroll for it.
      const active = document.activeElement;
      if (!active || active === document.body || !active.isConnected) previous?.focus?.({ preventScroll: true });
    };
  }, [root]);

  return { closeRef, dismissRef };
}

/**
 * The same behaviour for a screen's own modal or drawer markup: renders the
 * backdrop (`className`, e.g. "fixed inset-0 z-50 flex items-center
 * justify-center bg-black/50 p-4") at the top of the page and closes on
 * Escape or a click on the backdrop itself.
 */
export function AeOverlay({ onClose, className, children, dismissible = true, label, labelledBy }: {
  onClose: () => void; className: string; children: React.ReactNode; dismissible?: boolean;
  /** The dialog's accessible name, or the id of the element holding it. */
  label?: string; labelledBy?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { closeRef, dismissRef } = useModalBehaviour(root, onClose, dismissible);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div ref={root} data-ae-modal role={label || labelledBy ? 'dialog' : undefined} aria-modal={label || labelledBy ? true : undefined}
      aria-label={label} aria-labelledby={labelledBy} className={className}
      onMouseDown={e => { if (e.target === e.currentTarget && dismissRef.current) closeRef.current(); }}>
      {children}
    </div>,
    document.body,
  );
}

export default function AeModal({
  title, description, onClose, children, footer, size = 'md', dismissible = true, bodyClassName = 'space-y-3', hideClose = false, widthClassName,
}: AeModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const { closeRef, dismissRef } = useModalBehaviour(panel, onClose, dismissible);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="ae-fade-in fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={e => { if (e.target === e.currentTarget && dismissRef.current) closeRef.current(); }}>
      <div ref={panel} data-ae-modal role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descId : undefined} tabIndex={-1}
        className={`ae-pop-in flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl dark:bg-[#1e1e1e] ${widthClassName ?? WIDTH[size]}`}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/8">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[16px] font-semibold leading-6 text-gray-900 dark:text-white">{title}</h2>
            {description && <p id={descId} className="mt-0.5 text-[13px] leading-5 text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          {!hideClose && (
            <button type="button" data-modal-close="true" onClick={() => dismissRef.current && closeRef.current()} aria-label="Close"
              className="-mr-1 shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-white/8 dark:hover:text-gray-200"
              disabled={!dismissible}>
              <X className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>
        {children !== undefined && children !== null && (
          <div className={`flex-1 overflow-y-auto px-5 py-4 ${bodyClassName}`}>{children}</div>
        )}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-white/8">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ── Confirmation ─────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger: a red confirm button and a warning icon, for removing or deleting. */
  tone?: 'default' | 'danger';
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const confirm = useCallback<Confirm>(options => new Promise(resolve => {
    setRequest(current => {
      current?.resolve(false);
      return { ...options, resolve };
    });
  }), []);

  const finish = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <AeModal size="sm" hideClose title={request.title} onClose={() => finish(false)} bodyClassName=""
          footer={(
            <>
              <button type="button" onClick={() => finish(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">
                {request.cancelLabel ?? 'Cancel'}
              </button>
              <button type="button" onClick={() => finish(true)}
                className={`rounded-lg px-4 py-2 text-[13px] font-semibold ${request.tone === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-[#f5bd02] text-[#1a1a1a] hover:opacity-90'}`}>
                {request.confirmLabel ?? 'Confirm'}
              </button>
            </>
          )}>
          {request.message && (
            <div className="flex gap-3">
              {request.tone === 'danger' && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                  <AlertTriangle className="h-[18px] w-[18px]" aria-hidden />
                </span>
              )}
              <div className="text-[14px] leading-6 text-gray-600 dark:text-gray-300">{request.message}</div>
            </div>
          )}
        </AeModal>
      )}
    </ConfirmContext.Provider>
  );
}

/** Asks for confirmation in a modal. Resolves true when confirmed. */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>.');
  return confirm;
}
