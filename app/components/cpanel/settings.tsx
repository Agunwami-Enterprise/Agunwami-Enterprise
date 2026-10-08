'use client';

import { useState } from 'react';
import { ExternalLink, Image as ImageIcon, LayoutList, Megaphone, Palette, Pin, Plus, Save, Trash2 } from 'lucide-react';
import {
  Button, Card, ErrorNote, IconButton, ImageField, PageHeader, TextArea, TextInput, cpanelFetch, useMutation,
} from './ui';
import type { SiteFooterColumn, SiteSettings } from '@/backend/modules/site-content/site-content.types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="border-b border-[#F0EEE8] px-5 py-4 text-[15px] font-semibold text-[#1A1A1A]">{title}</h2>
      <div className="space-y-4 p-5">{children}</div>
    </Card>
  );
}

function SubSection({ icon: Icon, title, description, children }: {
  icon: typeof Pin; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-[#ECEAE3] p-5">
      <div>
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1A1A]"><Icon className="h-4 w-4" aria-hidden="true" /> {title}</h3>
        {description && <p className="mt-1 text-[13px] text-[#8A8A8A]">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">{label}</p>
      <div className="flex items-center gap-3 rounded-lg bg-[#F5F3EE] px-3 py-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value.toUpperCase())} aria-label={`${label} picker`}
          className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
        <input value={value} onChange={e => onChange(e.target.value)} aria-label={label} maxLength={7}
          className="flex-1 bg-transparent text-[14px] uppercase outline-none" />
      </div>
    </div>
  );
}

function ColumnEditor({ column, onChange, onRemove }: {
  column: SiteFooterColumn; onChange: (column: SiteFooterColumn) => void; onRemove: () => void;
}) {
  const setLink = (index: number, key: 'label' | 'href', value: string) =>
    onChange({ ...column, links: column.links.map((link, i) => (i === index ? { ...link, [key]: value } : link)) });
  return (
    <div className="space-y-3 rounded-lg border border-[#ECEAE3] bg-[#FDFCF9] p-4">
      <div className="flex items-end gap-2">
        <TextInput label="Column title" value={column.title} onChange={title => onChange({ ...column, title })} className="flex-1" />
        <IconButton label={`Remove ${column.title || 'column'}`} onClick={onRemove}><Trash2 className="h-4 w-4" /></IconButton>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">Links</p>
      {column.links.map((link, index) => (
        <div key={index} className="flex items-center gap-2">
          <input value={link.label} onChange={e => setLink(index, 'label', e.target.value)} placeholder="Label" aria-label="Link label"
            className="w-[40%] rounded-md bg-[#F5F3EE] px-2.5 py-2 text-[13px] outline-none focus:bg-white focus:ring-1 focus:ring-[#C89B3C]" />
          <input value={link.href} onChange={e => setLink(index, 'href', e.target.value)} placeholder="/page or https://…" aria-label="Link URL"
            className="min-w-0 flex-1 rounded-md bg-[#F5F3EE] px-2.5 py-2 text-[13px] outline-none focus:bg-white focus:ring-1 focus:ring-[#C89B3C]" />
          <IconButton label={`Remove ${link.label || 'link'}`} onClick={() => onChange({ ...column, links: column.links.filter((_, i) => i !== index) })}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ))}
      <Button variant="outline" className="w-full py-2" onClick={() => onChange({ ...column, links: [...column.links, { label: '', href: '' }] })}>
        <Plus className="h-4 w-4" aria-hidden="true" /> Add Link
      </Button>
    </div>
  );
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useMutation();
  const set = <K extends keyof SiteSettings>(key: K) => (value: SiteSettings[K]) => { setDraft(d => ({ ...d, [key]: value })); setSaved(false); };
  const setFooter = <K extends keyof SiteSettings['footer']>(key: K) => (value: SiteSettings['footer'][K]) => {
    setDraft(d => ({ ...d, footer: { ...d.footer, [key]: value } }));
    setSaved(false);
  };
  const columns = draft.footer.columns;

  async function save() {
    if (await run(() => cpanelFetch('/api/cpanel/settings', { method: 'PUT', json: draft }))) setSaved(true);
  }

  return (
    <div className="mx-auto max-w-[1075px] space-y-6 pb-10">
      <PageHeader title="Site Settings" subtitle="Manage your company information and contact details." />

      <Section title="Company Information">
        <TextInput label="Company name" value={draft.companyName} onChange={set('companyName')} />
        <TextInput label="Tagline" value={draft.tagline} onChange={set('tagline')} />
        <TextInput label="Location" value={draft.location} onChange={set('location')} placeholder="Atlanta, GA" />
      </Section>

      <Section title="Contact Details">
        <TextInput label="Email" type="email" value={draft.email} onChange={set('email')} />
        <TextInput label="Phone" value={draft.phone} onChange={set('phone')} placeholder="+1 404 000 0000" />
      </Section>

      <Section title="Social Media">
        {draft.socialLinks.map((link, index) => (
          <div key={index} className="flex items-end gap-2">
            <TextInput label="Network" value={link.label} className="w-[30%]" placeholder="LinkedIn"
              onChange={label => set('socialLinks')(draft.socialLinks.map((l, i) => (i === index ? { ...l, label } : l)))} />
            <TextInput label="URL" value={link.url} className="flex-1" placeholder="https://…"
              onChange={url => set('socialLinks')(draft.socialLinks.map((l, i) => (i === index ? { ...l, url } : l)))} />
            <IconButton label={`Remove ${link.label || 'social link'}`} onClick={() => set('socialLinks')(draft.socialLinks.filter((_, i) => i !== index))}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ))}
        <button type="button" onClick={() => set('socialLinks')([...draft.socialLinks, { label: '', url: '' }])}
          className="w-full rounded-lg border border-[#C89B3C] py-2.5 text-[14px] font-medium text-[#C89B3C] hover:bg-[#FDF8EC]">
          + Add Social Link
        </button>
      </Section>

      <Section title="Footer">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SubSection icon={Pin} title="1. Brand & Description">
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-[#E2DFD5] bg-[#1A1A1A] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {draft.footer.logoUrl && <img src={draft.footer.logoUrl} alt="Logo preview" className="h-10 object-contain" />}
              <span className="ml-3 font-primary text-[18px] text-white">{draft.companyName}</span>
            </div>
            <ImageField label="Company logo" value={draft.footer.logoUrl} onChange={setFooter('logoUrl')} />
            <TextArea label="Description" value={draft.footer.description} onChange={setFooter('description')} rows={4} maxLength={300}
              hint={`${draft.footer.description.length}/300`} />
            <TextInput label="Contact email" type="email" value={draft.footer.contactEmail} onChange={setFooter('contactEmail')} />
          </SubSection>

          <SubSection icon={LayoutList} title="2. Navigation Columns" description="Manage your footer link columns and their links.">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {columns.map((column, index) => (
                <ColumnEditor key={index} column={column}
                  onChange={next => setFooter('columns')(columns.map((c, i) => (i === index ? next : c)))}
                  onRemove={() => setFooter('columns')(columns.filter((_, i) => i !== index))} />
              ))}
            </div>
            <button type="button" onClick={() => setFooter('columns')([...columns, { title: 'New Column', links: [] }])}
              className="w-full rounded-lg border border-[#C89B3C] py-2.5 text-[14px] font-medium text-[#C89B3C] hover:bg-[#FDF8EC]">
              + Add Column
            </button>
          </SubSection>

          <SubSection icon={ExternalLink} title="3. Get Started CTA" description="Configure the call-to-action button in the right column.">
            <TextInput label="Heading" value={draft.footer.ctaHeading} onChange={setFooter('ctaHeading')} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput label="Button text" value={draft.footer.ctaButtonText} onChange={setFooter('ctaButtonText')} />
              <TextInput label="Button URL" value={draft.footer.ctaButtonUrl} onChange={setFooter('ctaButtonUrl')} placeholder="/contact or mailto:…" />
            </div>
          </SubSection>

          <SubSection icon={Megaphone} title="4. Footer Bottom" description="Manage copyright text and tagline.">
            <TextInput label="Copyright text" value={draft.footer.copyright} onChange={setFooter('copyright')} />
            <TextInput label="Tagline" value={draft.footer.bottomTagline} onChange={setFooter('bottomTagline')} />
          </SubSection>
        </div>

        <SubSection icon={Palette} title="5. Background & Appearance" description="Customize the look and feel of your footer.">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg bg-[#111111]">
              {draft.footer.backgroundImageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={draft.footer.backgroundImageUrl} alt="" style={{ opacity: draft.footer.backgroundOpacity / 100 }} className="h-full w-full object-cover" />
                : <ImageIcon className="h-6 w-6 text-[#5A5A5A]" aria-hidden="true" />}
            </div>
            <label className="min-w-[220px] flex-1 space-y-2">
              <span className="flex justify-between text-[14px] font-semibold text-[#1A1A1A]">
                Pattern visibility <span className="font-normal text-[#8A8A8A]">{draft.footer.backgroundOpacity}%</span>
              </span>
              <input type="range" min={0} max={100} value={draft.footer.backgroundOpacity}
                onChange={e => setFooter('backgroundOpacity')(Number(e.target.value))} className="w-full accent-[#C89B3C]" />
            </label>
          </div>
          <ImageField label="Background image" value={draft.footer.backgroundImageUrl} onChange={setFooter('backgroundImageUrl')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ColorField label="Text colour" value={draft.footer.textColor} onChange={setFooter('textColor')} />
            <ColorField label="Accent colour" value={draft.footer.accentColor} onChange={setFooter('accentColor')} />
          </div>
        </SubSection>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex items-center gap-4 bg-gradient-to-t from-[#FBFAF3] via-[#FBFAF3] to-transparent px-1 pb-2 pt-6">
        <Button variant="gold" busy={busy} onClick={save}>
          {!busy && <Save className="h-4 w-4" aria-hidden="true" />} Save Settings
        </Button>
        {saved && <span className="text-[14px] text-green-700" role="status">Saved. The website is updated.</span>}
        <div className="flex-1"><ErrorNote message={error} /></div>
      </div>
    </div>
  );
}
