'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, ExternalLink, KeyRound, LayoutDashboard, Plus, Sparkles, Trash2 } from 'lucide-react';
import SiteIcon from '@/app/components/common/SiteIcon';
import {
  Button, Card, ErrorNote, IconButton, IconPicker, ImageField, Select, TagInput, TextArea, TextInput, cpanelFetch, cx,
} from './ui';
import type {
  ProjectKind, SiteIconName, SiteProject, SiteProjectStat,
} from '@/backend/modules/site-content/site-content.types';

const CATEGORIES = ['E-Commerce', 'Non-Profit', 'Retail', 'Corporate', 'Education', 'Healthcare', 'Finance', 'Logistics', 'Operations', 'Government', 'Other'];
const STATUSES = ['ACTIVE', 'IN DEVELOPMENT', 'COMPLETED'];
/** Card colours on the CEO dashboard. */
const PROJECT_COLORS = [
  { name: 'Gold', hex: '#C89B3C' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Rose', hex: '#E11D48' },
];

type Draft = {
  name: string; kind: ProjectKind; published: boolean; category: string; subtitle: string; homeDescription: string;
  description: string; challenges: string; solution: string; technologyStack: string[]; image: string;
  websiteUrl: string; adminUrl: string; status: string; icon: SiteIconName; stats: SiteProjectStat[];
  deliverables: string[]; impact: string; ecosystemSummary: string; ecosystemDescription: string;
  ecosystemFeatures: string[]; apiEndpoint: string; apiToken: string; clearApiToken: boolean;
  lead: string; color: string;
};

function toDraft(project?: SiteProject): Draft {
  return {
    name: project?.name ?? '',
    kind: project?.kind ?? 'client',
    published: project?.published ?? true,
    category: project?.category ?? '',
    subtitle: project?.subtitle ?? '',
    homeDescription: project?.homeDescription ?? '',
    description: project?.description ?? '',
    challenges: project?.challenges ?? '',
    solution: project?.solution ?? '',
    technologyStack: project?.technologyStack ?? [],
    image: project?.image ?? '',
    websiteUrl: project?.websiteUrl ?? '',
    adminUrl: project?.adminUrl ?? '',
    status: project?.status ?? 'ACTIVE',
    icon: project?.icon ?? 'Briefcase',
    stats: project?.stats ?? [],
    deliverables: project?.deliverables ?? [],
    impact: project?.impact ?? '',
    ecosystemSummary: project?.ecosystemSummary ?? '',
    ecosystemDescription: project?.ecosystemDescription ?? '',
    ecosystemFeatures: project?.ecosystemFeatures ?? [],
    apiEndpoint: project?.apiEndpoint ?? '',
    apiToken: '',
    clearApiToken: false,
    lead: project?.lead ?? '',
    color: project?.color ?? '#C89B3C',
  };
}

function SectionCard({ step, title, description, children }: {
  step: number; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FBF3E1] text-[13px] font-semibold text-[#C89B3C]">{step}</span>
        <div>
          <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{title}</h2>
          <p className="text-[13px] text-[#8A8A8A]">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Switch({ checked, onChange, label, description }: {
  checked: boolean; onChange: (checked: boolean) => void; label: string; description: string;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 text-left">
      <span className={cx('mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors', checked ? 'bg-[#C89B3C]' : 'bg-[#D9D5CA]')}>
        <span className={cx('h-4 w-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </span>
      <span>
        <span className="block text-[14px] font-semibold text-[#1A1A1A]">{label}</span>
        <span className="block text-[12px] text-[#8A8A8A]">{description}</span>
      </span>
    </button>
  );
}

/** How the project's card looks on the website, updated as you type. */
function CardPreview({ draft }: { draft: Draft }) {
  const line = draft.kind === 'ecosystem'
    ? draft.ecosystemSummary || draft.homeDescription
    : draft.homeDescription || draft.subtitle;
  return (
    <Card className="overflow-hidden">
      <p className="flex items-center justify-between border-b border-[#F0EEE8] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
        Website preview
        {!draft.published && <span className="rounded bg-[#F3F1EA] px-1.5 py-0.5 normal-case tracking-normal text-[#8A8A8A]">Hidden</span>}
      </p>
      <div className="relative aspect-[16/10] bg-[#1A1A1A]">
        {draft.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={draft.image} alt="" className="h-full w-full object-cover" />
          : <div className="flex h-full items-center justify-center text-[13px] text-[#6B6B6B]">Add a project image</div>}
        {draft.category && (
          <span className="absolute left-3 top-3 rounded-md bg-white px-2.5 py-1 text-[12px] font-medium uppercase text-[#C89B3C]">{draft.category}</span>
        )}
      </div>
      <div className="space-y-2 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C89B3C]/10 text-[22px] text-[#C89B3C]">
            <SiteIcon name={draft.icon} />
          </span>
          <p className="font-primary text-[22px] leading-tight text-[#1A1A1A]">{draft.name || 'Project name'}</p>
        </div>
        <p className="line-clamp-3 text-[14px] text-[#6B6B6B]">{line || 'A short line about the project appears here.'}</p>
        {draft.technologyStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {draft.technologyStack.slice(0, 5).map(tech => (
              <span key={tech} className="rounded bg-[#F3F1EA] px-1.5 py-0.5 text-[11px] text-[#5A5A5A]">{tech}</span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * The one editor for workstation projects, used by the C-panel and the CEO
 * dashboard. `basePath` is where the list/edit pages live in each.
 */
export default function ProjectEditor({
  project, basePath = '/cpanel/projects', editSuffix = '', backHref = basePath, backLabel = 'All projects',
}: {
  /** editSuffix: appended to `${basePath}/<id>` for the edit page ('/edit' in the CEO workstation). */
  project?: SiteProject; basePath?: string; editSuffix?: string; backHref?: string; backLabel?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => toDraft(project));
  const [hasToken, setHasToken] = useState(project?.hasApiToken ?? false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const savingRef = useRef(false);

  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => {
    setDraft(d => ({ ...d, [key]: value }));
    setDirty(true);
  };
  const setStat = (index: number, key: keyof SiteProjectStat, value: string) =>
    set('stats')(draft.stats.map((stat, i) => (i === index ? { ...stat, [key]: value } : stat)));
  const categories = draft.category && !CATEGORIES.includes(draft.category) ? [draft.category, ...CATEGORIES] : CATEGORIES;
  const isEcosystem = draft.kind === 'ecosystem';

  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const website = { ...draft, stats: draft.stats.filter(s => s.value.trim() && s.label.trim()) };
      const saved = project
        ? await cpanelFetch<SiteProject>('/api/ceo/projects', { method: 'PATCH', json: { id: project.id, website } })
        : await cpanelFetch<SiteProject>('/api/ceo/projects', { method: 'POST', json: { website } });
      setHasToken(saved.hasApiToken);
      setDraft(d => ({ ...d, apiToken: '', clearApiToken: false }));
      setDirty(false);
      setSavedAt(new Date());
      if (!project) router.replace(`${basePath}/${encodeURIComponent(saved.id)}${editSuffix}`);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the project.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [basePath, draft, editSuffix, project, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const status = dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : project ? 'All changes saved' : 'New project';
  let step = 0;

  return (
    <div className="mx-auto max-w-[1180px] pb-10">
      {/* Top bar */}
      <div className="sticky top-0 z-20 -mx-5 mb-6 flex flex-wrap items-center gap-3 border-b border-[#ECEAE3] bg-[#FBFAF3]/95 px-5 py-3 backdrop-blur md:-mx-16 md:px-16">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6B6B6B] hover:text-[#1A1A1A]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
        </Link>
        <span className="text-[13px] text-[#9A9A9A]" aria-live="polite">{status}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {project?.published && (
            <Button variant="ghost" onClick={() => window.open(`/projects/${project.slug}`, '_blank', 'noopener')}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> View on website
            </Button>
          )}
          <Button variant="gold" busy={saving} onClick={save}>{project ? 'Save changes' : 'Create project'}</Button>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="font-primary text-[30px] leading-tight text-[#1A1A1A]">{project ? draft.name || 'Untitled project' : 'New project'}</h1>
        <p className="mt-1 text-[15px] text-[#6B6B6B]">
          This is the same project as in the AE workstation. The admin URL and metrics stay private; everything else can appear on the website.
        </p>
      </div>
      <ErrorNote message={error} />

      <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <SectionCard step={++step} title="Basics" description="What kind of project this is, and the lines people see first.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Project type">
              {([
                ['client', Building2, 'Client project', 'Work for an organization or business. Listed under Client Implementations.'],
                ['ecosystem', Sparkles, 'Ecosystem platform', 'One of AE’s own platforms. Shown on the Ecosystem page.'],
              ] as const).map(([kind, Icon, title, text]) => (
                <button key={kind} type="button" role="radio" aria-checked={draft.kind === kind} onClick={() => set('kind')(kind)}
                  className={cx('flex gap-3 rounded-xl border p-4 text-left transition-colors',
                    draft.kind === kind ? 'border-[#C89B3C] bg-[#FDF8EC]' : 'border-[#ECEAE3] hover:bg-[#FBFAF6]')}>
                  <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', draft.kind === kind ? 'text-[#C89B3C]' : 'text-[#9A9A9A]')} aria-hidden="true" />
                  <span>
                    <span className="block text-[14px] font-semibold text-[#1A1A1A]">{title}</span>
                    <span className="block text-[12px] text-[#8A8A8A]">{text}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput label="Title *" value={draft.name} onChange={set('name')} placeholder="Project name" />
              <Select label="Category *" value={draft.category} onChange={set('category')} options={categories} placeholder="Select category" />
            </div>
            <TextInput label="Tagline" hint="under the title on the project page" value={draft.subtitle} onChange={set('subtitle')} placeholder="A custom apparel platform built to scale." />
            <TextInput label="Card description" hint="on project cards and the home page" value={draft.homeDescription} onChange={set('homeDescription')} maxLength={300} />
          </SectionCard>

          <SectionCard step={++step} title="Links" description="Where the project lives. The admin URL is only visible in the C-panel and the workstation.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput label="Live URL" value={draft.websiteUrl} onChange={set('websiteUrl')} placeholder="https://project.com" />
              <TextInput label="Admin URL" value={draft.adminUrl} onChange={set('adminUrl')} placeholder="https://admin.project.com" />
            </div>
            {(draft.websiteUrl || draft.adminUrl) && (
              <div className="flex flex-wrap gap-2">
                {draft.websiteUrl && <a href={draft.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-[#F3F1EA] px-2.5 py-1.5 text-[13px] text-[#3A3A3A] hover:bg-[#E9E5DA]"><ExternalLink className="h-3.5 w-3.5" /> Open live site</a>}
                {draft.adminUrl && <a href={draft.adminUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-[#F3F1EA] px-2.5 py-1.5 text-[13px] text-[#3A3A3A] hover:bg-[#E9E5DA]"><LayoutDashboard className="h-3.5 w-3.5" /> Open admin</a>}
              </div>
            )}
          </SectionCard>

          <SectionCard step={++step} title="Workstation & metrics" description="How the project appears on the CEO dashboard and where its live numbers come from. Never shown on the website.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput label="Project lead" value={draft.lead} onChange={set('lead')} placeholder="Who runs this project" />
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Dashboard colour</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Dashboard colour">
                  {PROJECT_COLORS.map(({ name, hex }) => (
                    <button key={hex} type="button" role="radio" aria-checked={draft.color.toUpperCase() === hex} aria-label={name} title={name}
                      onClick={() => set('color')(hex)} style={{ backgroundColor: hex }}
                      className={cx('h-8 w-8 rounded-full ring-offset-2 transition', draft.color.toUpperCase() === hex ? 'ring-2 ring-[#1A1A1A]' : 'hover:scale-110')} />
                  ))}
                </div>
              </div>
            </div>
            <TextInput label="Metrics endpoint URL" value={draft.apiEndpoint} onChange={set('apiEndpoint')} placeholder="https://project.com/api/ae/metrics" />
            <TextInput label="Bearer token" type="password" autoComplete="new-password" value={draft.apiToken} onChange={set('apiToken')}
              placeholder={hasToken && !draft.clearApiToken ? 'Saved — leave blank to keep it' : 'Paste the project’s token'} />
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
              <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-1',
                hasToken && !draft.clearApiToken ? 'bg-green-50 text-green-700' : 'bg-[#F3F1EA] text-[#8A8A8A]')}>
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                {hasToken && !draft.clearApiToken ? 'Token saved (encrypted)' : 'No token saved'}
              </span>
              {hasToken && (
                <label className="inline-flex items-center gap-2 text-[#6B6B6B]">
                  <input type="checkbox" checked={draft.clearApiToken} onChange={e => set('clearApiToken')(e.target.checked)} className="accent-[#C89B3C]" />
                  Remove the saved token
                </label>
              )}
            </div>
          </SectionCard>

          {isEcosystem && (
            <SectionCard step={++step} title="Ecosystem card" description="How the platform appears on the Ecosystem page.">
              <TextInput label="Short summary" value={draft.ecosystemSummary} onChange={set('ecosystemSummary')} maxLength={160}
                placeholder="Educational platform empowering digital skills" />
              <TextArea label="Description" value={draft.ecosystemDescription} onChange={set('ecosystemDescription')} rows={3} />
              <TagInput label="Key features" hint="press Enter after each" values={draft.ecosystemFeatures} onChange={set('ecosystemFeatures')} placeholder="Online course management…" />
              <TextArea label="Impact" value={draft.impact} onChange={set('impact')} rows={2}
                placeholder="Empowering thousands of students with verified digital skills…" />
            </SectionCard>
          )}

          <SectionCard step={++step} title="The story" description={isEcosystem ? 'Why the platform exists and how it works.' : 'What the client needed and what you built.'}>
            <TextArea label="Overview" value={draft.description} onChange={set('description')} rows={4} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextArea label="Challenge" value={draft.challenges} onChange={set('challenges')} rows={6} />
              <TextArea label="Solution" value={draft.solution} onChange={set('solution')} rows={6} />
            </div>
          </SectionCard>

          <SectionCard step={++step} title="Results & delivery" description="Numbers for the gold results bar, and what was delivered.">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Key results <span className="font-normal normal-case tracking-normal text-[#A3A3A3]">(up to 6)</span></p>
              {draft.stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input value={stat.value} onChange={e => setStat(index, 'value', e.target.value)} placeholder="15+" aria-label="Result value"
                    className="w-28 rounded-lg bg-[#F5F3EE] px-3 py-2.5 text-[15px] font-semibold outline-none focus:bg-white focus:ring-1 focus:ring-[#C89B3C]" />
                  <input value={stat.label} onChange={e => setStat(index, 'label', e.target.value)} placeholder="Vendors onboarded at launch" aria-label="Result label"
                    className="min-w-0 flex-1 rounded-lg bg-[#F5F3EE] px-3 py-2.5 text-[14px] outline-none focus:bg-white focus:ring-1 focus:ring-[#C89B3C]" />
                  <IconButton label="Remove result" onClick={() => set('stats')(draft.stats.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              ))}
              {draft.stats.length < 6 && (
                <Button variant="outline" className="py-2" onClick={() => set('stats')([...draft.stats, { value: '', label: '' }])}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add result
                </Button>
              )}
            </div>
            <TagInput label="Technologies" hint="press Enter after each" values={draft.technologyStack} onChange={set('technologyStack')} placeholder="React, Node.js, Stripe…" />
            <TagInput label="Deliverables" hint="press Enter after each" values={draft.deliverables} onChange={set('deliverables')} placeholder="Unified storefront…" />
          </SectionCard>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <Switch checked={draft.published} onChange={set('published')} label="Show on website"
              description={draft.published ? 'Visible on the public site after saving.' : 'Kept in the workstation only.'} />
          </Card>
          <CardPreview draft={draft} />
          <Card className="space-y-4 p-5">
            <ImageField label="Project image" value={draft.image} onChange={set('image')} />
            <Select label="Status" value={draft.status} onChange={set('status')} options={STATUSES} />
            <IconPicker value={draft.icon} onChange={set('icon')} />
          </Card>
          <p className="text-[13px] text-[#9A9A9A]">Ctrl+S saves. You can keep editing after saving.</p>
        </aside>
      </div>
    </div>
  );
}
