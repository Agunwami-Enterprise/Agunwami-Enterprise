'use client';

// ─── Message preferences ──────────────────────────────────────────────────────
// Per-person chat settings, stored with the person's other settings in the
// workstation (AE Hub) Firebase project at users/{uid}/settings/messages, so
// they follow the person to any device. Edited from the gear on the Messages
// page and from Settings → Messages.

import { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { authDb } from '@/lib/workstation/firebase';

export type MessageTimeFormat = '12h' | '24h';
export type MessageTextSize = 'small' | 'normal' | 'large';

export interface MessagePreferences {
  /** Enter sends (Shift+Enter adds a line); off means Ctrl/Cmd+Enter sends. */
  enterToSend: boolean;
  /** Share read receipts. Off also hides other people's, as in most chat apps. */
  readReceipts: boolean;
  /** Show the last message in the conversation list and in desktop alerts. */
  showPreviews: boolean;
  /** Play a short chime when a message arrives. */
  sound: boolean;
  /** Show a browser notification when a message arrives while the page is in the background. */
  desktopAlerts: boolean;
  timeFormat: MessageTimeFormat;
  textSize: MessageTextSize;
  /** Keep unsent drafts in this browser between visits. */
  saveDrafts: boolean;
  /** Conversations with no sound, alert or unread total. */
  mutedConversations: Record<string, true>;
}

export const DEFAULT_MESSAGE_PREFERENCES: MessagePreferences = {
  enterToSend: true,
  readReceipts: true,
  showPreviews: true,
  sound: true,
  desktopAlerts: false,
  timeFormat: '12h',
  textSize: 'normal',
  saveDrafts: true,
  mutedConversations: {},
};

export type MessagePreferenceKey = Exclude<keyof MessagePreferences, 'mutedConversations'>;

/** Local storage keys the Messages page keeps drafts under. */
export const DRAFT_STORAGE_KEYS = ['aehub_chat_drafts', 'aehub_chat_draft_replies'] as const;

const prefsDoc = (uid: string) => doc(authDb, 'users', uid, 'settings', 'messages');

function parse(data: Record<string, unknown> | undefined): MessagePreferences {
  const d = DEFAULT_MESSAGE_PREFERENCES;
  if (!data) return d;
  const bool = (key: keyof MessagePreferences, fallback: boolean) =>
    typeof data[key] === 'boolean' ? (data[key] as boolean) : fallback;
  const muted: Record<string, true> = {};
  if (data.mutedConversations && typeof data.mutedConversations === 'object') {
    for (const [id, on] of Object.entries(data.mutedConversations as Record<string, unknown>)) {
      if (on === true) muted[id] = true;
    }
  }
  return {
    enterToSend: bool('enterToSend', d.enterToSend),
    readReceipts: bool('readReceipts', d.readReceipts),
    showPreviews: bool('showPreviews', d.showPreviews),
    sound: bool('sound', d.sound),
    desktopAlerts: bool('desktopAlerts', d.desktopAlerts),
    timeFormat: data.timeFormat === '24h' ? '24h' : '12h',
    textSize: data.textSize === 'small' || data.textSize === 'large' ? data.textSize : 'normal',
    saveDrafts: bool('saveDrafts', d.saveDrafts),
    mutedConversations: muted,
  };
}

export function subscribeMessagePreferences(
  uid: string,
  cb: (prefs: MessagePreferences) => void,
): () => void {
  return onSnapshot(
    prefsDoc(uid),
    snap => cb(parse(snap.exists() ? snap.data() : undefined)),
    error => {
      console.warn('[messages] Message preferences snapshot error:', error);
      cb(DEFAULT_MESSAGE_PREFERENCES);
    },
  );
}

export async function saveMessagePreference<K extends MessagePreferenceKey>(
  uid: string,
  key: K,
  value: MessagePreferences[K],
): Promise<void> {
  await setDoc(prefsDoc(uid), { [key]: value, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function setConversationMuted(uid: string, conversationId: string, muted: boolean): Promise<void> {
  await setDoc(
    prefsDoc(uid),
    { mutedConversations: { [conversationId]: muted ? true : deleteField() }, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}

/** Live message preferences for a person (defaults until the first snapshot). */
export function useMessagePreferences(uid: string | null | undefined): MessagePreferences {
  const [prefs, setPrefs] = useState<MessagePreferences>(DEFAULT_MESSAGE_PREFERENCES);
  useEffect(() => (uid ? subscribeMessagePreferences(uid, setPrefs) : undefined), [uid]);
  return prefs;
}

/** Removes drafts saved in this browser by the Messages page. */
export function clearSavedDrafts(): void {
  for (const key of DRAFT_STORAGE_KEYS) {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  }
}

// ── Alerts ────────────────────────────────────────────────────────────────────

let audioContext: AudioContext | null = null;

/** A short two-note chime made with Web Audio (no sound file to load). */
export function playMessageChime(): void {
  try {
    const Ctx = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioContext ??= new Ctx();
    const ctx = audioContext;
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime;
    [880, 1320].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      const t = start + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch { /* audio blocked or unsupported */ }
}

export type AlertPermission = NotificationPermission | 'unsupported';

export function desktopAlertPermission(): AlertPermission {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

export async function requestDesktopAlertPermission(): Promise<AlertPermission> {
  if (desktopAlertPermission() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showDesktopAlert(title: string, body: string, tag: string, onClick?: () => void): void {
  if (desktopAlertPermission() !== 'granted') return;
  try {
    const alert = new Notification(title, { body, tag, icon: '/logo.png' });
    alert.onclick = () => {
      window.focus();
      onClick?.();
      alert.close();
    };
  } catch { /* some mobile browsers only allow notifications from a service worker */ }
}
