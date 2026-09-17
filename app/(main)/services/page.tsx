import Badge from "@/app/components/common/ui/Badge";
import ScrollReveal from "@/app/components/common/ScrollReveal";
import CTA from "@/app/components/common/CTA";
import Section, {
  SectionWithHeading,
} from "@/app/components/common/ui/Section";
import Image from "next/image";
import Card from "@/app/components/common/ui/Card";
import {
  LuLayers,
  LuDatabase,
  LuShield,
  LuShieldCheck,
  LuZap,
  LuCreditCard,
} from "react-icons/lu";
import { cn } from "@/lib/utils";

export default function Services() {
  const services = [
    {
      id: "website-development",
      icon: LuLayers,
      title: "Website Development",
      description:
        "custom, responsive websites built on modern tech stacks and optimized for speed, SEO, and conversions.",
    },
    {
      id: "platform-systems",
      icon: LuDatabase,
      title: "Platform Systems",
      description:
        "Scalable digital infrastructure, APIs, Integrations, and backend architecture built to support growth.",
    },
    {
      id: "admin-dashboards",
      icon: LuShield,
      title: "Admin Dashboards",
      description:
        "Intuitive admin interfaces with real-time reporting, data visualization, and role-based access control.",
    },
    {
      id: "membership-systems",
      icon: LuShieldCheck,
      title: "Membership Systems",
      description:
        "Full membership platforms with secure authentication, member directories, tiered access, and engagement tools.",
    },
    {
      id: "workflow-automation",
      icon: LuZap,
      title: "Workflow Automation",
      description:
        "Automate repetitive processes with smart workflows, email triggers, and operational efficiency built in.",
    },
    {
      id: "payment-integration",
      icon: LuCreditCard,
      title: "Payment Integration",
      description:
        "Secure, PCI-compliant payment processing with subscription billing and transparent transaction reporting.",
    },
  ];
  const builtForSuccess = [
    {
      title: "We Build for Scale",
      description:
        "Every system we design grows with your organization, ensuring seamless scalability and long-term performance.",
    },
    {
      title: "Transparency-First",
      description:
        "Clear communication, honest timelines, and collaborative decision-making at every stage of your project.",
    },
    {
      title: "Impact-Driven",
      description:
        "We measure success by the real-world results our platforms deliver for your business and your users.",
    },
    {
      title: "Execution Excellence",
      description:
        "Clean code, thoughtful design, and rigorous quality standards in everything we deliver.",
    },
  ];
  const coreValues = [
    {
      number: "01",
      title: "Requirements",
      title2: "Structuring",
      description:
        "We translate ambiguous goals into clear, actionable specifications through technical discovery, requirements documentation, architecture planning, and stakeholder alignment.",
      list: [
        "Technical discovery sessions",
        "System requirements documentation",
        "Architecture planning",
        "Stakeholder alignment",
      ],
    },
    {
      number: "02",
      title: "UI",
      title2: "Architecture",
      description:
        "We build scalable design systems and component libraries — including component development, design tokens, pattern documentation, and accessibility compliance.",
      list: [
        "Component library development",
        "Design token systems",
        "Interface pattern documentation",
        "Accessibility compliance",
      ],
    },
    {
      number: "03",
      title: "Dashboard",
      title2: "Development",
      description:
        "We build custom analytics dashboards with real-time data visualization, custom metrics tracking, interactive reporting, and export capabilities.",
      list: [
        "Real-time data visualization",
        "Custom metrics tracking",
        "Interactive reporting",
        "Export capabilities",
      ],
    },
    {
      number: "04",
      title: "Workflow",
      title2: "Modeling",
      description:
        "We map complex business processes into efficient digital workflows through process documentation, automation opportunities, and integration planning.",
      list: [
        "Process documentation",
        "Automation opportunities",
        "Integration planning",
        "Optimization strategies",
      ],
    },
    {
      number: "05",
      title: "Scalability",
      title2: "Planning",
      description:
        "We review architecture and plan infrastructure for growing platforms through performance audits, optimization, load testing, and growth road-mapping.",
      list: [
        "Performance audits",
        "Infrastructure optimization",
        "Load testing",
        "Growth road-mapping",
      ],
    },
    {
      number: "06",
      title: "System",
      title2: "Integration",
      description:
        "We connect your digital ecosystem seamlessly through API development, documentation, legacy system migration, and third-party tool integration.",
      list: [
        "API development & documentation",
        "Legacy system migration",
        "Third-party tool integration",
        "Data synchronization",
      ],
    },
  ];
  return (
    <main className="flex flex-col items-center w-full">
      {/* ── Hero ── */}
      <Section className="relative flex flex-col justify-between min-h-[100dvh] bg-services-hero dark:bg-services-hero-dark bg-cover bg-center bg-no-repeat pt-28 md:pt-32 pb-16">
        {/* Text block — left column */}
        <div className="absolute right-[60%] top-0 h-full overflow-hidden w-full md:flex hidden justify-start items-start opacity-20 pointer-events-none">
          <img
            src="/ecobg.png"
            alt=""
            className="w-full h-fit scale-[0.6] mt-[-300px]"
          />
        </div>
        <div className="flex flex-col gap-6 justify-center flex-1 w-full relative z-10">
          <ScrollReveal direction="none">
            <Badge title="Platform Solutions" type="primary" />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <h1 className="text-[40px] md:text-[64px] lg:text-[72px] xl:text-[84px] 2xl:text-[96px] leading-[48px] md:leading-[72px] lg:leading-[80px] xl:leading-[92px] 2xl:leading-[104px] font-primary font-normal tracking-tight text-white drop-shadow-sm w-full">
              Services Built for <br className="hidden sm:block" />
              <span className="text-primary">Impact &amp; Scale</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={220}>
            <p className="w-full max-w-2xl text-[18px] md:text-[22px] lg:text-[24px] xl:text-[28px] 2xl:text-[30px] leading-[28px] md:leading-[34px] lg:leading-[38px] xl:leading-[42px] 2xl:leading-[46px] text-gray-200 drop-shadow-sm">
              Agunwami Enterprise designs and builds platform solutions, from
              websites and dashboards to systems that solve real problems and grow
              with your organization.
            </p>
          </ScrollReveal>
        </div>

        {/* Scroll indicator */}
        <ScrollReveal direction="none" delay={500}>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[11px] tracking-[0.2em] uppercase text-gray-400 font-medium">
              Explore
            </span>
            <div className="w-px h-12 bg-gradient-to-b from-gray-400 to-transparent" />
          </div>
        </ScrollReveal>
      </Section>
      <Section>
        <ScrollReveal direction="up">
          <SectionWithHeading heading="Our Services" />
        </ScrollReveal>
        <div className="flex flex-col md:flex-row items-center gap-10 justify-between">
          <ScrollReveal direction="left" className="overflow-hidden rounded-xl w-full md:w-fit shadow-lg">
            <Image
              src="/coreservices.jpg"
              alt="Core Services - Platform Systems, Architecture and Engineering"
              width={700}
              height={450}
              className="relative w-full h-full object-cover rounded-xl hover:scale-105 transition-all duration-300 ease-in-out"
              style={{ width: "100%", maxWidth: "700px" }}
            />
          </ScrollReveal>
          <ScrollReveal direction="right" className="w-full md:w-[50%]">
            <blockquote className="border-l-4 border-primary bg-white dark:bg-white/5 shadow-sm rounded-r-xl pl-6 pr-6 py-10 md:py-20 w-full">
              <p className="text-[22px] md:text-[26px] leading-[32px] md:leading-[36px] font-semibold text-gray-900 dark:text-white">
                We deliver end-to-end platform solutions, from requirements to launch,
                engineered to solve real-world challenges and scale your organization.
              </p>
            </blockquote>
          </ScrollReveal>
        </div>
      </Section>
      <Section className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {services.map((service, index) => (
          <ScrollReveal key={index} delay={index * 100} className="h-full">
            <div id={service.id} className="scroll-mt-28 h-full">
              <Card
                icon={service.icon}
                title={service.title}
                description={service.description}
                className="h-full"
              />
            </div>
          </ScrollReveal>
        ))}
      </Section>

      <Section className="flex flex-col md:flex-row items-start md:items-center gap-10 justify-between">
        <ScrollReveal direction="left" className="w-full md:w-[45%] overflow-hidden rounded-xl shadow-lg">
          <Image
            src="/built.jpg"
            alt="Built for Your Success - Collaborative Partnership & Impact"
            width={700}
            height={500}
            className="relative w-full h-auto object-cover rounded-xl hover:scale-105 transition-all duration-300 ease-in-out"
          />
        </ScrollReveal>

        <div className="w-full md:w-[50%] space-y-10">
          <ScrollReveal direction="right">
            <SectionWithHeading heading="Built for Your Success" />
          </ScrollReveal>
          <div className="flex flex-col gap-4">
            {builtForSuccess.map((item, index) => (
              <ScrollReveal
                key={index}
                direction="right"
                delay={index * 100 + 200}
              >
                <div className="flex items-center gap-4">
                  <div className="h-2 w-2 bg-primary rounded-full" />
                  <div className="space-y-4">
                    <h3 className="text-2xl font-semibold">{item.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </Section>

      <Section id="core-values" className="space-y-16 scroll-mt-28">
        <ScrollReveal direction="up">
          <SectionWithHeading heading="Core Values" />
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {coreValues.map((value, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <div className="bg-white dark:bg-[#1C1C1C] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-none rounded-3xl p-6 md:p-10 relative overflow-hidden h-full group hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] dark:hover:shadow-none transition-all duration-500 border border-gray-100/50 dark:border-white/10">
                {/* Background Concentric Circles */}
                <img
                  src="/ecocard.png"
                  alt=""
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover pointer-events-none",
                  )}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 w-[300px] h-[300px] opacity-[0.04]"
                >
                  {[30, 60, 90, 120, 150].map((r) => (
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

                {/* Big Number in Background */}

                <div className="relative z-10 flex flex-col h-full space-y-8">
                  <h3 className="text-[32px] font-primary font-normal text-gray-900 dark:text-white leading-tight">
                    {value.title} <br />
                    {value.title2}
                  </h3>
                  <span className="absolute top-7 right-40 text-[98px] font-primary text-primary/5 leading-none select-none group-hover:text-primary/40  group-hover:right-45 transition-all duration-500">
                    {value.number}
                  </span>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                    {value.description}
                  </p>

                  <ul className="space-y-4 mt-auto">
                    {value.list.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-3 text-gray-600 dark:text-gray-400 group/item"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                        <span className="text-[15px]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>
      <CTA
        title="Ready to build your platform?"
        description="Let's build digital infrastructure that scales with your vision and empowers your organization, from strategy to launch."
        buttonText="Start a Project"
        buttonHref="/contact"
        secondaryButtonText="Explore Our Projects"
        secondaryButtonHref="/projects"
      />
    </main>
  );
}
