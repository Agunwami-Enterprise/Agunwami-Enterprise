'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeStaff, type Member, type StaffStatus, type ClockStatus } from '@/modules/staff/services';
import { SkeletonStaff } from '@/app/components/ceo/Skeleton';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TYPES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

type StaffRole   = 'CEO' | 'Admin' | 'Manager' | 'Accountant' | 'Live Tutor' | 'Customer Care' | 'General Staff';
type ActiveTab   = 'directory' | 'requests' | 'external';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONSTANTS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const ALL_ROLES: StaffRole[] = ['CEO','Admin','Manager','Accountant','Live Tutor','Customer Care','General Staff'];

const ROLE_STYLE: Record<StaffRole, { bg: string; text: string }> = {
  'CEO':          { bg:'#fef9c3', text:'#854d0e' },
  'Admin':        { bg:'#ffedd5', text:'#c2410c' },
  'Manager':      { bg:'#dbeafe', text:'#1e40af' },
  'Accountant':   { bg:'#dcfce7', text:'#166534' },
  'Live Tutor':   { bg:'#ede9fe', text:'#6d28d9' },
  'Customer Care':{ bg:'#ccfbf1', text:'#0f766e' },
  'General Staff':{ bg:'#f3f4f6', text:'#374151' },
};

const PERMISSIONS: Record<StaffRole, string[]> = {
  'CEO':          ['full access','manage staff','manage permissions','approve tasks','configure rules','account configuration','commission management','manage team'],
  'Admin':        ['manage tasks','manage permissions','view all projects','account configuration','user finance','view finance'],
  'Manager':      ['manage tasks','manage team','approve tasks'],
  'Accountant':   ['view finance','approve payments'],
  'Live Tutor':   ['user tasks','view projects'],
  'Customer Care':['user tasks','search library'],
  'General Staff':['user tasks'],
};


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN PAGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export default function StaffPage() {
  const [tab,       setTab]       = useState<ActiveTab>('directory');
  const [search,    setSearch]    = useState('');
  const [roleF,     setRoleF]     = useState('All Roles');
  const [statF,     setStatF]     = useState('All Status');

  const [addOpen,   setAddOpen]   = useState(false);
  const [editMbr,   setEditMbr]   = useState<Member | null>(null);
  const [permMbr,   setPermMbr]   = useState<Member | null>(null);
  const [removeMbr, setRemoveMbr] = useState<Member | null>(null);
  const [MOCK,      setMOCK]      = useState<Member[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => subscribeStaff((data) => { setMOCK(data as Member[]); setLoading(false); }), []);

  const filtered = MOCK.filter(m => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleF !== 'All Roles' && m.departmentPosition !== roleF) return false;
    if (statF !== 'All Status' && m.status !== statF && m.clockStatus !== statF) return false;
    return true;
  });

  const stats = {
    total: MOCK.length,
    active: MOCK.filter(m => m.status === 'Active').length,
    clockedIn: MOCK.filter(m => m.clockStatus === 'Clocked In').length,
    departments: new Set(MOCK.map(m => m.department)).size,
  };

  if (loading) return <SkeletonStaff />;

  return (
    <>
      <div className="p-4 md:p-5">

        {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Staff Management</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Manage team members and their access levels</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 self-start rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:opacity-90"
            style={{ backgroundColor: '#f5bd02' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/>
            </svg>
            Add Staff Member
          </button>
        </div>

        {/* â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-5 flex border-b border-gray-200 dark:border-white/6">
          {([
            ['directory', 'Staff Directory',  false],
            ['requests',  'Staff Requests',   true ],
            ['external',  'External Staff',   false],
          ] as const).map(([key, label, badge]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors
                ${tab === key ? 'text-gray-800 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              {label}
              {badge && (
                <span className="rounded-full bg-orange-400 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">2</span>
              )}
              {tab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-[#f5bd02]" />
              )}
            </button>
          ))}
        </div>

        {tab === 'directory' && (
          <>
            {/* â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard bg="#f5f3ff" icon={<PeopleIcon c="#7c3aed" />} label="Total Staff"  value={stats.total} />
              <StatCard bg="#f0fdf4" icon={<CheckIcon  c="#16a34a" />} label="Active"        value={stats.active} />
              <StatCard bg="#fefce8" icon={<ClockIcon  c="#a16207" />} label="Clocked In"    value={stats.clockedIn} />
              <StatCard bg="#f5f3ff" icon={<GridIcon   c="#7c3aed" />} label="Departments"   value={stats.departments} />
            </div>

            {/* â”€â”€ Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-white/8 dark:bg-[#1e1e1e]">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.8">
                  <circle cx="7" cy="7" r="5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>
                </svg>
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search staff members..."
                  className="flex-1 bg-transparent text-[12px] text-gray-700 placeholder-gray-400 outline-none"
                />
              </div>
              <DropSelect value={roleF} onChange={setRoleF} options={['All Roles', ...ALL_ROLES]} />
              <DropSelect value={statF} onChange={setStatF} options={['All Status','Active','Inactive','Clocked In','Clocked Out']} />
            </div>

            {/* â”€â”€ Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(m => (
                <MemberCard
                  key={m.id} member={m}
                  onEdit={() => setEditMbr(m)}
                  onRemove={() => setRemoveMbr(m)}
                  onPermissions={() => setPermMbr(m)}
                />
              ))}
              {filtered.length === 0 && (
                <p className="col-span-3 py-16 text-center text-[13px] text-gray-400">No staff members found.</p>
              )}
            </div>
          </>
        )}

        {tab !== 'directory' && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <PeopleIcon c="#9ca3af" />
            </div>
            <p className="text-[14px] font-medium text-gray-500">
              {tab === 'requests' ? 'No pending requests' : 'No external staff'}
            </p>
            <p className="text-[12px] text-gray-400">Nothing to display here yet.</p>
          </div>
        )}
      </div>

      {/* â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {addOpen   && <AddModal    onClose={() => setAddOpen(false)} />}
      {editMbr   && <EditModal   member={editMbr}   onClose={() => setEditMbr(null)} />}
      {permMbr   && <PermModal   member={permMbr}   onClose={() => setPermMbr(null)} />}
      {removeMbr && <RemoveModal member={removeMbr} onClose={() => setRemoveMbr(null)} />}
    </>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STAT CARD
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function StatCard({ bg, icon, label, value }: { bg: string; icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: bg }}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-gray-500">{label}</p>
        <p className="text-[22px] font-bold leading-tight text-gray-800">{value}</p>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DROPDOWN SELECT  (filter row)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function DropSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex min-w-[130px] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 hover:bg-gray-50 dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-300 dark:hover:bg-white/4"
      >
        <span>{value}</span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round">
          <polyline points="2,4 6,8 10,4"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full min-w-[150px] overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200">
          {options.map(o => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              className={`block w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 ${value === o ? 'font-semibold text-gray-800' : 'text-gray-600'}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MEMBER CARD
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function MemberCard({ member: m, onEdit, onRemove, onPermissions }: {
  member: Member; onEdit: () => void; onRemove: () => void; onPermissions: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const rs = ROLE_STYLE[m.departmentPosition as StaffRole] ?? { bg: '#f3f4f6', text: '#374151' };
  const clk = m.status !== 'Active'
    ? { label: m.status,     bg: '#f3f4f6', text: '#6b7280' }
    : m.clockStatus === 'Clocked In'
    ? { label: 'Clocked In', bg: '#dcfce7', text: '#16a34a' }
    : { label: 'Clocked Out',bg: '#fee2e2', text: '#dc2626' };

  return (
    <div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      {/* Row 1: avatar + name + dots */}
      <div className="mb-1 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: m.color }}
          >
            {m.initials}
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight text-gray-800 dark:text-white">{m.name}</p>
            <p className="text-[11px] text-gray-400">{m.departmentPosition}</p>
          </div>
        </div>
        {/* Kebab menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <svg width="14" height="14" viewBox="0 0 4 16" fill="currentColor">
              <circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[170px] overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200">
              <button
                onClick={() => { setMenuOpen(false); onPermissions(); }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] text-gray-700 hover:bg-gray-50"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <rect x="2" y="7.5" width="12" height="7" rx="1.5"/><path d="M5 7.5V5a3 3 0 0 1 6 0v2.5"/>
                </svg>
                Manage Permissions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: role badge + status badge */}
      <div className="mb-2.5 flex items-center justify-between">
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: rs.bg, color: rs.text }}
        >
          {m.departmentPosition}
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: clk.bg, color: clk.text }}
        >
          {clk.label}
        </span>
      </div>

      {/* Row 3: email */}
      <div className="mb-1 flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.5">
          <rect x="1" y="3" width="14" height="10" rx="1.5"/><polyline points="1,4 8,9 15,4"/>
        </svg>
        <span className="truncate text-[11px] text-gray-500">{m.email}</span>
      </div>

      {/* Row 4: last seen */}
      <p className="mb-3 text-[11px] text-gray-400">Last seen: {m.lastSeen}</p>

      {/* Divider */}
      <div className="mb-3 border-t border-gray-100" />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 text-[12px] font-medium text-gray-600 transition hover:bg-gray-50"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/>
          </svg>
          Edit
        </button>
        <button
          onClick={onRemove}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50 py-1.5 text-[12px] font-medium text-red-500 transition hover:bg-red-100"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <polyline points="2,4 14,4"/><path d="M5.5 4V2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5V4"/>
            <path d="M3.5 4l.9 9.5a1 1 0 0 0 1 .9h5.2a1 1 0 0 0 1-.9l.9-9.5"/>
            <line x1="6.5" y1="7" x2="6.5" y2="11.5"/><line x1="9.5" y1="7" x2="9.5" y2="11.5"/>
          </svg>
          Remove
        </button>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ADD MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function AddModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ fullName:'', email:'', role:'', department:'', projectId:'', officialEmail:'', idNo:'' });
  const [genPwd, setGenPwd] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const generatePwd = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    setGenPwd(Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
  };

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-[460px] rounded-2xl bg-white shadow-2xl dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-[15px] font-bold text-gray-800">Add New Staff Member</h2>
          <CloseBtn onClose={onClose} />
        </div>
        <div className="space-y-3 px-6 py-4">
          <FInput label=""           placeholder="Full Name"                    value={form.fullName}      onChange={set('fullName')} />
          <FInput label=""           placeholder="Email Address"                value={form.email}         onChange={set('email')} />
          <FSelect label=""          placeholder="Select Role"                  value={form.role}          onChange={set('role')}      options={ALL_ROLES} />
          <FInput label=""           placeholder="Department"                   value={form.department}    onChange={set('department')} />
          <FInput label="Project ID *" placeholder="e.g., EXT-AE-01, EXT-MCS-05" value={form.projectId}    onChange={set('projectId')} />
          <FInput label=""           placeholder="Official Email"               value={form.officialEmail} onChange={set('officialEmail')} />
          <FInput label=""           placeholder="ID/No (optional)"             value={form.idNo}          onChange={set('idNo')} />
          {genPwd && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-[12px] tracking-wider text-gray-700">
              {genPwd}
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={generatePwd} className="text-[12px] font-medium text-[#f5bd02] hover:underline">
              Generate Password
            </button>
          </div>
        </div>
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button className="flex-1 rounded-lg py-2.5 text-[13px] font-semibold text-white hover:opacity-90" style={{ backgroundColor:'#f5bd02' }}>Add Staff</button>
        </div>
      </div>
    </Overlay>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   EDIT MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function EditModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const [form, setForm] = useState({
    fullName: member.name, email: member.email,
    role: member.role as string, department: member.department, status: member.status as string,
  });
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-[460px] rounded-2xl bg-white shadow-2xl dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-gray-800">Edit Staff Member</h2>
            <p className="text-[11px] text-gray-500">Update staff account details</p>
          </div>
          <CloseBtn onClose={onClose} />
        </div>
        <div className="space-y-3 px-6 py-4">
          <FInput  label="Full name"     value={form.fullName}   onChange={set('fullName')} />
          <FInput  label="Email Address" value={form.email}      onChange={set('email')} />
          <FSelect label="Role"          value={form.role}       onChange={set('role')}   options={ALL_ROLES} />
          <FInput  label="Department"    value={form.department} onChange={set('department')} />
          <FSelect label="Status"        value={form.status}     onChange={set('status')} options={['Active','Inactive','On Leave']} />
        </div>
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onClose} className="flex-1 rounded-lg py-2.5 text-[13px] font-semibold text-white hover:opacity-90" style={{ backgroundColor:'#f5bd02' }}>Save Changes</button>
        </div>
      </div>
    </Overlay>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PERMISSIONS MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function PermModal({ member: m, onClose }: { member: Member; onClose: () => void }) {
  const perms = PERMISSIONS[m.departmentPosition as StaffRole] ?? [];
  const rs    = ROLE_STYLE[m.departmentPosition as StaffRole] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-[340px] rounded-2xl bg-white shadow-2xl dark:bg-[#1e1e1e]">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-white/6">
          <div>
            <h2 className="text-[14px] font-bold text-gray-800">Manage Permissions</h2>
            <p className="text-[11px] text-gray-500">Configure role-based permissions for {m.name}</p>
          </div>
          <CloseBtn onClose={onClose} />
        </div>
        <div className="px-5 py-4">
          {/* Member row */}
          <div className="mb-4 flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: m.color }}
            >{m.initials}</div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[13px] font-semibold text-gray-800">{m.name}</p>
                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: rs.bg, color: rs.text }}>{m.role}</span>
              </div>
              <p className="text-[11px] text-gray-500">{m.email}</p>
            </div>
          </div>

          {/* Permissions list */}
          <p className="mb-2.5 text-[11px] font-semibold text-gray-600">Current Permissions</p>
          <div className="mb-4 grid grid-cols-2 gap-y-2 gap-x-3">
            {perms.map(p => (
              <label key={p} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-[#f5bd02] bg-[#fef9c3]">
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#a16207" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5,5 4,7.5 8.5,2"/>
                  </svg>
                </span>
                {p}
              </label>
            ))}
          </div>

          <p className="mb-4 text-[10px] italic leading-relaxed text-gray-400">
            Permissions are automatically assigned based on role. To change permissions, update the staff member&apos;s role.
          </p>

          <button onClick={onClose} className="w-full rounded-lg border border-gray-200 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REMOVE MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function RemoveModal({ member, onClose }: { member: Member; onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-[320px] rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-[#1e1e1e]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,6 21,6"/>
            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>
            <path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/>
            <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </div>
        <h2 className="mb-2 text-[16px] font-bold text-gray-800">Remove Staff Member</h2>
        <p className="mb-5 text-[12px] leading-relaxed text-gray-500">
          Are you sure you want to remove <strong className="font-semibold text-gray-700">{member.name}</strong> from the system?{' '}
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg bg-red-500 py-2.5 text-[13px] font-semibold text-white hover:bg-red-600">
            Remove Staff
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SHARED HELPERS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
      </svg>
    </button>
  );
}

function FInput({ label, placeholder, value, onChange }: { label?: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      {label && <label className="mb-1 block text-[11px] font-medium text-gray-500">{label}</label>}
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[12px] text-gray-700 placeholder-gray-400 outline-none transition focus:border-[#f5bd02] focus:ring-1 focus:ring-[#f5bd02]/30"
      />
    </div>
  );
}

function FSelect({ label, placeholder, value, options, onChange }: {
  label?: string; placeholder?: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      {label && <label className="mb-1 block text-[11px] font-medium text-gray-500">{label}</label>}
      <div className="relative">
        <select
          value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-8 text-[12px] text-gray-700 outline-none transition focus:border-[#f5bd02] dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round">
          <polyline points="2,4 6,8 10,4"/>
        </svg>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STAT ICONS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function PeopleIcon({ c }: { c: string }) {
  return <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.6"><circle cx="6" cy="5" r="2.5"/><path d="M1 13.5c0-2.5 2-4 5-4s5 1.5 5 4"/><circle cx="12" cy="5" r="2"/><path d="M10.5 13.5c.3-1.5 1.2-2.5 3-3"/></svg>;
}
function CheckIcon({ c }: { c: string }) {
  return <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.8"><circle cx="8" cy="8" r="6.5"/><polyline points="5,8 7,10 11,6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ClockIcon({ c }: { c: string }) {
  return <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.6"><circle cx="8" cy="8" r="6.5"/><polyline points="8,4.5 8,8 10.5,10" strokeLinecap="round"/></svg>;
}
function GridIcon({ c }: { c: string }) {
  return <svg width="20" height="20" viewBox="0 0 16 16" fill={c}><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>;
}

