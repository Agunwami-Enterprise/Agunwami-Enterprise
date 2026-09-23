import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ScrollReveal from "@/app/components/common/ScrollReveal";
import HeroScrollIndicator from "@/app/components/common/HeroScrollIndicator";
import Section from "@/app/components/common/ui/Section";
import { cn } from "@/lib/utils";
import { getProjectBySlug, projects } from "@/lib/dummy";
import {
  RiStarFill,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiStore2Line,
} from "react-icons/ri";
import { TbQuote } from "react-icons/tb";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Per-project SEO metadata from the official metadata document */
const PROJECT_META: Record<string, { title: string; description: string }> = {
  trendora: {
    title: "Trendora Store | E-commerce Platform Project",
    description:
      "Explore Trendora Store, an e-commerce platform built by Agunwami Enterprise for fashion, lifestyle products, discovery, and retail growth.",
  },
  meridiancrestsolutions: {
    title: "Meridian Crest Solutions | Digital Platform Project",
    description:
      "Explore the Meridian Crest Solutions project, a digital platform built by Agunwami Enterprise for business consulting and strategic services.",
  },
  abiawomenassembly: {
    title: "Abia Women Assembly | Digital Platform Project",
    description:
      "Explore how Agunwami Enterprise built a digital platform for Abia Women Assembly, supporting event registration, community management, and engagement.",
  },
  "delight-tees": {
    title: "Delight Tees | E-commerce Platform Project",
    description:
      "Explore Delight Tees, an e-commerce platform built by Agunwami Enterprise for product discovery, retail operations, and online customer experiences.",
  },
  aehub: {
    title: "AE Hub | Educational Platform Project",
    description:
      "Explore AE Hub, an educational and learning platform developed by Agunwami Enterprise for digital skills, coursework, and student certification.",
  },
  mobility: {
    title: "Mobility Platform | Transportation & Logistics Project",
    description:
      "Explore the Mobility Platform, a transportation and logistics system built by Agunwami Enterprise to connect riders, drivers, and fleet partners.",
  },
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};

  const custom = PROJECT_META[slug];
  const title =
    custom?.title || `${project.name} | Digital Platform | Agunwami Enterprise`;
  const description = custom?.description || project.homeDescription;
  const canonicalUrl = `/projects/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: `https://agunwamienterprise.com${canonicalUrl}`,
      type: "website",
      images: project.image ? [{ url: project.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: project.image ? [project.image] : undefined,
    },
  };
}

export function generateStaticParams() {
  return projects
    .filter((p) => p.link && p.link.startsWith("/projects/"))
    .map((p) => ({
      slug: p.link.replace(/^\/projects\//, ""),
    }));
}

export default async function ProjectSinglePage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const subtitle = project.subtitle || project.homeDescription;
  const heroBgClass =
    project.heroBgClass || "bg-project-hero dark:bg-project-hero-dark";
  const stats = project.stats || [];
  const technologies = project.technologyStack || [];
  const deliverables = project.deliverables || project.key || [];
  const testimonials = project.testimonials || [];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://agunwamienterprise.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Projects",
        item: "https://agunwamienterprise.com/projects",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: project.name,
        item: `https://agunwamienterprise.com/projects/${slug}`,
      },
    ],
  };

  return (
    <main className="flex flex-col items-center w-full bg-[#FAFAFA] dark:bg-[#0a0a0a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {/* ── Hero ── */}
      <Section
        className={cn(
          "relative flex flex-col justify-between min-h-[540px] sm:min-h-[600px] md:min-h-[680px] lg:min-h-[760px] bg-cover bg-[position:center_top] md:bg-[position:center_20%] bg-no-repeat pt-28 md:pt-36 pb-8 md:pb-12 space-y-0",
          heroBgClass,
        )}
      >
        {/* Subtle circuit pattern overlay */}
        <div className="absolute right-[50%] top-0 h-full overflow-hidden w-full md:flex hidden justify-start items-start opacity-30 pointer-events-none">
          <img
            src="/ecobg.png"
            alt=""
            className="w-full h-fit scale-[1] mt-[-280px] ml-[-200px] opacity-[0.4]"
          />
        </div>

        <div className="flex flex-col gap-5 justify-center flex-1 w-full relative z-10 max-w-4xl my-auto py-6">
          {/* Breadcrumb */}
          <ScrollReveal direction="none">
            <nav className="flex items-center gap-2 text-[13px] text-gray-400 mb-2">
              <Link
                href="/projects"
                className="hover:text-primary transition-colors"
              >
                Projects
              </Link>
              <span>&rsaquo;</span>
              <span className="text-white font-medium">{project.name}</span>
            </nav>
          </ScrollReveal>

          {/* Category Badge */}
          <ScrollReveal direction="down" delay={60}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-[#C28E2C] text-white w-fit shadow-sm">
              {project.icon ? (
                <project.icon className="text-[13px]" />
              ) : (
                <RiStore2Line className="text-[13px]" />
              )}
              <span>{project.projectCategory}</span>
            </div>
          </ScrollReveal>

          {/* Title */}
          <ScrollReveal direction="up" delay={120}>
            <h1 className="w-full text-[48px] sm:text-[64px] md:text-[76px] lg:text-[88px] xl:text-[96px] leading-[1.08] font-primary font-normal tracking-tight text-white">
              {project.name}
            </h1>
          </ScrollReveal>

          {/* Subtitle */}
          <ScrollReveal direction="up" delay={200}>
            <p className="w-full max-w-2xl text-[18px] md:text-[22px] lg:text-[24px] leading-relaxed text-gray-300 font-light">
              {subtitle}
            </p>
          </ScrollReveal>
        </div>

        {/* Explore Scroll indicator */}
        <HeroScrollIndicator label="Explore" delay={700} />
      </Section>

      {/* ── Gold Stats Bar ── */}
      {stats.length > 0 && (
        <section className="w-full bg-primary py-8 md:py-10 px-6 md:px-20 text-white shadow-md">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center divide-y sm:divide-y-0 sm:divide-x divide-white/20">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5",
                  idx > 0 ? "pt-6 sm:pt-0" : "",
                )}
              >
                <span className="text-[40px] md:text-[52px] font-primary font-bold leading-none tracking-tight">
                  {stat.value}
                </span>
                <span className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/90">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Project Overview & Deliverables ── */}
      <section className="relative w-full px-4 md:px-20 py-16 md:py-24 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto">
          <ScrollReveal direction="up">
            <div className="bg-white dark:bg-[#141414] rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-sm p-8 md:p-14">
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1.1fr] gap-12 items-start">
                {/* Left Column: Overview Details */}
                <div className="space-y-8">
                  <div>
                    <h2 className="text-[32px] md:text-[40px] font-primary font-normal tracking-tight text-gray-900 dark:text-white">
                      Project Overview
                    </h2>
                    <div className="w-12 h-1 bg-primary rounded-full mt-3" />
                  </div>

                  <p className="text-[16px] md:text-[17px] leading-[28px] text-gray-700 dark:text-gray-300">
                    {project.description}
                  </p>

                  {/* Challenge */}
                  {project.challenges && (
                    <div className="space-y-2.5">
                      <h3 className="text-[12px] font-bold tracking-[0.18em] uppercase text-gray-900 dark:text-white">
                        The Challenge
                      </h3>
                      <p className="text-[15px] leading-[26px] text-gray-600 dark:text-gray-400">
                        {project.challenges}
                      </p>
                    </div>
                  )}

                  {/* Solution */}
                  {project.solution && (
                    <div className="space-y-2.5">
                      <h3 className="text-[12px] font-bold tracking-[0.18em] uppercase text-gray-900 dark:text-white">
                        Our Solution
                      </h3>
                      <p className="text-[15px] leading-[26px] text-gray-600 dark:text-gray-400">
                        {project.solution}
                      </p>
                    </div>
                  )}

                  {/* Technologies */}
                  {technologies.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-[12px] font-bold tracking-[0.18em] uppercase text-gray-900 dark:text-white">
                        Technologies Used
                      </h3>
                      <div className="flex flex-wrap gap-2.5">
                        {technologies.map((tech) => (
                          <span
                            key={tech}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Deliverables Card */}
                {deliverables.length > 0 && (
                  <div className="bg-[#FAF9F5] dark:bg-[#1A1A1A] rounded-2xl border border-gray-200/70 dark:border-white/10 p-7 md:p-8 space-y-6">
                    <h3 className="text-[13px] font-bold tracking-[0.18em] uppercase text-gray-900 dark:text-white">
                      What We Delivered
                    </h3>

                    <ul className="space-y-4">
                      {deliverables.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-[14px] text-gray-700 dark:text-gray-300 leading-snug"
                        >
                          <span className="text-primary font-bold text-[13px] leading-none shrink-0 mt-0.5 select-none">
                            ✦
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-4 border-t border-gray-200/60 dark:border-white/10">
                      <Link
                        href="/partnerships/apply"
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-[14px] hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all shadow-sm"
                      >
                        <span>Start a Similar Project</span>
                        <RiArrowRightLine className="text-base" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Client Testimonials ── */}
      {testimonials.length > 0 && (
        <section className="relative w-full px-4 md:px-20 pb-24 overflow-hidden">
          {/* Subtle concentric radar watermark */}
          <div className="absolute right-[-8%] top-[0%] w-[600px] h-[600px] pointer-events-none opacity-[0.14] dark:opacity-[0.05] select-none">
            <img
              src="/ecocard.png"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto space-y-12">
            <div>
              <h2 className="text-[32px] md:text-[42px] font-primary font-normal tracking-tight text-gray-900 dark:text-white">
                What the Client Said
              </h2>
              <div className="w-12 h-1 bg-primary rounded-full mt-3 mb-3" />
              <p className="text-[16px] text-gray-500 dark:text-gray-400">
                Hear directly from the people who experienced this project
                firsthand.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {testimonials.map((t, idx) => (
                <ScrollReveal key={idx} delay={idx * 120}>
                  <div className="h-full bg-white dark:bg-[#141414] rounded-2xl border border-gray-100/80 dark:border-white/5 p-8 md:p-10 flex flex-col justify-between shadow-[0_4px_25px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.2)] hover:shadow-md transition-shadow">
                    <div>
                      {/* Top Quote Squircle */}
                      <div className="w-14 h-14 rounded-2xl bg-[#F8F5EE] dark:bg-white/5 flex items-center justify-center">
                        <TbQuote className="text-[#C28E2C] text-[28px]" />
                      </div>

                      {/* 5 Stars placed below quote box */}
                      <div className="flex items-center gap-1.5 text-[#C28E2C] mt-6 mb-6">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <RiStarFill key={i} className="text-[16px]" />
                        ))}
                      </div>

                      {/* Quote Text: NOT ITALIC */}
                      <p className="text-[16px] md:text-[17px] leading-[28px] md:leading-[30px] text-[#2D3748] dark:text-gray-200 font-normal">
                        {t.quote}
                      </p>
                    </div>

                    {/* Divider and Author Row */}
                    <div>
                      <div className="w-full h-px bg-[#F1F3F5] dark:bg-white/10 mt-8 mb-6" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-white/10">
                            <Image
                              src={t.avatar}
                              alt={t.author}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
                              {t.author}
                            </p>
                            <p className="text-[13px] text-[#6B7280] dark:text-gray-400 mt-1">
                              {t.role}
                            </p>
                          </div>
                        </div>

                        {t.featured && (
                          <span className="px-3.5 py-1.5 rounded-[3px] text-[11px] font-bold tracking-wider uppercase bg-[#C28E2C] text-white shadow-sm">
                            FEATURED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom Project Navigation Bar ── */}
      <section className="w-full bg-[#161412] dark:bg-[#0D0D0D] py-10 px-6 md:px-20 text-white border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
          >
            <RiArrowLeftLine className="text-base" />
            <span>All Projects</span>
          </Link>

          <div className="text-center md:text-left space-y-1">
            <p className="text-[11px] tracking-[0.2em] uppercase text-gray-400 font-semibold">
              Ready to Build?
            </p>
            <h3 className="font-primary text-[24px] md:text-[28px] text-white">
              Let&apos;s create your platform.
            </h3>
          </div>

          <Link
            href="/partnerships/apply"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-[14px] transition-all shadow-md"
          >
            <span>Apply for Partnership</span>
            <RiArrowRightLine className="text-base" />
          </Link>
        </div>
      </section>
    </main>
  );
}
