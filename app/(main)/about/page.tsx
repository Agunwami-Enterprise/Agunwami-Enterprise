import Section, {
  SectionWithHeading,
} from "@/app/components/common/ui/Section";
import {
  RiShieldLine,
  RiLightbulbLine,
  RiHeartLine,
  RiUserLine,
  RiFocus3Line,
} from "react-icons/ri";
import { type IconType } from "react-icons";
import ScrollReveal from "@/app/components/common/ScrollReveal";

interface CoreValue {
  icon: IconType;
  title: string;
  description: string;
}

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
      <Section className="bg-about bg-cover bg-center bg-no-repeat h-fit md:h-[100vh] grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-5 py-20 px-4 flex flex-col items-start justify-center">
          <ScrollReveal direction="up">
            <h1 className="text-[64px] leading-[72px] font-primary font-[400] tracking-tight text-gray-900">
              About <br />
              <span className="text-primary">Agunwami Enterprise</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal direction="none" delay={200}>
            <p className="text-[22px] leading-[34px] text-[#7C7C7C]">
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

          <p className="text-[18px] leading-[32px] text-[#7C7C7C]">
            Agunwami Enterprise (AE) is a platform infrastructure and digital
            systems partner specializing in building scalable solutions for
            nonprofits, institutions, education programs, agriculture
            initiatives, startups, and technology companies.
          </p>

          {/* Blockquote callout */}
          <blockquote className="border-l-4 border-primary bg-white shadow-sm rounded-r-xl pl-6 pr-6 py-6">
            <p className="text-[17px] leading-[30px] font-semibold text-gray-900">
              We go beyond traditional web development. Our approach combines
              business architecture, UI systems, graphic design, and transparent
              delivery to create platforms that do not just function—they scale,
              adapt, and empower.
            </p>
          </blockquote>

          <p className="text-[18px] leading-[32px] text-[#7C7C7C]">
            Whether you are launching a new digital initiative or strengthening
            existing infrastructure, we partner with you to build systems that
            support your mission and drive measurable impact.
          </p>
        </ScrollReveal>

        {/* Right: image */}
        <ScrollReveal direction="right" delay={150} className="relative w-full">
          <div className="absolute inset-0 rounded-xl translate-x-3 translate-y-3" />
          <img
            src="/whoweare.jpg"
            alt="Agunwami Enterprise team member at work"
            className="relative w-full h-full object-cover rounded-xl"
            style={{ minHeight: "400px", maxHeight: "500px" }}
          />
        </ScrollReveal>
      </Section>

      {/* ── Mission and Vision ── */}
      <Section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Mission Column */}
        <ScrollReveal direction="up" className="flex flex-col gap-4">
          <SectionWithHeading heading="Our Mission" />
          <p className="text-[18px] leading-[32px] text-[#7C7C7C]">
            To empower organizations and communities by delivering reliable,
            scalable, and transparent technology solutions that accelerate
            growth and expand opportunity.
          </p>
        </ScrollReveal>

        {/* Vision Column */}
        <ScrollReveal direction="up" delay={150} className="flex flex-col gap-4">
          <SectionWithHeading heading="Our Vision" />
          <p className="text-[18px] leading-[32px] text-[#7C7C7C]">
            To be a trusted partner in progress across East Africa, enabling
            institutions, businesses, and innovators to build the future with
            confidence and clarity.
          </p>
        </ScrollReveal>
      </Section>

      {/* ── Core Values ── */}
      <Section className="relative overflow-hidden bg-[#FAFAFA]">
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
                  <div className="flex items-start gap-6 py-8 group">
                    {/* Gold icon square */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <Icon className="text-white text-[22px]" />
                    </div>

                    {/* Text */}
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-[28px] font-[500] text-gray-900 font-primary leading-snug">
                        {value.title}
                      </h3>
                      <p className="text-[18px] leading-[28px] text-[#7C7C7C]">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Divider — skip after last item */}
                {index < coreValues.length - 1 && (
                  <div className="h-px bg-gray-200 w-full" />
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Our Delivery Philosophy ── */}
      <section className="px-4 md:px-20 py-25 space-y-5 bg-[#1A1A1A] text-white bg-cta bg-cover bg-center bg-no-repeat">
        {/* Section heading */}
        <ScrollReveal direction="left">
          <div className="mb-16">
            <div className="bg-primary h-[3px] w-16 mb-6" />
            <h2 className="text-[48px] md:text-[56px] leading-tight font-primary font-normal tracking-tight text-white">
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
      <Section className="flex flex-col items-center justify-center text-center">
        <ScrollReveal direction="none">
          <div className="w-full flex flex-col justify-center items-center gap-2">
            <h1 className="font-primary text-[48px]">
              You are not just getting a vendor
            </h1>
            <h1 className="font-primary text-[48px] text-primary">
              You are gaining a partner
            </h1>
          </div>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={150}>
          <p className="text-[20px] leading-[32px] text-[#7C7C7C]">
            One who understands your mission, commits to your success, and builds
            infrastructure that scales with your vision for the long term.
          </p>
        </ScrollReveal>
      </Section>

    </main>
  );
}
