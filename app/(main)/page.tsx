import type { Metadata } from "next";
import { BsArrowRight } from "react-icons/bs";
import Badge from "../components/common/ui/Badge";
import Buttons from "../components/common/ui/Buttons";
import Image from "next/image";
import Card from "../components/common/ui/Card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ScrollReveal from "../components/common/ScrollReveal";
import Section, { SectionWithHeading } from "../components/common/ui/Section";
import CTA from "../components/common/CTA";
import HeroMetrics from "../components/main/HeroMetrics";
import TeamSection from "../components/main/TeamSection";
import {
  projects,
  whatYouGain,
  whatWeDo,
  ourServices,
  aeEcosystemCards,
  howWeWork,
} from "@/lib/dummy";

export const metadata: Metadata = {
  title: "Custom Software Development Company | Agunwami Enterprise",
  description:
    "Need digital infrastructure? Agunwami Enterprise builds custom software, digital platforms, and web solutions for organizations and technology teams.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Custom Software Development Company | Agunwami Enterprise",
    description:
      "Need digital infrastructure? Agunwami Enterprise builds custom software, digital platforms, and web solutions for organizations and technology teams.",
    url: "https://agunwamienterprise.com",
    siteName: "Agunwami Enterprise",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 800,
        alt: "Agunwami Enterprise Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom Software Development Company | Agunwami Enterprise",
    description:
      "Need digital infrastructure? Agunwami Enterprise builds custom software, digital platforms, and web solutions for organizations and technology teams.",
    images: ["/logo.png"],
  },
};

const homeSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://agunwamienterprise.com/#organization",
      name: "Agunwami Enterprise",
      url: "https://agunwamienterprise.com",
      logo: "https://agunwamienterprise.com/logo.png",
      email: "Contact@agunwamienterprise.com",
      description:
        "Agunwami Enterprise builds custom software, digital platforms, and web solutions for organizations and technology teams.",
      sameAs: ["https://www.linkedin.com/company/agunwami-enterprises/"],
    },
    {
      "@type": "WebSite",
      "@id": "https://agunwamienterprise.com/#website",
      url: "https://agunwamienterprise.com",
      name: "Agunwami Enterprise",
      publisher: {
        "@id": "https://agunwamienterprise.com/#organization",
      },
    },
  ],
};

export default function MainPage() {
  return (
    <main className="flex flex-col items-center w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />
      {/* ── Hero ── */}
      <Section className="min-h-[100dvh] bg-hero-gradient dark:bg-hero-gradient-dark bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center lg:items-start pt-28 md:pt-32 pb-16 w-full space-y-0">
        <div className="w-full space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left my-auto py-6">
          <ScrollReveal direction="down">
            <Badge title="Platform Infrastructure Partner" type="primary" />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <h1 className="w-full text-[36px] sm:text-[48px] md:text-[56px] lg:text-[64px] xl:text-[76px] 2xl:text-[88px] leading-[44px] sm:leading-[56px] md:leading-[64px] lg:leading-[74px] xl:leading-[88px] 2xl:leading-[98px] font-primary font-normal tracking-tight text-gray-900 dark:text-white">
              Building Digital Infrastructure <br className="hidden sm:flex" />
              That Helps Start-ups, <br className="hidden sm:flex" />
              Businesses, and Non-profit organizations{" "}
              <span className="text-primary">Scale Faster.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <p className="text-[17px] md:text-[20px] lg:text-[22px] xl:text-[24px] leading-[26px] md:leading-[32px] lg:leading-[36px] text-gray-700 dark:text-gray-300 max-w-3xl">
              Agunwami Enterprise partners with businesses, startups,
              institutions, and non-profit organizations to design, build, and
              scale secure digital infrastructure, enterprise software,
              AI-powered solutions, and technology ecosystems that accelerate
              innovation, improve operational efficiency, and drive sustainable
              growth across the world.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={300}>
            <div className="mt-6 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href={"/partnerships/apply"} className="w-full sm:w-auto">
                <Buttons lg primaryButton className="w-full">
                  Partner With Us <BsArrowRight />
                </Buttons>
              </Link>
              <Link href={"/projects"} className="w-full sm:w-auto">
                <Buttons lg secondaryButton className="w-full">
                  Explore Our Projects
                </Buttons>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </Section>

      {/* ── Key Metrics & Statistics Strip ── */}
      <HeroMetrics />

      {/* ── What You Get When You Build With Agunwami Enterprise ── */}
      <Section>
        <div className="space-y-12 pb-6">
          <ScrollReveal>
            <SectionWithHeading
              heading="What You Get When You Build With Agunwami Enterprise"
              description="Partner with Agunwami Enterprise to turn ambitious ideas into secure, scalable, and future-ready digital solutions. We combine strategy, engineering, and innovation to help organizations achieve measurable business outcomes."
            />
          </ScrollReveal>

          {/* Six Value Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whatYouGain.map((item, index) => (
              <ScrollReveal key={index} delay={index * 80}>
                <Card className="h-full border border-gray-200/80 dark:border-white/10 hover:border-primary transition-all duration-300 group">
                  <div className="space-y-4">
                    <div className="w-10 h-1 bg-primary group-hover:w-16 transition-all duration-300" />
                    <h3 className="text-[24px] md:text-[26px] font-primary font-normal leading-snug text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-[16px] leading-[26px] text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </div>

          {/* Trust Statement & CTA */}
          <ScrollReveal>
            <div className="border-t border-gray-200 dark:border-white/10 pt-14 space-y-10">
              <div className="max-w-4xl space-y-3">
                <span className="text-xs font-semibold tracking-[0.25em] uppercase text-primary">
                  Why Organizations Choose Agunwami Enterprise
                </span>
                <p className="text-[20px] md:text-[24px] lg:text-[28px] leading-snug font-primary text-gray-900 dark:text-white">
                  We don&apos;t just develop software. We engineer digital
                  ecosystems that help businesses innovate, governments
                  modernize public services, and organizations create lasting
                  impact through technology.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-950 via-black to-gray-900 p-8 md:p-14 text-white shadow-2xl border border-primary/20">
                <div className="relative z-10 space-y-5 max-w-3xl">
                  <h2 className="text-[30px] sm:text-[38px] md:text-[46px] font-primary font-normal leading-tight">
                    Ready to Build Something{" "}
                    <span className="text-primary">Extraordinary?</span>
                  </h2>
                  <p className="text-[17px] md:text-[20px] text-gray-300 leading-relaxed">
                    Let&apos;s transform your vision into a secure, scalable,
                    and impactful digital solution.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Link href="/partnerships/apply">
                      <Buttons lg primaryButton className="w-full sm:w-auto">
                        Partner With Us <BsArrowRight />
                      </Buttons>
                    </Link>
                    <Link href="/projects">
                      <Buttons
                        lg
                        secondaryButton
                        className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10"
                      >
                        Explore Our Projects
                      </Buttons>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </Section>

      {/* ── The Team Behind AE ── */}
      <TeamSection />

      {/* ── What We Do ── */}
      <Section className="bg-primary/10 dark:bg-primary/5">
        <ScrollReveal className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="overflow-hidden rounded-xl w-full">
              <Image
                src="/whatwedo.png"
                alt="What We Do - Digital Infrastructure & Systems"
                width={700}
                height={400}
                className="relative w-full h-full object-cover hover:scale-105 transition-all duration-300 ease-in-out"
                style={{ width: "100%" }}
              />
            </div>
            <div className="space-y-5 justify-center flex flex-col">
              <SectionWithHeading
                heading="What We Do"
                description="We design, build, and scale digital solutions and infrastructure that help businesses, startups, and organizations operate at scale and create lasting impact"
              />
            </div>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {whatWeDo.map((item, index) => (
            <ScrollReveal key={index} delay={index * 100} className="w-full">
              <Card className="h-full min-h-[16rem] border border-gray-200/80 dark:border-white/10 hover:border-primary transition-all duration-300">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="w-10 h-1 bg-[#C89B3C] group-hover:w-16 transition-all duration-300 ease-in-out" />
                    <h3 className="text-[26px] md:text-[28px] font-primary font-normal leading-tight text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-[16px] leading-[26px] text-[#7C7C7C] dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* ── Our Services ── */}
      <Section className="bg-ourservices bg-cover bg-center bg-no-repeat flex h-fit flex-col justify-between gap-y-20 md:flex-row md:items-start md:space-y-0">
        <ScrollReveal direction="left">
          <SectionWithHeading heading="Our Services" dash="md:w-[20%]" />
        </ScrollReveal>
        <div className="w-full md:w-[50%] divide-y divide-gray-200/50 dark:divide-white/10">
          {ourServices.map((item, index) => (
            <ScrollReveal key={index} delay={index * 40}>
              <Link
                href={item.href}
                className="group font-[400] text-[20px] md:text-[26px] leading-[30px] md:leading-[34px] flex items-center justify-between py-5 md:py-7 hover:text-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 bg-primary rounded-full transition-transform duration-300 group-hover:scale-150" />
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    {item.title}
                  </span>
                </div>
                <BsArrowRight className="text-gray-400 group-hover:text-primary transition-all duration-300 group-hover:translate-x-2 text-xl" />
              </Link>
            </ScrollReveal>
          ))}
          <ScrollReveal delay={ourServices.length * 40}>
            <div className="pt-6">
              <Link
                href={"/services"}
                className="group relative flex items-center gap-2 w-fit text-[22px] font-semibold pb-1 hover:text-primary transition-colors"
              >
                <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary group-hover:w-full transition-[width] duration-300 ease-out" />
                Explore All Services
                <BsArrowRight className="transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </Section>

      {/* ── Featured Projects ── */}
      <Section className="bg-primary/10 dark:bg-primary/5">
        <ScrollReveal>
          <SectionWithHeading
            heading="Featured Projects"
            description="Real-world implementations across diverse sectors"
            dash="md:w-[5%]"
          />
        </ScrollReveal>
        <div>
          {projects
            .filter((item) => item.status !== "DISABLED")
            .map((item, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Link
                  href={item.link}
                  className="group relative p-6 flex flex-col md:flex-row md:justify-between md:items-center cursor-pointer gap-6 md:gap-0 block"
                >
                  <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 dark:bg-white group-hover:w-full transition-[width] duration-300 ease-out" />
                  <div className="max-w-2xl">
                    <h1 className="text-[28px] md:text-[32px] font-primary font-[400] tracking-tight text-gray-900 dark:text-white transition-transform duration-300 group-hover:translate-x-2">
                      {item.name}
                    </h1>
                    <p className="text-[18px] md:text-[20px] leading-relaxed md:leading-[34px] text-[#7C7C7C] dark:text-gray-400">
                      {item.homeDescription}
                    </p>
                  </div>
                  <div className="group/link flex items-center gap-2 font-[400] text-primary md:opacity-0 group-hover:opacity-100 transition-all duration-300 md:translate-x-2 group-hover:translate-x-0 w-fit">
                    <span className="uppercase tracking-widest text-primary text-[14px] md:text-[16px]">
                      {item.projectCategory}
                    </span>
                    <BsArrowRight className="transition-transform duration-300 group-hover/link:translate-x-1" />
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          <ScrollReveal delay={projects.filter((p) => p.status !== "DISABLED").length * 100}>
            <Link
              href={"/projects"}
              className="group relative flex items-center gap-2 mt-10 w-fit text-[24px] pb-1"
            >
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 dark:bg-white group-hover:w-full transition-[width] duration-300 ease-out" />
              View All Projects
              <BsArrowRight className="transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
            </Link>
          </ScrollReveal>
        </div>
      </Section>

      {/* ── AE Digital Ecosystem ── */}
      <Section className="relative overflow-hidden">
        {/* ecobg — large, left-anchored, low opacity */}
        <div className="absolute right-[60%] top-0 h-full overflow-hidden w-full md:flex hidden justify-start items-start opacity-70">
          <img
            src="/ecobg.png"
            alt=""
            className="w-full h-fit scale-[0.6] mt-[-300px]"
          />
        </div>
        {/* Heading block */}
        <ScrollReveal>
          <SectionWithHeading
            heading="AE Digital Ecosystem"
            description="We are building an interconnected network of platforms to address challenges in emerging markets"
            dash="md:w-[5%]"
            className="relative z-10 text-center flex flex-col items-center"
          />
        </ScrollReveal>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {aeEcosystemCards.map((item, index) => (
            <ScrollReveal key={index} delay={index * 120}>
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl p-6 md:p-8 min-h-[280px] md:min-h-[320px] flex flex-col gap-5 md:gap-7 transition-transform duration-300",
                  item.status === "ACTIVE"
                    ? "bg-[#1A1A1A] hover:bg-primary/100 hover:-translate-y-1 group"
                    : item.status === "DISABLED"
                      ? "bg-[#F5F2EC]/50 dark:bg-[#1C1C1C]/50 opacity-50 cursor-not-allowed pointer-events-none"
                      : "bg-[#F5F2EC] dark:bg-[#1C1C1C] hover:-translate-y-1",
                )}
              >
                {/* Concentric circles pattern */}
                <img
                  src="/ecocard.png"
                  alt=""
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover pointer-events-none",
                  )}
                />
                {/* Badge */}
                <div className="relative z-10">
                  <span
                    className={cn(
                      "inline-flex items-center px-3 py-1 rounded-md text-[12px] font-semibold tracking-wide",
                      item.status === "ACTIVE"
                        ? "bg-primary text-white"
                        : item.status === "DISABLED"
                          ? "bg-gray-300 dark:bg-white/5 text-gray-500 dark:text-gray-600"
                          : "bg-[#E8E5DF] dark:bg-white/10 text-[#555555] dark:text-gray-400",
                    )}
                  >
                    {item.status}
                  </span>
                </div>
                {/* Text */}
                <div className="relative z-10 space-y-3">
                  <h2
                    className={cn(
                      "text-[28px] md:text-[34px] font-primary font-normal leading-tight",
                      item.status === "ACTIVE"
                        ? "text-white"
                        : "text-gray-900 dark:text-white",
                    )}
                  >
                    {item.title}
                  </h2>
                  <p
                    className={cn(
                      "text-[17px] leading-[28px]",
                      item.status === "ACTIVE"
                        ? "text-gray-400 group-hover:text-gray-300"
                        : "text-gray-500 dark:text-gray-400",
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* CTA Link */}
        <ScrollReveal>
          <div className="relative z-10 mt-14 flex justify-center">
            <Link
              href={"/ecosystem"}
              className="group relative flex items-center gap-2 text-[20px] font-semibold pb-1"
            >
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 dark:bg-white group-hover:w-full transition-[width] duration-300 ease-out" />
              Explore Our Ecosystem
              <BsArrowRight className="transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>
      </Section>

      {/* ── How We Work ── */}
      <Section className="bg-primary/10 dark:bg-primary/5">
        <ScrollReveal>
          <SectionWithHeading heading="How We Work" dash="md:w-[5%]" />
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 justify-between gap-3">
          {howWeWork.map((item, index) => (
            <ScrollReveal key={index} delay={index * 150}>
              <div className="space-y-5 group">
                <h1 className="group-hover:text-primary transition-all duration-500 group-hover:px-4 text-[58px] xl:text-[72px] leading-[56px] xl:leading-[70px] font-primary font-[400] tracking-tight text-[#C89B3C33]">
                  0{index + 1}
                </h1>
                <h3 className="text-[32px] md:text-[42px] lg:text-[48px] xl:text-[56px] font-primary leading-tight dark:text-white">
                  {item.title}
                </h3>
                <p className="text-[24px] xl:text-[28px] leading-[34px] xl:leading-[40px] text-[#7C7C7C] dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <CTA
        title="Ready to build something exceptional?"
        description="Let us collaborate on digital infrastructure that scales with your vision and empowers your community."
        buttonText="Start a Conversation"
        buttonHref="/contact"
      />
    </main>
  );
}
