'use client';

// ─── Threads ──────────────────────────────────────────────────────────────────
// A thread is a focused side conversation inside a group or community, for one
// problem ("Fix the checkout button"): pick the people involved, link the tasks
// it concerns, then resolve or delete it when the problem is solved.
//
// Storage (AE Hub's Realtime Database, the same place as every chat):
// - The thread is a conversation of type "thread" at conversations/{threadId},
//   so its messages, unread counts and member rules work like any chat. AE Hub's
//   own messages page lists only direct, group and community chats, so it
//   ignores threads.
// - Its parent keeps a summary at conversations/{parentId}/threads/{threadId}
//   so everyone in the group can see and join open threads.
// - Starting, resolving and deleting a thread post a short note in the parent
//   chat. The note is plain text there too, so it reads well in AE Hub.

import { push, ref, remove, update } from 'firebase/database';
import { rtdb } from '@/lib/workstation/firebase';

export type ThreadStatus = 'open' | 'resolved';
export type ThreadEvent = 'started' | 'resolved' | 'reopened' | 'deleted';

/** What the parent chat stores about each of its threads. */
export interface ThreadSummary {
  title: string;
  status: ThreadStatus;
  createdById: string;
  createdByName: string;
  createdAt: number;
  memberCount: number;
  taskCount: number;
  resolvedAt?: number | null;
}

/** Fields a thread conversation has on top of an ordinary conversation. */
export interface ThreadFields {
  parentId?: string;
  parentName?: string;
  parentType?: 'group' | 'community';
  status?: ThreadStatus;
  taskIds?: Record<string, true>;
  resolvedAt?: number | null;
  resolvedByName?: string | null;
}

/** A message in the parent chat that points at a thread. */
export interface ThreadRef {
  id: string;
  title: string;
  event: ThreadEvent;
}

export interface ThreadConversation extends ThreadFields {
  id: string;
  name?: string;
  type?: string;
  memberIds: Record<string, boolean>;
  adminIds?: Record<string, boolean>;
  createdById?: string;
  unreadCount?: Record<string, number>;
  threads?: Record<string, ThreadSummary>;
}

export interface ThreadSender {
  uid: string;
  name: string;
  initials: string;
  color: string;
  photoURL?: string | null;
}

export interface LinkedTask {
  id: string;
  title: string;
}

export const MAX_THREAD_TITLE = 80;

const memberCount = (memberIds: Record<string, boolean>) =>
  Object.values(memberIds).filter(Boolean).length;

/**
 * Posts a message as the sender and makes it the conversation's latest message.
 * `countUnread` raises other members' unread counts (and so their alerts).
 */
async function postMessage(
  conversation: Pick<ThreadConversation, 'id' | 'memberIds' | 'unreadCount'>,
  sender: ThreadSender,
  text: string,
  { countUnread, extra }: { countUnread: boolean; extra?: Record<string, unknown> },
): Promise<void> {
  const now = Date.now();
  await push(ref(rtdb, `messages/${conversation.id}`), {
    senderId: sender.uid,
    senderName: sender.name,
    senderInitials: sender.initials,
    senderAvatarColor: sender.color,
    senderPhotoURL: sender.photoURL || null,
    text,
    sentAt: now,
    readBy: { [sender.uid]: true },
    type: 'text',
    ...extra,
  });
  const batch: Record<string, unknown> = {
    [`conversations/${conversation.id}/lastMessage`]: text,
    [`conversations/${conversation.id}/lastMessageSenderId`]: sender.uid,
    [`conversations/${conversation.id}/lastMessageSenderName`]: sender.name,
    [`conversations/${conversation.id}/lastMessageAt`]: now,
  };
  if (countUnread) {
    for (const uid of Object.keys(conversation.memberIds)) {
      if (uid !== sender.uid && conversation.memberIds[uid]) {
        batch[`conversations/${conversation.id}/unreadCount/${uid}`] = (conversation.unreadCount?.[uid] || 0) + 1;
      }
    }
  }
  await update(ref(rtdb), batch);
}

const NOTICE_TEXT: Record<ThreadEvent, (who: string, title: string) => string> = {
  started: (who, title) => `🧵 ${who} started a thread: "${title}"`,
  resolved: (who, title) => `✅ ${who} marked the thread "${title}" as resolved`,
  reopened: (who, title) => `🧵 ${who} reopened the thread "${title}"`,
  deleted: (who, title) => `🗑️ ${who} closed and deleted the thread "${title}"`,
};

/** A note in the parent chat; it doesn't count as unread there. */
async function noticeInParent(
  parent: Pick<ThreadConversation, 'id' | 'memberIds' | 'unreadCount'>,
  sender: ThreadSender,
  thread: { id: string; title: string },
  event: ThreadEvent,
): Promise<void> {
  await postMessage(parent, sender, NOTICE_TEXT[event](sender.name, thread.title), {
    countUnread: false,
    extra: { threadRef: { id: thread.id, title: thread.title, event } satisfies ThreadRef },
  });
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

export async function createThread(input: {
  parent: ThreadConversation;
  title: string;
  memberIds: string[];
  tasks: LinkedTask[];
  sender: ThreadSender;
  /** The message the thread was started from, quoted as its first message. */
  source?: { id: string; senderName: string; text: string } | null;
}): Promise<string> {
  const { parent, sender, source } = input;
  const title = input.title.trim().slice(0, MAX_THREAD_TITLE);
  if (!title) throw new Error('Give the thread a title.');
  if (parent.type !== 'group' && parent.type !== 'community') {
    throw new Error('Threads can only be started in group chats and communities.');
  }

  const threadId = push(ref(rtdb, 'conversations')).key;
  if (!threadId) throw new Error('Could not create the thread. Please try again.');

  const now = Date.now();
  const members: Record<string, boolean> = { [sender.uid]: true };
  const unreadCount: Record<string, number> = { [sender.uid]: 0 };
  for (const uid of input.memberIds) {
    members[uid] = true;
    if (uid !== sender.uid) unreadCount[uid] = 1;
  }
  const taskIds = Object.fromEntries(input.tasks.map(task => [task.id, true as const]));
  const firstText = source
    ? `${sender.name} started this thread from a message by ${source.senderName}.`
    : `${sender.name} started this thread.`;

  const summary: ThreadSummary = {
    title,
    status: 'open',
    createdById: sender.uid,
    createdByName: sender.name,
    createdAt: now,
    memberCount: memberCount(members),
    taskCount: input.tasks.length,
    resolvedAt: null,
  };

  // The thread and the parent's summary are written together.
  await update(ref(rtdb), {
    [`conversations/${threadId}`]: {
      name: title,
      type: 'thread',
      parentId: parent.id,
      parentName: parent.name || 'Group',
      parentType: parent.type,
      status: 'open',
      memberIds: members,
      adminIds: { [sender.uid]: true },
      createdById: sender.uid,
      createdByName: sender.name,
      createdAt: now,
      taskIds,
      lastMessage: firstText,
      lastMessageSenderId: sender.uid,
      lastMessageSenderName: sender.name,
      lastMessageAt: now,
      unreadCount,
    },
    [`conversations/${parent.id}/threads/${threadId}`]: summary,
  });

  const thread = { id: threadId, memberIds: members, unreadCount };
  await postMessage(thread, sender, firstText, {
    countUnread: false,
    extra: source ? { replyTo: { id: source.id, senderName: source.senderName, text: source.text, type: 'text' } } : undefined,
  });
  if (input.tasks.length > 0) {
    await postMessage(thread, sender, `📌 Linked ${input.tasks.length === 1 ? 'task' : 'tasks'}: ${input.tasks.map(t => t.title).join(', ')}`, { countUnread: false });
  }
  await noticeInParent(parent, sender, { id: threadId, title }, 'started');
  return threadId;
}

export async function setThreadStatus(
  thread: ThreadConversation,
  parent: ThreadConversation | null,
  status: ThreadStatus,
  sender: ThreadSender,
): Promise<void> {
  const now = Date.now();
  const batch: Record<string, unknown> = {
    [`conversations/${thread.id}/status`]: status,
    [`conversations/${thread.id}/resolvedAt`]: status === 'resolved' ? now : null,
    [`conversations/${thread.id}/resolvedByName`]: status === 'resolved' ? sender.name : null,
  };
  if (parent && thread.parentId) {
    batch[`conversations/${thread.parentId}/threads/${thread.id}/status`] = status;
    batch[`conversations/${thread.parentId}/threads/${thread.id}/resolvedAt`] = status === 'resolved' ? now : null;
  }
  await update(ref(rtdb), batch);
  const title = thread.name || 'Thread';
  const event: ThreadEvent = status === 'resolved' ? 'resolved' : 'reopened';
  await postMessage(thread, sender, NOTICE_TEXT[event](sender.name, title), { countUnread: true });
  if (parent) await noticeInParent(parent, sender, { id: thread.id, title }, event);
}

/** Deletes the thread and its messages for everyone, leaving a note in the parent. */
export async function deleteThread(
  thread: ThreadConversation,
  parent: ThreadConversation | null,
  sender: ThreadSender,
): Promise<void> {
  // Messages first: the rules only let current members remove them.
  await remove(ref(rtdb, `messages/${thread.id}`));
  const batch: Record<string, unknown> = { [`conversations/${thread.id}`]: null };
  if (parent && thread.parentId) batch[`conversations/${thread.parentId}/threads/${thread.id}`] = null;
  await update(ref(rtdb), batch);
  if (parent) await noticeInParent(parent, sender, { id: thread.id, title: thread.name || 'Thread' }, 'deleted');
}

// ── People ───────────────────────────────────────────────────────────────────

export async function addThreadMembers(
  thread: ThreadConversation,
  uids: string[],
  names: string[],
  sender: ThreadSender,
): Promise<void> {
  const added = uids.filter(uid => !thread.memberIds[uid]);
  if (added.length === 0) return;
  const members = { ...thread.memberIds };
  const batch: Record<string, unknown> = {};
  for (const uid of added) {
    members[uid] = true;
    batch[`conversations/${thread.id}/memberIds/${uid}`] = true;
    batch[`conversations/${thread.id}/unreadCount/${uid}`] = 1;
  }
  if (thread.parentId) batch[`conversations/${thread.parentId}/threads/${thread.id}/memberCount`] = memberCount(members);
  await update(ref(rtdb), batch);
  await postMessage({ ...thread, memberIds: members }, sender, `${sender.name} added ${names.join(', ')} to the thread.`, { countUnread: false });
}

/** Joins an open thread from the parent chat. */
export async function joinThread(
  threadId: string,
  summary: ThreadSummary,
  parentId: string,
  sender: ThreadSender,
): Promise<void> {
  await update(ref(rtdb), {
    [`conversations/${threadId}/memberIds/${sender.uid}`]: true,
    [`conversations/${threadId}/unreadCount/${sender.uid}`]: 0,
    [`conversations/${parentId}/threads/${threadId}/memberCount`]: summary.memberCount + 1,
  });
  await push(ref(rtdb, `messages/${threadId}`), {
    senderId: sender.uid,
    senderName: sender.name,
    senderInitials: sender.initials,
    senderAvatarColor: sender.color,
    senderPhotoURL: sender.photoURL || null,
    text: `${sender.name} joined the thread.`,
    sentAt: Date.now(),
    readBy: { [sender.uid]: true },
    type: 'text',
  });
}

export async function leaveThread(thread: ThreadConversation, sender: ThreadSender): Promise<void> {
  const members = { ...thread.memberIds };
  delete members[sender.uid];
  // Post while still a member, then leave.
  await postMessage(thread, sender, `${sender.name} left the thread.`, { countUnread: false });
  const batch: Record<string, unknown> = {
    [`conversations/${thread.id}/memberIds/${sender.uid}`]: null,
    [`conversations/${thread.id}/unreadCount/${sender.uid}`]: null,
    [`conversations/${thread.id}/adminIds/${sender.uid}`]: null,
  };
  if (thread.parentId) batch[`conversations/${thread.parentId}/threads/${thread.id}/memberCount`] = memberCount(members);
  await update(ref(rtdb), batch);
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function setTaskLinked(
  thread: ThreadConversation,
  task: LinkedTask,
  linked: boolean,
  sender: ThreadSender,
): Promise<void> {
  const taskIds = { ...(thread.taskIds ?? {}) };
  if (linked) taskIds[task.id] = true;
  else delete taskIds[task.id];
  const batch: Record<string, unknown> = {
    [`conversations/${thread.id}/taskIds/${task.id}`]: linked ? true : null,
  };
  if (thread.parentId) batch[`conversations/${thread.parentId}/threads/${thread.id}/taskCount`] = Object.keys(taskIds).length;
  await update(ref(rtdb), batch);
  await postMessage(
    thread,
    sender,
    linked ? `📌 ${sender.name} linked the task "${task.title}"` : `${sender.name} unlinked the task "${task.title}"`,
    { countUnread: false },
  );
}
