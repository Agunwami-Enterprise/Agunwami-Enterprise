'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { subscribeUserProfile, type UserProfile } from '@/modules/settings/services';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { seedDatabase } from '@/lib/seed-client';

type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'security' | 'system';

const VALID_TABS: SettingsTab[] = ['profile', 'preferences', 'notifications', 'security', 'system'];

export default function SettingsPage() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as SettingsTab | null;
  const [tab, setTab] = useState<SettingsTab>(
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'profile'
  );
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [seeding, setSeeding]   = useState(false);
  const [seedLogs, setSeedLogs] = useState<string[]>([]);
  const [seedDone, setSeedDone] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeUserProfile(user.uid, setProfile);
  }, [user?.uid]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [seedLogs]);

  async function handleSeed() {
    if (!user?.uid) return;
    setSeeding(true);
    setSeedLogs([]);
    setSeedDone(false);
    setSeedError(null);
    try {
      await seedDatabase(user.uid, (msg) =>
        setSeedLogs((prev) => [...prev, msg]),
      );
      setSeedDone(true);
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : String(err));
    } finally {
      setSeeding(false);
    }
  }

  const TABS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key:'profile',       label:'Profile',               icon:<UserIcon />   },
    { key:'preferences',   label:'Preferences',           icon:<CogIcon />    },
    { key:'notifications', label:'Notifications',         icon:<BellIcon />   },
    { key:'security',      label:'Security',              icon:<ShieldIcon /> },
    { key:'system',        label:'System Configuration',  icon:<CogIcon />    },
  ];

  return (
    <div className="p-4 md:p-5">
      <h1 className="mb-5 text-[20px] font-bold text-gray-800 dark:text-white">Profile Settings</h1>

      {/* Profile card */}
      <div className="mb-5 flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#f5bd02] text-[26px] font-bold text-[#1a1a1a]">
              {profile?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <button className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full text-white shadow" style={{ backgroundColor: '#f5bd02' }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12V10l3-3 2 2 5-5 3 3v5H1z"/><path d="M11 2h3v3"/></svg>
            </button>
          </div>
          <div>
            <p className="text-[18px] font-bold text-gray-800 dark:text-white">{profile?.name ?? 'Agunwami'}</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">{profile?.role ?? 'CEO'}</p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500">{profile?.department ?? 'Executive'}</p>
            <span className="mt-1 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/8 dark:text-gray-300">Employee ID: AE-001</span>
          </div>
        </div>
        {editing ? (
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/4"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => { setEditing(true); setTab('profile'); }}
            className="rounded-lg px-5 py-2.5 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90"
            style={{ backgroundColor: '#f5bd02' }}
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex border-b border-gray-200 dark:border-white/6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[12px] font-medium transition-colors
              ${tab === t.key ? 'border-b-2 border-[#f5bd02] text-[#f5bd02]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* PROFILE TAB — read-only view */}
      {tab === 'profile' && !editing && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Profile Information</h2>
            <p className="mb-4 text-[12px] text-gray-500 dark:text-gray-400">Your contact and basic details</p>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <InfoField label="Full Name"     value={profile?.name     ?? 'Agunwami'} />
              <InfoField label="Email Address" value={profile?.email    ?? 'ceo@agunwami.com'} />
              <InfoField label="Phone Number"  value={profile?.phone    ?? '—'} />
              <InfoField label="Location"      value={profile?.location ?? '—'} />
              <div className="sm:col-span-2">
                <InfoField label="Bio" value="Passionate professional with expertise in driving organizational success." />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Employment Details</h2>
            <p className="mb-4 text-[12px] text-gray-500 dark:text-gray-400">Your work-related information</p>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <InfoField label="Department"      value={profile?.department ?? 'Executive'}            bold />
              <InfoField label="Position"        value={profile?.position   ?? profile?.role ?? 'CEO'} bold />
              <InfoField label="Join Date"       value={profile?.joinDate   ?? '—'}                    bold />
              <InfoField label="Employment Type" value="Full-time"                                     bold />
              <InfoField label="Work Schedule"   value="Monday to Friday, 9:00 AM – 5:00 PM"          bold />
              <InfoField label="Reports To"      value="Board of Directors"                            bold />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label:'Days Employed', value:'670',      sub:'Since Jan 2023', iconColor:'#d97706' },
              { label:'Leave Balance', value:'15 days',  sub:'Available',      iconColor:'#d97706' },
              { label:'Performance',   value:'8.5/10',   sub:'latest review',  iconColor:'#f5bd02' },
            ].map(s => (
              <div key={s.label} className="flex items-start justify-between rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="mt-2 text-[24px] font-bold text-gray-800 dark:text-white">{s.value}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{s.sub}</p>
                </div>
                <div style={{ color: s.iconColor }}><CalIcon /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROFILE TAB — inline edit form */}
      {tab === 'profile' && editing && (
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
          <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Profile Information</h2>
          <p className="mb-5 text-[12px] text-gray-500 dark:text-gray-400">Edit your contact and basic details</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([
              { label: 'Full Name',     key: 'name',     type: 'text',  span: false },
              { label: 'Email Address', key: 'email',    type: 'email', span: false },
              { label: 'Phone Number',  key: 'phone',    type: 'tel',   span: false },
              { label: 'Location',      key: 'location', type: 'text',  span: false },
            ] as const).map(f => (
              <div key={f.label}>
                <label className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">{f.label}</label>
                <input
                  type={f.type}
                  defaultValue={(profile?.[f.key] as string | undefined) ?? ''}
                  placeholder={f.label}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Bio</label>
              <textarea
                rows={5}
                defaultValue="Passionate professional with expertise in driving organizational success."
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/4"
            >
              Cancel
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90"
              style={{ backgroundColor: '#f5bd02' }}
            >
              <PencilIcon /> Edit Profile
            </button>
          </div>
        </div>
      )}

      {/* PREFERENCES TAB */}
      {tab === 'preferences' && (
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
          <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Preferences</h2>
          <p className="mb-5 text-[12px] text-gray-500 dark:text-gray-400">Customize how your workstation looks</p>

          {/* Dark Mode */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-5 dark:border-white/6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400">
                <SunIcon />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Dark Mode</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Toggle between light and dark themes</p>
              </div>
            </div>
            <button
              onClick={toggle}
              className={`relative h-[26px] w-[46px] overflow-hidden rounded-full transition-colors duration-200 focus:outline-none
                ${dark ? 'bg-[#f5bd02]' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
                  ${dark ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between border-b border-gray-100 py-5 dark:border-white/6">
            <div>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Language</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Choose your preferred language</p>
            </div>
            <div className="relative">
              <select className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-[12px] font-medium text-gray-700 outline-none dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200">
                <option>English</option>
                <option>French</option>
                <option>Hausa</option>
                <option>Yoruba</option>
                <option>Igbo</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>

          {/* Time Zone */}
          <div className="flex items-center justify-between pt-5">
            <div>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Time Zone</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Set your local time zone</p>
            </div>
            <div className="relative">
              <select className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-[12px] font-medium text-gray-700 outline-none dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200">
                <option>Eastern Time</option>
                <option>Central Time</option>
                <option>Mountain Time</option>
                <option>Pacific Time</option>
                <option>West Africa Time (WAT)</option>
                <option>GMT / UTC</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {tab === 'notifications' && (
        <div className="flex flex-col gap-4">

          {/* Email Notifications */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[#f5bd02]"><EmailIcon /></span>
              <div>
                <p className="text-[13px] font-bold text-gray-800 dark:text-white">Email Notifications</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Configure which notifications you want to receive via email</p>
              </div>
            </div>
            <NotifRow label="New Tasks"              desc="Get notified when new tasks are assigned to you"          />
            <NotifRow label="CEO/Admin Updates"      desc="Receive important announcements from leadership"          />
            <NotifRow label="Payment Status Changes" desc="Get notified about salary, bonuses, and payment updates"  />
            <NotifRow label="Leave Updates"          desc="Notifications about leave requests and approvals"         />
            <NotifRow label="Announcements"          desc="Get notified when you receive announcement notifications" />
            <NotifRow label="Meetings"               desc="Get notified when you receive meetings notifications"     />
            <NotifRow label="Messages"               desc="Get notified when you receive new messages"              last />
          </div>

          {/* In-App Notifications */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[#f5bd02]"><InAppIcon /></span>
              <div>
                <p className="text-[13px] font-bold text-gray-800 dark:text-white">In-App Notifications</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Control which notifications appear in the application</p>
              </div>
            </div>
            <NotifRow label="New Tasks"              desc="Get notified when new tasks are assigned to you"          />
            <NotifRow label="CEO/Admin Updates"      desc="Receive important announcements from leadership"          />
            <NotifRow label="Payment Status Changes" desc="Get notified about salary, bonuses, and payment updates"  />
            <NotifRow label="Leave Updates"          desc="Notifications about leave requests and approvals"         />
            <NotifRow label="Announcements"          desc="Get notified when you receive announcement notifications" />
            <NotifRow label="Meetings"               desc="Get notified when you receive meetings notifications"     />
            <NotifRow label="Messages"               desc="Get notified when you receive new messages"  defaultOn={false} last />
          </div>

          {/* Additional Settings */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[#f5bd02]"><SoundIcon /></span>
              <div>
                <p className="text-[13px] font-bold text-gray-800 dark:text-white">Additional Settings</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Customize your notification experience</p>
              </div>
            </div>
            <NotifRow label="Notification Sound"  desc="Play a sound when new notifications arrive"                    />
            <NotifRow label="Push Notifications"  desc="Receive push notifications even when the app is closed"  last />
          </div>

        </div>
      )}

      {/* SECURITY TAB */}
      {tab === 'security' && (
        <div className="flex flex-col gap-4">

          {/* Privacy & Security */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Privacy &amp; Security</h2>
            <p className="mb-4 text-[11px] text-gray-500 dark:text-gray-400">Control your privacy settings</p>
            <NotifRow label="Show Online Status"     desc="Let others see when you're online"         />
            <NotifRow label="Show Last Seen"         desc="Display when you were last active"          />
            <NotifRow label="Allow Direct Messages"  desc="Let other staff members message you"  last  />
          </div>

          {/* Security Settings */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Security Settings</h2>
            <p className="mb-4 text-[11px] text-gray-500 dark:text-gray-400">Manage your account security</p>

            {/* Password */}
            <div className="border-b border-gray-100 pb-4 dark:border-white/6">
              <p className="text-[12px] font-semibold text-gray-800 dark:text-white">Password</p>
              <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Last changed 3 months ago</p>
              <button
                className="rounded-lg px-4 py-2 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
                style={{ backgroundColor: '#f5bd02' }}
              >
                Change Password
              </button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="border-b border-gray-100 py-4 dark:border-white/6">
              <p className="text-[12px] font-semibold text-gray-800 dark:text-white">Two-Factor Authentication</p>
              <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
              <button className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/4">
                Enable 2FA
              </button>
            </div>

            {/* Active Sessions */}
            <div className="pt-4">
              <p className="text-[12px] font-semibold text-gray-800 dark:text-white">Active Sessions</p>
              <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Manage where you&apos;re signed in</p>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/4">
                <div>
                  <p className="text-[12px] font-medium text-gray-700 dark:text-gray-200">Current Session</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Chrome on Windows • Lagos State, NG</p>
                </div>
                <span className="rounded-md bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400">
                  Active
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SYSTEM TAB */}
      {tab === 'system' && (
        <div className="flex flex-col gap-5">

          {/* System Configuration card */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">System Configuration</h2>
            <p className="mb-4 text-[11px] text-gray-500 dark:text-gray-400">Manage system-wide settings</p>

            {/* Toggle settings */}
            <NotifRow label="Maintenance Mode"               desc="Enable maintenance mode to prevent user access"        defaultOn={false} />
            <NotifRow label="Allow New Registrations"        desc="Allow new users to register"                                            />
            <NotifRow label="Require Email Verification"     desc="Require users to verify their email address"                            />
            <NotifRow label="Enable Two-Factor Authentication" desc="Require two-factor authentication for all users"                      />

            {/* Number inputs */}
            <div className="flex items-center justify-between border-b border-gray-100 py-3.5 dark:border-white/6">
              <div>
                <p className="text-[12px] font-semibold text-gray-800 dark:text-white">Session Timeout</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Set the session timeout in minutes</p>
              </div>
              <input type="number" defaultValue={60} className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-[12px] text-gray-700 outline-none dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200" />
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 py-3.5 dark:border-white/6">
              <div>
                <p className="text-[12px] font-semibold text-gray-800 dark:text-white">Max Login Attempts</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Set the maximum number of login attempts</p>
              </div>
              <input type="number" defaultValue={5} className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-[12px] text-gray-700 outline-none dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200" />
            </div>

            {/* Data Backup */}
            <div className="mt-4 border-b border-gray-100 pb-4 dark:border-white/6">
              <p className="mb-2 text-[12px] font-bold text-gray-800 dark:text-white">Data Backup</p>
              <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-white/6">
                <p className="text-[12px] font-semibold text-gray-800 dark:text-white">Data Backup Enabled</p>
                <NotifToggle defaultOn />
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <p className="text-[12px] font-semibold text-gray-800 dark:text-white">Auto Backup Interval</p>
                <div className="relative">
                  <select className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-7 text-[12px] font-medium text-gray-700 outline-none dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200">
                    <option>24 Hours</option>
                    <option>12 Hours</option>
                    <option>6 Hours</option>
                    <option>1 Hour</option>
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                    <ChevronDownIcon />
                  </span>
                </div>
              </div>
            </div>

            {/* User Management */}
            <div className="mt-4">
              <p className="text-[12px] font-bold text-gray-800 dark:text-white">User Management</p>
              <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Reset passwords and email addresses for staff members</p>
              <div className="space-y-2">
                <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left text-[12px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/4">
                  <KeyIcon /> Reset User Password
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left text-[12px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/4">
                  <EmailIcon /> Reset User Email
                </button>
              </div>
            </div>
          </div>

          {/* Database Seed card */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Database Seed</h2>
            <p className="mb-4 text-[12px] text-gray-500 dark:text-gray-400">
              Populate Firestore with sample data. Safe to run multiple times — already-populated collections are skipped.
            </p>

            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
              Set Firestore rules to <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">allow read, write: if request.auth != null;</code> before seeding, then restore production rules after.
            </div>

            <button
              onClick={handleSeed}
              disabled={seeding}
              className="rounded-lg px-5 py-2.5 text-[13px] font-semibold text-[#1a1a1a] disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: '#f5bd02' }}
            >
              {seeding ? 'Seeding…' : 'Seed Database'}
            </button>

            {seedLogs.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto rounded-lg bg-gray-950 p-3 font-mono text-[11px] text-gray-300">
                {seedLogs.map((line, i) => (
                  <div key={i} className="leading-5">{line}</div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}

            {seedDone && (
              <p className="mt-3 text-[12px] font-semibold text-green-600 dark:text-green-400">
                Seeding complete. Restore your Firestore security rules now.
              </p>
            )}
            {seedError && (
              <p className="mt-3 text-[12px] font-semibold text-red-600 dark:text-red-400">
                Error: {seedError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* OTHER TABS — placeholders */}
      {tab !== 'profile' && tab !== 'preferences' && tab !== 'notifications' && tab !== 'security' && tab !== 'system' && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20 shadow-sm dark:bg-[#1e1e1e]">
          <p className="text-[14px] font-semibold text-gray-600 dark:text-gray-300 capitalize">{tab.replace('-',' ')} settings</p>
          <p className="mt-1 text-[12px] text-gray-400">Coming soon</p>
        </div>
      )}

    </div>
  );
}

function InfoField({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-0.5 text-[13px] ${bold ? 'font-semibold' : ''} text-gray-800 dark:text-gray-100`}>{value}</p>
    </div>
  );
}


function PencilIcon() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11.5 2.5l2 2-9 9H2.5v-2l9-9z"/><path d="M9.5 4.5l2 2"/></svg>; }
function UserIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>; }
function CogIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function BellIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function ShieldIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function CalIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function SunIcon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>; }
function ChevronDownIcon() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="2,4 6,8 10,4"/></svg>; }
function EmailIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>; }
function KeyIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="15" r="5"/><path d="M21 2l-9.3 9.3"/><path d="M15 2l2 2-4 4 2 2"/></svg>; }
function InAppIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function SoundIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>; }

/* ── Notification helpers ─────────────────────────────────────────────────── */

function NotifToggle({ defaultOn = true }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(v => !v)}
      className={`relative h-[26px] w-[46px] flex-shrink-0 overflow-hidden rounded-full transition-colors duration-200 focus:outline-none
        ${on ? 'bg-[#f5bd02]' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
        ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function NotifRow({ label, desc, defaultOn = true, last = false }: {
  label: string; desc: string; defaultOn?: boolean; last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3.5 ${last ? '' : 'border-b border-gray-100 dark:border-white/6'}`}>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-gray-800 dark:text-white">{label}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
      <NotifToggle defaultOn={defaultOn} />
    </div>
  );
}
