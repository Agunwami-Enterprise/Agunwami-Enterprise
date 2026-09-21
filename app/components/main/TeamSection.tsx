import Image from "next/image";
import Link from "next/link";
import { BsArrowRight } from "react-icons/bs";
import { RiLinkedinBoxFill, RiTeamLine } from "react-icons/ri";
import ScrollReveal from "@/app/components/common/ScrollReveal";
import { defaultTeam } from "@/lib/data/teamData";

export default function TeamSection() {
  return (
    <section
      id="leadership"
      className="relative w-full py-20 md:py-28 px-4 md:px-20 overflow-hidden bg-[#FCFAF6] dark:bg-[#0E0E0E] transition-colors duration-300"
    >
      {/* Decorative Circuit Board Vector Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        aria-hidden="true"
      >
        <svg
          className="w-full h-full text-[#C89B3C]"
          viewBox="0 0 1440 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-50 200 H180 L240 260 H480 L520 220 H700"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.25"
          />
          <circle cx="240" cy="260" r="4" fill="currentColor" opacity="0.4" />
          <circle cx="480" cy="260" r="3" fill="currentColor" opacity="0.3" />
          <path
            d="M920 120 H1100 L1140 160 H1380 L1420 120 H1500"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            opacity="0.2"
          />
          <circle
            cx="1140"
            cy="160"
            r="3.5"
            fill="currentColor"
            opacity="0.3"
          />
          <path
            d="M100 700 H280 L320 660 H600 L640 700 H850"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.15"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#FAF5EB] dark:bg-[#C89B3C]/10 border border-[#E8DCC2] dark:border-[#C89B3C]/20 text-[#A87B28] dark:text-[#E0B85C] text-xs font-semibold tracking-wide">
              <RiTeamLine className="text-sm" />
              <span>Leadership</span>
            </div>
            {/* Title */}
            <div>
              <h2 className="text-[38px] sm:text-[46px] md:text-[54px] lg:text-[60px] font-primary font-normal leading-[1.1] text-gray-950 dark:text-white">
                The Team
                <br />
                <span className="text-primary">Behind AE</span>
              </h2>
              <div className="w-16 h-1 bg-primary rounded-full mt-3" />
            </div>
          </div>

          {/* View All CTA */}
          <Link
            href="/about#leadership"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md self-start md:self-end"
          >
            <span>View All Team Members</span>
            <BsArrowRight className="text-base" />
          </Link>
        </div>

        {/* 3-Card Static Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {defaultTeam.slice(0, 3).map((member, idx) => (
            <ScrollReveal key={idx} delay={idx * 100} direction="up">
              <div className="group bg-white dark:bg-[#161616] rounded-2xl border border-gray-100/90 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                {/* Photo */}
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-neutral-800">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                {/* Body */}
                <div className="p-6 md:p-7 flex flex-col flex-1 gap-3.5">
                  <h3 className="text-[22px] md:text-[24px] font-primary font-bold text-gray-950 dark:text-white leading-tight">
                    {member.name}
                  </h3>
                  <p className="text-[14px] md:text-[15px] font-bold text-[#A87B28] dark:text-[#E0B85C]">
                    {member.role}
                  </p>
                  <p className="text-[13.5px] leading-[22px] text-gray-600 dark:text-gray-300 line-clamp-4">
                    {member.bio}
                  </p>
                  <div className="pt-2 mt-auto">
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-[#0A66C2] dark:hover:text-[#0A66C2] transition-colors"
                    >
                      <RiLinkedinBoxFill className="text-[24px] text-[#0A66C2] flex-shrink-0" />
                      <span>LinkedIn ↗</span>
                    </a>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
