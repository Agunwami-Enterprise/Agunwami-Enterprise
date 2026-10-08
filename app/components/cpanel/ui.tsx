'use client';

/**
 * Building blocks for the website C-panel, styled after the Figma "C-Panel"
 * page: cream canvas, white cards, dark primary actions, gold confirmations.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ImageUp, Loader2, Plus, Trash2, X } from 'lucide-react';
import SiteIcon from '@/app/components/common/SiteIcon';
import { SITE_ICON_NAMES, type SiteIconName } from '@/backend/modules/site-content/site-content.types';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

// ── Requests ────────────────────────────────────────────────────────────────

/** Calls a C-panel API route; throws its { error } message on failure. */
export async function cpanelFetch<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: json === undefined ? rest.headers : { 'Content-Type': 'application/json', ...rest.headers },
    body: json === undefined ? rest.body : JSON.stringify(json),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status}).`);
  return body as T;
}

/** Runs a change, then re-renders the server data. Exposes busy/error state. */
export function useMutation() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(task: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError('');
    try {
      await task();
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

// ── Layout ──────────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-primary text-[28px] leading-tight text-[#1A1A1A]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-[#6B6B6B]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cx('rounded-xl border border-[#ECEAE3] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]', className)}>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-14 text-center text-[14px] text-[#9A9A9A]">{children}</p>;
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{message}</p>;
}

// ── Buttons ─────────────────────────────────────────────────────────────────

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'dark' | 'gold' | 'outline' | 'danger' | 'ghost';
  busy?: boolean;
};

export function Button({ variant = 'dark', busy, className, children, disabled, ...props }: ButtonProps) {
  const styles = {
    dark: 'bg-[#1F1F1F] text-white hover:bg-black',
    gold: 'bg-[#C89B3C] text-white hover:bg-[#B5892F]',
    outline: 'border border-[#E5E2D9] bg-white text-[#3A3A3A] hover:bg-[#F7F5EF]',
    danger: 'bg-[#EF4444] text-white hover:bg-[#DC2626]',
    ghost: 'text-[#6B6B6B] hover:bg-[#F3F1EA] hover:text-[#1A1A1A]',
  }[variant];
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || busy}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        styles,
        className,
      )}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function AddButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <Plus className="h-4 w-4" aria-hidden="true" /> {children}
    </Button>
  );
}

export function IconButton({ label, onClick, children, href }: {
  label: string; onClick?: () => void; children: React.ReactNode; href?: string;
}) {
  const className = 'rounded-md p-1.5 text-[#8A8A8A] transition-colors hover:bg-[#F3F1EA] hover:text-[#1A1A1A]';
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={className}>{children}</a>;
  }
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>{children}</button>;
}

// ── Form fields ─────────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-lg border border-transparent bg-[#F5F3EE] px-3.5 py-2.5 text-[14px] text-[#1A1A1A] placeholder:text-[#A3A3A3] outline-none transition focus:border-[#C89B3C] focus:bg-white';

export function Field({ label, hint, children, className }: {
  label: string; hint?: string; children: (id: string) => React.ReactNode; className?: string;
}) {
  const id = useId();
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
        {label}
        {hint && <span className="ml-1 font-normal normal-case tracking-normal text-[#A3A3A3]">({hint})</span>}
      </label>
      {children(id)}
    </div>
  );
}

export function TextInput({ label, hint, value, onChange, className, ...props }: {
  label: string; hint?: string; value: string; onChange: (value: string) => void; className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <Field label={label} hint={hint} className={className}>
      {id => <input id={id} {...props} value={value} onChange={e => onChange(e.target.value)} className={inputClass} />}
    </Field>
  );
}

export function TextArea({ label, hint, value, onChange, rows = 4, className, ...props }: {
  label: string; hint?: string; value: string; onChange: (value: string) => void; rows?: number; className?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  return (
    <Field label={label} hint={hint} className={className}>
      {id => (
        <textarea id={id} {...props} rows={rows} value={value} onChange={e => onChange(e.target.value)}
          className={cx(inputClass, 'resize-y leading-relaxed')} />
      )}
    </Field>
  );
}

export function Select({ label, value, onChange, options, placeholder, className }: {
  label: string; value: string; onChange: (value: string) => void; options: readonly string[];
  placeholder?: string; className?: string;
}) {
  return (
    <Field label={label} className={className}>
      {id => (
        <select id={id} value={value} onChange={e => onChange(e.target.value)} className={cx(inputClass, 'cursor-pointer')}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      )}
    </Field>
  );
}

/** Uploads an image to /api/cpanel/media and returns its URL. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { url } = await cpanelFetch<{ url: string }>('/api/cpanel/media', { method: 'POST', body: form });
  return url;
}

/** URL field with an Upload button and a preview, for any image setting. */
export function ImageField({ label, value, onChange, className }: {
  label: string; value: string; onChange: (value: string) => void; className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Field label={label} className={className}>
      {id => (
        <div className="space-y-2">
          <div className="flex gap-2">
            {value && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-[42px] w-[42px] shrink-0 rounded-md border border-[#ECEAE3] object-cover" />
            )}
            <input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder="https://… or upload"
              className={inputClass} />
            <Button variant="outline" busy={uploading} onClick={() => fileRef.current?.click()} className="shrink-0">
              {!uploading && <ImageUp className="h-4 w-4" aria-hidden="true" />} Upload
            </Button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
              onChange={e => handleFile(e.target.files?.[0])} />
          </div>
          <ErrorNote message={error} />
        </div>
      )}
    </Field>
  );
}

export function IconPicker({ value, onChange }: { value: SiteIconName; onChange: (value: SiteIconName) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Icon</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Icon">
        {SITE_ICON_NAMES.map(name => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={value === name}
            onClick={() => onChange(name)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors',
              value === name ? 'bg-[#C89B3C] text-white' : 'bg-[#F3F1EA] text-[#5A5A5A] hover:bg-[#E9E5DA]',
            )}
          >
            <SiteIcon name={name} className="text-[13px]" /> {name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Dialogs ─────────────────────────────────────────────────────────────────

export function Modal({ open, title, onClose, children, footer, width = 'max-w-[640px]' }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cx('flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl', width)}>
        <div className="flex items-center justify-between border-b border-[#F0EEE8] px-6 py-4">
          <h2 className="text-[17px] font-semibold text-[#1A1A1A]">{title}</h2>
          <IconButton label="Close" onClick={onClose}><X className="h-[18px] w-[18px]" /></IconButton>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-3 border-t border-[#F0EEE8] px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

export function SaveButton({ busy, onClick, children = 'Save Changes' }: { busy: boolean; onClick: () => void; children?: React.ReactNode }) {
  return (
    <Button variant="gold" busy={busy} onClick={onClick}>
      {!busy && <Check className="h-4 w-4" aria-hidden="true" />} {children}
    </Button>
  );
}

/** "Delete X? This will remove it from …" confirmation, per the Figma. */
export function ConfirmDelete({ open, kind, name, effect, onCancel, onConfirm, busy, error }: {
  open: boolean; kind: string; name: string; effect: string; onCancel: () => void; onConfirm: () => void;
  busy: boolean; error: string;
}) {
  return (
    <Modal open={open} title={`Delete ${kind}`} onClose={onCancel} width="max-w-[480px]"
      footer={(
        <>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" busy={busy} onClick={onConfirm}>
            {!busy && <Trash2 className="h-4 w-4" aria-hidden="true" />} Delete
          </Button>
        </>
      )}>
      <p className="text-[15px] text-[#3A3A3A]">Delete <strong>{name}</strong>?</p>
      <p className="text-[14px] text-[#9A9A9A]">{effect}</p>
      <ErrorNote message={error} />
    </Modal>
  );
}
