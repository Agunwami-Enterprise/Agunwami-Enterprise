/**
 * C-panel content in the shapes the public pages already render.
 *
 * Reads never fall back to built-in content: if storage can't be reached
 * the page shows an error. Results are cached for a few seconds
 * (content-cache.ts); C-panel saves clear the cache.
 */

import 'server-only';
import { createElement } from 'react';
import SiteIcon from '@/app/components/common/SiteIcon';
import { cached } from './content-cache';
import { CgMail } from 'react-icons/cg';
import { BiPhone } from 'react-icons/bi';
import { FaLocationPin } from 'react-icons/fa6';
import type { ContactDetail, ProjectItem } from '@/lib/dummy';
import type { TeamMember } from '@/lib/data/teamData';
import {
  getSettings,
  listArticles,
  listPartnershipCategories,
  listProjects,
  listDisplayedTeam,
  type SiteArticle,
  type SiteIconName,
  type SiteProject,
  type SiteSettings,
} from '@/backend/modules/site-content';

function iconComponent(name: SiteIconName) {
  const Icon = ({ className, size }: { className?: string; size?: number | string }) => createElement(SiteIcon, { name, className, size });
  Icon.displayName = `SiteIcon(${name})`;
  return Icon;
}

function toProjectItem(project: SiteProject): ProjectItem {
  return {
    client: project.kind === 'client',
    icon: iconComponent(project.icon),
    name: project.name,
    image: project.image || '/ecocard.png',
    homeDescription: project.homeDescription || project.subtitle,
    projectCategory: project.category,
    description: project.description,
    challenges: project.challenges,
    solution: project.solution,
    technologyStack: project.technologyStack,
    status: project.status,
    link: `/projects/${project.slug}`,
    subtitle: project.subtitle,
    heroBgClass: project.heroBgClass,
    stats: project.stats,
    deliverables: project.deliverables,
    testimonials: project.testimonials,
    impact: project.impact || undefined,
    ecoshort: project.ecosystemSummary || undefined,
    ecodesc: project.ecosystemDescription || undefined,
    ecokey: project.ecosystemFeatures.length ? project.ecosystemFeatures : undefined,
  };
}

const publishedProjects = () => cached('projects', () => listProjects({ publishedOnly: true }));

/**
 * Projects shown on the website, from the AE workstation's project
 * collection: client work (client: true) and ecosystem platforms.
 */
export async function getSiteProjects(): Promise<ProjectItem[]> {
  return (await publishedProjects()).map(toProjectItem);
}

export async function getSiteProjectBySlug(slug: string): Promise<{ project: ProjectItem; websiteUrl: string } | null> {
  const clean = slug.toLowerCase();
  const project = (await publishedProjects()).find(p => p.slug === clean) ?? null;
  return project ? { project: toProjectItem(project), websiteUrl: project.websiteUrl } : null;
}

export async function getSiteTeam(): Promise<TeamMember[]> {
  // Only the members chosen in the C-panel.
  const team = await cached('team', listDisplayedTeam);
  return team.map(({ name, role, bio, image, linkedin }) => ({ name, role, bio, image, linkedin }));
}

export async function getPublishedArticles(): Promise<SiteArticle[]> {
  return cached('articles', () => listArticles({ publishedOnly: true }));
}

export function formatArticleDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export interface ArticleHeading { id: string; text: string }

/**
 * Gives each <h2> in sanitized article HTML an id for the table of
 * contents, and returns the headings.
 */
export function outlineArticle(html: string): { html: string; headings: ArticleHeading[] } {
  const headings: ArticleHeading[] = [];
  const used = new Set<string>();
  const withIds = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (_match, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
    let id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    for (let n = 2; used.has(id); n++) id = `${id.replace(/-\d+$/, '')}-${n}`;
    used.add(id);
    headings.push({ id, text });
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
  return { html: withIds, headings };
}

export interface PartnershipCategoryCard {
  icon: ReturnType<typeof iconComponent>;
  title: string;
  description: string;
  number: string;
  partnershipBenefits: string[];
}

export async function getPartnershipCategories(): Promise<PartnershipCategoryCard[]> {
  const categories = await cached('partnership-categories', listPartnershipCategories);
  return categories.map(category => ({
    icon: iconComponent(category.icon),
    title: category.title,
    description: category.description,
    number: category.number,
    partnershipBenefits: category.benefits,
  }));
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return cached('settings', getSettings);
}

/** Email, phone and location cards for the Contact page, from Site Settings. */
export async function getContactDetails(): Promise<ContactDetail[]> {
  const { email, phone, location } = await getSiteSettings();
  const details: ContactDetail[] = [];
  if (email) details.push({ icon: CgMail, name: 'EMAIL', details: email, link: `mailto:${email}` });
  if (phone) details.push({ icon: BiPhone, name: 'PHONE', details: phone, link: `tel:${phone.replace(/[^d+]/g, '')}` });
  if (location) details.push({ icon: FaLocationPin, name: 'LOCATION', details: location, text: 'Serving clients globally' });
  return details;
}
