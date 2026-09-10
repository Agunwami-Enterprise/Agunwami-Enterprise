"use client";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BiMenu, BiX, BiChevronDown } from "react-icons/bi";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);
  const pathname = usePathname();

  const isResourcesActive =
    pathname === "/insights" ||
    pathname.startsWith("/insights/") ||
    pathname === "/ecosystem" ||
    pathname.startsWith("/ecosystem/");

  const resourceDropdown = [
    {
      title: "Expert Insights",
      href: "/insights",
      description: "Articles, perspectives & deep dives",
    },
    {
      title: "Ecosystem",
      href: "/ecosystem",
      description: "Interconnected platforms & initiatives",
    },
  ];

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[80%] max-w-[95%]">
      <div
        className={cn(
          "bg-white/80 dark:bg-[#111111]/85 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-black/40 px-4 md:px-8 py-3 transition-all duration-300",
          isOpen
            ? "rounded-3xl"
            : "rounded-2xl lg:rounded-full 4xl:rounded-[4rem]",
        )}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 md:gap-3">
            <div className="relative h-8 w-8 md:h-10 md:w-10 3xl:h-12 3xl:w-12 4xl:h-16 4xl:w-16 overflow-hidden rounded-lg md:rounded-xl flex items-center justify-center">
              <Image
                src="/logo.png"
                width={64}
                height={64}
                alt="logo"
                className="object-contain"
              />
            </div>
            <h1 className="text-lg md:text-2xl 3xl:text-3xl 4xl:text-4xl font-primary font-normal tracking-tight text-gray-900 dark:text-white">
              Agunwami Enterprise
            </h1>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 3xl:gap-12 4xl:gap-16">
            <Link
              href="/"
              className={`text-sm 3xl:text-base 4xl:text-xl font-medium transition-colors hover:text-primary ${
                pathname === "/"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Home
            </Link>

            <Link
              href="/about"
              className={`text-sm 3xl:text-base 4xl:text-xl font-medium transition-colors hover:text-primary ${
                pathname === "/about"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              About
            </Link>

            <Link
              href="/services"
              className={`text-sm 3xl:text-base 4xl:text-xl font-medium transition-colors hover:text-primary ${
                pathname === "/services"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Services
            </Link>

            <Link
              href="/projects"
              className={`text-sm 3xl:text-base 4xl:text-xl font-medium transition-colors hover:text-primary ${
                pathname === "/projects"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Projects
            </Link>

            {/* Resources Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setResourcesOpen(true)}
              onMouseLeave={() => setResourcesOpen(false)}
            >
              <button
                type="button"
                onClick={() => setResourcesOpen((prev) => !prev)}
                className={`flex items-center gap-1 text-sm 3xl:text-base 4xl:text-xl font-medium transition-colors hover:text-primary py-1 cursor-pointer ${
                  isResourcesActive
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                <span>Resources</span>
                <BiChevronDown
                  className={cn(
                    "text-base transition-transform duration-200",
                    resourcesOpen && "rotate-180",
                  )}
                />
              </button>

              {/* Dropdown Menu */}
              <div
                className={cn(
                  "absolute top-full left-1/2 -translate-x-1/2 pt-2 w-64 transition-all duration-200 z-50",
                  resourcesOpen
                    ? "opacity-100 visible translate-y-0"
                    : "opacity-0 invisible -translate-y-2 pointer-events-none",
                )}
              >
                <div className="p-2 bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl">
                  {resourceDropdown.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setResourcesOpen(false)}
                        className={cn(
                          "block px-3.5 py-2.5 rounded-xl transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200",
                        )}
                      >
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                          {item.description}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <Link
              href="/partnerships"
              className={`text-sm 3xl:text-base 4xl:text-xl font-medium transition-colors hover:text-primary ${
                pathname === "/partnerships"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Partnerships
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:gap-3 3xl:gap-5 4xl:gap-6">
            <ThemeToggle className="3xl:scale-125 4xl:scale-150 origin-right" />
            <div className="hidden sm:block">
              <Link href="/contact">
                <button
                  type="button"
                  className="whitespace-nowrap px-5 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all shadow-sm cursor-pointer"
                >
                  Get in Touch
                </button>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <BiX size={28} /> : <BiMenu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {isOpen && (
          <div className="lg:hidden mt-4 pb-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className={`text-base font-medium px-4 py-2 rounded-lg transition-colors ${
                pathname === "/"
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              Home
            </Link>

            <Link
              href="/about"
              onClick={() => setIsOpen(false)}
              className={`text-base font-medium px-4 py-2 rounded-lg transition-colors ${
                pathname === "/about"
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              About
            </Link>

            <Link
              href="/services"
              onClick={() => setIsOpen(false)}
              className={`text-base font-medium px-4 py-2 rounded-lg transition-colors ${
                pathname === "/services"
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              Services
            </Link>

            <Link
              href="/projects"
              onClick={() => setIsOpen(false)}
              className={`text-base font-medium px-4 py-2 rounded-lg transition-colors ${
                pathname === "/projects"
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              Projects
            </Link>

            {/* Mobile Resources Accordion */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setMobileResourcesOpen((prev) => !prev)}
                className={`flex items-center justify-between text-base font-medium px-4 py-2 rounded-lg transition-colors w-full text-left ${
                  isResourcesActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <span>Resources</span>
                <BiChevronDown
                  className={cn(
                    "text-xl transition-transform duration-200",
                    mobileResourcesOpen && "rotate-180",
                  )}
                />
              </button>

              {mobileResourcesOpen && (
                <div className="pl-6 pr-2 py-1 flex flex-col gap-1 border-l-2 border-primary/30 ml-4 my-1">
                  {resourceDropdown.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => {
                        setIsOpen(false);
                        setMobileResourcesOpen(false);
                      }}
                      className={`text-sm py-2 px-3 rounded-lg transition-colors ${
                        pathname === sub.href
                          ? "text-primary font-semibold bg-primary/5"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {sub.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/partnerships"
              onClick={() => setIsOpen(false)}
              className={`text-base font-medium px-4 py-2 rounded-lg transition-colors ${
                pathname === "/partnerships"
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              Partnerships
            </Link>

            <div className="sm:hidden pt-2">
              <Link href="/contact" onClick={() => setIsOpen(false)}>
                <button
                  type="button"
                  className="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm hover:bg-primary transition-all text-center"
                >
                  Get in Touch
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
