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
  portfolioProjects,
  defaultSettings,
  defaultTeamMembers,
  slugify,
} from './site-content.defaults';
import { readCollection, readSettings, updateCollection, writeSettings } from './site-content.store';
import { APPLICATION_LIMITS, firstInvalidApplicationStep } from './application-rules';
import {
  ProjectAlreadyExistsError,
  ProjectValidationError,
  ProjectsService,
  listProjectRecords,
  type ProjectRecord,
} from '../projects/projects.service';
import {
  APPLICATION_STATUSES,
  ARTICLE_FONTS,
  ARTICLE_ROLES,
  MAX_CATEGORY_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  PROJECT_KINDS,
  SITE_ICON_NAMES,
  type ApplicationStatus,
  type ArticleCategoryInfo,
  type ArticleCollaborator,
  type ArticlePerson,
  type ArticleRole,
  type PartnershipApplication,
  type SiteArticle,
  type SiteIconName,
  type SitePartnershipCategory,
  type ProjectKind,
  type SiteProject,
  type SiteProjectWebsite,
  type SiteSettings,
  type SiteTeamMember,
} from './site-content.types';
import { LOCK_MS, heldByOther, permissionsOf, type ArticleActor, type ArticlePermissions } from './article-access';

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

/** Not allowed for this person (e.g. editing an article they only have view access to). */
export class SiteContentForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteContentForbiddenError';
  }
}

/** Clashes with someone else's work (e.g. they're editing the article, or saved newer changes). */
export class SiteContentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteContentConflictError';
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

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;
const FONT_FAMILIES = new Set(ARTICLE_FONTS.map(f => f.css.replace(/\s+/g, ' ').trim()));

// What the C-panel article editor produces (see app/components/cpanel/article/extensions.ts).
const ARTICLE_HTML: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'code', 'pre', 'span', 'sub', 'sup',
    'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'hr', 'figure', 'figcaption',
    'table', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    // Checklists: <ul data-type="taskList"><li data-checked><label><input type="checkbox"></label><div>…</div></li>
    'label', 'input', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    // data-description: the image's description when the writer chose not to show it.
    img: ['src', 'alt', 'title', 'data-description'],
    p: ['style'], h2: ['style'], h3: ['style'], h4: ['style'],
    span: ['style'], mark: ['style', 'data-color'],
    ul: ['data-type'], li: ['data-type', 'data-checked'],
    input: ['type', 'checked', 'disabled'],
    th: ['colspan', 'rowspan', 'style'], td: ['colspan', 'rowspan', 'style'],
    table: ['style'], col: ['style'],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      color: [COLOR],
      'background-color': [COLOR],
      'font-size': [/^([89]|[1-6]\d|7[0-2])(\.\d)?px$/],
      'font-family': [/^[\w\s,"'-]{1,80}$/],
      'line-height': [/^(1|1\.15|1\.5|1\.85|2|2\.5)$/],
      'margin-left': [/^(2|4|6|8|10|12)em$/],
      'min-width': [/^\d{1,4}px$/],
      width: [/^\d{1,4}px$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Only checkboxes (checklists) among inputs, always read-only on the site.
  exclusiveFilter: frame => frame.tag === 'input' && frame.attribs.type !== 'checkbox',
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    input: (tagName, attribs) => ({ tagName, attribs: { ...attribs, disabled: '' } }),
    span: (tagName, attribs) => {
      // Fonts outside the editor's list are dropped.
      const style = (attribs.style ?? '').split(';').filter(rule => {
        const [prop, ...rest] = rule.split(':');
        if (prop?.trim().toLowerCase() !== 'font-family') return true;
        return FONT_FAMILIES.has(rest.join(':').replace(/\s+/g, ' ').trim());
      }).join(';');
      return { tagName, attribs: { ...attribs, style } };
    },
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, ARTICLE_HTML);
}

// ── Projects (stored in the AE workstation's enterprise_projects) ──────────

const squash = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const asText = (value: unknown) => (typeof value === 'string' ? value : '');
const asList = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

/** A workstation record as a website project; records never edited in the C-panel are hidden. */
function toSiteProject(record: ProjectRecord): SiteProject {
  const id = (record._id || record.id) as string;
  const web = (record.website && typeof record.website === 'object' ? record.website : {}) as Partial<SiteProjectWebsite>;
  const name = asText(record.name) || 'Untitled Project';
  return {
    id,
    name,
    adminUrl: asText(record.adminUrl),
    apiEndpoint: asText(record.apiEndpoint),
    hasApiToken: typeof record.apiTokenEncrypted === 'string' && record.apiTokenEncrypted.length > 0,
    lead: asText(record.lead),
    color: asText(record.color) || '#C89B3C',
    slug: web.slug || slugify(name) || id,
    kind: PROJECT_KINDS.includes(web.kind as ProjectKind) ? web.kind as ProjectKind : 'client',
    published: web.published === true,
    category: web.category || asText(record.subtitle),
    icon: SITE_ICON_NAMES.includes(web.icon as SiteIconName) ? web.icon as SiteIconName : 'Briefcase',
    subtitle: asText(web.subtitle),
    homeDescription: web.homeDescription ?? asText(record.description),
    description: web.description ?? asText(record.description),
    challenges: asText(web.challenges),
    solution: asText(web.solution),
    technologyStack: asList(web.technologyStack),
    image: asText(web.image),
    status: web.status || 'ACTIVE',
    websiteUrl: asText(web.websiteUrl),
    heroBgClass: web.heroBgClass || undefined,
    stats: Array.isArray(web.stats) ? web.stats : [],
    deliverables: asList(web.deliverables),
    testimonials: Array.isArray(web.testimonials) ? web.testimonials : [],
    impact: asText(web.impact),
    ecosystemSummary: asText(web.ecosystemSummary),
    ecosystemDescription: asText(web.ecosystemDescription),
    ecosystemFeatures: asList(web.ecosystemFeatures),
  };
}

let seeding: Promise<void> | null = null;

/**
 * Copies the projects that used to be hard-coded on the portfolio into the
 * workstation's project collection. Runs only while no workstation project
 * has website content, so it happens once. A workstation project with the
 * same name gets the content instead of a duplicate. Skipped while building
 * in CI, which has no access to the store.
 */
function ensurePortfolioSeeded(): Promise<void> {
  // `next build` sets NEXT_PHASE in its main process and NEXT_IS_EXPORT_WORKER
  // in the workers that render pages. A build must never write: the deploy
  // uploads data/ and would overwrite the server's project file.
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_IS_EXPORT_WORKER === 'true') {
    return Promise.resolve();
  }
  seeding ??= (async () => {
    const records = await listProjectRecords();
    if (records.some(record => record.website)) return;
    for (const { name, website } of portfolioProjects()) {
      const key = squash(name);
      const match = records.find(record => {
        const other = squash(asText(record.name));
        return other && (other === key || other.startsWith(key) || key.startsWith(other));
      });
      if (match) {
        await ProjectsService.updateProject((match._id || match.id) as string, { website: { ...website } });
      } else {
        await ProjectsService.createProject(
          { name, subtitle: website.category, description: website.homeDescription, color: '#C89B3C', website: { ...website } },
          { requireMetrics: false },
        ).catch(err => { if (!(err instanceof ProjectAlreadyExistsError)) throw err; });
      }
    }
  })().finally(() => { seeding = null; });
  return seeding;
}

/** Workstation projects as website projects; publishedOnly for the public site. */
export async function listProjects({ publishedOnly = false } = {}): Promise<SiteProject[]> {
  await ensurePortfolioSeeded();
  const projects = (await listProjectRecords()).map(toSiteProject);
  return publishedOnly ? projects.filter(project => project.published) : projects;
}

export async function getProjectBySlug(slugOrId: string, { publishedOnly = false } = {}): Promise<SiteProject | null> {
  const clean = slugOrId.toLowerCase();
  return (await listProjects({ publishedOnly })).find(project => project.slug === clean || project.id === slugOrId) ?? null;
}

/** Key results as [{ value, label }], or lines of "value | label". */
function parseStats(input: Input): SiteProject['stats'] {
  const raw = input.stats;
  const stats = Array.isArray(raw) && raw.some(item => typeof item === 'object' && item)
    ? raw.map(item => ({
      value: text(item as Input, 'value', { max: 20, label: 'Result value' }),
      label: text(item as Input, 'label', { max: 80, label: 'Result label' }),
    }))
    : list(input, 'stats', { max: 6 }).map(line => {
      const [value, ...label] = line.split('|');
      return { value: value.trim(), label: label.join('|').trim() };
    });
  const filled = stats.filter(stat => stat.value && stat.label);
  if (filled.length > 6) throw new SiteContentValidationError('Add at most 6 key results.');
  return filled;
}

/**
 * Creates (no id) or updates a workstation project from the shared project
 * editor (C-panel and CEO dashboard): name, admin URL, lead, colour, metrics
 * endpoint and token, and website content. A blank
 * token keeps the saved one; clearApiToken removes it.
 */
export async function saveProject(input: Input, id?: string): Promise<SiteProject> {
  const name = text(input, 'name', { required: true, max: 120, label: 'Title' });
  const category = text(input, 'category', { required: true, max: 60, label: 'Category' });
  const kind = input.kind as ProjectKind;
  if (!PROJECT_KINDS.includes(kind)) throw new SiteContentValidationError('Choose whether this is client work or an ecosystem platform.');

  const all = await listProjects();
  const existing = id ? all.find(project => project.id === id) : undefined;
  if (id && !existing) throw new SiteContentNotFoundError('Project');
  const slug = existing?.slug ?? uniqueSlug(name, all.map(p => p.slug), 'project');

  const website: SiteProjectWebsite = {
    slug,
    kind,
    published: input.published === true,
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
    websiteUrl: url(input, 'websiteUrl', { label: 'Live URL' }),
    heroBgClass: existing?.heroBgClass,
    stats: input.stats === undefined ? existing?.stats ?? [] : parseStats(input),
    deliverables: input.deliverables === undefined ? existing?.deliverables ?? [] : list(input, 'deliverables'),
    testimonials: existing?.testimonials ?? [],
    impact: text(input, 'impact', { max: 600, label: 'Impact' }),
    ecosystemSummary: text(input, 'ecosystemSummary', { max: 160, label: 'Ecosystem summary' }),
    ecosystemDescription: text(input, 'ecosystemDescription', { max: 1000, label: 'Ecosystem description' }),
    ecosystemFeatures: list(input, 'ecosystemFeatures', { max: 12, itemMax: 120 }),
  };
  if (!website.heroBgClass) delete website.heroBgClass;
  const adminUrl = url(input, 'adminUrl', { label: 'Admin URL' });
  const lead = text(input, 'lead', { max: 80, label: 'Project lead' });
  const color = text(input, 'color', { max: 9, label: 'Colour' }) || existing?.color || '#C89B3C';
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new SiteContentValidationError('Colour must look like #C89B3C.');
  const apiEndpoint = text(input, 'apiEndpoint', { max: 500, label: 'Metrics endpoint' });
  const apiToken = text(input, 'apiToken', { max: 2000, label: 'Bearer token' });
  const clearApiToken = input.clearApiToken === true && !apiToken;
  const keepsToken = !!existing?.hasApiToken && !clearApiToken;
  if (apiEndpoint && !apiToken && !keepsToken) {
    throw new SiteContentValidationError('Add the bearer token for the metrics endpoint.');
  }

  try {
    if (existing) {
      await ProjectsService.updateProject(existing.id, {
        name, adminUrl, lead, color, website: { ...website }, apiEndpoint,
        ...(apiToken ? { apiToken } : {}), clearApiToken,
      });
      return { ...website, id: existing.id, name, adminUrl, lead, color, apiEndpoint, hasApiToken: !!apiToken || keepsToken };
    }
    const card = await ProjectsService.createProject(
      {
        name, subtitle: category, description: website.homeDescription, adminUrl, lead, color,
        website: { ...website }, apiEndpoint: apiEndpoint || undefined, apiToken: apiToken || undefined,
      },
      { requireMetrics: false },
    );
    return { ...website, id: card.id, name, adminUrl, lead, color, apiEndpoint, hasApiToken: !!apiToken };
  } catch (err) {
    if (err instanceof ProjectAlreadyExistsError) {
      throw new SiteContentValidationError('A project with this name already exists. Open it from the list instead.');
    }
    if (err instanceof ProjectValidationError) throw new SiteContentValidationError(err.message);
    throw err;
  }
}

/** Shows or hides a project on the website; it stays in the workstation either way. */
export async function setProjectPublished(id: string, published: boolean): Promise<void> {
  const record = (await listProjectRecords()).find(r => (r._id || r.id) === id);
  if (!record) throw new SiteContentNotFoundError('Project');
  const website: Record<string, unknown> = { ...toSiteProject(record), published };
  // These live on the record itself (or are derived), not in its website map.
  for (const key of ['id', 'name', 'adminUrl', 'apiEndpoint', 'hasApiToken', 'lead', 'color']) delete website[key];
  await ProjectsService.updateProject(id, { website });
}

// ── Team ────────────────────────────────────────────────────────────────────

/** Members saved before these fields existed were all leads and all shown. */
function withTeamDefaults(member: SiteTeamMember): SiteTeamMember {
  return {
    ...member,
    department: member.department ?? '',
    isLead: member.isLead ?? true,
    showOnWebsite: member.showOnWebsite ?? true,
  };
}

export async function listTeam(): Promise<SiteTeamMember[]> {
  return ((await readCollection('team')) ?? defaultTeamMembers()).map(withTeamDefaults);
}

/** The members chosen to appear on the website. */
export async function listDisplayedTeam(): Promise<SiteTeamMember[]> {
  return (await listTeam()).filter(member => member.showOnWebsite);
}

/**
 * Saves a member. Marking someone lead of a department replaces that
 * department's previous lead, who stays on the team.
 */
export async function saveTeamMember(input: Input, id?: string): Promise<SiteTeamMember> {
  const department = text(input, 'department', { required: true, max: 60, label: 'Department' });
  const member = {
    name: text(input, 'name', { required: true, max: 80, label: 'Full name' }),
    role: text(input, 'role', { required: true, max: 80, label: 'Role / title' }),
    department,
    isLead: input.isLead === true,
    showOnWebsite: input.showOnWebsite === true,
    bio: text(input, 'bio', { max: 600, label: 'Bio' }),
    image: url(input, 'image', { label: 'Photo URL' }),
    linkedin: url(input, 'linkedin', { label: 'LinkedIn URL' }),
  };
  let saved: SiteTeamMember | undefined;
  await updateCollection('team', defaultTeamMembers, stored => {
    const team = stored.map(withTeamDefaults);
    if (id && !team.some(m => m.id === id)) throw new SiteContentNotFoundError('Team member');
    saved = { id: id ?? randomUUID(), ...member };
    const next = id ? team.map(m => (m.id === id ? saved! : m)) : [...team, saved];
    return member.isLead
      ? next.map(m => (m.id !== saved!.id && m.isLead && m.department.toLowerCase() === department.toLowerCase() ? { ...m, isLead: false } : m))
      : next;
  });
  return saved!;
}

export interface MetricsPerson {
  name: string;
  role: string;
  department: string;
  /** The workstation project whose metrics list this person. */
  project: string;
}

/**
 * People and departments from the connected projects' metrics, for picking
 * team members in the C-panel. Projects whose endpoint fails are listed in
 * `unavailable` rather than silently skipped.
 */
export async function listMetricsPeople(): Promise<{ people: MetricsPerson[]; departments: string[]; unavailable: string[] }> {
  const cards = await ProjectsService.getProjectsOverview();
  const people = new Map<string, MetricsPerson>();
  const departments = new Set<string>();
  const unavailable: string[] = [];
  for (const card of cards) {
    if (card.apiEndpoint && card.status === 'error') unavailable.push(card.name);
    const staff = [...(card.staff ?? []), ...(card.departments ?? []).flatMap(d => (d.staff ?? []).map(s => ({ ...s, department: s.department || d.name })))];
    for (const department of card.departments ?? []) if (department.name) departments.add(department.name.trim());
    for (const member of staff) {
      const name = member.name?.trim();
      if (!name) continue;
      const department = member.department?.trim() ?? '';
      if (department) departments.add(department);
      const key = `${name.toLowerCase()}|${department.toLowerCase()}`;
      if (!people.has(key)) people.set(key, { name, role: member.role?.trim() ?? '', department, project: card.name });
    }
  }
  return {
    people: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)),
    departments: [...departments].sort(),
    unavailable,
  };
}

/** Saves a new order (ids, first to last); the website shows members in this order. */
export async function reorderTeam(ids: unknown): Promise<SiteTeamMember[]> {
  if (!Array.isArray(ids)) throw new SiteContentValidationError('ids must be a list.');
  const team = await updateCollection('team', defaultTeamMembers, members => {
    const byId = new Map(members.map(m => [m.id, m]));
    if (ids.length !== members.length || ids.some(id => !byId.has(id as string))) {
      throw new SiteContentValidationError('The order must list every team member exactly once.');
    }
    return ids.map(id => byId.get(id as string)!);
  });
  return team.map(withTeamDefaults);
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

/** An article as listed in the C-panel: with what this person may do; private fields are left out where they have no access. */
export type ArticleListItem = SiteArticle & { permissions: ArticlePermissions };

export async function listArticlesFor(actor: ArticleActor): Promise<ArticleListItem[]> {
  const now = Date.now();
  return (await listArticles()).map(article => {
    const permissions = permissionsOf(article, actor);
    // Only a lock that hasn't lapsed means someone is editing.
    const lock = article.lock && now - Date.parse(article.lock.at) < LOCK_MS ? article.lock : null;
    if (permissions.canView) return { ...article, lock, permissions };
    return { ...article, body: '', pullQuote: '', collaborators: [], lock: null, permissions };
  });
}

/** Tags: trimmed, without duplicates (ignoring case), at most MAX_TAGS. */
function tagList(raw: unknown): string[] {
  const tags: string[] = [];
  for (const value of Array.isArray(raw) ? raw : []) {
    if (typeof value !== 'string') continue;
    const tag = value.trim().replace(/\s+/g, ' ');
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) throw new SiteContentValidationError(`Tags can be up to ${MAX_TAG_LENGTH} characters ("${tag.slice(0, 20)}…").`);
    if (!tags.some(t => t.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  if (tags.length > MAX_TAGS) throw new SiteContentValidationError(`An article can have up to ${MAX_TAGS} tags.`);
  return tags;
}

const personOf = (actor: ArticleActor): ArticlePerson => ({ uid: actor.uid, name: actor.name, email: actor.email });

function findArticle(articles: SiteArticle[], id: string): SiteArticle {
  const article = articles.find(a => a.id === id);
  if (!article) throw new SiteContentNotFoundError('Article');
  return article;
}

/**
 * Saves an article. A new one belongs to whoever creates it. Changes need
 * edit access, publishing or unpublishing needs manage access, and a save is
 * refused while someone else has the article open, or if it was saved by
 * someone else after `baseUpdatedAt` (when the editor opened it).
 */
export async function saveArticle(input: Input, actor: ArticleActor, id?: string): Promise<SiteArticle> {
  const title = text(input, 'title', { required: true, max: 160, label: 'Title' });
  const requested = text(input, 'category', { max: MAX_CATEGORY_LENGTH, label: 'Category' });
  const category = (await listArticleCategories()).find(c => sameName(c.name, requested))?.name;
  if (!category) throw new SiteContentValidationError('Choose a category.');
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
    if (existing) {
      const can = permissionsOf(existing, actor);
      if (!can.canEdit) throw new SiteContentForbiddenError('You can’t edit this article. Ask its owner for edit access.');
      if (existing.published !== published && !can.canPublish) {
        throw new SiteContentForbiddenError(`Only the owner or a manager can ${published ? 'publish' : 'unpublish'} this article.`);
      }
      const other = heldByOther(existing.lock, actor.uid);
      if (other) throw new SiteContentConflictError(`${other.name || other.email} is editing this article right now, so it can’t be saved.`);
      const base = typeof input.baseUpdatedAt === 'string' ? input.baseUpdatedAt : '';
      if (base && existing.updatedAt && base !== existing.updatedAt) {
        throw new SiteContentConflictError(`${existing.updatedBy || 'Someone'} saved changes after you opened this article. Copy your changes, reload, and add them again.`);
      }
    }
    // The URL slug can be changed in SEO settings; otherwise it's made from the first title and kept.
    const requestedSlug = slugify(text(input, 'slug', { max: 120, label: 'URL slug' }));
    const others = articles.filter(a => a.id !== existing?.id).map(a => a.slug);
    const slug = requestedSlug && requestedSlug !== existing?.slug
      ? uniqueSlug(requestedSlug, others, 'article')
      : existing?.slug ?? uniqueSlug(title, others, 'article');
    const image = url(input, 'image', { label: 'Feature image URL' });
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
      showToc: input.showToc !== false,
      seoTitle: text(input, 'seoTitle', { max: SEO_TITLE_MAX, label: 'Meta title' }),
      seoDescription: text(input, 'seoDescription', { max: SEO_DESCRIPTION_MAX, label: 'Meta description' }),
      seoImage: url(input, 'seoImage', { label: 'Social share image URL' }),
      noIndex: input.noIndex === true,
      tags: tagList(input.tags),
      owner: existing ? existing.owner ?? null : personOf(actor),
      collaborators: existing?.collaborators ?? [],
      lock: existing ? existing.lock ?? null : null,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.name || actor.email,
      published,
    };
    return existing ? articles.map(a => (a.id === existing.id ? saved! : a)) : [...articles, saved];
  });
  return saved!;
}

/** Deleting is for the owner, and the CEO (even when only a viewer). */
export async function deleteArticle(id: string, actor: ArticleActor): Promise<void> {
  await updateCollection('articles', defaultArticles, articles => {
    const article = findArticle(articles, id);
    if (!permissionsOf(article, actor).canDelete) throw new SiteContentForbiddenError('Only the article’s owner or the CEO can delete it.');
    return articles.filter(a => a.id !== id);
  });
}

function updateArticle(id: string, change: (article: SiteArticle) => SiteArticle): Promise<SiteArticle> {
  let saved: SiteArticle | undefined;
  return updateCollection('articles', defaultArticles, articles => {
    const article = findArticle(articles, id);
    saved = change(article);
    return articles.map(a => (a.id === id ? saved! : a));
  }).then(() => saved!);
}

function personInput(raw: unknown, label: string): ArticlePerson {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Input;
  const uid = text(value, 'uid', { max: 128, label });
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new SiteContentValidationError(`Choose a person for ${label.toLowerCase()}.`);
  return { uid, name: text(value, 'name', { max: 120, label: 'Name' }), email: text(value, 'email', { max: 200, label: 'Email' }) };
}

/** Sets who else has access, for the owner and managers. The owner is never in the list. */
export async function setArticleCollaborators(id: string, input: Input, actor: ArticleActor): Promise<SiteArticle> {
  const list = Array.isArray(input.collaborators) ? input.collaborators : [];
  if (list.length > 50) throw new SiteContentValidationError('An article can be shared with up to 50 people.');
  const collaborators: ArticleCollaborator[] = [];
  for (const raw of list) {
    const person = personInput(raw, 'Access');
    const role = (raw as Input).role as ArticleRole;
    if (!ARTICLE_ROLES.includes(role)) throw new SiteContentValidationError('Choose view, edit or manage access.');
    if (!collaborators.some(c => c.uid === person.uid)) collaborators.push({ ...person, role });
  }
  return updateArticle(id, article => {
    if (!permissionsOf(article, actor).canShare) throw new SiteContentForbiddenError('Only the owner or a manager can share this article.');
    return { ...article, collaborators: collaborators.filter(c => c.uid !== article.owner?.uid) };
  });
}

/** Hands the article to someone else (owner only); the previous owner keeps manage access. */
export async function transferArticleOwnership(id: string, input: Input, actor: ArticleActor): Promise<SiteArticle> {
  const next = personInput(input.owner, 'New owner');
  return updateArticle(id, article => {
    if (!permissionsOf(article, actor).canTransfer) throw new SiteContentForbiddenError('Only the owner can hand this article to someone else.');
    if (next.uid === actor.uid) return article;
    const others = (article.collaborators ?? []).filter(c => c.uid !== next.uid && c.uid !== actor.uid);
    return { ...article, owner: next, collaborators: [{ ...personOf(actor), role: 'manager' }, ...others] };
  });
}

/** Makes `actor` the owner of an article from before sharing (one with no owner). */
export async function claimArticle(id: string, actor: ArticleActor): Promise<SiteArticle> {
  return updateArticle(id, article => {
    if (!permissionsOf(article, actor).canClaim) throw new SiteContentConflictError('This article already has an owner.');
    return { ...article, owner: personOf(actor), collaborators: (article.collaborators ?? []).filter(c => c.uid !== actor.uid) };
  });
}

export interface ArticleLockResult { locked: boolean; lock: SiteArticle['lock'] }

/**
 * The edit lock: whoever opens an article to edit it holds it (their page
 * renews it every minute); others get it read-only until it's released or
 * lapses. The owner and managers can take it over.
 */
export async function lockArticle(id: string, input: Input, actor: ArticleActor): Promise<ArticleLockResult> {
  const action = input.action === 'release' ? 'release' : 'acquire';
  let result: ArticleLockResult = { locked: false, lock: null };
  await updateArticle(id, article => {
    const can = permissionsOf(article, actor);
    if (action === 'release') {
      result = { locked: false, lock: null };
      return article.lock?.uid === actor.uid ? { ...article, lock: null } : article;
    }
    if (!can.canEdit) throw new SiteContentForbiddenError('You can’t edit this article.');
    const other = heldByOther(article.lock, actor.uid);
    if (other && input.force !== true) {
      result = { locked: false, lock: other };
      return article;
    }
    if (other && !can.canShare && !can.canClaim) throw new SiteContentForbiddenError('Only the owner or a manager can take over editing.');
    const lock = { ...personOf(actor), at: new Date().toISOString() };
    result = { locked: true, lock };
    return { ...article, lock };
  });
  return result;
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

export async function getApplication(id: string): Promise<PartnershipApplication | null> {
  const applications = (await readCollection('applications')) ?? [];
  return applications.find(a => a.id === id) ?? null;
}

const APPLICATION_TEXT_FIELDS = [
  'phone', 'linkedin', 'role', 'orgName', 'orgType', 'industry', 'orgSize', 'website', 'location',
  'yearsInOperation', 'otherHelpNeeded', 'projectDescription', 'otherChallenge', 'desiredOutcome',
  'currentSolutionType', 'otherService', 'additionalNotes', 'budgetRange', 'startTime', 'deadline',
  'decisionMakers', 'otherStakeholders', 'otherRole',
] as const;

/** Stores a submission of the public /partnerships/apply form. */
export async function submitApplication(
  input: Input,
  { flaggedAsSpam = false }: { flaggedAsSpam?: boolean } = {},
): Promise<PartnershipApplication> {
  // Same rules the form checks step by step, so this only fails for requests
  // that skipped the form.
  const invalid = firstInvalidApplicationStep(input);
  if (invalid) throw new SiteContentValidationError(Object.values(invalid.errors)[0]);
  const email = text(input, 'email', { required: true, max: APPLICATION_LIMITS.email, label: 'Email' });
  const application: PartnershipApplication = {
    id: randomUUID(),
    status: 'pending',
    submittedAt: new Date().toISOString(),
    ...(flaggedAsSpam ? { flaggedAsSpam: true } : {}),
    firstName: text(input, 'firstName', { required: true, max: APPLICATION_LIMITS.name, label: 'First name' }),
    lastName: text(input, 'lastName', { required: true, max: APPLICATION_LIMITS.name, label: 'Last name' }),
    email,
    helpNeeded: list(input, 'helpNeeded', { max: 20, itemMax: 120 }),
    challenges: list(input, 'challenges', { max: 20, itemMax: 120 }),
    services: list(input, 'services', { max: 20, itemMax: 120 }),
    ...Object.fromEntries(APPLICATION_TEXT_FIELDS.map(key => [key, text(input, key, { max: APPLICATION_LIMITS.text })])),
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

// ── Article categories (kept in the site settings) ─────────────────────────

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function categoryName(input: Input, key: string): string {
  return text(input, key, { required: true, max: MAX_CATEGORY_LENGTH, label: 'Category name' }).replace(/\s+/g, ' ');
}

/** The categories in order, with how many articles each has; includes any category an article still uses. */
export async function listArticleCategories(): Promise<ArticleCategoryInfo[]> {
  const [{ articleCategories }, articles] = await Promise.all([getSettings(), listArticles()]);
  const names = [...articleCategories];
  for (const article of articles) {
    if (article.category && !names.some(n => sameName(n, article.category))) names.push(article.category);
  }
  return names.map(name => ({ name, articles: articles.filter(a => sameName(a.category, name)).length }));
}

async function writeArticleCategories(names: string[]): Promise<void> {
  await writeSettings({ ...await getSettings(), articleCategories: names });
}

export async function addArticleCategory(input: Input): Promise<ArticleCategoryInfo[]> {
  const name = categoryName(input, 'name');
  const current = await listArticleCategories();
  if (current.some(c => sameName(c.name, name))) throw new SiteContentValidationError(`There is already a "${name}" category.`);
  if (current.length >= 50) throw new SiteContentValidationError('There can be up to 50 categories.');
  await writeArticleCategories([...current.map(c => c.name), name]);
  return listArticleCategories();
}

/** Renames a category, moving its articles with it. */
export async function renameArticleCategory(input: Input): Promise<ArticleCategoryInfo[]> {
  const from = text(input, 'from', { required: true, max: 200, label: 'Category' });
  const to = categoryName(input, 'to');
  const current = await listArticleCategories();
  const existing = current.find(c => sameName(c.name, from));
  if (!existing) throw new SiteContentNotFoundError('Category');
  if (!sameName(from, to) && current.some(c => sameName(c.name, to))) throw new SiteContentValidationError(`There is already a "${to}" category.`);
  if (existing.articles > 0) {
    await updateCollection('articles', defaultArticles, articles =>
      articles.map(a => (sameName(a.category, existing.name) ? { ...a, category: to } : a)));
  }
  await writeArticleCategories(current.map(c => (c.name === existing.name ? to : c.name)));
  return listArticleCategories();
}

/** Removes an empty category; one with articles must be emptied (or renamed) first. */
export async function removeArticleCategory(name: string): Promise<ArticleCategoryInfo[]> {
  const current = await listArticleCategories();
  const existing = current.find(c => sameName(c.name, name));
  if (!existing) throw new SiteContentNotFoundError('Category');
  if (existing.articles > 0) {
    throw new SiteContentValidationError(`${existing.articles} article${existing.articles === 1 ? ' is' : 's are'} in "${existing.name}". Move ${existing.articles === 1 ? 'it' : 'them'} to another category first.`);
  }
  if (current.length <= 1) throw new SiteContentValidationError('Keep at least one category.');
  await writeArticleCategories(current.filter(c => c !== existing).map(c => c.name));
  return listArticleCategories();
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<SiteSettings> {
  const defaults = defaultSettings();
  const stored = await readSettings();
  if (!stored) return defaults;
  const categories = Array.isArray(stored.articleCategories)
    ? stored.articleCategories.filter((c): c is string => typeof c === 'string' && !!c.trim())
    : [];
  return {
    ...defaults,
    ...stored,
    articleCategories: categories.length ? categories : defaults.articleCategories,
    footer: { ...defaults.footer, ...(stored.footer ?? {}) },
  };
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
    // Managed on their own (article categories), so kept as they are.
    articleCategories: (await getSettings()).articleCategories,
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
