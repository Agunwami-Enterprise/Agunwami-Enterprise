import Section, {
  SectionWithHeading,
} from "@/app/components/common/ui/Section";
import Link from "next/link";
import { BsArrowRight } from "react-icons/bs";
import {
  RiShieldLine,
  RiLightbulbLine,
  RiHeartLine,
  RiUserLine,
  RiFocus3Line,
} from "react-icons/ri";
import { type IconType } from "react-icons";
import ScrollReveal from "@/app/components/common/ScrollReveal";
import TeamSlider, { type TeamMember } from "@/app/components/common/TeamSlider";

interface CoreValue {
  icon: IconType;
  title: string;
  description: string;
}

const leadershipTeam: TeamMember[] = [
  {
    name: "Agunwami .O.",
    role: "Chief Executive Officer",
    bio: "Visionary leader with over 12 years of experience in digital strategy, business development, and platform innovation.",
    image: "/agunwami_ceo.jpg",
    linkedin: "https://www.linkedin.com/company/agunwami-enterprises/",
  },
  {
    name: "Japhet Marshall",
    role: "Operation Manager",
    bio: "A strategist with expertise in systems architecture, process optimization, and organizational excellence.",
    image: "/japhet_coo.jpg",
    linkedin: "https://www.linkedin.com/company/agunwami-enterprises/",
  },
  {
    name: "Jesse A.",
    role: "Technology Officer",
    bio: "Full-stack technologist with deep expertise in cloud infrastructure, platform engineering, and scalability.",
    image: "/team_placeholder.jpg",
    linkedin: "https://www.linkedin.com/company/agunwami-enterprises/",
  },
  {
    name: "Aisha Y.",
    role: "Project Manager",
    bio: "Agile delivery specialist ensuring complex digital projects launch seamlessly on time, within scope, and at peak quality.",
    image: "/aisha_pm.jpg",
    linkedin: "https://www.linkedin.com/company/agunwami-enterprises/",
  },
  {
    name: "Chris Hayes",
    role: "Research & Development Director",
    bio: "Pioneering technological exploration and architectural roadmaps for sustainable, next-generation digital ecosystems.",
    image: "/chris_hayes.jpg",
    linkedin: "https://www.linkedin.com/company/agunwami-enterprises/",
  },
];

const coreValues: CoreValue[] = [
  {
    icon: RiFocus3Line,
    title: "Partnership Over Transactions",
    description:
      "We build long-term relationships, not one-off projects. Your success is our success.",
  },
  {
    icon: RiShieldLine,
    title: "Systems Thinking",
    description:
      "We design for scale, sustainability, and growth—not just immediate needs.",
  },
  {
    icon: RiLightbulbLine,
    title: "Clarity & Transparency",
    description:
      "Clear communication, honest timelines, and collaborative decision-making at every stage.",
  },
  {
    icon: RiHeartLine,
    title: "Impact-Driven Work",
    description:
      "We prioritize projects that create opportunity, empower communities, and drive meaningful change.",
  },
  {
    icon: RiUserLine,
    title: "Execution Excellence",
    description:
      "Clean code, thoughtful design, and rigorous quality standards in everything we deliver.",
  },
];

export default function AboutPage() {
  return (
    <main className="flex flex-col items-center w-full">
      {/* ── Hero ── */}
      <Section className="bg-about dark:bg-about-dark bg-cover bg-center bg-no-repeat min-h-[100dvh] flex flex-col justify-center items-center md:items-start pt-28 md:pt-32 pb-16">
        <div className="w-full space-y-6 flex flex-col items-center md:items-start text-center md:text-left">
          <ScrollReveal direction="up">
            <h1 className="w-full text-[40px] md:text-[64px] lg:text-[72px] xl:text-[84px] 2xl:text-[96px] leading-[48px] md:leading-[72px] lg:leading-[80px] xl:leading-[92px] 2xl:leading-[104px] font-primary font-normal tracking-tight text-white drop-shadow-sm">
              About <br className="hidden sm:block" />
              <span className="text-primary">Agunwami Enterprise</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal direction="none" delay={200}>
            <p className="w-full max-w-2xl text-[18px] md:text-[22px] lg:text-[24px] xl:text-[28px] 2xl:text-[30px] leading-[28px] md:leading-[34px] lg:leading-[38px] xl:leading-[42px] 2xl:leading-[46px] text-gray-200 max-w-2xl xl:max-w-3xl drop-shadow-sm">
              Building the digital infrastructure that powers organizations and
              enables opportunity across emerging ecosystems.
            </p>
          </ScrollReveal>
        </div>
      </Section>

      {/* ── Who We Are ── */}
      <Section className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-12 items-start">
        {/* Left: text content */}
        <ScrollReveal direction="left" className="flex flex-col gap-7">
          <SectionWithHeading heading="Who We Are" />

          <p className="text-[18px] leading-[32px] text-[#7C7C7C] dark:text-gray-400">
            Agunwami Enterprise (AE) is a platform infrastructure and digital
            systems partner specializing in building scalable solutions for
            nonprofits, institutions, education programs, agriculture
            initiatives, startups, and technology companies.
          </p>

          {/* Blockquote callout */}
          <blockquote className="border-l-4 border-primary bg-white dark:bg-white/5 shadow-sm rounded-r-xl pl-6 pr-6 py-6">
            <p className="text-[17px] leading-[30px] font-semibold text-gray-900 dark:text-white">
              We go beyond traditional web development. Our approach combines
              business architecture, UI systems, graphic design, and transparent
              delivery to create platforms that do not just function—they scale,
              adapt, and empower.
            </p>
          </blockquote>

          <p className="text-[18px] leading-[32px] text-[#7C7C7C] dark:text-gray-400">
            Whether you are launching a new digital initiative or strengthening
            existing infrastructure, we partner with you to build systems that
            support your mission and drive measurable impact.
          </p>

          <div className="pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all duration-300 font-medium group"
            >
              <span>Let&apos;s map out what your platform needs; talk to our team.</span>
              <BsArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Right: image */}
        <ScrollReveal direction="right" delay={150} className="relative w-full">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 translate-x-3 translate-y-3 -z-10" />
          <img
            src="/whoweare.jpg"
            alt="Agunwami Enterprise team collaborating on digital systems"
            className="relative w-full h-full object-cover rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 hover:scale-[1.01] transition-all duration-300"
            style={{ minHeight: "400px", maxHeight: "500px" }}
          />
        </ScrollReveal>
      </Section>

      {/* ── Mission and Vision ── */}
      <Section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Mission Column */}
        <ScrollReveal direction="up" className="flex flex-col gap-4">
          <SectionWithHeading heading="Our Mission" />
          <p className="text-[18px] leading-[32px] text-[#7C7C7C] dark:text-gray-400">
            To empower organizations and communities by delivering reliable,
            scalable, and transparent technology solutions that accelerate
            growth and expand opportunity.
          </p>
        </ScrollReveal>

        {/* Vision Column */}
        <ScrollReveal
          direction="up"
          delay={150}
          className="flex flex-col gap-4"
        >
          <SectionWithHeading heading="Our Vision" />
          <p className="text-[18px] leading-[32px] text-[#7C7C7C] dark:text-gray-400">
            To be a trusted partner in progress across East Africa, enabling
            institutions, businesses, and innovators to build the future with
            confidence and clarity.
          </p>
        </ScrollReveal>
      </Section>

      {/* ── Core Values ── */}
      <Section className="relative overflow-hidden bg-[#FAFAFA] dark:bg-[#111111]">
        {/* Decorative concentric circles — right side */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[380px] h-[380px] opacity-[0.06]"
        >
          {[40, 80, 120, 160, 190].map((r) => (
            <span
              key={r}
              className="absolute rounded-full border border-primary"
              style={{
                width: r * 2,
                height: r * 2,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 space-y-0">
          <ScrollReveal direction="up">
            <SectionWithHeading heading="Core Values" className="mb-10" />
          </ScrollReveal>

          {coreValues.map((value, index) => {
            const Icon = value.icon;
            return (
              <div key={index}>
                <ScrollReveal direction="up" delay={index * 100}>
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 py-6 sm:py-8 group">
                    {/* Gold icon square */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <Icon className="text-white text-[22px]" />
                    </div>

                    {/* Text */}
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-[24px] md:text-[28px] font-[500] text-gray-900 dark:text-white font-primary leading-snug">
                        {value.title}
                      </h3>
                      <p className="text-[16px] md:text-[18px] leading-relaxed text-[#7C7C7C] dark:text-gray-400">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Divider — skip after last item */}
                {index < coreValues.length - 1 && (
                  <div className="h-px bg-gray-200 dark:bg-white/10 w-full" />
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Our Leadership (Slider) ── */}
      <TeamSlider
        variant="about"
        aboutHeading="Our Leadership"
        aboutDescription="The minds behind Agunwami Enterprise, experienced leaders passionate about building systems that create opportunity and drive impact."
      />

      {/* ── Our Delivery Philosophy ── */}
      <section className="px-6 md:px-20 py-20 md:py-25 min-h-[50vh] flex flex-col justify-center bg-[#1A1A1A] text-white bg-cta bg-cover bg-center bg-no-repeat">
        {/* Section heading */}
        <ScrollReveal direction="left">
          <div className="mb-12 md:mb-16">
            <div className="bg-primary h-[3px] w-16 mb-6" />
            <h2 className="text-[36px] md:text-[56px] leading-tight font-primary font-normal tracking-tight text-white">
              Our Delivery Philosophy
            </h2>
          </div>
        </ScrollReveal>

        {/* 2×2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-20">
          {[
            {
              title: "No Hidden Complexity",
              description:
                "We break down technical decisions into clear, understandable language so you always know what is happening and why.",
            },
            {
              title: "Milestone-Based Progress",
              description:
                "Work is structured around clear deliverables with regular check-ins, ensuring transparency and accountability.",
            },
            {
              title: "Built to Scale",
              description:
                "Every platform we build is designed for growth, not just launch. We plan for your future, not just today.",
            },
            {
              title: "Your Platform, Your Ownership",
              description:
                "You own everything we build—code, design systems, documentation. No vendor lock-in, ever.",
            },
          ].map((item, index) => (
            <ScrollReveal key={index} direction="up" delay={index * 120}>
              <div className="flex flex-col gap-5 group">
                <div className="bg-primary h-[3px] w-12 transition-all duration-300 group-hover:w-20 group-hover:bg-linear-to-r from-primary to-white" />
                <h3 className="text-[28px] md:text-[32px] font-primary font-semibold text-white leading-snug">
                  {item.title}
                </h3>
                <p className="text-[16px] leading-[28px] text-gray-400">
                  {item.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Partner closing ── */}
      <Section className="relative overflow-hidden w-full py-28 md:py-36 flex flex-col items-center justify-center text-center bg-partner-closing dark:bg-partner-closing-dark bg-cover bg-center bg-no-repeat border-t border-b border-primary/20">
        {/* Soft ambient overlay to ensure the background stays warm, luminous, and legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-6 flex flex-col items-center">
          <ScrollReveal direction="none">
            <div className="w-full flex flex-col justify-center items-center gap-4">
              <h2 className="font-primary text-[32px] sm:text-[40px] md:text-[52px] leading-tight text-white drop-shadow-md">
                You are not just getting a vendor
              </h2>
              <h2 className="font-primary text-[32px] sm:text-[40px] md:text-[52px] text-primary leading-tight drop-shadow-md">
                You are gaining a partner
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={150}>
            <p className="text-[18px] md:text-[22px] leading-[32px] md:leading-[36px] text-gray-200 max-w-2xl mx-auto drop-shadow-sm">
              One who understands your mission, commits to your success, and
              builds infrastructure that scales with your vision for the long
              term.
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={250} className="pt-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-medium rounded-md hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.02]"
            >
              <span>Start the Conversation</span>
              <BsArrowRight />
            </Link>
          </ScrollReveal>
        </div>
      </Section>
    </main>
  );
}
