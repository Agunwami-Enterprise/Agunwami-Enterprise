/**
 * backend/modules/departments/ceos.service.ts
 *
 * Who has CEO access in AE: the approved-CEO list in the enterprise project.
 * Being a CEO in a project (AE Hub's CEO role or CEO office) only puts someone
 * on the waiting list; AE's official CEO approves them, gives CEO access to
 * anyone, and can hand the official role over.
 *
 * Until anyone is approved, everyone a project lists as CEO keeps CEO access
 * (how AE worked before). The first approval, or the first sign-in of an AE
 * Hub account with the CEO role, makes that person the official CEO.
 */

import 'server-only';
import { deleteDoc, getDoc, listDocsOrNull, updateDoc } from '../../core/firestore';
import { DepartmentError, isSafeId } from './departments.service';

const CEOS = 'aeCeos';
const CACHE_MS = 15_000;

export type CeoStatus = 'approved' | 'declined' | 'pending';
/** Why a project lists them as CEO: the CEO role itself, or AE Hub's CEO office. */
export type CeoClaim = 'ceo' | 'ceo-office' | '';
/** What the list means for someone's access. */
export type CeoAccess = 'ceo' | 'pending' | 'none';

export interface AeCeo {
  uid: string;
  name: string;
  email: string;
  status: CeoStatus;
  /** The one approved CEO who manages CEO access. */
  official: boolean;
  claim: CeoClaim;
  /** How the record came about: sign-in, approval, promotion, bootstrap, handover, revoked, stepped-down. */
  source: string;
  requestedAt: string | null;
  decidedAt: string | null;
  decidedBy: string;
}

export interface CeoPerson { uid: string; name?: string; email?: string }

const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const iso = (value: unknown) => (typeof value === 'string' ? value : null);

function toCeo(doc: Record<string, unknown>): AeCeo {
  const status = doc.status === 'approved' || doc.status === 'declined' ? doc.status : 'pending';
  return {
    uid: String(doc._id),
    name: String(doc.name || ''),
    email: String(doc.email || ''),
    status,
    official: status === 'approved' && doc.official === true,
    claim: doc.claim === 'ceo' || doc.claim === 'ceo-office' ? doc.claim : '',
    source: String(doc.source || ''),
    requestedAt: iso(doc.requestedAt),
    decidedAt: iso(doc.decidedAt),
    decidedBy: String(doc.decidedBy || ''),
  };
}

let cache: { records: AeCeo[]; at: number } | null = null;

/** The list, cached briefly; the last good copy if a read fails; null if it has never been read. */
async function load(fresh = false): Promise<AeCeo[] | null> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.records;
  const docs = await listDocsOrNull(CEOS, 300);
  if (!docs) return cache?.records ?? null;
  cache = { records: docs.map(toCeo), at: Date.now() };
  return cache.records;
}

export function invalidateCeos(): void {
  cache = null;
}

function requireUid(uid: unknown): string {
  if (!isSafeId(uid)) throw new DepartmentError('That person isn’t valid.');
  return uid;
}

async function save(uid: string, data: Record<string, unknown>): Promise<void> {
  const saved = await updateDoc(CEOS, uid, data);
  if (!saved) throw new DepartmentError('CEO access could not be saved. Please try again.', 503);
}

const personFields = (person: CeoPerson) => ({
  ...(person.name ? { name: text(person.name, 120) } : {}),
  ...(person.email ? { email: text(person.email, 200).toLowerCase() } : {}),
});

export class CeoApprovals {
  static async list(): Promise<AeCeo[]> {
    const records = await load(true);
    if (!records) throw new DepartmentError('The CEO list could not be loaded. Please try again.', 503);
    return records;
  }

  /**
   * CEO access for a signed-in person. `isCandidate`: a project lists them as
   * CEO (their session role is "ceo").
   */
  static async accessOf(uid: string, isCandidate: boolean): Promise<CeoAccess> {
    const records = await load();
    if (!records) {
      // Can't read the list: keep the old behaviour while developing without
      // the enterprise database; in production nobody gets CEO access unchecked.
      if (!isCandidate) return 'none';
      return process.env.NODE_ENV === 'production' ? 'pending' : 'ceo';
    }
    const record = records.find(r => r.uid === uid);
    if (record?.status === 'approved') return 'ceo';
    if (!isCandidate) return 'none';
    if (!records.some(r => r.status === 'approved')) return 'ceo';
    return record?.status === 'declined' ? 'none' : 'pending';
  }

  /**
   * Called when someone a project lists as CEO signs in: the first AE Hub
   * account with the CEO role becomes the official CEO; anyone else goes on
   * the waiting list.
   */
  static async onSignIn(person: CeoPerson, claim: CeoClaim): Promise<void> {
    if (!claim || !isSafeId(person.uid)) return;
    const records = await load(true);
    if (!records) return;
    const existing = records.find(r => r.uid === person.uid);
    const now = new Date().toISOString();
    if (claim === 'ceo' && !records.some(r => r.status === 'approved')) {
      await save(person.uid, { ...personFields(person), status: 'approved', official: true, claim, source: 'bootstrap', decidedAt: now, decidedBy: 'system', requestedAt: existing?.requestedAt ?? now });
    } else if (!existing) {
      await save(person.uid, { ...personFields(person), status: 'pending', official: false, claim, source: 'sign-in', requestedAt: now });
    } else if (existing.status === 'pending') {
      await save(person.uid, { ...personFields(person), claim });
    } else {
      return;
    }
    invalidateCeos();
  }

  /**
   * Checks the actor may change CEO access: only the official CEO can. While
   * nobody is approved yet, the CEO making the first change becomes the
   * official CEO.
   */
  private static async requireOfficial(actor: CeoPerson): Promise<AeCeo[]> {
    const records = await CeoApprovals.list();
    const approved = records.filter(r => r.status === 'approved');
    if (approved.length === 0) {
      const now = new Date().toISOString();
      await save(requireUid(actor.uid), { ...personFields(actor), status: 'approved', official: true, source: 'bootstrap', decidedAt: now, decidedBy: actor.uid });
      invalidateCeos();
      return CeoApprovals.list();
    }
    if (!approved.some(r => r.uid === actor.uid && r.official)) {
      throw new DepartmentError('Only the official CEO can change CEO access.', 403);
    }
    return records;
  }

  private static guardTarget(records: AeCeo[], uid: string, actor: CeoPerson, what: string) {
    if (uid === actor.uid) throw new DepartmentError(`You can’t ${what} yourself. Hand over the official CEO role first.`);
    if (records.some(r => r.uid === uid && r.official)) throw new DepartmentError(`The official CEO can’t be ${what === 'remove' ? 'removed' : 'changed'} here.`);
  }

  /** Gives CEO access: approving someone on the waiting list, or promoting anyone. */
  static async approve(person: CeoPerson, actor: CeoPerson): Promise<void> {
    const uid = requireUid(person.uid);
    const records = await CeoApprovals.requireOfficial(actor);
    const existing = records.find(r => r.uid === uid);
    if (existing?.status === 'approved') return;
    const now = new Date().toISOString();
    await save(uid, {
      ...personFields(person), status: 'approved', official: false,
      source: existing && existing.status === 'pending' ? 'approval' : 'promotion',
      decidedAt: now, decidedBy: actor.uid, ...(existing ? {} : { requestedAt: now, claim: '' }),
    });
    invalidateCeos();
  }

  /** Leaves someone on the waiting list out (no CEO access), or takes CEO access away. */
  static async decline(person: CeoPerson, actor: CeoPerson): Promise<void> {
    const uid = requireUid(person.uid);
    const records = await CeoApprovals.requireOfficial(actor);
    CeoApprovals.guardTarget(records, uid, actor, 'remove');
    const existing = records.find(r => r.uid === uid);
    await save(uid, {
      ...personFields(person), status: 'declined', official: false,
      source: existing?.status === 'approved' ? 'revoked' : 'declined',
      decidedAt: new Date().toISOString(), decidedBy: actor.uid,
    });
    invalidateCeos();
  }

  /** Forgets a decision, so a project's CEO goes back on the waiting list. */
  static async reconsider(uid: unknown, actor: CeoPerson): Promise<void> {
    const id = requireUid(uid);
    const records = await CeoApprovals.requireOfficial(actor);
    CeoApprovals.guardTarget(records, id, actor, 'change');
    if (records.find(r => r.uid === id)?.status === 'approved') throw new DepartmentError('Remove their CEO access instead.');
    if (!(await deleteDoc(CEOS, id))) throw new DepartmentError('That could not be undone. Please try again.', 503);
    invalidateCeos();
  }

  /**
   * Makes someone the official CEO. The outgoing official CEO stays a CEO, or
   * steps down to their AE department (`stayOn: false`).
   */
  static async handOver(person: CeoPerson, actor: CeoPerson, stayOn: boolean): Promise<void> {
    const uid = requireUid(person.uid);
    if (uid === actor.uid) throw new DepartmentError('You’re already the official CEO.');
    const records = await CeoApprovals.requireOfficial(actor);
    const existing = records.find(r => r.uid === uid);
    const now = new Date().toISOString();
    await save(uid, {
      ...personFields(person), status: 'approved', official: true, source: 'handover',
      decidedAt: now, decidedBy: actor.uid, ...(existing ? {} : { requestedAt: now, claim: '' }),
    });
    await save(actor.uid, stayOn
      ? { official: false, decidedAt: now, decidedBy: actor.uid }
      : { status: 'declined', official: false, source: 'stepped-down', decidedAt: now, decidedBy: actor.uid });
    invalidateCeos();
  }

  static async get(uid: string): Promise<AeCeo | null> {
    if (!isSafeId(uid)) return null;
    const doc = await getDoc(CEOS, uid);
    return doc ? toCeo(doc) : null;
  }
}
