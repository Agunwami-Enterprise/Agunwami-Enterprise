'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeMessages, subscribeConvoMessages, sendMessage, type Convo, type ChatMessage } from '@/modules/messages/services';
import { useAuth } from '@/lib/auth-context';
import { SkeletonMessages } from '@/components/Skeleton';

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════ */

type MainTab = 'chat' | 'communities' | 'calendar' | 'activity';

interface Meeting { id: string; title: string; time: string; }

/* ══════════════════════════════════════════════════════════════════════════
   MOCK DATA
══════════════════════════════════════════════════════════════════════════ */


const MEETINGS: Meeting[] = [
  { id:'1', title:'Team Standup',   time:'Today at 10:05AM' },
  { id:'2', title:'Project Review', time:'Today at 10:05AM' },
  { id:'3', title:'Client Meeting', time:'Today at 10:05AM' },
];

const RECIPIENTS = [
  'Sarah Manager [Manager]',
  'Agunwami CEO [CEO]',
  'Mike Tutor [Live Tutor]',
  'Emily Staff [General Staff]',
];

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */

export default function MessagesPage() {
  const { user } = useAuth();
  const [tab,           setTab]           = useState<MainTab>('chat');
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [CONVOS,        setCONVOS]        = useState<Convo[]>([]);
  const [loading,       setLoading]       = useState(true);

  /* modal flags */
  const [showNewMsg,       setShowNewMsg]       = useState(false);
  const [showNewMeeting,   setShowNewMeeting]   = useState(false);
  const [showJoinId,       setShowJoinId]       = useState(false);
  const [showStartNow,     setShowStartNow]     = useState(false);
  const [showMeetCreated,  setShowMeetCreated]  = useState(false);
  const [showNewCommunity, setShowNewCommunity] = useState(false);

  /* new message form */
  const [msgTo,      setMsgTo]      = useState('');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody,    setMsgBody]    = useState('');

  /* new meeting form */
  const [meetTz,      setMeetTz]      = useState('Eastern Time');
  const [meetTitle,   setMeetTitle]   = useState('');
  const [meetPartic,  setMeetPartic]  = useState('');
  const [meetDate,    setMeetDate]    = useState('10/10/2025');
  const [meetStart,   setMeetStart]   = useState('11:30 AM');
  const [meetEnd,     setMeetEnd]     = useState('12:00 PM (30m)');
  const [meetAllDay,  setMeetAllDay]  = useState(false);
  const [meetRepeat,  setMeetRepeat]  = useState('Does not repeat');
  const [meetDesc,    setMeetDesc]    = useState('');
  const [meetLobby,   setMeetLobby]   = useState('People who were invited');
  const [meetPresent, setMeetPresent] = useState('Everyone');

  /* join id form */
  const [joinId,   setJoinId]   = useState('');
  const [joinPass, setJoinPass] = useState('');

  /* community form */
  const [commName, setCommName] = useState('');
  const [commDesc, setCommDesc] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeMessages(user.uid, (data) => { setCONVOS(data as Convo[]); setLoading(false); });
  }, [user?.uid]);

  const isCalendar = tab === 'calendar';

  if (loading) return <SkeletonMessages />;

  return (
    <>
      {/* ── Root: fills <main> height ── */}
      <div className="flex h-full flex-col overflow-hidden">

        {/* ── Page header ── */}
        <div className="flex flex-shrink-0 items-start justify-between p-4 pb-3 md:p-5 md:pb-3">
          <div>
            <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">
              {isCalendar ? 'Calendar' : 'Messages'}
            </h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              {isCalendar
                ? 'Schedule and manage meetings and events'
                : 'Stay connected with your team and colleagues'}
            </p>
          </div>
          {isCalendar && (
            <button
              onClick={() => setShowNewMeeting(true)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#1a1a1a] shadow-sm hover:opacity-90"
              style={{ backgroundColor: '#f5bd02' }}
            >
              <PlusIcon /> New meeting
            </button>
          )}
        </div>

        {/* ── Main tabs ── */}
        <div className="flex-shrink-0 px-4 pb-3 md:px-5">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-[#1a1a1a]">
            {(['chat','communities','calendar','activity'] as MainTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2 text-[12px] font-semibold capitalize transition-colors
                  ${tab === t
                    ? 'bg-[#f5bd02] text-[#1a1a1a] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                {t === 'chat' ? 'Chat' : t === 'communities' ? 'Communities' : t === 'calendar' ? 'Calendar' : 'Activity'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="flex min-h-0 flex-1 px-4 pb-4 md:px-5 md:pb-5">

          {/* ─── CHAT ─── */}
          {tab === 'chat' && (
            <div className="flex w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/6 dark:bg-[#1a1a1a]">

              {/* Left: conversation list */}
              <div className="flex w-[260px] flex-shrink-0 flex-col border-r border-gray-100 dark:border-white/6">
                {/* Search */}
                <div className="flex-shrink-0 border-b border-gray-100 p-3 dark:border-white/6">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/8 dark:bg-[#2a2a2a]">
                    <SearchSmIcon />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      className="min-w-0 flex-1 bg-transparent text-[12px] text-gray-600 placeholder-gray-400 outline-none dark:text-gray-300 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Unread count + New Chat */}
                <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2.5 dark:border-white/6">
                  <span className="text-[12px] font-semibold" style={{ color: '#f5bd02' }}>4 unread</span>
                  <div className="flex-1" />
                  <button
                    onClick={() => setShowNewMsg(true)}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[#1a1a1a] hover:opacity-90"
                    style={{ backgroundColor: '#f5bd02' }}
                  >
                    <PlusIcon size={10} /> New Chat
                  </button>
                </div>

                {/* Conversations */}
                <div className="flex-1 overflow-y-auto">
                  {CONVOS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConvo(c.id)}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors
                        ${selectedConvo === c.id
                          ? 'bg-amber-50 dark:bg-white/4'
                          : 'hover:bg-gray-50 dark:hover:bg-white/3'}`}
                    >
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[12px] font-semibold text-gray-800 dark:text-white">{c.name}</p>
                          <span className="flex-shrink-0 text-[10px] text-gray-400">{c.time}</span>
                        </div>
                        <p className="truncate text-[11px] text-gray-400">{c.preview}</p>
                      </div>
                      {c.unread && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: chat view or empty state */}
              {selectedConvo ? (
                <ChatView
                  convo={CONVOS.find(c => c.id === selectedConvo)!}
                  uid={user?.uid ?? ''}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-300 dark:bg-[#2a2a2a] dark:text-gray-600">
                    <ChatBubbleIcon />
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-gray-600 dark:text-gray-300">Select a conversation</p>
                  <p className="text-[11px] leading-snug text-gray-400 dark:text-gray-500">
                    Choose a conversation from the list sidebar<br />to start messaging
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── COMMUNITIES ─── */}
          {tab === 'communities' && (
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Your Communities</p>
                <button
                  onClick={() => setShowNewCommunity(true)}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
                  style={{ backgroundColor: '#f5bd02' }}
                >
                  <PlusIcon size={11} /> New Community
                </button>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-[#1a1a1a]">
                <div className="text-gray-300 dark:text-gray-600"><ChatBubbleIcon /></div>
                <p className="mt-3 text-[13px] font-semibold text-gray-600 dark:text-gray-300">No communities yet</p>
                <p className="text-[11px] text-gray-400">Create a community to collaborate with your team</p>
              </div>
            </div>
          )}

          {/* ─── CALENDAR ─── */}
          {tab === 'calendar' && (
            <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#1a1a1a]">
              {/* Sub-tabs */}
              <div className="flex flex-shrink-0 border-b border-gray-100 px-2 dark:border-white/6">
                <button
                  onClick={() => setTab('chat')}
                  className="flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <BackIcon /> Back to message
                </button>
                <button className="border-b-2 border-[#f5bd02] px-4 py-3 text-[12px] font-semibold text-[#f5bd02]">
                  Calendar
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* Section header */}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">Upcoming Meetings</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowJoinId(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/4"
                    >
                      <KeyIcon /> Join with an ID
                    </button>
                    <button
                      onClick={() => setShowStartNow(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/4"
                    >
                      <VideoIcon /> Meet now
                    </button>
                  </div>
                </div>

                {/* Meeting list */}
                <div className="flex flex-col gap-2">
                  {MEETINGS.map(m => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5 dark:border-white/6 dark:bg-[#222]"
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-gray-800 dark:text-white">{m.title}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{m.time}</p>
                      </div>
                      <button
                        className="rounded-lg px-6 py-1.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
                        style={{ backgroundColor: '#f5bd02' }}
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── ACTIVITY ─── */}
          {tab === 'activity' && (
            <div className="flex w-full flex-col items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-[#1a1a1a]">
              <p className="text-[13px] font-semibold text-gray-600 dark:text-gray-300">No recent activity</p>
              <p className="mt-1 text-[11px] text-gray-400">Your team activity will appear here</p>
            </div>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════ */}

      {/* New Message */}
      {showNewMsg && (
        <Overlay onClose={() => setShowNewMsg(false)}>
          <div className="w-[420px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <ModalHeader title="New Message" onClose={() => setShowNewMsg(false)} />
            <div className="flex flex-col gap-3">
              <ModalField label="To">
                <select
                  value={msgTo} onChange={e => setMsgTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200"
                >
                  <option value="">Select recipient...</option>
                  {RECIPIENTS.map(r => <option key={r}>{r}</option>)}
                </select>
              </ModalField>
              <ModalField label="Subject">
                <input
                  value={msgSubject} onChange={e => setMsgSubject(e.target.value)}
                  placeholder="Enter subject..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500"
                />
              </ModalField>
              <ModalField label="Message">
                <textarea
                  value={msgBody} onChange={e => setMsgBody(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500"
                />
              </ModalField>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-lg py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
                style={{ backgroundColor: '#f5bd02' }}
              >
                Send Message
              </button>
              <button
                onClick={() => setShowNewMsg(false)}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-400 dark:hover:bg-white/4"
              >
                Cancel
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* New Meeting */}
      {showNewMeeting && (
        <Overlay onClose={() => setShowNewMeeting(false)}>
          <div className="max-h-[90vh] w-[610px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">Upcoming Meetings</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowNewMeeting(false); setShowMeetCreated(true); }}
                  className="rounded-lg px-5 py-2 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
                  style={{ backgroundColor: '#f5bd02' }}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowNewMeeting(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-400"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex gap-5">
              {/* Left col */}
              <div className="flex flex-1 flex-col gap-3">
                <select value={meetTz} onChange={e => setMeetTz(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                  {['Eastern Time','Central Time','Mountain Time','Pacific Time'].map(tz => <option key={tz}>{tz}</option>)}
                </select>

                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/8">
                  <EditPencilIcon />
                  <input value={meetTitle} onChange={e => setMeetTitle(e.target.value)} placeholder="Add Title"
                    className="flex-1 bg-transparent text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:text-gray-200 dark:placeholder-gray-500" />
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/8">
                  <PersonIcon />
                  <input value={meetPartic} onChange={e => setMeetPartic(e.target.value)} placeholder="Enter name or email"
                    className="flex-1 bg-transparent text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:text-gray-200 dark:placeholder-gray-500" />
                </div>

                <div className="flex gap-2">
                  <input value={meetDate} onChange={e => setMeetDate(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200" />
                  <select value={meetStart} onChange={e => setMeetStart(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                    {['11:30 AM','12:00 PM','12:30 PM','1:00 PM'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="flex gap-2">
                  <input value={meetDate} readOnly
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-gray-400 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-500" />
                  <select value={meetEnd} onChange={e => setMeetEnd(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                    {['12:00 PM (30m)','12:30 PM (1h)','1:00 PM (1h 30m)','1:30 PM (2h)'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMeetAllDay(v => !v)}
                    className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${meetAllDay ? 'bg-[#f5bd02]' : 'bg-gray-200 dark:bg-gray-600'}`}
                  >
                    <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${meetAllDay ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-[12px] text-gray-600 dark:text-gray-400">All Day</span>
                </div>

                <select value={meetRepeat} onChange={e => setMeetRepeat(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                  {['Does not repeat','Every weekday (Mon - Fri)','Daily','Weekly'].map(r => <option key={r}>{r}</option>)}
                </select>

                <div className="flex items-start gap-2 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/8">
                  <GridIcon />
                  <textarea value={meetDesc} onChange={e => setMeetDesc(e.target.value)}
                    placeholder="Type details for this new meeting" rows={3}
                    className="flex-1 resize-none bg-transparent text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:text-gray-200 dark:placeholder-gray-500" />
                </div>
              </div>

              {/* Right col */}
              <div className="flex w-[190px] flex-shrink-0 flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] text-gray-500 dark:text-gray-400">Who can bypass the lobby?</label>
                  <select value={meetLobby} onChange={e => setMeetLobby(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                    {['People who were invited','Everyone','Only me'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] text-gray-500 dark:text-gray-400">Who can be present?</label>
                  <select value={meetPresent} onChange={e => setMeetPresent(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                    {['Everyone','Only me'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* Join with an ID */}
      {showJoinId && (
        <Overlay onClose={() => setShowJoinId(false)}>
          <div className="w-[360px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <ModalHeader title="Join with an ID" onClose={() => setShowJoinId(false)} />
            <div className="flex flex-col gap-3">
              <ModalField label="Meeting ID">
                <input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Type a meeting ID"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
              </ModalField>
              <ModalField label="Meeting passcode">
                <input type="password" value={joinPass} onChange={e => setJoinPass(e.target.value)} placeholder="Type a meeting passcode"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
              </ModalField>
            </div>
            <button
              className="mt-4 w-full rounded-lg py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
              style={{ backgroundColor: '#f5bd02' }}
            >
              Join meeting
            </button>
          </div>
        </Overlay>
      )}

      {/* Meeting Created */}
      {showMeetCreated && (
        <Overlay onClose={() => setShowMeetCreated(false)}>
          <div className="w-[380px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <ModalHeader title="Meeting created" onClose={() => setShowMeetCreated(false)} />
            <p className="mb-4 text-[12px] text-gray-500 dark:text-gray-400">Share the meeting invitation with others</p>
            <div className="rounded-xl bg-gray-50 p-4 text-[12px] leading-relaxed text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-300">
              <p className="font-semibold">Invitation preview:</p>
              <p className="mt-2">
                Agunwami invited you to AE Project Sprint Meeting.<br />
                Friday, October 17, 2025<br />
                12:00PM – 1:00PM (WAT)<br />
                Meeting link: AE-project.sprint/Meetup-yes
              </p>
            </div>
            <button
              onClick={() => setShowMeetCreated(false)}
              className="mt-4 w-full rounded-lg py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
              style={{ backgroundColor: '#f5bd02' }}
            >
              Copy
            </button>
          </div>
        </Overlay>
      )}

      {/* Start a meeting now */}
      {showStartNow && (
        <Overlay onClose={() => setShowStartNow(false)}>
          <div className="w-[360px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <ModalHeader title="Start a meeting now" onClose={() => setShowStartNow(false)} />
            <div className="flex flex-col gap-3">
              <ModalField label="Meeting name">
                <input defaultValue="AE Project Sprint Meeting"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200" />
              </ModalField>
              <button className="w-full rounded-lg border border-gray-200 py-2.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/4">
                Get a link to share
              </button>
              <button
                className="w-full rounded-lg py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
                style={{ backgroundColor: '#f5bd02' }}
              >
                Start meeting
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Create New Community */}
      {showNewCommunity && (
        <Overlay onClose={() => setShowNewCommunity(false)}>
          <div className="w-[380px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <ModalHeader title="Create New Community" onClose={() => setShowNewCommunity(false)} />
            <p className="mb-4 text-[12px] text-gray-500 dark:text-gray-400">A space for team collaboration and discussions</p>
            <div className="flex flex-col gap-3">
              <ModalField label="Community Name">
                <input value={commName} onChange={e => setCommName(e.target.value)} placeholder="e.g. Engineering Team"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
              </ModalField>
              <ModalField label="Description">
                <textarea value={commDesc} onChange={e => setCommDesc(e.target.value)} placeholder="What's this community about?" rows={3}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
              </ModalField>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowNewCommunity(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-400">
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
                style={{ backgroundColor: '#f5bd02' }}
              >
                Create Community
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CHAT VIEW
══════════════════════════════════════════════════════════════════════════ */

function ChatView({ convo, uid }: { convo: Convo; uid: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!convo?.id) return;
    return subscribeConvoMessages(convo.id, uid, setMessages);
  }, [convo?.id, uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try { await sendMessage(convo.id, uid, text); } finally { setSending(false); }
  }

  if (!convo) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Conversation header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/6">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: convo.color }}
        >
          {convo.initials}
        </div>
        <p className="flex-1 text-[13px] font-semibold text-gray-800 dark:text-white">{convo.name}</p>
        <div className="h-2 w-2 rounded-full bg-green-400" />
        <span className="text-[10px] text-gray-400">Online</span>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[12px] text-gray-400">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
                m.mine
                  ? 'bg-[#f5bd02] text-[#1a1a1a]'
                  : 'bg-gray-100 text-gray-800 dark:bg-[#2a2a2a] dark:text-gray-200'
              }`}>
                {!m.mine && <p className="mb-0.5 text-[10px] font-semibold text-gray-500">{m.senderName}</p>}
                <p>{m.text}</p>
                <p className={`mt-1 text-[10px] ${m.mine ? 'text-[#1a1a1a]/50' : 'text-gray-400'}`}>{m.time}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 px-4 py-3 dark:border-white/6">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={`Message ${convo.name}...`}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5bd02] text-[#1a1a1a] hover:opacity-90 disabled:opacity-40"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SHARED HELPERS
══════════════════════════════════════════════════════════════════════════ */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">{title}</h2>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        <XIcon />
      </button>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════════════════════ */

function PlusIcon({ size = 12 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>;
}
function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>;
}
function SearchSmIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>;
}
function ChatBubbleIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function BackIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="8,2 4,6 8,10"/></svg>;
}
function KeyIcon() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="6" r="4"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}
function VideoIcon() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="9" height="8" rx="1"/><polyline points="10,7 15,4 15,12 10,9"/></svg>;
}
function EditPencilIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.6"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>;
}
function PersonIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.6"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.5-5 6-5s6 2 6 5"/></svg>;
}
function GridIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.6"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg>;
}
function SendIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="14" y1="2" x2="1" y2="8"/><line x1="14" y1="2" x2="8" y2="15"/><line x1="8" y1="15" x2="1" y2="8"/></svg>;
}
