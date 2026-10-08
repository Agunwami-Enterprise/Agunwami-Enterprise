import Image from "next/image";
import Link from "next/link";
import { BsArrowRight, BsEnvelope } from "react-icons/bs";
import { HiArrowUpRight } from "react-icons/hi2";
import { FaFacebook, FaInstagram, FaLinkedin, FaXTwitter, FaYoutube, FaGithub, FaTiktok } from "react-icons/fa6";
import { BiLink } from "react-icons/bi";
import { getSiteSettings } from "@/lib/site/content";

const SOCIAL_ICONS: [RegExp, React.ElementType][] = [
  [/linkedin/i, FaLinkedin],
  [/twitter|^x$|x\.com/i, FaXTwitter],
  [/instagram/i, FaInstagram],
  [/facebook/i, FaFacebook],
  [/youtube/i, FaYoutube],
  [/github/i, FaGithub],
  [/tiktok/i, FaTiktok],
];

function socialIcon(label: string, url: string): React.ElementType {
  return SOCIAL_ICONS.find(([pattern]) => pattern.test(label) || pattern.test(url))?.[1] ?? BiLink;
}

/** Links to other sites open in a new tab; site paths and mailto: don't. */
const isExternal = (href: string) => /^https?:\/\//.test(href);

/** Footer content and colours come from C-panel → Site Settings. */
export default async function Footer() {
  const settings = await getSiteSettings();
  const { footer } = settings;
  const socialLinks = settings.socialLinks.filter((link) => link.url && link.url !== "#");

  return (
    <footer
      className="relative overflow-hidden w-full bg-gradient-to-r from-primary/10 to-black/90 "
      style={{
        backgroundColor: "#111111",
        ["--footer-text" as string]: footer.textColor,
        ["--footer-accent" as string]: footer.accentColor,
      }}
    >
      {/* Background pattern */}
      {footer.backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={footer.backgroundImageUrl}
          alt=""
          aria-hidden="true"
          style={{ opacity: footer.backgroundOpacity / 100 }}
          className="absolute right-0 top-199 -bottom-1 left-0 -translate-y-1/2  object-contain pointer-events-none"
        />
      )}

      {/* Main footer content */}
      <div className="relative z-10 px-4 md:px-20 pt-16 pb-20">
        {/* Brand column is twice as wide as each link/CTA column, like before. */}
        <div
          className="grid grid-cols-1 gap-12 md:[grid-template-columns:var(--footer-cols)]"
          style={{ ["--footer-cols" as string]: `2fr ${"1fr ".repeat(footer.columns.length)}1fr` }}
        >
          {/* Brand block */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Image
                src={footer.logoUrl || "/logo.png"}
                alt={`${settings.companyName} Logo`}
                width={44}
                height={44}
                className="object-contain"
              />
              <span className="font-primary text-[22px] leading-tight text-[var(--footer-text)]">
                {settings.companyName}
              </span>
            </div>
            {footer.description && (
              <p className="text-[15px] leading-[26px] text-[#9A9A9A] max-w-[320px]">
                {footer.description}
              </p>
            )}
            {footer.contactEmail && (
              <Link
                href={`mailto:${footer.contactEmail}`}
                className="inline-flex items-center gap-2 text-[var(--footer-accent)] text-[14px] font-semibold hover:underline"
              >
                <BsEnvelope />
                {footer.contactEmail}
                <HiArrowUpRight className="text-[12px]" />
              </Link>
            )}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-4 pt-1">
                {socialLinks.map((link) => {
                  const Icon = socialIcon(link.label, link.url);
                  return (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      className="text-[#9A9A9A] hover:text-[var(--footer-accent)] transition-colors text-[18px]"
                    >
                      <Icon />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Link columns */}
          {footer.columns.map((column) => (
            <div key={column.title} className="space-y-5">
              <p className="text-[11px] font-semibold tracking-widest text-[#7C7C7C] uppercase">
                {column.title}
              </p>
              <ul className="space-y-4">
                {column.links.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <Link
                      href={link.href}
                      {...(isExternal(link.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex items-center gap-2 text-[15px] text-[#D4D4D4] hover:text-[var(--footer-text)] transition-colors"
                    >
                      <span className="w-0 h-[1px] bg-[var(--footer-accent)] transition-all duration-300 group-hover:w-3" />
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Get Started */}
          {footer.ctaButtonText && footer.ctaButtonUrl && (
            <div className="space-y-5">
              {footer.ctaHeading && (
                <p className="text-[11px] font-semibold tracking-widest text-[#7C7C7C] uppercase">
                  {footer.ctaHeading}
                </p>
              )}
              <Link
                href={footer.ctaButtonUrl}
                {...(isExternal(footer.ctaButtonUrl) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-flex items-center gap-3 bg-[#242424] hover:bg-white hover:text-black text-[var(--footer-text)] text-[15px] font-semibold px-5 py-3 rounded-lg border border-white/10 transition-all"
              >
                {footer.ctaButtonText} <BsArrowRight />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 border-t border-white/10 px-4 md:px-20 pt-5 pb-10 flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="text-[13px] text-[#6B6B6B]">{footer.copyright}</p>
        <p className="text-[13px] text-[#6B6B6B]">{footer.bottomTagline}</p>
      </div>
    </footer>
  );
}
