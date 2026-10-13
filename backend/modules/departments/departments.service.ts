/**
 * backend/modules/departments/departments.service.ts
 *
 * AE departments and who belongs to them, in the enterprise project (read and
 * written only by the server). The CEO isn't a department: CEO access is the
 * approved-CEO list (ceos.service.ts). CEO Office, for the CEO's own staff, is
 * a built-in department created on first use.
 */

import { createDoc, deleteDoc, getDoc, listDocs, updateDoc } from '../../core/firestore';
import { BASE_PAGE_IDS, isPageId, normalizePages } from '@/lib/workstation/pages';
import { CEO_OFFICE_ID, CEO_OFFICE_NAME, PROJECT_CEO_DEPARTMENT, positionTitle } from './departments.types';
import type { AeDepartment, AeDepartmentMember, AssignMemberDto, SaveDepartmentDto, UpdateMemberDto } from './departments.types';

const DEPARTMENTS = 'aeDepartments';
const MEMBERS = 'aeDepartmentMembers';
const MAX_NAME = 60;
const MAX_DESCRIPTION = 240;

export class DepartmentError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = 'DepartmentError';
  }
}

const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

/** Ids go into document paths, so only plain id characters are accepted. */
export const isSafeId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);

function requireSafeId(id: unknown, what: string): string {
  if (!isSafeId(id)) throw new DepartmentError(`That ${what} isn't valid.`);
  return id;
}

function slugify(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

/** Project links: CEO Office links only to project CEO departments, every other department never does. */
function projectLinksOf(value: unknown, ceoOffice: boolean): Record<string, string> {
  const links: Record<string, string> = {};
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [projectId, departmentId] of Object.entries(value as Record<string, unknown>)) {
      if (!isSafeId(projectId) || !isSafeId(departmentId)) continue;
      if ((departmentId.toLowerCase() === PROJECT_CEO_DEPARTMENT) === ceoOffice) links[projectId] = departmentId;
    }
  }
  return links;
}

const DEFAULT_CEO_OFFICE_PAGES = [...BASE_PAGE_IDS, 'tasks', 'time-tracking', 'documents', 'leave-requests', 'reports'];

function toDepartment(doc: Record<string, unknown>, memberCount = 0): AeDepartment {
  return {
    id: String(doc._id),
    name: String(doc.name || doc._id),
    description: String(doc.description || ''),
    pages: normalizePages(doc.pages),
    active: doc.active !== false,
    projectLinks: projectLinksOf(doc.projectLinks, doc._id === CEO_OFFICE_ID),
    memberCount,
    builtIn: doc._id === CEO_OFFICE_ID,
    createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : null,
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : null,
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A person's own page list: valid, non-base page ids (base pages are always open). */
function personalPages(pages: unknown): string[] {
  return Array.isArray(pages) ? [...new Set(pages.filter(isPageId).filter(id => !BASE_PAGE_IDS.includes(id)))] : [];
}

function toMember(doc: Record<string, unknown>): AeDepartmentMember {
  return {
    uid: String(doc._id),
    departmentId: String(doc.departmentId || ''),
    name: String(doc.name || ''),
    email: String(doc.email || ''),
    title: String(doc.title || ''),
    shiftStart: typeof doc.shiftStart === 'string' && TIME.test(doc.shiftStart) ? doc.shiftStart : '',
    shiftEnd: typeof doc.shiftEnd === 'string' && TIME.test(doc.shiftEnd) ? doc.shiftEnd : '',
    pages: personalPages(doc.pages),
    isDepartmentAdmin: doc.isDepartmentAdmin === true,
    status: doc.status === 'suspended' ? 'suspended' : 'active',
    suspendedReason: String(doc.suspendedReason || ''),
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : null,
  };
}

function validate(dto: SaveDepartmentDto, ceoOffice = false) {
  const name = ceoOffice ? CEO_OFFICE_NAME : text(dto.name, MAX_NAME);
  if (!name) throw new DepartmentError('Give the department a name.');
  return {
    name,
    description: text(dto.description, MAX_DESCRIPTION),
    pages: normalizePages(dto.pages),
    // CEO Office always stays open to its members.
    active: ceoOffice || dto.active !== false,
    projectLinks: projectLinksOf(dto.projectLinks, ceoOffice),
  };
}

let ceoOfficeReady = false;

export class DepartmentsService {
  static async list(): Promise<{ departments: AeDepartment[]; members: AeDepartmentMember[] }> {
    const [listed, memberDocs] = await Promise.all([listDocs(DEPARTMENTS, 300), listDocs(MEMBERS, 300)]);
    const departmentDocs = await DepartmentsService.withCeoOffice(listed);
    const members = memberDocs.map(toMember).filter(m => m.departmentId);
    const counts = new Map<string, number>();
    for (const member of members) counts.set(member.departmentId, (counts.get(member.departmentId) ?? 0) + 1);
    const departments = departmentDocs
      .map(doc => toDepartment(doc, counts.get(String(doc._id)) ?? 0))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { departments, members };
  }

  /** Creates CEO Office the first time departments are listed, if it isn't there. */
  private static async withCeoOffice(docs: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> {
    if (docs.some(doc => doc._id === CEO_OFFICE_ID)) {
      ceoOfficeReady = true;
      return docs;
    }
    if (ceoOfficeReady) return docs;
    const existing = await getDoc(DEPARTMENTS, CEO_OFFICE_ID);
    const doc = existing ?? await createDoc(DEPARTMENTS, {
      name: CEO_OFFICE_NAME,
      description: 'The CEO’s own staff: assistants, PAs and chief of staff. They get a department workstation, not CEO access.',
      pages: normalizePages(DEFAULT_CEO_OFFICE_PAGES),
      active: true,
      projectLinks: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
    }, CEO_OFFICE_ID);
    if (!doc) return docs;
    ceoOfficeReady = true;
    return [...docs, doc];
  }

  /**
   * Links CEO Office to each project's CEO department the first time those
   * departments are known; after that the CEO manages the links.
   */
  static async autoLinkCeoOffice(projectCeoDepartments: Record<string, string>): Promise<void> {
    if (Object.keys(projectCeoDepartments).length === 0) return;
    const doc = await getDoc(DEPARTMENTS, CEO_OFFICE_ID);
    if (!doc || doc.autoLinked === true) return;
    const links = { ...projectLinksOf(doc.projectLinks, true), ...projectLinksOf(projectCeoDepartments, true) };
    await updateDoc(DEPARTMENTS, CEO_OFFICE_ID, { projectLinks: links, autoLinked: true, updatedAt: new Date().toISOString() });
  }

  static async get(id: string): Promise<AeDepartment | null> {
    if (!isSafeId(id)) return null;
    const doc = await getDoc(DEPARTMENTS, id);
    return doc ? toDepartment(doc) : null;
  }

  static async create(dto: SaveDepartmentDto, by: string): Promise<AeDepartment> {
    const data = validate(dto);
    const id = slugify(data.name);
    if (!id || id === PROJECT_CEO_DEPARTMENT || id === CEO_OFFICE_ID) throw new DepartmentError('Choose a different name.');
    if (await getDoc(DEPARTMENTS, id)) throw new DepartmentError(`A department called "${data.name}" already exists.`, 409);
    const now = new Date().toISOString();
    const created = await createDoc(DEPARTMENTS, { ...data, createdAt: now, updatedAt: now, createdBy: by }, id);
    if (!created) throw new DepartmentError('The department could not be saved. Please try again.', 503);
    return toDepartment(created);
  }

  static async update(id: string, dto: SaveDepartmentDto, by: string): Promise<AeDepartment> {
    requireSafeId(id, 'department');
    if (!(await getDoc(DEPARTMENTS, id))) throw new DepartmentError('That department no longer exists.', 404);
    const data = validate(dto, id === CEO_OFFICE_ID);
    const updated = await updateDoc(DEPARTMENTS, id, { ...data, updatedAt: new Date().toISOString(), updatedBy: by });
    if (!updated) throw new DepartmentError('The department could not be saved. Please try again.', 503);
    return toDepartment(updated);
  }

  /** Deletes the department and removes its members from it. */
  static async remove(id: string): Promise<void> {
    requireSafeId(id, 'department');
    if (id === CEO_OFFICE_ID) throw new DepartmentError('CEO Office is built in and can’t be deleted.');
    const { members } = await DepartmentsService.list();
    await Promise.all(members.filter(m => m.departmentId === id).map(m => deleteDoc(MEMBERS, m.uid)));
    if (!(await deleteDoc(DEPARTMENTS, id))) throw new DepartmentError('The department could not be deleted. Please try again.', 503);
  }

  /** Puts a person in a department (moving them out of any other). */
  static async assign(departmentId: string, dto: AssignMemberDto, by: string): Promise<AeDepartmentMember> {
    requireSafeId(departmentId, 'department');
    const uid = requireSafeId(dto.uid, 'person');
    const department = await getDoc(DEPARTMENTS, departmentId);
    if (!department) throw new DepartmentError('That department no longer exists.', 404);
    const saved = await updateDoc(MEMBERS, uid, {
      departmentId,
      name: text(dto.name, 120),
      email: text(dto.email, 200),
      title: positionTitle(String(department.name || departmentId), false),
      pages: [],
      isDepartmentAdmin: false,
      status: 'active',
      suspendedReason: '',
      updatedAt: new Date().toISOString(),
      updatedBy: by,
    });
    if (!saved) throw new DepartmentError('That person could not be added. Please try again.', 503);
    return toMember(saved);
  }

  /**
   * Updates a member: position (admin or staff), shift, personal page access,
   * suspension, or a transfer to another department.
   */
  static async updateMember(uid: string, dto: UpdateMemberDto, by: string): Promise<AeDepartmentMember> {
    requireSafeId(uid, 'person');
    const existing = await getDoc(MEMBERS, uid);
    if (!existing?.departmentId) throw new DepartmentError('That person is not in an AE department.', 404);
    const patch: Record<string, unknown> = {};
    for (const key of ['shiftStart', 'shiftEnd'] as const) {
      if (dto[key] === undefined) continue;
      const value = text(dto[key], 5);
      if (value && !TIME.test(value)) throw new DepartmentError('Enter shift times as HH:mm, e.g. 09:00.');
      patch[key] = value;
    }
    if (dto.pages !== undefined) patch.pages = personalPages(dto.pages);
    const departmentId = String(existing.departmentId);
    const transferring = dto.departmentId !== undefined && dto.departmentId !== departmentId;
    if (dto.isDepartmentAdmin !== undefined && !transferring && (dto.isDepartmentAdmin === true) !== (existing.isDepartmentAdmin === true)) {
      const makeAdmin = dto.isDepartmentAdmin === true;
      const department = await getDoc(DEPARTMENTS, departmentId);
      if (makeAdmin) {
        if (departmentId === CEO_OFFICE_ID) throw new DepartmentError('CEO Office has no admin: in AE Hub that position has the CEO’s powers.');
        const { members } = await DepartmentsService.list();
        const current = members.find(m => m.departmentId === departmentId && m.isDepartmentAdmin && m.uid !== uid);
        if (current) throw new DepartmentError(`${current.name || current.email} is already the admin of ${String(department?.name || departmentId)}. Make them staff first.`, 409);
      }
      patch.isDepartmentAdmin = makeAdmin;
      patch.title = positionTitle(String(department?.name || departmentId), makeAdmin);
    }
    if (dto.status !== undefined) {
      patch.status = dto.status === 'suspended' ? 'suspended' : 'active';
      patch.suspendedReason = dto.status === 'suspended' ? text(dto.suspendedReason, 240) : '';
    }
    if (transferring) {
      const target = requireSafeId(dto.departmentId, 'department');
      const targetDoc = await getDoc(DEPARTMENTS, target);
      if (!targetDoc) throw new DepartmentError('That department no longer exists.', 404);
      patch.departmentId = target;
      // Page access and admin rights belong to the old department: they join as staff.
      patch.pages = [];
      patch.isDepartmentAdmin = false;
      patch.title = positionTitle(String(targetDoc.name || target), false);
      patch.transferredFrom = String(existing.departmentId);
      patch.transferredAt = new Date().toISOString();
    }
    if (Object.keys(patch).length === 0) return toMember(existing);
    const saved = await updateDoc(MEMBERS, uid, { ...patch, updatedAt: new Date().toISOString(), updatedBy: by });
    if (!saved) throw new DepartmentError('The change could not be saved. Please try again.', 503);
    return toMember(saved);
  }

  /** Keeps AE's copy of a member's email in step with their account (e.g. a new project work email). */
  static async updateMemberEmail(uid: string, email: string): Promise<void> {
    requireSafeId(uid, 'person');
    await updateDoc(MEMBERS, uid, { email: text(email, 200).toLowerCase(), updatedAt: new Date().toISOString() });
  }

  static async unassign(uid: string): Promise<void> {
    requireSafeId(uid, 'person');
    if (!(await deleteDoc(MEMBERS, uid))) throw new DepartmentError('That person could not be removed. Please try again.', 503);
  }

  static async getMember(uid: string): Promise<AeDepartmentMember | null> {
    if (!isSafeId(uid)) return null;
    const doc = await getDoc(MEMBERS, uid);
    return doc ? toMember(doc) : null;
  }

  /** The department a person belongs to, if any. */
  static async membershipOf(uid: string): Promise<{ member: AeDepartmentMember; department: AeDepartment } | null> {
    if (!isSafeId(uid)) return null;
    const memberDoc = await getDoc(MEMBERS, uid);
    const member = memberDoc ? toMember(memberDoc) : null;
    if (!member?.departmentId) return null;
    const department = await DepartmentsService.get(member.departmentId);
    return department ? { member, department } : null;
  }
}
