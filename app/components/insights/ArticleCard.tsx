import Image from "next/image";
import Link from "next/link";
import { RiCalendarLine, RiArrowRightLine } from "react-icons/ri";
import ScrollReveal from "@/app/components/common/ScrollReveal";
import type { Article } from "@/lib/data/insightsData";

interface ArticleCardProps {
  article: Article;
  delay?: number;
}

export default function ArticleCard({ article, delay = 0 }: ArticleCardProps) {
  return (
    <ScrollReveal delay={delay}>
      <Link
        href={`/insights/${article.slug}`}
        className="group block h-full focus:outline-none"
      >
        <article className="h-full flex flex-col bg-white dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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
      </Link>
    </ScrollReveal>
  );
}
