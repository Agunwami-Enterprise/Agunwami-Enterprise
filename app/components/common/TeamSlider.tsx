"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { BsArrowRight, BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { RiLinkedinBoxFill, RiTeamLine } from "react-icons/ri";

import { TeamMember, defaultTeam } from "./teamData";

export type { TeamMember };
export { defaultTeam };

interface TeamSliderProps {
  members?: TeamMember[];
  variant?: "home" | "about";
  showViewAll?: boolean;
  sectionId?: string;
  title1?: string;
  title2?: string;
  aboutHeading?: string;
  aboutDescription?: string;
  badgeText?: string;
}

export default function TeamSlider({
  members = defaultTeam,
  variant = "home",
  showViewAll = true,
  sectionId = "leadership",
  title1 = "The Team",
  title2 = "Behind AE",
  aboutHeading = "Our Leadership",
  aboutDescription = "The minds behind Agunwami Enterprise, experienced leaders passionate about building systems that create opportunity and drive impact.",
  badgeText = "Leadership",
}: TeamSliderProps) {
  const N = members.length;

  // Cloned array for seamless infinite looping (3 copies)
  const extendedMembers = N > 0 ? [...members, ...members, ...members] : [];

  // Start in the middle copy (index N)
  const [currentIndex, setCurrentIndex] = useState(N);
  const [isAnimating, setIsAnimating] = useState(false);
  const isTransitioningRef = useRef(false);

  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive items per view
  const [itemsPerView, setItemsPerView] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update currentIndex if members change
  useEffect(() => {
    setCurrentIndex(members.length);
  }, [members.length]);

  // Seamless jump reset on transition end
  const handleTransitionEnd = useCallback(() => {
    isTransitioningRef.current = false;
    setIsAnimating(false);
    if (N === 0) return;

    setCurrentIndex((curr) => {
      if (curr >= 2 * N) {
        return curr - N;
      }
      if (curr < N) {
        return curr + N;
      }
      return curr;
    });
  }, [N]);

  // Fallback safety timer for transitions
  useEffect(() => {
    if (!isAnimating) return;
    const timer = setTimeout(() => {
      if (isTransitioningRef.current) {
        handleTransitionEnd();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [isAnimating, handleTransitionEnd]);

  // Slide forward (infinite circular loop)
  const nextSlide = useCallback(() => {
    if (isTransitioningRef.current || N <= 1) return;
    isTransitioningRef.current = true;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev + 1);
  }, [N]);

  // Slide backward (infinite circular loop)
  const prevSlide = useCallback(() => {
    if (isTransitioningRef.current || N <= 1) return;
    isTransitioningRef.current = true;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev - 1);
  }, [N]);

  // Active dot in the 0..N-1 space
  const activeDot = N > 0 ? ((currentIndex % N) + N) % N : 0;

  // Jump to specific dot smoothly via shortest circular path
  const goToSlide = (dotIdx: number) => {
    if (isTransitioningRef.current || dotIdx === activeDot || N <= 1) return;
    isTransitioningRef.current = true;
    setIsAnimating(true);
    let diff = dotIdx - activeDot;
    if (diff > N / 2) diff -= N;
    if (diff < -N / 2) diff += N;
    setCurrentIndex((prev) => prev + diff);
  };

  // Autoplay
  useEffect(() => {
    if (isPaused || N <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, N]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) {
      nextSlide();
    } else if (distance < -50) {
      prevSlide();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const distance = dragStartX - e.clientX;
    if (distance > 60) {
      nextSlide();
    } else if (distance < -60) {
      prevSlide();
    }
  };

  return (
    <section
      id={sectionId}
      className="relative w-full py-20 md:py-28 px-4 md:px-20 overflow-hidden bg-[#FCFAF6] dark:bg-[#0E0E0E] transition-colors duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        setIsDragging(false);
      }}
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
          <circle cx="1140" cy="160" r="3.5" fill="currentColor" opacity="0.3" />
          <path
            d="M100 700 H280 L320 660 H600 L640 700 H850"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.15"
          />
          <path
            d="M1000 680 H1180 L1220 640 H1400"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.2"
          />
          <circle cx="1220" cy="640" r="4" fill="currentColor" opacity="0.3" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        {/* Header Block: Two variants (Home vs About) */}
        {variant === "about" ? (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <div>
                <h2 className="text-[38px] sm:text-[46px] md:text-[54px] font-primary font-normal leading-[1.15] text-gray-950 dark:text-white">
                  {aboutHeading}
                </h2>
                {/* Gold underline accent bar */}
                <div className="w-16 h-1 bg-primary rounded-full mt-3" />
              </div>
              <p className="text-[15px] sm:text-[16px] leading-[26px] text-gray-600 dark:text-gray-400">
                {aboutDescription}
              </p>
            </div>

            {/* Slider Navigation Controls */}
            <div className="flex items-center gap-2 self-start md:self-end">
              <button
                onClick={prevSlide}
                aria-label="Previous Team Member"
                className="w-11 h-11 rounded-full border border-gray-200 dark:border-white/15 bg-white dark:bg-[#1A1A1A] hover:border-primary hover:text-primary dark:hover:border-primary flex items-center justify-center text-gray-700 dark:text-gray-300 transition-all duration-200 shadow-sm cursor-pointer"
              >
                <BsChevronLeft className="text-sm" />
              </button>
              <button
                onClick={nextSlide}
                aria-label="Next Team Member"
                className="w-11 h-11 rounded-full border border-gray-200 dark:border-white/15 bg-white dark:bg-[#1A1A1A] hover:border-primary hover:text-primary dark:hover:border-primary flex items-center justify-center text-gray-700 dark:text-gray-300 transition-all duration-200 shadow-sm cursor-pointer"
              >
                <BsChevronRight className="text-sm" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#FAF5EB] dark:bg-[#C89B3C]/10 border border-[#E8DCC2] dark:border-[#C89B3C]/20 text-[#A87B28] dark:text-[#E0B85C] text-xs font-semibold tracking-wide">
                <RiTeamLine className="text-sm" />
                <span>{badgeText}</span>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-[38px] sm:text-[46px] md:text-[54px] lg:text-[60px] font-primary font-normal leading-[1.1] text-gray-950 dark:text-white">
                  {title1}
                  <br />
                  <span className="text-primary">{title2}</span>
                </h2>
                {/* Gold underline accent bar */}
                <div className="w-16 h-1 bg-primary rounded-full mt-3" />
              </div>
            </div>

            {/* Right Action & Slider Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {showViewAll && (
                <Link
                  href="/about#leadership"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <span>View All Team Members</span>
                  <BsArrowRight className="text-base" />
                </Link>
              )}

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSlide}
                  aria-label="Previous Team Member"
                  className="w-11 h-11 rounded-full border border-gray-200 dark:border-white/15 bg-white dark:bg-[#1A1A1A] hover:border-primary hover:text-primary dark:hover:border-primary flex items-center justify-center text-gray-700 dark:text-gray-300 transition-all duration-200 shadow-sm cursor-pointer"
                >
                  <BsChevronLeft className="text-sm" />
                </button>
                <button
                  onClick={nextSlide}
                  aria-label="Next Team Member"
                  className="w-11 h-11 rounded-full border border-gray-200 dark:border-white/15 bg-white dark:bg-[#1A1A1A] hover:border-primary hover:text-primary dark:hover:border-primary flex items-center justify-center text-gray-700 dark:text-gray-300 transition-all duration-200 shadow-sm cursor-pointer"
                >
                  <BsChevronRight className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Carousel Slider */}
        <div
          ref={containerRef}
          className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          <div
            onTransitionEnd={handleTransitionEnd}
            className="flex"
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
              transition: isAnimating
                ? "transform 500ms cubic-bezier(0.25, 1, 0.5, 1)"
                : "none",
            }}
          >
            {extendedMembers.map((member, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 px-3 md:px-4"
                style={{ width: `${100 / itemsPerView}%` }}
              >
                <div className="group bg-white dark:bg-[#161616] rounded-2xl border border-gray-100/90 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  {/* Photo Container */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-neutral-800">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Body Content */}
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

                    {/* LinkedIn Link */}
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
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Dots */}
        {N > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {Array.from({ length: N }).map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => goToSlide(dotIdx)}
                aria-label={`Go to slide ${dotIdx + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeDot === dotIdx
                    ? "w-8 bg-primary"
                    : "w-2.5 bg-gray-300 dark:bg-white/20 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
