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

/** A client project shown on /projects and /projects/[slug]. */
export interface SiteProject {
  id: string;
  /** URL segment: /projects/<slug>. */
  slug: string;
  name: string;
  category: string;
  icon: SiteIconName;
  /** Tagline under the name in the C-panel and on the project hero. */
  subtitle: string;
  /** Short line on project cards. */
  homeDescription: string;
  description: string;
  challenges: string;
  solution: string;
  technologyStack: string[];
  image: string;
  status: string;
  /** Live site of the project, if any. */
  websiteUrl: string;
  /** Tailwind background class for the detail hero (seeded projects only). */
  heroBgClass?: string;
  stats: SiteProjectStat[];
  deliverables: string[];
  testimonials: SiteProjectTestimonial[];
  impact?: string;
}

/** A leader shown in the About page team slider. */
export interface SiteTeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  linkedin: string;
}

export const ARTICLE_CATEGORIES = ['Infrastructure', 'Design', 'Technology', 'Partnerships', 'Insights'] as const;
export type SiteArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

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
  /** Card image on the list page. */
  image: string;
  /** Hero image on the article page; falls back to `image`. */
  heroImage: string;
  /** Article content as HTML from the C-panel editor, sanitized on save. */
  body: string;
  pullQuote: string;
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

export interface SiteContentCollections {
  projects: SiteProject;
  team: SiteTeamMember;
  articles: SiteArticle;
  partnershipCategories: SitePartnershipCategory;
  applications: PartnershipApplication;
}
export type SiteCollectionName = keyof SiteContentCollections;
