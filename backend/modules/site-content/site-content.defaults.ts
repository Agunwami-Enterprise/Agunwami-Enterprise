/**
 * backend/modules/site-content/site-content.defaults.ts
 *
 * Content the site shows until the C-panel saves its own. Built from the
 * hard-coded data the public pages used before the C-panel existed, so the
 * live site looks the same until someone edits it.
 */

import { partnershipCategories, projects } from '@/lib/dummy';
import { defaultTeam } from '@/lib/data/teamData';
import { ARTICLES } from '@/lib/data/insightsData';
import type {
  SiteArticle,
  SiteIconName,
  SitePartnershipCategory,
  SiteProjectWebsite,
  SiteSettings,
  SiteTeamMember,
} from './site-content.types';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const PROJECT_ICONS: Record<string, SiteIconName> = {
  'Trendora Store': 'Store',
  'Meridian Crest Solutions': 'Briefcase',
  'Abia Women Assembly': 'Heart',
  'Delight Tees': 'ShoppingBag',
  'AE Hub': 'GraduationCap',
  'Mobility Platform': 'Rocket',
  'AE Workstation': 'Layers',
};

const PARTNERSHIP_ICONS: SiteIconName[] = ['Users', 'Sprout', 'Building2'];

/** "May 15, 2025" → "2025-05-15" (dates in the old data are display strings). */
function toIsoDate(display: string): string {
  const parsed = new Date(`${display} 12:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? display : parsed.toISOString().slice(0, 10);
}

/**
 * The projects that were hard-coded on the portfolio (client work and AE's
 * ecosystem platforms), for seeding into the workstation's project
 * collection. No metrics endpoints: those are added in the CEO dashboard.
 */
export function portfolioProjects(): { name: string; website: SiteProjectWebsite }[] {
  return projects.map(project => {
    const fromLink = project.link.startsWith('/projects/') ? project.link.replace(/^\/projects\//, '') : '';
    return {
      name: project.name,
      website: {
        slug: fromLink || slugify(project.name),
        kind: project.client ? 'client' : 'ecosystem',
        published: true,
        category: project.projectCategory,
        icon: PROJECT_ICONS[project.name] ?? 'Briefcase',
        subtitle: project.subtitle ?? '',
        homeDescription: project.homeDescription,
        description: project.description,
        challenges: project.challenges,
        solution: project.solution,
        technologyStack: [...project.technologyStack],
        image: project.image ?? '',
        status: project.status,
        websiteUrl: '',
        heroBgClass: project.heroBgClass,
        stats: (project.stats ?? []).map(stat => ({ ...stat })),
        deliverables: [...(project.deliverables ?? project.key ?? [])],
        testimonials: (project.testimonials ?? []).map(t => ({ ...t })),
        impact: project.impact ?? '',
        ecosystemSummary: project.ecoshort ?? '',
        ecosystemDescription: project.ecodesc ?? '',
        ecosystemFeatures: [...(project.ecokey ?? [])],
      },
    };
  });
}

const TEAM_DEPARTMENT_BY_ROLE: Record<string, string> = {
  'Chief Executive Officer': 'Executive',
  'Operation Manager': 'Operations',
  'Project Manager': 'Project Management',
  'Research & Development Director': 'Research & Development',
};

/** The leaders the About page showed before the C-panel: department leads, all shown. */
export function defaultTeamMembers(): SiteTeamMember[] {
  return defaultTeam.map(member => ({
    id: slugify(member.name),
    ...member,
    department: TEAM_DEPARTMENT_BY_ROLE[member.role] ?? 'Other',
    isLead: true,
    showOnWebsite: true,
  }));
}

export function defaultArticles(): SiteArticle[] {
  return ARTICLES.map(article => ({
    id: article.slug,
    slug: article.slug,
    title: article.title,
    category: article.category,
    excerpt: article.excerpt,
    date: toIsoDate(article.date),
    readTime: article.readTime,
    author: article.author,
    authorRole: article.authorRole,
    authorImage: article.authorImage,
    image: article.image,
    heroImage: article.image,
    body: [
      `<p>${escapeHtml(article.intro)}</p>`,
      ...article.sections.map(section =>
        [`<h2>${escapeHtml(section.heading)}</h2>`, ...section.body.map(p => `<p>${escapeHtml(p)}</p>`)].join('')),
    ].join(''),
    pullQuote: article.pullQuote,
    published: true,
  }));
}

export function defaultPartnershipCategories(): SitePartnershipCategory[] {
  return partnershipCategories.map((category, index) => ({
    id: slugify(category.title),
    number: category.number,
    title: category.title,
    icon: PARTNERSHIP_ICONS[index] ?? 'Handshake',
    description: category.description,
    benefits: [...category.partnershipBenefits],
  }));
}

export function defaultSettings(): SiteSettings {
  return {
    companyName: 'Agunwami Enterprise',
    tagline: 'Platform Infrastructure Partner',
    location: 'Atlanta, Georgia, US',
    email: 'Contact@agunwamienterprise.com',
    phone: '+1 (470) 526-0343',
    socialLinks: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/company/agunwami-enterprises/' },
    ],
    footer: {
      logoUrl: '/logo.png',
      description:
        'Agunwami Enterprise delivers structured digital infrastructure for organizations and technology teams across emerging ecosystems.',
      contactEmail: 'Contact@agunwamienterprise.com',
      columns: [
        {
          title: 'Quick Links',
          links: [
            { label: 'Home', href: '/' },
            { label: 'About', href: '/about' },
            { label: 'Services', href: '/services' },
            { label: 'Contact', href: '/contact' },
          ],
        },
        {
          title: 'Explore',
          links: [
            { label: 'Projects', href: '/projects' },
            { label: 'Ecosystem', href: '/ecosystem' },
            { label: 'Insights', href: '/insights' },
            { label: 'Partnerships', href: '/partnerships' },
          ],
        },
      ],
      ctaHeading: 'Get Started',
      ctaButtonText: 'Get in Touch',
      ctaButtonUrl: '/contact',
      copyright: '© 2026 Agunwami Enterprise. All rights reserved.',
      bottomTagline: 'Building Platforms. Empowering Institutions.',
      backgroundImageUrl: '/ecobg.png',
      backgroundOpacity: 10,
      textColor: '#FFFFFF',
      accentColor: '#C89B3C',
    },
  };
}
