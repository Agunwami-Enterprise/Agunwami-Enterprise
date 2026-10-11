'use client';

/**
 * CEO Settings. Profile and preferences are read from and saved to the
 * workstation (AE Hub) project, in the same places AE Hub's staff settings use,
 * so changes show in both apps. Options with nothing behind them yet are
 * marked "Coming soon" rather than shown as working switches.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  NOTIFICATION_CATEGORIES, PROFILE_LIMITS, TIME_ZONES,
  saveInAppPreference, saveProfile, saveTimeZone, sendPasswordReset,
  subscribeSecuritySettings, subscribeUserProfile, uploadProfilePhoto,
  type NotificationCategory, type SecuritySettings, type UserProfile,
} from '@/modules/settings/services';
import { useInAppPreferences } from '@/modules/settings/use-in-app-preferences';
import { useAuth } from '@/lib/workstation/auth-context';
import { useTheme } from '@/lib/workstation/theme-context';
import { auth } from '@/lib/workstation/firebase';
import { seedDatabase } from '@/lib/workstation/seed-client';

type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'security' | 'system';

const VALID_TABS: SettingsTab[] = ['profile', 'preferences', 'notifications', 'security', 'system'];
const AE_HUB_URL = 'https://aehub-eafa6.web.app';
// The demo-data seeder rewrites shared collections; never offer it in production.
const SHOW_SEED_TOOL = process.env.NODE_ENV !== 'production';

type Status = { tone: 'success' | 'error'; text: string } | null;

const errorText = (err: unknown) => (err instanceof Error && err.message) || 'Something went wrong. Please try again.';

/** "Chrome on Windows" from the browser's user agent. */
function describeDevice(): string {
  if (typeof navigator === 'undefined') return 'This device';
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'an unknown system';
  return `${browser} on ${os}`;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const titleCase = (value?: string | null) =>
  value ? value.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as SettingsTab | null;
  const [tab, setTab] = useState<SettingsTab>(
    initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'profile'
  );
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const inApp = useInAppPreferences();

  // Profile form
  const [form, setForm] = useState({ displayName: '', phone: '', location: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Preferences / security status lines
  const [prefStatus, setPrefStatus] = useState<Status>(null);
  const [securityStatus, setSecurityStatus] = useState<Status>(null);
  const [sendingReset, setSendingReset] = useState(false);

  const [seeding, setSeeding]   = useState(false);
  const [seedLogs, setSeedLogs] = useState<string[]>([]);
  const [seedDone, setSeedDone] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeUserProfile(
      user.uid,
      p => { setProfile(p); setProfileLoaded(true); },
      err => setProfileError(err.message || 'Unknown error'),
    );
  }, [user?.uid]);

  useEffect(() => (user?.uid ? subscribeSecuritySettings(user.uid, setSecurity) : undefined), [user?.uid]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [seedLogs]);

  function startEditing() {
    setForm({
      displayName: profile?.displayName ?? '',
      phone: profile?.phone ?? '',
      location: profile?.location ?? '',
      bio: profile?.bio ?? '',
    });
    setProfileStatus(null);
    setEditing(true);
    setTab('profile');
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    setProfileStatus(null);
    try {
      await saveProfile(user.uid, form);
      setEditing(false);
      setProfileStatus({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      setProfileStatus({ tone: 'error', text: `Could not save your profile: ${errorText(err)}` });
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user?.uid) return;
    setUploading(true);
    setProfileStatus(null);
    try {
      await uploadProfilePhoto(user.uid, file);
      setProfileStatus({ tone: 'success', text: 'Profile photo updated.' });
    } catch (err) {
      setProfileStatus({ tone: 'error', text: `Could not upload the photo: ${errorText(err)}` });
    } finally {
      setUploading(false);
    }
  }

  async function handleTimeZone(value: string) {
    if (!user?.uid) return;
    setPrefStatus(null);
    try {
      await saveTimeZone(user.uid, value);
      setPrefStatus({ tone: 'success', text: 'Time zone saved.' });
    } catch (err) {
      setPrefStatus({ tone: 'error', text: `Could not save the time zone: ${errorText(err)}` });
    }
  }

  async function handleInApp(category: NotificationCategory, enabled: boolean) {
    if (!user?.uid) return;
    try {
      await saveInAppPreference(user.uid, category, enabled);
    } catch (err) {
      setPrefStatus({ tone: 'error', text: `Could not save that preference: ${errorText(err)}` });
    }
  }

  async function handlePasswordReset() {
    const email = profile?.email || user?.email;
    if (!email) {
      setSecurityStatus({ tone: 'error', text: 'Your account has no email address to send the link to.' });
      return;
    }
    setSendingReset(true);
    setSecurityStatus(null);
    try {
      await sendPasswordReset(email);
      setSecurityStatus({ tone: 'success', text: `We sent a password reset link to ${email}. It expires in one hour.` });
    } catch (err) {
      setSecurityStatus({ tone: 'error', text: `Could not send the reset link: ${errorText(err)}` });
    } finally {
      setSendingReset(false);
    }
  }

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

  const displayName = profile?.displayName || user?.displayName || 'Your name';
  const email = profile?.email || user?.email || '—';
  const position = profile?.departmentPosition || 'CEO';
  const employeeId = profile?.aehubId || (profile?.staffNumber != null ? `#${profile.staffNumber}` : '—');
  const photoURL = profile?.photoURL || user?.photoURL || '';
  const timeZone = profile?.timeZone || 'Africa/Lagos';
  const lastSignIn = auth.currentUser?.metadata.lastSignInTime;

  return (
    <div className="p-4 md:p-5">
      <h1 className="mb-5 text-[20px] font-bold text-gray-800 dark:text-white">Profile Settings</h1>

      {profileError && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
          Your profile could not be loaded: {profileError}
        </p>
      )}

      {/* Profile card */}
      <div className="mb-5 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-[#1e1e1e]">
        <div className="flex items-center gap-4">
          <div className="relative">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoURL} alt="" className="h-[76px] w-[76px] rounded-full object-cover" />
            ) : (
              <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#f5bd02] text-[26px] font-bold text-[#1a1a1a]">
                {displayName[0]?.toUpperCase() ?? 'A'}
              </div>
            )}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile photo"
              title="Change profile photo (max 2 MB)"
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full text-white shadow disabled:opacity-60"
              style={{ backgroundColor: '#f5bd02' }}
            >
              {uploading
                ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12V10l3-3 2 2 5-5 3 3v5H1z"/><path d="M11 2h3v3"/></svg>}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          <div>
            <p className="text-[18px] font-bold text-gray-800 dark:text-white">{profileLoaded || !user ? displayName : 'Loading…'}</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">{position}</p>
            <p className="text-[12px] text-gray-400 dark:text-gray-500">{titleCase(profile?.department)}</p>
            <span className="mt-1 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/8 dark:text-gray-300">Employee ID: {employeeId}</span>
          </div>
        </div>
        {editing ? (
          <button
            onClick={() => setEditing(false)}
            className="self-start rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 sm:self-auto dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/4"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={startEditing}
            disabled={!profileLoaded}
            className="self-start rounded-lg px-5 py-2.5 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50 sm:self-auto"
            style={{ backgroundColor: '#f5bd02' }}
          >
            Edit Profile
          </button>
        )}
      </div>

      <StatusLine status={profileStatus} />

      {/* Tabs */}
      <div className="mb-5 flex overflow-x-auto border-b border-gray-200 dark:border-white/6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-2 py-2.5 text-[12px] font-medium transition-colors
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
              <InfoField label="Full Name"     value={displayName} />
              <InfoField label="Email Address" value={email} />
              <InfoField label="Phone Number"  value={profile?.phone || '—'} />
              <InfoField label="Location"      value={profile?.location || '—'} />
              <div className="sm:col-span-2">
                <InfoField label="Bio" value={profile?.bio || '—'} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Employment Details</h2>
            <p className="mb-4 text-[12px] text-gray-500 dark:text-gray-400">Your work-related information</p>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <InfoField label="Department"    value={titleCase(profile?.department)} bold />
              <InfoField label="Position"      value={position} bold />
              <InfoField label="Join Date"     value={formatDate(profile?.joinDate)} bold />
              <InfoField label="Work Schedule" value={profile?.shiftStartTime && profile?.shiftEndTime ? `${profile.shiftStartTime} – ${profile.shiftEndTime}` : '—'} bold />
              <InfoField label="Time Zone"     value={TIME_ZONES.find(z => z.value === timeZone)?.label ?? timeZone} bold />
              <InfoField label="Employee ID"   value={employeeId} bold />
            </div>
          </div>
        </div>
      )}

      {/* PROFILE TAB — edit form */}
      {tab === 'profile' && editing && (
        <form onSubmit={handleSaveProfile} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
          <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Profile Information</h2>
          <p className="mb-5 text-[12px] text-gray-500 dark:text-gray-400">Edit your contact and basic details. Department, position and IDs are managed by HR.</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([
              { label: 'Full Name',    key: 'displayName', type: 'text', autoComplete: 'name' },
              { label: 'Phone Number', key: 'phone',       type: 'tel',  autoComplete: 'tel' },
              { label: 'Location',     key: 'location',    type: 'text', autoComplete: 'address-level2' },
            ] as const).map(f => (
              <div key={f.key}>
                <label htmlFor={`settings-${f.key}`} className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">{f.label}</label>
                <input
                  id={`settings-${f.key}`}
                  type={f.type}
                  autoComplete={f.autoComplete}
                  value={form[f.key]}
                  maxLength={PROFILE_LIMITS[f.key]}
                  required={f.key === 'displayName'}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.label}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200"
                />
              </div>
            ))}
            <div>
              <label htmlFor="settings-email" className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Email Address</label>
              <input
                id="settings-email"
                type="email"
                value={email}
                readOnly
                title="Your sign-in email can't be changed here"
                className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-500 outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="settings-bio" className="mb-1.5 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Bio</label>
              <textarea
                id="settings-bio"
                rows={5}
                value={form.bio}
                maxLength={PROFILE_LIMITS.bio}
                onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="A short introduction for your team"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-700 outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200"
              />
              <p className="mt-1 text-right text-[10px] text-gray-400">{form.bio.length}/{PROFILE_LIMITS.bio}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#f5bd02' }}
            >
              <PencilIcon /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* PREFERENCES TAB */}
      {tab === 'preferences' && (
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
          <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Preferences</h2>
          <p className="mb-2 text-[12px] text-gray-500 dark:text-gray-400">Customize how the workstation looks and works for you</p>
          <StatusLine status={prefStatus} />

          {/* Theme */}
          <div className="flex items-center justify-between border-b border-gray-100 py-5 dark:border-white/6">
            <div className="flex items-center gap-3">
              <span className="text-gray-500 dark:text-gray-400"><SunIcon /></span>
              <div>
                <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Dark Mode</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Toggle between light and dark themes</p>
              </div>
            </div>
            <Switch on={dark} onChange={() => toggle()} label="Dark mode" />
          </div>

          {/* Time Zone */}
          <div className="flex flex-col gap-3 border-b border-gray-100 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/6">
            <div>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Time Zone</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Used for your attendance and lateness in AE Hub reports</p>
            </div>
            <div className="relative">
              <select
                value={timeZone}
                disabled={!profileLoaded}
                onChange={e => void handleTimeZone(e.target.value)}
                aria-label="Time zone"
                className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-[12px] font-medium text-gray-700 outline-none disabled:opacity-60 dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200"
              >
                {TIME_ZONES.map(zone => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
                {!TIME_ZONES.some(zone => zone.value === timeZone) && <option value={timeZone}>{timeZone}</option>}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between pt-5">
            <div>
              <p className="flex items-center gap-2 text-[13px] font-semibold text-gray-800 dark:text-white">Language <ComingSoon /></p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">The workstation is in English for now</p>
            </div>
            <span className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-500 dark:border-white/10 dark:text-gray-400">English</span>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {tab === 'notifications' && (
        <div className="flex flex-col gap-4">
          <StatusLine status={prefStatus} />
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-[#f5bd02]"><InAppIcon /></span>
              <div>
                <p className="text-[13px] font-bold text-gray-800 dark:text-white">In-App Notifications</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Choose what appears in the bell, the sidebar badge and the Notifications page</p>
              </div>
            </div>
            {NOTIFICATION_CATEGORIES.map((category, index) => (
              <Row key={category.key} label={category.label} desc={category.desc} last={index === NOTIFICATION_CATEGORIES.length - 1}>
                <Switch
                  on={inApp[category.key]}
                  onChange={on => void handleInApp(category.key, on)}
                  label={category.label}
                />
              </Row>
            ))}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[#f5bd02]"><EmailIcon /></span>
              <div>
                <p className="flex items-center gap-2 text-[13px] font-bold text-gray-800 dark:text-white">Email, Sound &amp; Push Notifications <ComingSoon /></p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Email alerts from AE Hub can&apos;t be switched off by category yet, and the workstation doesn&apos;t play sounds or send push
                  notifications. Choices for these will appear here once they can be honoured.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY TAB */}
      {tab === 'security' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Security Settings</h2>
            <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">Manage your account security</p>
            <StatusLine status={securityStatus} />

            {/* Password */}
            <div className="border-b border-gray-100 py-4 dark:border-white/6">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-gray-800 dark:text-white"><KeyIcon /> Password</p>
              <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">We&apos;ll email a secure link to {email} where you can choose a new password.</p>
              <button
                type="button"
                onClick={() => void handlePasswordReset()}
                disabled={sendingReset}
                className="rounded-lg px-4 py-2 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#f5bd02' }}
              >
                {sendingReset ? 'Sending…' : 'Email Me a Reset Link'}
              </button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="border-b border-gray-100 py-4 dark:border-white/6">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-gray-800 dark:text-white">
                Two-Factor Authentication
                {security && (
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${security.twoFactorEnabled
                    ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-gray-300'}`}>
                    {security.twoFactorEnabled ? 'On' : 'Off'}
                  </span>
                )}
              </p>
              <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">
                Two-factor authentication is set up and checked when you sign in to AE Hub. Manage it in AE Hub&apos;s settings.
              </p>
              <a
                href={`${AE_HUB_URL}/staff/${encodeURIComponent(profile?.department || 'ceo')}/settings/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/4"
              >
                Manage in AE Hub
              </a>
            </div>

            {/* Session */}
            <div className="pt-4">
              <p className="text-[12px] font-semibold text-gray-800 dark:text-white">Current Session</p>
              <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Where you&apos;re signed in right now</p>
              <div className="flex flex-col gap-3 rounded-xl bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-white/4">
                <div>
                  <p className="text-[12px] font-medium text-gray-700 dark:text-gray-200">{describeDevice()}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {lastSignIn ? `Signed in ${new Date(lastSignIn).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Signed in'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="self-start rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-white sm:self-auto dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/8"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-gray-800 dark:text-white">Privacy <ComingSoon /></h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Hiding your online status or last seen, and limiting who can message you, isn&apos;t supported by Messages yet.
            </p>
          </div>
        </div>
      )}

      {/* SYSTEM TAB */}
      {tab === 'system' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="flex items-center gap-2 text-[14px] font-bold text-gray-800 dark:text-white">System Configuration <ComingSoon /></h2>
            <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Workstation-wide controls planned for this page:</p>
            <ul className="list-disc space-y-1.5 pl-5 text-[12px] text-gray-600 dark:text-gray-300">
              <li>Maintenance mode for the workstation</li>
              <li>Session timeout and sign-in attempt limits</li>
              <li>Requiring two-factor authentication for all staff</li>
              <li>Scheduled data backups</li>
            </ul>
            <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
              They are not active yet, so they aren&apos;t shown as switches. Website content is managed in the{' '}
              <a href="/cpanel/dashboard" className="font-semibold text-[#d97706] hover:underline">C-panel</a>.
            </p>
          </div>

          {SHOW_SEED_TOOL && (
            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
              <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Seed Demo Data (development only)</h2>
              <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Fills an empty development database with sample records. Not available in production.</p>
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
              {seedDone && <p className="mt-3 text-[12px] font-semibold text-green-600 dark:text-green-400">Seeding complete.</p>}
              {seedError && <p className="mt-3 text-[12px] font-semibold text-red-600 dark:text-red-400">Error: {seedError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-0.5 whitespace-pre-line text-[13px] ${bold ? 'font-semibold' : ''} text-gray-800 dark:text-gray-100`}>{value}</p>
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      role={status.tone === 'error' ? 'alert' : 'status'}
      className={`mb-4 rounded-xl px-4 py-2.5 text-[12px] ${status.tone === 'error'
        ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
        : 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'}`}
    >
      {status.text}
    </p>
  );
}

function ComingSoon() {
  return <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500 dark:bg-white/8 dark:text-gray-400">Coming soon</span>;
}

/** A labelled on/off switch that reflects saved state. */
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

function Row({ label, desc, last = false, children }: { label: string; desc: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3.5 ${last ? '' : 'border-b border-gray-100 dark:border-white/6'}`}>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-gray-800 dark:text-white">{label}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function PencilIcon() { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11.5 2.5l2 2-9 9H2.5v-2l9-9z"/><path d="M9.5 4.5l2 2"/></svg>; }
function UserIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>; }
function CogIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function BellIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function ShieldIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function SunIcon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>; }
function ChevronDownIcon() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="2,4 6,8 10,4"/></svg>; }
function EmailIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>; }
function KeyIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="15" r="5"/><path d="M21 2l-9.3 9.3"/><path d="M15 2l2 2-4 4 2 2"/></svg>; }
function InAppIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
