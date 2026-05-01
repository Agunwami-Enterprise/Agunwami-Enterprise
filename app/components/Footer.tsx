import Image from "next/image";
import Link from "next/link";
import { BsArrowRight, BsEnvelope } from "react-icons/bs";
import { HiArrowUpRight } from "react-icons/hi2";

const quickLinks = [
  { title: "Home", href: "/" },
  { title: "About", href: "/about" },
  { title: "Services", href: "/services" },
  { title: "Contact", href: "/contact" },
];

const exploreLinks = [
  { title: "Projects", href: "/projects" },
  { title: "Ecosystem", href: "/ecosystem" },
  { title: "Partnerships", href: "/partnerships" },
];

export default function Footer() {
  return (
    <footer
      className="relative overflow-hidden w-full"
      style={{ backgroundColor: "#111111" }}
    >
      {/* Background ecobg circuit pattern */}
      <img
        src="/ecobg.png"
        alt=""
        aria-hidden="true"
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] object-contain pointer-events-none opacity-10"
      />

      {/* Main footer content */}
      <div className="relative z-10 px-4 md:px-20 pt-16 pb-12 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12">
        {/* Brand block */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Agunwami Enterprise Logo"
              width={44}
              height={44}
              className="object-contain"
            />
            <span className="font-primary text-[22px] leading-tight text-white">
              Agunwami Enterprise
            </span>
          </div>
          <p className="text-[15px] leading-[26px] text-[#9A9A9A] max-w-[320px]">
            Agunwami Enterprise delivers structured digital infrastructure for
            organizations and technology teams across emerging ecosystems.
          </p>
          <Link
            href="mailto:contact@agunwami.com"
            className="inline-flex items-center gap-2 text-primary text-[14px] font-semibold hover:underline"
          >
            <BsEnvelope className="text-primary" />
            contact@agunwami.com
            <HiArrowUpRight className="text-primary text-[12px]" />
          </Link>
        </div>

        {/* Quick Links */}
        <div className="space-y-5">
          <p className="text-[11px] font-semibold tracking-widest text-[#7C7C7C] uppercase">
            Quick Links
          </p>
          <ul className="space-y-4">
            {quickLinks.map((link) => (
              <li key={link.title}>
                <Link
                  href={link.href}
                  className="text-[15px] text-[#D4D4D4] hover:text-white transition-colors"
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Explore */}
        <div className="space-y-5">
          <p className="text-[11px] font-semibold tracking-widest text-[#7C7C7C] uppercase">
            Explore
          </p>
          <ul className="space-y-4">
            {exploreLinks.map((link) => (
              <li key={link.title}>
                <Link
                  href={link.href}
                  className="text-[15px] text-[#D4D4D4] hover:text-white transition-colors"
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Get Started */}
        <div className="space-y-5">
          <p className="text-[11px] font-semibold tracking-widest text-[#7C7C7C] uppercase">
            Get Started
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-3 bg-black text-white text-[15px] font-semibold px-5 py-3 rounded-md hover:bg-primary hover:text-white transition-all"
          >
            Partner With Us <BsArrowRight />
          </Link>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 border-t border-white/10 px-4 md:px-20 py-5 flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="text-[13px] text-[#6B6B6B]">
          © 2026 Agunwami Enterprise. All rights reserved.
        </p>
        <p className="text-[13px] text-[#6B6B6B]">
          Building Platforms. Empowering Institutions.
        </p>
      </div>
    </footer>
  );
}
