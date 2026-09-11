import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/app/components/common/ScrollReveal";
import Section from "@/app/components/common/ui/Section";
import { cn } from "@/lib/utils";
import {
  RiStarFill,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiCheckboxCircleLine,
  RiDoubleQuotesL,
} from "react-icons/ri";

interface ProjectDetail {
  slug: string;
  name: string;
  category: string;
  subtitle: string;
  heroBgClass: string;
  stats: { value: string; label: string }[];
  overview: string;
  challenge: string;
  solution: string;
  technologies: string[];
  deliverables: string[];
  testimonials: {
    quote: string;
    author: string;
    role: string;
    avatar: string;
    featured?: boolean;
    rating: number;
  }[];
}

const PROJECTS_DATA: Record<string, ProjectDetail> = {
  "delight-tees": {
    slug: "delight-tees",
    name: "Delight Tees",
    category: "E-Commerce",
    subtitle: "A custom apparel platform built to scale.",
    heroBgClass: "bg-delight-hero dark:bg-delight-hero-dark",
    stats: [
      { value: "3×", label: "CONVERSION RATE INCREASE" },
      { value: "40%", label: "REDUCTION IN ABANDONED CARTS" },
      { value: "2 weeks", label: "LAUNCH TURNAROUND" },
    ],
    overview:
      "Premium apparel brand specializing in custom-designed t-shirts and merchandise. Delight Tees needed a digital storefront that matched the quality and personality of their products.",
    challenge:
      "Needed a modern e-commerce platform with inventory management, secure payments, and a seamless shopping experience that could handle high-volume seasonal demand.",
    solution:
      "Built a custom e-commerce platform with Stripe integration, real-time inventory tracking, order management dashboard, and responsive product catalog. Included automated order confirmation emails and an admin panel for the founding team.",
    technologies: ["Next.js", "Tailwind CSS", "Supabase", "Vercel"],
    deliverables: [
      "Custom storefront with product catalog",
      "Stripe payment integration",
      "Real-time inventory dashboard",
      "Order tracking & confirmation system",
      "Mobile-responsive design",
      "Admin management panel",
    ],
    testimonials: [
      {
        quote:
          "“Agunwami Enterprise understood exactly what we needed — a store that felt as premium as our products. The build was fast, the quality was exceptional, and our customers constantly compliment the experience. We saw a significant jump in completed purchases almost immediately after launch.”",
        author: "Chidi Okafor",
        role: "Founder, Delight Tees",
        avatar: "/whoweare.jpg",
        featured: true,
        rating: 5,
      },
      {
        quote:
          "“Managing inventory used to be a nightmare. Now everything is tracked in one place and we get alerts before we run out of stock. The admin panel alone has saved us hours every week.”",
        author: "Amaka Eze",
        role: "Operations Lead, Delight Tees",
        avatar: "/whoweare.jpg",
        rating: 5,
      },
    ],
  },
  trendora: {
    slug: "trendora",
    name: "Trendora Store",
    category: "Retail",
    subtitle:
      "Modern retail platform offering curated fashion and lifestyle products.",
    heroBgClass: "bg-delight-hero dark:bg-delight-hero-dark",
    stats: [
      { value: "4×", label: "ONLINE SALES GROWTH" },
      { value: "35%", label: "INCREASE IN CHECKOUT RATE" },
      { value: "3 weeks", label: "LAUNCH TURNAROUND" },
    ],
    overview:
      "Trendora is a fast-growing modern lifestyle brand offering curated apparel and retail goods to thousands of active customers across emerging markets.",
    challenge:
      "Needed a scalable retail platform with multi-vendor support, inventory management, fast checkout, and responsive analytics to support expanding sales volume.",
    solution:
      "Created a feature-rich retail platform with high-speed product catalogs, automated vendor onboarding, order tracking, and custom conversion funnels.",
    technologies: ["Next.js", "Tailwind CSS", "Stripe", "Supabase", "Vercel"],
    deliverables: [
      "Dynamic catalog with multi-vendor support",
      "One-click checkout and payment processing",
      "Vendor analytics and sales dashboard",
      "Automated logistics & order fulfillment pipeline",
      "Cross-device responsive storefront",
      "Role-based administrative controls",
    ],
    testimonials: [
      {
        quote:
          "“Agunwami Enterprise delivered an experience far beyond standard e-commerce templates. Our customer engagement and retention skyrocketed after launch.”",
        author: "Trendora Leadership",
        role: "Managing Director, Trendora Store",
        avatar: "/whoweare.jpg",
        featured: true,
        rating: 5,
      },
    ],
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectSinglePage({ params }: PageProps) {
  const { slug } = await params;
  // Normalized lookup or fallback to Delight Tees
  const project =
    PROJECTS_DATA[slug.toLowerCase()] ||
    (slug.toLowerCase().includes("delight")
      ? PROJECTS_DATA["delight-tees"]
      : null) ||
    (slug.toLowerCase().includes("trendora")
      ? PROJECTS_DATA["trendora"]
      : null) ||
    PROJECTS_DATA["delight-tees"];

  return (
    <main className="flex flex-col items-center w-full bg-[#FAFAFA] dark:bg-[#0a0a0a]">
      {/* ── Hero ── */}
      <Section
        className={cn(
          "relative flex flex-col justify-between min-h-[100dvh] bg-cover bg-center bg-no-repeat pt-28 md:pt-36 pb-16",
          project.heroBgClass,
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

        <div className="flex flex-col gap-5 justify-center flex-1 w-full relative z-10 max-w-4xl">
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-primary/20 text-primary border border-primary/40 w-fit backdrop-blur-md">
              <span>{project.category}</span>
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
              {project.subtitle}
            </p>
          </ScrollReveal>
        </div>

        {/* Explore Scroll indicator */}
        <ScrollReveal direction="none" delay={700}>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
            <span className="text-[11px] tracking-[0.25em] uppercase text-gray-400 font-medium animate-pulse-slow">
              Explore
            </span>
            <div className="w-px h-12 bg-gradient-to-b from-gray-400 to-transparent animate-float" />
          </div>
        </ScrollReveal>
      </Section>

      {/* ── Gold Stats Bar ── */}
      <section className="w-full bg-primary py-8 md:py-10 px-6 md:px-20 text-white shadow-md">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center divide-y sm:divide-y-0 sm:divide-x divide-white/20">
          {project.stats.map((stat, idx) => (
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

      {/* ── Project Overview & Deliverables ── */}
      <section className="relative w-full px-4 md:px-20 py-16 md:py-24 overflow-hidden">
        {/* Subtle background circuit pattern */}

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
                    {project.overview}
                  </p>

                  {/* Challenge */}
                  <div className="space-y-2.5">
                    <h3 className="text-[12px] font-bold tracking-[0.18em] uppercase text-gray-900 dark:text-white">
                      The Challenge
                    </h3>
                    <p className="text-[15px] leading-[26px] text-gray-600 dark:text-gray-400">
                      {project.challenge}
                    </p>
                  </div>

                  {/* Solution */}
                  <div className="space-y-2.5">
                    <h3 className="text-[12px] font-bold tracking-[0.18em] uppercase text-gray-900 dark:text-white">
                      Our Solution
                    </h3>
                    <p className="text-[15px] leading-[26px] text-gray-600 dark:text-gray-400">
                      {project.solution}
                    </p>
                  </div>

                  {/* Technologies */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-[12px] font-bold tracking-[0.18em] uppercase text-gray-900 dark:text-white">
                      Technologies Used
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {project.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Deliverables Card */}
                <div className="bg-[#FAF9F5] dark:bg-[#1A1A1A] rounded-2xl border border-gray-200/70 dark:border-white/10 p-7 md:p-8 space-y-6">
                  <h3 className="text-[13px] font-bold tracking-[0.18em] uppercase text-gray-900 dark:text-white">
                    What We Delivered
                  </h3>

                  <ul className="space-y-4">
                    {project.deliverables.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-[14px] text-gray-700 dark:text-gray-300 leading-snug"
                      >
                        <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
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
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Client Testimonials ── */}
      {project.testimonials.length > 0 && (
        <section className="relative w-full px-4 md:px-20 pb-24 overflow-hidden">
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
              {project.testimonials.map((t, idx) => (
                <ScrollReveal key={idx} delay={idx * 120}>
                  <div className="h-full bg-white dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/10 p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div className="space-y-5">
                      {/* Quote Icon & Stars */}
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <RiDoubleQuotesL className="text-[20px]" />
                        </div>
                        <div className="flex items-center gap-1 text-primary">
                          {Array.from({ length: t.rating }).map((_, i) => (
                            <RiStarFill key={i} className="text-sm" />
                          ))}
                        </div>
                      </div>

                      <p className="text-[15px] md:text-[16px] leading-[28px] text-gray-700 dark:text-gray-300 italic">
                        {t.quote}
                      </p>
                    </div>

                    {/* Author row */}
                    <div className="mt-8 pt-5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
                          <Image
                            src={t.avatar}
                            alt={t.author}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">
                            {t.author}
                          </p>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {t.role}
                          </p>
                        </div>
                      </div>

                      {t.featured && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-primary/15 text-primary border border-primary/30">
                          Featured
                        </span>
                      )}
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
