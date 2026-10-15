'use client';

/**
 * An article's SEO settings: meta title and description (with a Google
 * result preview and length guides), the URL slug, the image shown when
 * it's shared, and whether search engines may list it. Blank fields fall
 * back to the article's title, excerpt and feature image.
 */

import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from '@/backend/modules/site-content/site-content.types';
import { ImageField, cx } from '../ui';

export interface SeoValue { seoTitle: string; seoDescription: string; seoImage: string; noIndex: boolean; slug: string }

const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

function Counter({ length, ideal, max }: { length: number; ideal: [number, number]; max: number }) {
  const tone = length === 0 ? 'text-[#8C8679]' : length < ideal[0] ? 'text-amber-600' : length <= ideal[1] ? 'text-green-700' : 'text-red-600';
  return <span className={cx('text-[12px] tabular-nums', tone)}>{length} / {max}</span>;
}

export default function SeoSettings({ value, fallback, savedSlug, published, onChange }: {
  value: SeoValue;
  fallback: { title: string; excerpt: string; image: string };
  /** The slug the article is saved under (none for a new article). */
  savedSlug?: string;
  published: boolean;
  onChange: (next: Partial<SeoValue>) => void;
}) {
  const title = value.seoTitle || fallback.title || 'Article title';
  const description = value.seoDescription || fallback.excerpt || 'Add a meta description or an excerpt to show here.';
  const slug = slugify(value.slug) || savedSlug || slugify(fallback.title) || 'article';
  const slugChanged = !!savedSlug && !!value.slug && slugify(value.slug) !== savedSlug;
  const input = 'w-full rounded-lg border border-[#E5E2D9] bg-white px-3 py-2 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#8C8679] focus:border-[#C89B3C]';

  return (
    <div className="space-y-4">
      {/* Search result preview */}
      <div className="rounded-lg border border-[#ECEAE3] bg-white p-3" aria-label="Search result preview">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8C8679]">Google preview</p>
        <p className="truncate text-[12px] text-[#4D5156]">agunwamienterprise.com › insights › {slug}</p>
        <p className="line-clamp-1 text-[17px] leading-snug text-[#1A0DAB]">{title.length > 60 ? `${title.slice(0, 60)}…` : title}</p>
        <p className="line-clamp-2 text-[13px] leading-snug text-[#4D5156]">{description.length > 160 ? `${description.slice(0, 160)}…` : description}</p>
      </div>

      <label className="block">
        <span className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#3A3A3A]">Meta title</span>
          <Counter length={value.seoTitle.length} ideal={[30, 60]} max={SEO_TITLE_MAX} />
        </span>
        <input className={input} value={value.seoTitle} maxLength={SEO_TITLE_MAX} onChange={e => onChange({ seoTitle: e.target.value })}
          placeholder={fallback.title ? `${fallback.title} (article title)` : 'Uses the article title'} />
        <span className="mt-1 block text-[12px] text-[#6B6B6B]">Shown in search results and the browser tab. Aim for 50–60 characters.</span>
      </label>

      <label className="block">
        <span className="mb-1 flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#3A3A3A]">Meta description</span>
          <Counter length={value.seoDescription.length} ideal={[70, 160]} max={SEO_DESCRIPTION_MAX} />
        </span>
        <textarea className={cx(input, 'min-h-[84px]')} value={value.seoDescription} maxLength={SEO_DESCRIPTION_MAX} onChange={e => onChange({ seoDescription: e.target.value })}
          placeholder={fallback.excerpt ? 'Uses the excerpt' : 'A short summary for search results'} />
        <span className="mt-1 block text-[12px] text-[#6B6B6B]">The summary under the title in search results. Aim for 120–160 characters.</span>
      </label>

      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[#3A3A3A]">URL slug</span>
        <div className="flex items-center rounded-lg border border-[#E5E2D9] bg-white focus-within:border-[#C89B3C]">
          <span className="shrink-0 pl-3 text-[13px] text-[#8C8679]">/insights/</span>
          <input className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-2 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#8C8679]"
            value={value.slug} maxLength={120} onChange={e => onChange({ slug: e.target.value })} onBlur={() => onChange({ slug: slugify(value.slug) })}
            placeholder={savedSlug || slugify(fallback.title) || 'made-from-the-title'} />
        </div>
        <span className={cx('mt-1 block text-[12px]', slugChanged && published ? 'text-amber-700' : 'text-[#6B6B6B]')}>
          {slugChanged && published
            ? 'Links to the current address will stop working once you save.'
            : 'Lowercase words joined by hyphens. Leave blank to keep the current one.'}
        </span>
      </label>

      <div>
        <ImageField label="Social share image" value={value.seoImage} onChange={seoImage => onChange({ seoImage })} />
        <span className="mt-1 block text-[12px] text-[#6B6B6B]">
          {value.seoImage ? 'Shown when the article is shared on social media and in messages.' : fallback.image ? 'Uses the feature image. Add one here to share a different image.' : 'Uses the feature image once you add one.'}
        </span>
      </div>

      <label className="flex items-start gap-2 text-[13px] text-[#4A4A4A]">
        <input type="checkbox" checked={value.noIndex} onChange={e => onChange({ noIndex: e.target.checked })} className="mt-0.5 accent-[#C89B3C]" />
        <span>Hide from search engines<span className="block text-[12px] text-[#9A9A9A]">The article stays on the site but Google and others are asked not to list it.</span></span>
      </label>
    </div>
  );
}
