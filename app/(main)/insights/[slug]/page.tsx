import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ARTICLES } from "../insightsData";
import ShareButtons from "./ShareButtons";
import NewsletterCard from "@/app/components/common/NewsletterCard";
import {
  RiCalendarLine,
  RiTimeLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiSparklingLine,
} from "react-icons/ri";

/* ── Static params for SSG ── */
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

/* ── Per-page SEO metadata ── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) return {};
  return {
    title: `${article.title} | Expert Insights — Agunwami Enterprise`,
    description: article.excerpt,
  };
}

/* ── Category colour helper ── */
function getCategoryColor(cat: string) {
  const map: Record<string, string> = {
    Infrastructure: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    Design: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    Technology: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    Partnerships: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    Insights: "bg-primary/10 text-primary border-primary/30",
  };
  return map[cat] ?? "bg-primary/10 text-primary border-primary/30";
}

/* ── Page Component ── */
export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) notFound();

  /* Other articles for "Continue Reading" — excluding the current one */
  const related = ARTICLES.filter((a) => a.slug !== slug).slice(0, 3);

  return (
    <main className="flex flex-col w-full bg-[#FAFAFA] dark:bg-[#0a0a0a]">
      {/* ───────────── HERO ───────────── */}
      <section className="relative w-full min-h-[480px] md:min-h-[560px] flex flex-col justify-end bg-gray-950 overflow-hidden">
        {/* Background image with dark gradient overlay */}
        <div className="absolute inset-0">
          <Image
            src={article.image}
            alt={article.title}
            fill
            priority
            className="object-cover opacity-40"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-gray-950/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/60 to-transparent" />
        </div>

        {/* Eco pattern overlay */}
        <img
          src="/ecobg.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute right-0 top-0 w-[600px] opacity-[0.06] hidden md:block"
        />

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-20 pb-14 pt-36 md:pt-44 flex flex-col gap-5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-400" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-gray-600">/</span>
            <Link href="/insights" className="hover:text-white transition-colors">Expert Insights</Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-300 truncate max-w-[260px]">{article.title}</span>
          </nav>

          {/* Category badge */}
          <span
            className={`inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(article.category)}`}
          >
            <RiSparklingLine />
            {article.category}
          </span>

          {/* Title */}
          <h1 className="max-w-3xl text-[32px] sm:text-[40px] md:text-[52px] leading-[1.12] font-primary font-normal tracking-tight text-white">
            {article.title}
          </h1>

          {/* Author + meta row */}
          <div className="flex flex-wrap items-center gap-5 mt-1">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary/50 flex-shrink-0 bg-gray-800">
                <Image
                  src={article.authorImage}
                  alt={article.author}
                  fill
                  className="object-cover object-top"
                  sizes="36px"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">{article.author}</p>
                <p className="text-xs text-gray-400 mt-0.5">{article.authorRole}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <RiCalendarLine className="text-primary" />
                {article.date}
              </span>
              <span className="flex items-center gap-1.5">
                <RiTimeLine className="text-primary" />
                {article.readTime}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── BODY + SIDEBAR ───────────── */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-20 py-14 md:py-20">
        <div className="flex flex-col lg:flex-row gap-14 xl:gap-20">
          {/* ── Main Article Content ── */}
          <article className="flex-1 min-w-0">
            {/* Back link */}
            <Link
              href="/insights"
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors mb-10 group"
            >
              <RiArrowLeftLine className="group-hover:-translate-x-0.5 transition-transform" />
              Back to all articles
            </Link>

            {/* Intro paragraph */}
            <p className="text-[17px] md:text-[18px] leading-[1.85] text-gray-700 dark:text-gray-200 font-medium mb-10">
              {article.intro}
            </p>

            {/* Divider */}
            <div className="w-full h-px bg-gray-200 dark:bg-white/10 mb-10" />

            {/* Sections */}
            <div className="space-y-10">
              {article.sections.map((section, i) => (
                <div key={i} id={`section-${i}`} className="scroll-mt-24">
                  <h2 className="text-[20px] md:text-[22px] font-primary font-semibold text-gray-900 dark:text-white mb-4 leading-snug">
                    {section.heading}
                  </h2>
                  <div className="space-y-4">
                    {section.body.map((paragraph, j) => (
                      <p
                        key={j}
                        className="text-[15.5px] md:text-[16px] leading-[1.85] text-gray-600 dark:text-gray-300"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pull Quote */}
            <blockquote className="my-12 pl-6 border-l-4 border-primary py-2">
              <p className="text-[18px] md:text-[20px] font-primary font-normal italic text-gray-800 dark:text-gray-100 leading-relaxed">
                &ldquo;{article.pullQuote}&rdquo;
              </p>
            </blockquote>

            {/* What This Looks Like in Practice */}
            <div className="rounded-2xl bg-[#FBF7EE] dark:bg-[#161410] border border-[#E8DCC2] dark:border-primary/20 p-7 md:p-9 my-4">
              <h3 className="text-[18px] font-primary font-semibold text-gray-900 dark:text-white mb-3">
                What This Looks Like in Practice
              </h3>
              <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
                The best organizations are not the ones that started with the most resources. They are the ones that made the right decisions early—and built systems, teams, and cultures that could compound those decisions over time. If you do anything after reading this, let it be: start before you're ready.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
                Building great digital infrastructure is not a one-time event. It is a continuous practice of intentional decisions, honest retrospectives, and principled trade-offs. The organizations that get it right do so because they treat it as a discipline—not a destination.
              </p>
            </div>

            {/* Author card */}
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
              <div className="flex items-start gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-primary/30 flex-shrink-0 bg-gray-200 dark:bg-gray-800">
                  <Image
                    src={article.authorImage}
                    alt={article.author}
                    fill
                    className="object-cover object-top"
                    sizes="56px"
                  />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-[15px]">
                    {article.author}
                  </p>
                  <p className="text-sm text-primary font-medium">{article.authorRole}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed max-w-md">
                    A leader at Agunwami Enterprise focused on building digital infrastructure and systems that scale with purpose.
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* ── Sticky Sidebar ── */}
          <aside className="lg:w-[300px] xl:w-[320px] flex-shrink-0">
            <div className="sticky top-28 space-y-6">
              {/* Article Info Card */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm">
                <div className="p-6 space-y-4">
                  <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400">
                    Article Info
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-between">
                      <span>Published</span>
                      <span className="font-medium text-gray-900 dark:text-white">{article.date}</span>
                    </div>
                    <div className="h-px bg-gray-100 dark:bg-white/5" />
                    <div className="flex items-center justify-between">
                      <span>Read time</span>
                      <span className="font-medium text-gray-900 dark:text-white">{article.readTime}</span>
                    </div>
                    <div className="h-px bg-gray-100 dark:bg-white/5" />
                    <div className="flex items-center justify-between">
                      <span>Category</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryColor(article.category)}`}
                      >
                        {article.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table of Contents */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm">
                <div className="p-6 space-y-3">
                  <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400">
                    Contents
                  </h3>
                  <nav className="space-y-1.5">
                    {article.sections.map((section, i) => (
                      <a
                        key={i}
                        href={`#section-${i}`}
                        className="flex items-start gap-2 text-[13px] text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors leading-snug group"
                      >
                        <span className="mt-0.5 text-[10px] font-bold text-primary opacity-60 flex-shrink-0 group-hover:opacity-100 transition-opacity">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{section.heading}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Share */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm">
                <div className="p-6 space-y-3">
                  <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400">
                    Share
                  </h3>
                  <ShareButtons title={article.title} slug={article.slug} />
                </div>
              </div>

              {/* Newsletter CTA */}
              <NewsletterCard category={article.category} />
            </div>
          </aside>
        </div>
      </section>

      {/* ───────────── CONTINUE READING ───────────── */}
      <section className="w-full border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#0D0D0D] py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-20">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-[28px] md:text-[34px] font-primary font-normal text-gray-900 dark:text-white">
              Continue Reading
            </h2>
            <Link
              href="/insights"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group"
            >
              View all articles
              <RiArrowRightLine className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((rel) => (
              <Link
                key={rel.id}
                href={`/insights/${rel.slug}`}
                className="group block bg-[#FAFAFA] dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/10 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-white/5">
                  <Image
                    src={rel.image}
                    alt={rel.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <span
                    className={`absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-sm ${getCategoryColor(rel.category)}`}
                  >
                    {rel.category}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {rel.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
                    {rel.excerpt}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <RiCalendarLine className="text-primary text-xs" />
                      {rel.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <RiTimeLine className="text-primary text-xs" />
                      {rel.readTime}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center sm:hidden">
            <Link
              href="/insights"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              View all articles
              <RiArrowRightLine />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
