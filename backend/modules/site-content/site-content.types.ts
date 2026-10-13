/**
 * backend/modules/site-content/site-content.types.ts
 *
 * Content of the public website that the C-panel (/cpanel) edits.
 */

/** Icon names shared by the C-panel picker and the public site (lucide-react). */
export const SITE_ICON_NAMES = [
  'Users', 'Building2', 'Sprout', 'GraduationCap', 'Rocket', 'Code', 'Handshake',
  'Globe', 'Layers', 'Heart', 'Star', 'ShieldCheck', 'Store', 'Briefcase', 'Lightbulb',
  'ShoppingBag',
] as const;
export type SiteIconName = (typeof SITE_ICON_NAMES)[number];

export interface SiteProjectStat {
  value: string;
  label: string;
}

export interface SiteProjectTestimonial {
  quote: string;
  author: string;
  role: string;
  avatar: string;
  featured?: boolean;
  rating: number;
}

export const PROJECT_KINDS = ['client', 'ecosystem'] as const;
/** Client work for organizations, or one of AE's own ecosystem platforms. */
export type ProjectKind = (typeof PROJECT_KINDS)[number];

/**
 * A project as the website shows it. Stored on the AE workstation's project
 * record (`enterprise_projects`): `name` and `adminUrl` are the record's
 * own fields, the rest lives in its `website` map.
 */
export interface SiteProject {
  /** The workstation project id. */
  id: string;
  /** URL segment: /projects/<slug>. */
  slug: string;
  name: string;
  kind: ProjectKind;
  /** Hidden projects stay in the workstation but not on the website. */
  published: boolean;
  category: string;
  icon: SiteIconName;
  /** Tagline under the name on the project hero. */
  subtitle: string;
  /** Short line on project cards. */
  homeDescription: string;
  description: string;
  challenges: string;
  solution: string;
  technologyStack: string[];
  image: string;
  status: string;
  /** Live site of the project; shown on its public page. */
  websiteUrl: string;
  /** The project's admin dashboard (workstation field); only shown in the C-panel. */
  adminUrl: string;
  /** Workstation metrics endpoint; only shown in the C-panel. */
  apiEndpoint: string;
  /** Whether a bearer token is saved. The token itself never leaves the server. */
  hasApiToken: boolean;
  /** Workstation fields for the CEO dashboard card; never shown on the website. */
  lead: string;
  color: string;
  /** Tailwind background class for the detail hero (seeded projects only). */
  heroBgClass?: string;
  stats: SiteProjectStat[];
  deliverables: string[];
  testimonials: SiteProjectTestimonial[];
  impact: string;
  /** Ecosystem platforms only: the Ecosystem page card. */
  ecosystemSummary: string;
  ecosystemDescription: string;
  ecosystemFeatures: string[];
}

/** The part of a SiteProject kept in the workstation record's `website` map. */
export type SiteProjectWebsite = Omit<SiteProject, 'id' | 'name' | 'adminUrl' | 'apiEndpoint' | 'hasApiToken' | 'lead' | 'color'>;

/** A team member. Members chosen with showOnWebsite appear on the About and home pages. */
export interface SiteTeamMember {
  id: string;
  name: string;
  role: string;
  /** Free text; the C-panel suggests the departments other members already have. */
  department: string;
  /** Each department has at most one lead. */
  isLead: boolean;
  showOnWebsite: boolean;
  bio: string;
  image: string;
  linkedin: string;
}

/** The categories a site starts with; writers add, rename and remove them in the C-panel (settings.articleCategories). */
export const ARTICLE_CATEGORIES: readonly string[] = ['Infrastructure', 'Design', 'Technology', 'Partnerships', 'Insights'];
export type SiteArticleCategory = string;
export const MAX_CATEGORY_LENGTH = 40;

export const SEO_TITLE_MAX = 70;
export const SEO_DESCRIPTION_MAX = 160;

/** A category with the number of articles in it (C-panel). */
export interface ArticleCategoryInfo { name: string; articles: number }

/** Fonts the article editor offers; the site's HTML cleaner allows exactly these. */
export const ARTICLE_FONTS: Array<{ label: string; css: string }> = [
  { label: 'Georgia', css: 'Georgia, serif' },
  { label: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { label: 'Arial', css: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', css: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet MS', css: '"Trebuchet MS", sans-serif' },
  { label: 'Courier New', css: '"Courier New", Courier, monospace' },
];

/** An Expert Insights article (/insights and /insights/[slug]). */
export interface SiteArticle {
  id: string;
  slug: string;
  title: string;
  category: SiteArticleCategory;
  excerpt: string;
  /** ISO date (YYYY-MM-DD) shown as the publish date. */
  date: string;
  readTime: string;
  author: string;
  authorRole: string;
  authorImage: string;
  /** Feature image: the article's card on the list page and in shares. */
  image: string;
  /** Hero image at the top of the article; the same as `image` unless a different one is chosen. */
  heroImage: string;
  /** Article content as HTML from the C-panel editor, sanitized on save. */
  body: string;
  pullQuote: string;
  /** Show the table of contents (the article's section headings) beside it; on unless turned off. */
  showToc?: boolean;
  /** SEO: the title in search results and the browser tab; the article title when blank. */
  seoTitle?: string;
  /** SEO: the description in search results; the excerpt when blank. */
  seoDescription?: string;
  /** SEO: the image shown when the article is shared; the feature image when blank. */
  seoImage?: string;
  /** SEO: ask search engines not to list the article. */
  noIndex?: boolean;
  /** Drafts are only visible in the C-panel. */
  published: boolean;
}

/** A card on the Partnerships page ("Who we partner with"). */
export interface SitePartnershipCategory {
  id: string;
  number: string;
  title: string;
  icon: SiteIconName;
  description: string;
  benefits: string[];
}

export const APPLICATION_STATUSES = ['pending', 'reviewed', 'approved', 'declined'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** A submission of the /partnerships/apply form. */
export interface PartnershipApplication {
  id: string;
  status: ApplicationStatus;
  submittedAt: string;
  /** The form's hidden spam-trap field was filled; kept for a person to judge. */
  flaggedAsSpam?: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedin: string;
  role: string;
  orgName: string;
  orgType: string;
  industry: string;
  orgSize: string;
  website: string;
  location: string;
  yearsInOperation: string;
  helpNeeded: string[];
  otherHelpNeeded: string;
  projectDescription: string;
  challenges: string[];
  otherChallenge: string;
  desiredOutcome: string;
  currentSolutionType: string;
  services: string[];
  otherService: string;
  additionalNotes: string;
  budgetRange: string;
  startTime: string;
  deadline: string;
  decisionMakers: string;
  otherStakeholders: string;
  otherRole: string;
}

export interface SiteLink {
  label: string;
  href: string;
}

export interface SiteFooterColumn {
  title: string;
  links: SiteLink[];
}

export interface SiteSocialLink {
  label: string;
  url: string;
}

/** Company details and footer content (single record). */
export interface SiteSettings {
  /** Article categories, in the order the Insights page shows them. */
  articleCategories: string[];
  companyName: string;
  tagline: string;
  location: string;
  email: string;
  phone: string;
  socialLinks: SiteSocialLink[];
  footer: {
    logoUrl: string;
    description: string;
    contactEmail: string;
    columns: SiteFooterColumn[];
    ctaHeading: string;
    ctaButtonText: string;
    ctaButtonUrl: string;
    copyright: string;
    bottomTagline: string;
    backgroundImageUrl: string;
    /** 0–100: opacity of the background pattern image. */
    backgroundOpacity: number;
    textColor: string;
    accentColor: string;
  };
}

/** Collections stored by site-content.store (projects live in the workstation). */
export interface SiteContentCollections {
  team: SiteTeamMember;
  articles: SiteArticle;
  partnershipCategories: SitePartnershipCategory;
  applications: PartnershipApplication;
}
export type SiteCollectionName = keyof SiteContentCollections;
