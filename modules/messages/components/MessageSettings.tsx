'use client';

/**
 * Message settings: the form shown in Settings → Messages and in the panel
 * opened from the gear on the Messages page. Every change saves immediately.
 */

import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { authDb, rtdb } from '@/lib/workstation/firebase';
import {
  clearSavedDrafts, desktopAlertPermission, playMessageChime, requestDesktopAlertPermission,
  saveMessagePreference, setConversationMuted,
  type AlertPermission, type MessagePreferenceKey, type MessagePreferences,
} from '../preferences';

type Status = { tone: 'success' | 'error'; text: string } | null;

const errorText = (err: unknown) => (err instanceof Error && err.message) || 'Something went wrong. Please try again.';

export default function MessageSettings({ uid, prefs, onDraftsCleared }: {
  uid: string;
  prefs: MessagePreferences;
  /** Called after saved drafts are cleared, so an open Messages page can drop its copy too. */
  onDraftsCleared?: () => void;
}) {
  const [status, setStatus] = useState<Status>(null);
  const [permission, setPermission] = useState<AlertPermission>('default');

  // Read after mount: Notification doesn't exist during server rendering.
  useEffect(() => {
    const id = setTimeout(() => setPermission(desktopAlertPermission()), 0);
    return () => clearTimeout(id);
  }, []);

  async function save<K extends MessagePreferenceKey>(key: K, value: MessagePreferences[K]) {
    setStatus(null);
    try {
      await saveMessagePreference(uid, key, value);
    } catch (err) {
      setStatus({ tone: 'error', text: `Could not save: ${errorText(err)}` });
    }
  }

  async function toggleDesktopAlerts(on: boolean) {
    if (!on) return save('desktopAlerts', false);
    const result = await requestDesktopAlertPermission();
    setPermission(result);
    if (result === 'granted') return save('desktopAlerts', true);
    setStatus({
      tone: 'error',
      text: result === 'unsupported'
        ? 'This browser does not support desktop notifications.'
        : 'Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.',
    });
  }

  function clearDrafts() {
    clearSavedDrafts();
    onDraftsCleared?.();
    setStatus({ tone: 'success', text: 'Saved drafts cleared from this browser.' });
  }

  return (
    <div className="flex flex-col gap-4">
      {status && (
        <p
          role={status.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-2.5 text-[12px] ${status.tone === 'error'
            ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
            : 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'}`}
        >
          {status.text}
        </p>
      )}

      <Section title="Sending" desc="How the message box behaves">
        <Row
          label="Press Enter to send"
          desc={prefs.enterToSend ? 'Enter sends · Shift+Enter starts a new line' : 'Enter starts a new line · Ctrl+Enter (⌘+Enter on Mac) sends'}
          last
        >
          <Switch on={prefs.enterToSend} onChange={on => void save('enterToSend', on)} label="Press Enter to send" />
        </Row>
      </Section>

      <Section title="Privacy" desc="What other people see">
        <Row label="Read receipts" desc="Show people when you’ve read their messages. If you turn this off, you won’t see theirs either.">
          <Switch on={prefs.readReceipts} onChange={on => void save('readReceipts', on)} label="Read receipts" />
        </Row>
        <Row label="Message previews" desc="Show the latest message in the conversation list and in desktop alerts" last>
          <Switch on={prefs.showPreviews} onChange={on => void save('showPreviews', on)} label="Message previews" />
        </Row>
      </Section>

      <Section title="Alerts" desc="When a message arrives in a conversation you don’t have open">
        <Row label="Sound" desc="Play a short chime">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={playMessageChime}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Test
            </button>
            <Switch on={prefs.sound} onChange={on => void save('sound', on)} label="Sound" />
          </div>
        </Row>
        <Row
          label="Desktop alerts"
          desc={permission === 'denied'
            ? 'Blocked in this browser. Allow notifications for this site in your browser settings.'
            : permission === 'unsupported'
              ? 'Not supported in this browser'
              : 'Show a notification while the workstation is in another tab or window'}
          last
        >
          <Switch
            on={prefs.desktopAlerts && permission === 'granted'}
            onChange={on => void toggleDesktopAlerts(on)}
            label="Desktop alerts"
          />
        </Row>
        <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
          Muted conversations never play a sound or show an alert. Alerts work while the Messages page is open.
        </p>
      </Section>

      <Section title="Display" desc="How conversations look">
        <Row label="Time format" desc="For message times">
          <Segmented
            value={prefs.timeFormat}
            options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]}
            onChange={value => void save('timeFormat', value)}
            label="Time format"
          />
        </Row>
        <Row label="Text size" desc="Size of message text" last>
          <Segmented
            value={prefs.textSize}
            options={[{ value: 'small', label: 'Small' }, { value: 'normal', label: 'Normal' }, { value: 'large', label: 'Large' }]}
            onChange={value => void save('textSize', value)}
            label="Text size"
          />
        </Row>
      </Section>

      <Section title="Drafts" desc="Messages you’ve started but not sent">
        <Row label="Keep drafts" desc="Remember unsent messages in this browser when you leave the page">
          <Switch on={prefs.saveDrafts} onChange={on => void save('saveDrafts', on)} label="Keep drafts" />
        </Row>
        <Row label="Clear saved drafts" desc="Delete every unsent draft saved in this browser" last>
          <button
            type="button"
            onClick={clearDrafts}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Clear
          </button>
        </Row>
      </Section>

      <MutedConversations uid={uid} muted={prefs.mutedConversations} onError={err => setStatus({ tone: 'error', text: errorText(err) })} />
    </div>
  );
}

// ── Muted conversations ─────────────────────────────────────────────────────

function MutedConversations({ uid, muted, onError }: {
  uid: string;
  muted: Record<string, true>;
  onError: (err: unknown) => void;
}) {
  const ids = Object.keys(muted);
  const idsKey = ids.sort().join(',');
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found: Record<string, string> = {};
      await Promise.all(idsKey.split(',').filter(Boolean).map(async id => {
        try {
          const snap = await get(ref(rtdb, `conversations/${id}`));
          const convo = snap.val() as { name?: string; type?: string; memberIds?: Record<string, boolean> } | null;
          if (!convo) { found[id] = 'Deleted conversation'; return; }
          if (convo.type === 'direct') {
            const peer = Object.keys(convo.memberIds ?? {}).find(memberId => memberId !== uid);
            const profile = peer ? await getDoc(doc(authDb, 'users', peer)) : null;
            found[id] = (profile?.exists() && (profile.data().displayName || profile.data().email)) || convo.name || 'Direct message';
          } else {
            found[id] = convo.name || 'Group chat';
          }
        } catch {
          found[id] = 'Conversation';
        }
      }));
      if (!cancelled) setNames(found);
    })();
    return () => { cancelled = true; };
  }, [idsKey, uid]);

  return (
    <Section title="Muted conversations" desc="No sound or alert, and left out of your unread total. Mute a chat from its header on the Messages page.">
      {ids.length === 0 ? (
        <p className="py-2 text-[12px] text-gray-400 dark:text-gray-500">You haven’t muted any conversations.</p>
      ) : ids.map((id, index) => (
        <Row key={id} label={names[id] ?? 'Loading…'} desc="Muted" last={index === ids.length - 1}>
          <button
            type="button"
            onClick={() => void setConversationMuted(uid, id, false).catch(onError)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Unmute
          </button>
        </Row>
      ))}
    </Section>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────────

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
      <h3 className="text-[13px] font-bold text-gray-800 dark:text-white">{title}</h3>
      <p className="mb-1 text-[11px] text-gray-500 dark:text-gray-400">{desc}</p>
      {children}
    </section>
  );
}

function Row({ label, desc, last = false, children }: { label: string; desc: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3.5 ${last ? '' : 'border-b border-gray-100 dark:border-white/6'}`}>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-gray-800 dark:text-white">{label}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[26px] w-[46px] flex-shrink-0 overflow-hidden rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd02]/50
        ${on ? 'bg-[#f5bd02]' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
        ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-shrink-0 rounded-lg bg-gray-100 p-0.5 dark:bg-white/8">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${value === option.value
            ? 'bg-white text-gray-800 shadow-sm dark:bg-[#2a2a2a] dark:text-white'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
