'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   IT SUPPORT — Static mock data, matches approved design.
═══════════════════════════════════════════════════════════════════════════ */

const STATS = [
  { label: 'Open Tickets', value: '1', trend: 'Awaiting response', iconBg: '#fef3c7', iconColor: '#d97706', icon: <ChatIcon /> },
  { label: 'In Progress',  value: '1', trend: 'Being worked on',   iconBg: '#fef3c7', iconColor: '#d97706', icon: <ClockIcon /> },
  { label: 'Resolved',     value: '1', trend: 'This month',        iconBg: '#fef3c7', iconColor: '#d97706', icon: <CheckIcon />  },
];

type Priority = 'High' | 'Medium' | 'Low';
type Status = 'Open' | 'In Progress' | 'Resolved';

const TICKETS: { title: string; detail: string; priority: Priority; status: Status; created: string; updated: string }[] = [
  { title: 'Cannot access time tracking module', detail: 'Getting an error when trying to clock in', priority: 'High',   status: 'Open',        created: '11/14/2025, 8:30:00 AM', updated: '11/14/2025, 9:15:00 AM' },
  { title: 'Password reset required',             detail: 'Need help resetting my account password',  priority: 'Medium', status: 'In Progress', created: '11/13/2025, 2:20:00 PM', updated: '11/14/2025, 10:00:00 AM' },
  { title: 'Feature request: Dark mode',           detail: 'Would love to have a dark mode option',     priority: 'Low',    status: 'Resolved',    created: '11/10/2025, 11:00:00 AM',updated: '11/12/2025, 4:30:00 PM' },
];

const PRIORITY_STYLE: Record<Priority, string> = {
  High: 'bg-[#fee2e2] text-[#dc2626]',
  Medium: 'bg-[#fef3c7] text-[#b45309]',
  Low: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
};
const STATUS_STYLE: Record<Status, string> = {
  Open: 'bg-[#dbeafe] text-[#2563eb]',
  'In Progress': 'bg-[#fef3c7] text-[#b45309]',
  Resolved: 'bg-[#dcfce7] text-[#16a34a]',
};

const QUICK_HELP = [
  { q: "How do I reset my password?", a: 'Go to Settings → Security → Change Password' },
  { q: 'Clock in/out not working?', a: 'Try refreshing the page or clearing your browser cache' },
  { q: "Can't access certain features?", a: 'Contact your manager or admin to verify your permissions' },
];

export default function ItSupportPage() {
  return (
    <div className="space-y-4 p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-gray-800 dark:text-white">IT Support</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">Get help with technical issues</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-[#f5bd02] px-3 py-2 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90">
          <PlusIcon /> New Support Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STATS.map(s => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>{s.icon}</div>
            </div>
            <p className="mt-1.5 text-[22px] font-bold text-gray-800 dark:text-white">{s.value}</p>
            <p className="mt-1 text-[11px] text-gray-400">{s.trend}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
        <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Your Support Tickets</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">Track your support requests</p>
        <div className="mt-3 space-y-2.5">
          {TICKETS.map((t, i) => (
            <div key={i} className="rounded-lg border border-gray-100 p-3 dark:border-white/10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-gray-800 dark:text-white">{t.title}</p>
                  <p className="text-[11px] text-gray-400">{t.detail}</p>
                  <p className="mt-1 text-[10px] text-gray-400">Created: {t.created} · Updated: {t.updated}</p>
                </div>
                <div className="flex flex-shrink-0 items-start gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status]}`}>{t.status}</span>
                </div>
              </div>
              <button className="mt-2 rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">View Details</button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
        <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Quick Help</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">Common issues and solutions</p>
        <div className="mt-3 space-y-3">
          {QUICK_HELP.map(item => (
            <div key={item.q} className="border-l-2 border-[#f5bd02] pl-3">
              <p className="text-[12px] font-medium text-gray-800 dark:text-white">{item.q}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
function ClockIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>;
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" /></svg>;
}
function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
