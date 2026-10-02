/**
 * backend/core/utils.ts
 *
 * Common formatting and math utility functions for backend services.
 */

export function formatRelativeTime(dateInput?: string | number | Date): string {
  if (!dateInput) return 'recently';
  const time =
    dateInput instanceof Date
      ? dateInput.getTime()
      : typeof dateInput === 'number'
      ? dateInput
      : new Date(dateInput).getTime();

  if (isNaN(time)) return 'recently';

  const diffMs = Date.now() - time;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatCurrencyNGN(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `₦${amount.toLocaleString()}`;
}

export function formatCurrencyUSD(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export function getTodayDateKey(): string {
  return new Date().toISOString().split('T')[0];
}
