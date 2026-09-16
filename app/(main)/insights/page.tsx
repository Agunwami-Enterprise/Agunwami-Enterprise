"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import CTA from "@/app/components/common/CTA";
import ScrollReveal from "@/app/components/common/ScrollReveal";
import Section from "@/app/components/common/ui/Section";
import { cn } from "@/lib/utils";
import {
  RiCalendarLine,
  RiArrowRightLine,
  RiSearchLine,
  RiSparklingLine,
} from "react-icons/ri";

interface Article {
  id: number;
  title: string;
  category:
    | "Infrastructure"
    | "Design"
    | "Technology"
    | "Partnerships"
    | "Insights";
  excerpt: string;
  date: string;
  image: string;
  slug: string;
}

const ARTICLES: Article[] = [
  {
    id: 1,
    title: "Building Scalable Platforms for Long-Term Impact",
    category: "Infrastructure",
    excerpt:
      "Exploring the core principles of building digital platforms that scale with purpose and deliver sustainable impact.",
    date: "May 15, 2025",
    image: "/insight_infra.jpg",
    slug: "building-scalable-platforms-for-long-term-impact",
  },
  {
    id: 2,
    title: "Design Systems: The Backbone of Consistent Experiences",
    category: "Design",
    excerpt:
      "How design systems help teams ship faster, maintain consistency, and create better user experiences across platforms.",
    date: "May 08, 2025",
    image: "/insight_design.jpg",
    slug: "design-systems-the-backbone-of-consistent-experiences",
  },
  {
    id: 3,
    title: "The Future of Digital Infrastructure",
    category: "Technology",
    excerpt:
      "Key trends shaping the future of digital infrastructure and what forward-looking organizations should prepare for today.",
    date: "May 01, 2025",
    image: "/meridian.jpg",
    slug: "the-future-of-digital-infrastructure",
  },
  {
    id: 4,
    title: "Strategic Partnerships That Drive Transformation",
    category: "Partnerships",
    excerpt:
      "Why the right partnerships can accelerate growth, foster cross-sector innovation, and drive positive community impact.",
    date: "Apr 24, 2025",
    image: "/applyhero.jpg",
    slug: "strategic-partnerships-that-drive-transformation",
  },
  {
    id: 5,
    title: "Data-Driven Decisions for Smarter Systems",
    category: "Technology",
    excerpt:
      "How leveraging real-time data insights helps organizations make smarter decisions and build more effective, resilient systems.",
    date: "Apr 10, 2025",
    image: "/whatwedo.jpg",
    slug: "data-driven-decisions-for-smarter-systems",
  },
  {
    id: 6,
    title: "From Strategy to Execution: Bridging the Gap",
    category: "Insights",
    excerpt:
      "Turning ambitious ideas into concrete results with clear strategies, actionable roadmaps, and measurable mission outcomes.",
    date: "Apr 17, 2025",
    image: "/built.jpg",
    slug: "from-strategy-to-execution-bridging-the-gap",
  },
];

const CATEGORIES = [
  "All",
  "Infrastructure",
  "Design",
  "Technology",
  "Partnerships",
  "Insights",
] as const;

export default function InsightsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  const filteredArticles = useMemo(() => {
    return ARTICLES.filter((article) => {
      const matchesCategory =
        selectedCategory === "All" || article.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredArticles.length / itemsPerPage),
  );
  const currentArticles = filteredArticles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <main className="flex flex-col items-center w-full bg-[#FAFAFA] dark:bg-[#0a0a0a]">
      {/* ── Hero ── */}
      <Section className="relative flex flex-col justify-between min-h-[100dvh] bg-insights-hero dark:bg-insights-hero-dark bg-cover bg-center bg-no-repeat pt-28 md:pt-36 pb-16">
        {/* Subtle cyber ecobg overlay */}
        <div className="absolute right-[50%] top-0 h-full overflow-hidden w-full md:flex hidden justify-start items-start opacity-40 pointer-events-none">
          <img
            src="/ecobg.png"
            alt=""
            className="w-full h-fit scale-[1] mt-[-280px] ml-[-200px] opacity-[0.4]"
          />
        </div>

        <div className="flex flex-col gap-6 justify-center flex-1 w-full relative z-10 max-w-4xl">
          <ScrollReveal direction="down">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-primary/20 text-primary border border-primary/40 w-fit backdrop-blur-md">
              <RiSparklingLine className="text-sm" />
              <span>Blog</span>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <h1 className="w-full text-[44px] sm:text-[60px] md:text-[72px] lg:text-[84px] xl:text-[96px] leading-[1.1] font-primary font-normal tracking-tight text-white drop-shadow-md">
              Expert Insights<span className="text-primary">.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={220}>
            <p className="w-full max-w-2xl text-[18px] md:text-[22px] lg:text-[24px] xl:text-[26px] leading-relaxed text-gray-200 drop-shadow-sm">
              Ideas, strategies, and perspectives on building digital
              infrastructure that drives real impact.
            </p>
          </ScrollReveal>
        </div>

        {/* Explore Scroll indicator */}
        <ScrollReveal direction="none" delay={800}>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
            <span className="text-[11px] tracking-[0.25em] uppercase text-gray-400 font-medium animate-pulse-slow">
              Explore
            </span>
            <div className="w-px h-12 bg-gradient-to-b from-gray-400 to-transparent animate-float" />
          </div>
        </ScrollReveal>
      </Section>

      {/* ── Articles Catalog Section ── */}
      <section className="relative w-full px-4 md:px-20 py-16 md:py-24 overflow-hidden">
        {/* Subtle circuit background pattern */}
        <img
          src="/ecobg.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute left-[-150px] top-1/3 -translate-y-1/2 w-[700px] opacity-[0.08] dark:opacity-[0.05]"
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto space-y-12">
          {/* ── Filter Tabs & Search Bar ── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-200 dark:border-white/10">
            {/* Category tabs */}
            <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
              {CATEGORIES.map((category) => {
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-3.5 py-2 text-sm md:text-[15px] font-medium transition-all whitespace-nowrap rounded-lg cursor-pointer",
                      isActive
                        ? "bg-primary text-white font-semibold shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5",
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            {/* Search Input with gold button */}
            <div className="relative flex items-center w-full lg:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search articles..."
                className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161616] text-gray-900 dark:text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm"
              />
              <button
                type="button"
                className="absolute right-0 top-0 bottom-0 px-3.5 bg-primary text-white rounded-r-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
                aria-label="Search"
              >
                <RiSearchLine className="text-base" />
              </button>
            </div>
          </div>

          {/* ── Articles Grid ── */}
          {currentArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentArticles.map((article, idx) => (
                <ScrollReveal key={article.id} delay={idx * 80}>
                  <article className="group h-full flex flex-col bg-white dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    {/* Card Image */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100 dark:bg-white/5">
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      {/* Category Badge on image */}
                      <span className="absolute bottom-3.5 left-3.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#1a1711]/90 backdrop-blur-md text-primary border border-primary/40 shadow-sm">
                        {article.category}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 md:p-7 flex flex-col justify-between flex-1">
                      <div className="space-y-3">
                        <h2 className="font-primary text-[20px] md:text-[22px] font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-primary transition-colors">
                          {article.title}
                        </h2>
                        <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-3">
                          {article.excerpt}
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <RiCalendarLine className="text-sm text-primary" />
                          {article.date}
                        </span>
                        <span className="flex items-center gap-1 text-primary font-semibold group-hover:translate-x-1 transition-transform">
                          <RiArrowRightLine className="text-base" />
                        </span>
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4">
              <p className="text-lg text-gray-500 dark:text-gray-400">
                No articles found matching your criteria.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-10 h-10 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                      currentPage === page
                        ? "bg-primary text-white shadow-md"
                        : "bg-white dark:bg-[#161616] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:border-primary",
                    )}
                  >
                    {page}
                  </button>
                ),
              )}
              {currentPage < totalPages && (
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-4 h-10 rounded-lg text-sm font-semibold bg-white dark:bg-[#161616] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:border-primary flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Next</span>
                  <RiArrowRightLine className="text-sm" />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <CTA
        title="Interested in our ecosystem initiatives?"
        description="Connect with us to explore partnership opportunities or learn more about our platform roadmap."
        buttonText="Get in Touch"
        buttonHref="/contact"
      />
    </main>
  );
}
