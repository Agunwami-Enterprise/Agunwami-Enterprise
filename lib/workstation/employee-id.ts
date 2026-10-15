/**
 * Staff identifiers shared with AE Hub.
 *
 * - The employee number is a person's running staff number (AE Hub's
 *   `staffNumber`), e.g. 12.
 * - The Employee ID is that number with the AE prefix: "AE-0012". It stays the
 *   same when someone changes department.
 * - The AE Hub ID is AE Hub's own ID, "AEHUB-{department number}-{employee
 *   number}", e.g. "AEHUB-0004-0012". Only people with an AE Hub staff record
 *   have one.
 */

export interface StaffIdSource {
  aehubId?: string | null;
  staffNumber?: number | string | null;
}

/** The person's employee number, from `staffNumber` or the end of their AE Hub ID. */
export function employeeNumber(person: StaffIdSource | null | undefined): number | null {
  const raw = person?.staffNumber;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    const n = Number(String(raw).replace(/\D/g, ''));
    if (Number.isFinite(n) && n > 0) return n;
  }
  const match = person?.aehubId?.trim().match(/^AEHUB-[^-]+-(\d+)$/i);
  return match ? Number(match[1]) : null;
}

/** "AE-0012", or null when the person has no employee number yet. */
export function formatEmployeeId(person: StaffIdSource | null | undefined): string | null {
  const n = employeeNumber(person);
  return n === null ? null : `AE-${String(n).padStart(4, '0')}`;
}

/** The person's AE Hub ID ("AEHUB-0004-0012"), or null if they don't have one. */
export function formatAehubId(person: StaffIdSource | null | undefined): string | null {
  const id = person?.aehubId?.trim();
  return id ? id.toUpperCase() : null;
}
