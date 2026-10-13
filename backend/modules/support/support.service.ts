/**
 * backend/modules/support/support.service.ts
 *
 * Internal IT support tickets (aeSupportTickets, enterprise project). Anyone
 * signed in to AE raises a ticket from Settings → IT Support and follows it
 * there; departments with the IT Support page see every ticket, assign it,
 * change its status and priority, and reply. Comments are kept on the ticket.
 */

import 'server-only';
import { createDoc, getDoc, listDocs, updateDoc } from '../../core/firestore';
import { DepartmentError, isSafeId } from '../departments/departments.service';

const TICKETS = 'aeSupportTickets';

export const TICKET_CATEGORIES = ['Hardware', 'Software', 'Accounts & access', 'Network', 'Website', 'Other'] as const;
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TICKET_STATUSES = ['open', 'in-progress', 'waiting', 'resolved', 'closed'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface TicketComment { id: string; authorUid: string; authorName: string; body: string; at: string; fromSupport: boolean }

export interface SupportTicket {
  id: string;
  /** Short reference, e.g. IT-7K2Q9. */
  reference: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  requesterUid: string;
  requesterName: string;
  requesterEmail: string;
  requesterDepartment: string;
  assigneeUid: string;
  assigneeName: string;
  comments: TicketComment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface Person { uid: string; name: string; email: string; department: string }

const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? value as T : fallback);

function toTicket(doc: Record<string, unknown>): SupportTicket {
  return {
    id: String(doc._id),
    reference: String(doc.reference || ''),
    subject: String(doc.subject || ''),
    description: String(doc.description || ''),
    category: String(doc.category || 'Other'),
    priority: oneOf(TICKET_PRIORITIES, doc.priority, 'medium'),
    status: oneOf(TICKET_STATUSES, doc.status, 'open'),
    requesterUid: String(doc.requesterUid || ''),
    requesterName: String(doc.requesterName || ''),
    requesterEmail: String(doc.requesterEmail || ''),
    requesterDepartment: String(doc.requesterDepartment || ''),
    assigneeUid: String(doc.assigneeUid || ''),
    assigneeName: String(doc.assigneeName || ''),
    comments: Array.isArray(doc.comments) ? (doc.comments as TicketComment[]).filter(c => c && typeof c.body === 'string') : [],
    createdAt: String(doc.createdAt || ''),
    updatedAt: String(doc.updatedAt || ''),
    resolvedAt: typeof doc.resolvedAt === 'string' && doc.resolvedAt ? doc.resolvedAt : null,
  };
}

async function load(id: string): Promise<SupportTicket> {
  if (!isSafeId(id)) throw new DepartmentError('That ticket isn’t valid.');
  const doc = await getDoc(TICKETS, id);
  if (!doc) throw new DepartmentError('That ticket no longer exists.', 404);
  return toTicket(doc);
}

export class SupportService {
  static async list(filter: { requesterUid?: string } = {}): Promise<SupportTicket[]> {
    const docs = await listDocs(TICKETS, 300);
    return docs.map(toTicket)
      .filter(t => !filter.requesterUid || t.requesterUid === filter.requesterUid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static async create(input: { subject: unknown; description: unknown; category: unknown; priority: unknown }, by: Person): Promise<SupportTicket> {
    const subject = text(input.subject, 140);
    const description = text(input.description, 4000);
    if (!subject) throw new DepartmentError('Give the ticket a subject.');
    if (!description) throw new DepartmentError('Describe the problem.');
    const now = new Date().toISOString();
    const created = await createDoc(TICKETS, {
      reference: `IT-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
      subject,
      description,
      category: oneOf(TICKET_CATEGORIES, input.category, 'Other'),
      priority: oneOf(TICKET_PRIORITIES, input.priority, 'medium'),
      status: 'open',
      requesterUid: by.uid,
      requesterName: text(by.name, 120),
      requesterEmail: text(by.email, 200),
      requesterDepartment: text(by.department, 120),
      assigneeUid: '',
      assigneeName: '',
      comments: [],
      createdAt: now,
      updatedAt: now,
      resolvedAt: '',
    });
    if (!created) throw new DepartmentError('The ticket could not be saved. Please try again.', 503);
    return toTicket(created);
  }

  /** Status, priority and assignee: IT support only. */
  static async update(id: string, patch: { status?: unknown; priority?: unknown; assigneeUid?: unknown; assigneeName?: unknown }): Promise<SupportTicket> {
    const ticket = await load(id);
    const data: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (patch.status !== undefined) {
      const status = oneOf(TICKET_STATUSES, patch.status, ticket.status);
      data.status = status;
      data.resolvedAt = status === 'resolved' || status === 'closed' ? (ticket.resolvedAt ?? new Date().toISOString()) : '';
    }
    if (patch.priority !== undefined) data.priority = oneOf(TICKET_PRIORITIES, patch.priority, ticket.priority);
    if (patch.assigneeUid !== undefined) {
      const uid = text(patch.assigneeUid, 128);
      if (uid && !isSafeId(uid)) throw new DepartmentError('That person isn’t valid.');
      data.assigneeUid = uid;
      data.assigneeName = uid ? text(patch.assigneeName, 120) : '';
      if (uid && ticket.status === 'open') data.status = 'in-progress';
    }
    const saved = await updateDoc(TICKETS, id, data);
    if (!saved) throw new DepartmentError('The ticket could not be saved. Please try again.', 503);
    return toTicket(saved);
  }

  /** A reply: from IT support, or from the person who raised the ticket (which reopens a resolved one). */
  static async comment(id: string, body: unknown, by: Person, fromSupport: boolean): Promise<SupportTicket> {
    const ticket = await load(id);
    if (!fromSupport && ticket.requesterUid !== by.uid) throw new DepartmentError('You can only reply to your own tickets.', 403);
    const message = text(body, 4000);
    if (!message) throw new DepartmentError('Write a reply first.');
    const now = new Date().toISOString();
    const comment: TicketComment = { id: `c-${Date.now().toString(36)}`, authorUid: by.uid, authorName: text(by.name, 120) || by.email, body: message, at: now, fromSupport };
    const data: Record<string, unknown> = { comments: [...ticket.comments, comment].slice(-200), updatedAt: now };
    if (fromSupport && ticket.status === 'open') data.status = 'in-progress';
    if (!fromSupport && (ticket.status === 'resolved' || ticket.status === 'waiting')) {
      data.status = ticket.status === 'resolved' ? 'open' : 'in-progress';
      data.resolvedAt = '';
    }
    const saved = await updateDoc(TICKETS, id, data);
    if (!saved) throw new DepartmentError('The reply could not be saved. Please try again.', 503);
    return toTicket(saved);
  }

  static async get(id: string): Promise<SupportTicket> {
    return load(id);
  }
}
