"use client";
import Image from "next/image";
import Buttons from "./ui/Buttons";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BiMenu, BiX } from "react-icons/bi";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { id: 1, title: "Home", href: "/" },
    { id: 2, title: "About", href: "/about" },
    { id: 3, title: "Services", href: "/services" },
    { id: 4, title: "Projects", href: "/projects" },
    { id: 5, title: "Ecosystem", href: "/ecosystem" },
    { id: 6, title: "Partnerships", href: "/partnerships" },
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
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className={`text-sm 3xl:text-base 4xl:text-xl font-medium transition-colors hover:text-primary ${
                  pathname === link.href
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {link.title}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3 3xl:gap-5 4xl:gap-6">
            <ThemeToggle className="3xl:scale-125 4xl:scale-150 origin-right" />
            <div className="hidden sm:block">
              <Buttons
                onClick={() => (window.location.href = "/partnerships")}
                md
                primaryButton
                className="whitespace-nowrap px-4 py-2 3xl:text-lg 3xl:px-6 3xl:py-3 4xl:text-xl 4xl:px-8 4xl:py-4"
              >
                Partner With Us
              </Buttons>
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
          <div className="lg:hidden mt-4 pb-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`text-base font-medium px-4 py-2 rounded-lg transition-colors ${
                  pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                {link.title}
              </Link>
            ))}
            <div className="sm:hidden pt-2">
              <Buttons
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/partnerships";
                }}
                md
                primaryButton
              >
                Partner With Us
              </Buttons>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
