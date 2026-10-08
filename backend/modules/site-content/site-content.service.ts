/**
 * backend/modules/site-content/site-content.service.ts
 *
 * Validated reads and writes of website content for the C-panel and the
 * public pages.
 */

import { randomUUID } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import {
  defaultArticles,
  defaultPartnershipCategories,
  defaultProjects,
  defaultSettings,
  defaultTeamMembers,
  slugify,
} from './site-content.defaults';
import { readCollection, readSettings, updateCollection, writeSettings } from './site-content.store';
import {
  APPLICATION_STATUSES,
  ARTICLE_CATEGORIES,
  SITE_ICON_NAMES,
  type ApplicationStatus,
  type PartnershipApplication,
  type SiteArticle,
  type SiteArticleCategory,
  type SiteIconName,
  type SitePartnershipCategory,
  type SiteProject,
  type SiteSettings,
  type SiteTeamMember,
} from './site-content.types';

export class SiteContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteContentValidationError';
  }
}

export class SiteContentNotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found.`);
    this.name = 'SiteContentNotFoundError';
  }
}

// ── Field helpers ───────────────────────────────────────────────────────────

type Input = Record<string, unknown>;

function text(input: Input, key: string, { required = false, max = 2000, label = key } = {}): string {
  const raw = input[key];
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (required && !value) throw new SiteContentValidationError(`${label} is required.`);
  if (value.length > max) throw new SiteContentValidationError(`${label} must be at most ${max} characters.`);
  return value;
}

/** A site path ("/logo.png") or an http(s)/mailto URL; never javascript: and the like. */
function url(input: Input, key: string, { label = key, allowMailto = false } = {}): string {
  const value = text(input, key, { max: 2000, label });
  if (!value || value === '#') return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const parsed = new URL(value);
    if (['http:', 'https:'].includes(parsed.protocol) || (allowMailto && parsed.protocol === 'mailto:')) return value;
  } catch {
    // fall through
  }
  throw new SiteContentValidationError(`${label} must be a link starting with https:// or /.`);
}

function list(input: Input, key: string, { max = 30, itemMax = 200 } = {}): string[] {
  const raw = input[key];
  const items = (Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split('\n') : [])
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  if (items.length > max) throw new SiteContentValidationError(`${key} can have at most ${max} entries.`);
  return items.map(item => item.slice(0, itemMax));
}

function icon(input: Input, key: string, fallback: SiteIconName): SiteIconName {
  const value = input[key];
  return SITE_ICON_NAMES.includes(value as SiteIconName) ? value as SiteIconName : fallback;
}

function uniqueSlug(base: string, taken: Iterable<string>, fallback: string): string {
  const used = new Set(taken);
  const root = slugify(base) || fallback;
  let slug = root;
  for (let n = 2; used.has(slug); n++) slug = `${root}-${n}`;
  return slug;
}

const ARTICLE_HTML: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'code', 'pre',
    'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'hr', 'figure', 'figcaption',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    p: ['style'], h2: ['style'], h3: ['style'], h4: ['style'],
  },
  allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/] } },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, ARTICLE_HTML);
}

// ── Projects ────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<SiteProject[]> {
  return (await readCollection('projects')) ?? defaultProjects();
}

export async function getProjectBySlug(slug: string): Promise<SiteProject | null> {
  const clean = slug.toLowerCase();
  return (await listProjects()).find(project => project.slug === clean || project.id === clean) ?? null;
}

function parseStats(input: Input): SiteProject['stats'] {
  return list(input, 'stats', { max: 6 }).map(line => {
    const [value, ...label] = line.split('|');
    return { value: value.trim(), label: label.join('|').trim() };
  }).filter(stat => stat.value && stat.label);
}

export async function saveProject(input: Input, id?: string): Promise<SiteProject> {
  const name = text(input, 'name', { required: true, max: 120, label: 'Title' });
  const category = text(input, 'category', { required: true, max: 60, label: 'Category' });
  let saved: SiteProject | undefined;
  await updateCollection('projects', defaultProjects, projects => {
    const existing = id ? projects.find(project => project.id === id) : undefined;
    if (id && !existing) throw new SiteContentNotFoundError('Project');
    const slug = existing?.slug ?? uniqueSlug(name, projects.map(p => p.slug), 'project');
    saved = {
      ...(existing ?? { testimonials: [], heroBgClass: undefined, impact: undefined }),
      id: existing?.id ?? slug,
      slug,
      name,
      category,
      icon: icon(input, 'icon', existing?.icon ?? 'Briefcase'),
      subtitle: text(input, 'subtitle', { max: 200, label: 'Tagline' }),
      homeDescription: text(input, 'homeDescription', { max: 300, label: 'Card description' }),
      description: text(input, 'description', { max: 4000, label: 'Overview' }),
      challenges: text(input, 'challenges', { max: 4000, label: 'Challenge' }),
      solution: text(input, 'solution', { max: 4000, label: 'Solution' }),
      technologyStack: list(input, 'technologyStack', { max: 20, itemMax: 40 }),
      image: url(input, 'image', { label: 'Image URL' }),
      status: text(input, 'status', { max: 40 }) || 'ACTIVE',
      websiteUrl: url(input, 'websiteUrl', { label: 'Website URL' }),
      stats: input.stats === undefined ? existing?.stats ?? [] : parseStats(input),
      deliverables: input.deliverables === undefined ? existing?.deliverables ?? [] : list(input, 'deliverables'),
    } as SiteProject;
    return existing
      ? projects.map(project => (project.id === existing.id ? saved! : project))
      : [...projects, saved];
  });
  return saved!;
}

export async function deleteProject(id: string): Promise<void> {
  await updateCollection('projects', defaultProjects, projects => {
    if (!projects.some(project => project.id === id)) throw new SiteContentNotFoundError('Project');
    return projects.filter(project => project.id !== id);
  });
}

// ── Team ────────────────────────────────────────────────────────────────────

export async function listTeam(): Promise<SiteTeamMember[]> {
  return (await readCollection('team')) ?? defaultTeamMembers();
}

export async function saveTeamMember(input: Input, id?: string): Promise<SiteTeamMember> {
  const member = {
    name: text(input, 'name', { required: true, max: 80, label: 'Full name' }),
    role: text(input, 'role', { required: true, max: 80, label: 'Role / title' }),
    bio: text(input, 'bio', { max: 600, label: 'Bio' }),
    image: url(input, 'image', { label: 'Photo URL' }),
    linkedin: url(input, 'linkedin', { label: 'LinkedIn URL' }),
  };
  let saved: SiteTeamMember | undefined;
  await updateCollection('team', defaultTeamMembers, team => {
    if (id && !team.some(m => m.id === id)) throw new SiteContentNotFoundError('Team member');
    saved = { id: id ?? randomUUID(), ...member };
    return id ? team.map(m => (m.id === id ? saved! : m)) : [...team, saved];
  });
  return saved!;
}

export async function deleteTeamMember(id: string): Promise<void> {
  await updateCollection('team', defaultTeamMembers, team => {
    if (!team.some(m => m.id === id)) throw new SiteContentNotFoundError('Team member');
    return team.filter(m => m.id !== id);
  });
}

// ── Articles ────────────────────────────────────────────────────────────────

/** All articles, newest first; pass publishedOnly for the public site. */
export async function listArticles({ publishedOnly = false } = {}): Promise<SiteArticle[]> {
  const articles = (await readCollection('articles')) ?? defaultArticles();
  return articles
    .filter(article => !publishedOnly || article.published)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getArticle(idOrSlug: string, { publishedOnly = false } = {}): Promise<SiteArticle | null> {
  return (await listArticles({ publishedOnly })).find(a => a.id === idOrSlug || a.slug === idOrSlug) ?? null;
}

/** Rough reading time at 220 words per minute. */
function estimateReadTime(html: string): string {
  const words = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

export async function saveArticle(input: Input, id?: string): Promise<SiteArticle> {
  const title = text(input, 'title', { required: true, max: 160, label: 'Title' });
  const category = input.category as SiteArticleCategory;
  if (!ARTICLE_CATEGORIES.includes(category)) throw new SiteContentValidationError('Choose a category.');
  const body = sanitizeArticleHtml(typeof input.body === 'string' ? input.body : '');
  if (body.length > 200_000) throw new SiteContentValidationError('The article is too long.');
  const published = input.published === true;
  if (published && !sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} }).trim()) {
    throw new SiteContentValidationError('Write the article before publishing it.');
  }
  const date = text(input, 'date', { max: 10 }) || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new SiteContentValidationError('Date must be YYYY-MM-DD.');

  let saved: SiteArticle | undefined;
  await updateCollection('articles', defaultArticles, articles => {
    const existing = id ? articles.find(a => a.id === id) : undefined;
    if (id && !existing) throw new SiteContentNotFoundError('Article');
    const slug = existing?.slug ?? uniqueSlug(title, articles.map(a => a.slug), 'article');
    const image = url(input, 'image', { label: 'Card image URL' });
    saved = {
      id: existing?.id ?? slug,
      slug,
      title,
      category,
      excerpt: text(input, 'excerpt', { max: 400, label: 'Excerpt' }),
      date,
      readTime: text(input, 'readTime', { max: 30, label: 'Read time' }) || estimateReadTime(body),
      author: text(input, 'author', { max: 80, label: 'Author' }),
      authorRole: text(input, 'authorRole', { max: 80, label: 'Author role' }),
      authorImage: url(input, 'authorImage', { label: 'Author photo URL' }),
      image,
      heroImage: url(input, 'heroImage', { label: 'Hero image URL' }) || image,
      body,
      pullQuote: text(input, 'pullQuote', { max: 400, label: 'Pull quote' }),
      published,
    };
    return existing ? articles.map(a => (a.id === existing.id ? saved! : a)) : [...articles, saved];
  });
  return saved!;
}

export async function deleteArticle(id: string): Promise<void> {
  await updateCollection('articles', defaultArticles, articles => {
    if (!articles.some(a => a.id === id)) throw new SiteContentNotFoundError('Article');
    return articles.filter(a => a.id !== id);
  });
}

// ── Partnership categories ──────────────────────────────────────────────────

export async function listPartnershipCategories(): Promise<SitePartnershipCategory[]> {
  return (await readCollection('partnershipCategories')) ?? defaultPartnershipCategories();
}

export async function savePartnershipCategory(input: Input, id?: string): Promise<SitePartnershipCategory> {
  const title = text(input, 'title', { required: true, max: 80, label: 'Title' });
  let saved: SitePartnershipCategory | undefined;
  await updateCollection('partnershipCategories', defaultPartnershipCategories, categories => {
    if (id && !categories.some(c => c.id === id)) throw new SiteContentNotFoundError('Category');
    saved = {
      id: id ?? randomUUID(),
      number: text(input, 'number', { max: 4 }) || String(categories.length + (id ? 0 : 1)).padStart(2, '0'),
      title,
      icon: icon(input, 'icon', 'Handshake'),
      description: text(input, 'description', { max: 600, label: 'Description' }),
      benefits: list(input, 'benefits', { max: 12, itemMax: 120 }),
    };
    return id ? categories.map(c => (c.id === id ? saved! : c)) : [...categories, saved];
  });
  return saved!;
}

export async function deletePartnershipCategory(id: string): Promise<void> {
  await updateCollection('partnershipCategories', defaultPartnershipCategories, categories => {
    if (!categories.some(c => c.id === id)) throw new SiteContentNotFoundError('Category');
    return categories.filter(c => c.id !== id);
  });
}

/** Saves a new order (ids, first to last) and renumbers 01, 02, …. */
export async function reorderPartnershipCategories(ids: unknown): Promise<SitePartnershipCategory[]> {
  if (!Array.isArray(ids)) throw new SiteContentValidationError('ids must be a list.');
  return updateCollection('partnershipCategories', defaultPartnershipCategories, categories => {
    const byId = new Map(categories.map(c => [c.id, c]));
    if (ids.length !== categories.length || ids.some(id => !byId.has(id as string))) {
      throw new SiteContentValidationError('The order must list every category exactly once.');
    }
    return ids.map((id, index) => ({ ...byId.get(id as string)!, number: String(index + 1).padStart(2, '0') }));
  });
}

// ── Partnership applications ────────────────────────────────────────────────

const noApplications = (): PartnershipApplication[] => [];

/** Newest first. */
export async function listApplications(): Promise<PartnershipApplication[]> {
  const applications = (await readCollection('applications')) ?? [];
  return [...applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

const APPLICATION_TEXT_FIELDS = [
  'phone', 'linkedin', 'role', 'orgName', 'orgType', 'industry', 'orgSize', 'website', 'location',
  'yearsInOperation', 'otherHelpNeeded', 'projectDescription', 'otherChallenge', 'desiredOutcome',
  'currentSolutionType', 'otherService', 'additionalNotes', 'budgetRange', 'startTime', 'deadline',
  'decisionMakers', 'otherStakeholders', 'otherRole',
] as const;

/** Stores a submission of the public /partnerships/apply form. */
export async function submitApplication(input: Input): Promise<PartnershipApplication> {
  const email = text(input, 'email', { required: true, max: 200, label: 'Email' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SiteContentValidationError('Enter a valid email address.');
  const application: PartnershipApplication = {
    id: randomUUID(),
    status: 'pending',
    submittedAt: new Date().toISOString(),
    firstName: text(input, 'firstName', { required: true, max: 80, label: 'First name' }),
    lastName: text(input, 'lastName', { required: true, max: 80, label: 'Last name' }),
    email,
    helpNeeded: list(input, 'helpNeeded', { max: 20, itemMax: 120 }),
    challenges: list(input, 'challenges', { max: 20, itemMax: 120 }),
    services: list(input, 'services', { max: 20, itemMax: 120 }),
    ...Object.fromEntries(APPLICATION_TEXT_FIELDS.map(key => [key, text(input, key, { max: 3000 })])),
  } as PartnershipApplication;
  await updateCollection('applications', noApplications, applications => [...applications, application]);
  return application;
}

export async function setApplicationStatus(id: string, status: unknown): Promise<void> {
  if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) throw new SiteContentValidationError('Unknown status.');
  await updateCollection('applications', noApplications, applications => {
    if (!applications.some(a => a.id === id)) throw new SiteContentNotFoundError('Application');
    return applications.map(a => (a.id === id ? { ...a, status: status as ApplicationStatus } : a));
  });
}

export async function deleteApplication(id: string): Promise<void> {
  await updateCollection('applications', noApplications, applications => {
    if (!applications.some(a => a.id === id)) throw new SiteContentNotFoundError('Application');
    return applications.filter(a => a.id !== id);
  });
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<SiteSettings> {
  const defaults = defaultSettings();
  const stored = await readSettings();
  if (!stored) return defaults;
  return { ...defaults, ...stored, footer: { ...defaults.footer, ...(stored.footer ?? {}) } };
}

function color(input: Input, key: string, label: string): string {
  const value = text(input, key, { max: 9, label });
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new SiteContentValidationError(`${label} must be a colour like #C89B3C.`);
  return value.toUpperCase();
}

export async function saveSettings(input: Input): Promise<SiteSettings> {
  const footerInput = (input.footer ?? {}) as Input;
  const socialLinks = (Array.isArray(input.socialLinks) ? input.socialLinks : [])
    .slice(0, 12)
    .map(link => ({ label: text(link as Input, 'label', { max: 40 }), url: url(link as Input, 'url', { label: 'Social link' }) }))
    .filter(link => link.label && link.url);
  const columns = (Array.isArray(footerInput.columns) ? footerInput.columns : [])
    .slice(0, 6)
    .map(column => {
      const col = column as Input;
      const links = (Array.isArray(col.links) ? col.links : []).slice(0, 12)
        .map(link => ({ label: text(link as Input, 'label', { max: 40 }), href: url(link as Input, 'href', { label: 'Footer link' }) }))
        .filter(link => link.label && link.href);
      return { title: text(col, 'title', { required: true, max: 40, label: 'Column title' }), links };
    });
  const opacity = Number(footerInput.backgroundOpacity);

  const settings: SiteSettings = {
    companyName: text(input, 'companyName', { required: true, max: 80, label: 'Company name' }),
    tagline: text(input, 'tagline', { max: 120, label: 'Tagline' }),
    location: text(input, 'location', { max: 120, label: 'Location' }),
    email: text(input, 'email', { max: 200, label: 'Email' }),
    phone: text(input, 'phone', { max: 40, label: 'Phone' }),
    socialLinks,
    footer: {
      logoUrl: url(footerInput, 'logoUrl', { label: 'Logo' }) || '/logo.png',
      description: text(footerInput, 'description', { max: 300, label: 'Description' }),
      contactEmail: text(footerInput, 'contactEmail', { max: 200, label: 'Contact email' }),
      columns,
      ctaHeading: text(footerInput, 'ctaHeading', { max: 60, label: 'CTA heading' }),
      ctaButtonText: text(footerInput, 'ctaButtonText', { max: 40, label: 'Button text' }),
      ctaButtonUrl: url(footerInput, 'ctaButtonUrl', { label: 'Button URL', allowMailto: true }),
      copyright: text(footerInput, 'copyright', { max: 160, label: 'Copyright text' }),
      bottomTagline: text(footerInput, 'bottomTagline', { max: 160, label: 'Tagline' }),
      backgroundImageUrl: url(footerInput, 'backgroundImageUrl', { label: 'Background image' }),
      backgroundOpacity: Number.isFinite(opacity) ? Math.min(100, Math.max(0, Math.round(opacity))) : 10,
      textColor: color(footerInput, 'textColor', 'Text colour'),
      accentColor: color(footerInput, 'accentColor', 'Accent colour'),
    },
  };
  await writeSettings(settings);
  return settings;
}
