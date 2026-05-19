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
import { projects } from "@/lib/dummy";

export default function MainPage() {
  const whatYouGet = [
    {
      title: "Business Architecture",
      description: [
        "Requirements structuring",
        "System design planning",
        "Scalability roadmaps",
      ],
    },
    {
      title: "UI Systems",
      description: [
        "Component libraries",
        "Design systems",
        "Responsive layouts",
      ],
    },
    {
      title: "Graphic Design Systemss",
      description: ["Brand identity", "Visual consistency", "Asset management"],
    },
    {
      title: "Transparent Delivery",
      description: [
        "Clear milestones",
        "Regular updates",
        "Collaborative process",
      ],
    },
  ];
  const whatWeDo = [
    {
      title: "Digital Solutions",
      description:
        "Custom websites and digital platforms built with modern technology stacks and best practices.",
      className: "",
    },
    {
      title: "Platform Development",
      description:
        "Comprehensive platform systems including admin dashboards, membership systems, and workflow automation.",
      className: "",
    },
    {
      title: "Impact & Partnerships",
      description:
        "Strategic collaboration with nonprofits, institutions, and tech teams to build infrastructure that scales.",
      className: "",
    },
  ];
  const OurServices = [
    { title: "Website Development" },
    { title: "Platform Systems" },
    { title: "Mobile App Design" },
    { title: "User Experience Research" },
    { title: "Security Audits" },
    { title: "API Development" },
    { title: "UI/UX Design" },
    { title: "Database Architecture" },
    { title: "DevOps & CI/CD" },
    { title: "Technical Consulting" },
    { title: "QA & Testing" },
  ];
  const FeaturedProjects = [
    {
      title: "EduStack Nigeria",
      description: "Custom educational platform for Nigerian schools",
      link: "/projects/edustack",
      type: "Edutech Platform",
    },
    {
      title: "Luxe Thread",
      description: "Custom e-commerce platform for premium apparel brand",
      link: "/projects/luxethread",
      type: "E-commerce Platform",
    },
    {
      title: "TeamSync",
      description: "Modern workplace productivity tools for hybrid teams",
      link: "/projects/teamsync",
      type: "SaaS Platform",
    },
  ];
  const AE = [
    {
      title: "AE Hub",
      description: "Internal platform powering our operations and partnerships",
      status: "ACTIVE",
    },
    {
      title: "Mobility Platform",
      description: "Transportation and logistics infrastructure",
      status: "COMING SOON",
    },
    {
      title: "Fintech Platform",
      description: "Financial services for underserved communities",
      status: "COMING SOON",
    },
  ];
  const HowWeWork = [
    {
      title: "Discovery & Planning",
      description:
        "We start by understanding your mission, goals, and requirements to structure a clear roadmap.",
    },

    {
      title: "Design & Development",
      description:
        "Our team builds your platform with modern technology, clean UI systems, and scalable architecture.",
    },
    {
      title: "Launch & Support",
      description:
        "We deliver your platform and provide ongoing maintenance, updates, and strategic guidance.",
    },
  ];
  return (
    <main className="flex flex-col items-center w-full">
      {/* ── Hero ── */}
      <Section className="min-h-[100dvh] bg-hero-gradient dark:bg-hero-gradient-dark bg-cover bg-center bg-no-repeat flex flex-col justify-center items-center lg:items-start pt-28 md:pt-32 pb-16 w-full">
        <div className="w-full space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left">
          <ScrollReveal direction="down">
            <Badge title="Platform Infrastructure Partner" type="primary" />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <h1 className="w-full text-[36px] sm:text-[48px] md:text-[56px] lg:text-[64px] xl:text-[80px] 2xl:text-[96px] 3xl:text-[120px] 4xl:text-[160px] leading-[44px] sm:leading-[56px] md:leading-[64px] lg:leading-[72px] xl:leading-[88px] 2xl:leading-[104px] 3xl:leading-[128px] 4xl:leading-[168px] font-primary font-normal tracking-tight text-gray-900 dark:text-white">
              Building Platforms. <br className="hidden sm:flex" />
              Empowering Institutions. <br className="hidden sm:flex" />{" "}
              <span className="text-primary">Expanding Opportunity.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <p className="text-[17px] md:text-[20px] lg:text-[22px] xl:text-[26px] 2xl:text-[30px] 3xl:text-[38px] 4xl:text-[48px] leading-[26px] md:leading-[30px] lg:leading-[34px] xl:leading-[40px] 2xl:leading-[46px] 3xl:leading-[56px] 4xl:leading-[68px] text-[#7C7C7C] dark:text-gray-400 max-w-2xl xl:max-w-3xl 2xl:max-w-4xl 3xl:max-w-6xl 4xl:max-w-7xl">
              We partner with nonprofits, institutions, and technology teams to
              build scalable digital infrastructure that drives impact and
              enables growth.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={300}>
            <div className="mt-6 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href={"/projects"} className="w-full sm:w-auto">
                <Buttons lg primaryButton className="w-full">
                  Explore Our Work <BsArrowRight />
                </Buttons>
              </Link>
              <Link href={"/contact"} className="w-full sm:w-auto">
                <Buttons lg secondaryButton className="w-full">
                  Partner With Us
                </Buttons>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </Section>

      {/* ── What You Get ── */}
      <Section>
        <div className="space-y-10 pb-10">
          <ScrollReveal>
            <SectionWithHeading
              heading="What You Get When You Build With Agunwami"
              heading2="Enterprise"
            />
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {whatYouGet.map((item, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <div className="space-y-7">
                  <h3 className="text-[32px] md:text-[40px] lg:text-[48px] font-primary font-normal leading-tight text-gray-900 dark:text-white">
                    {item.title}
                  </h3>
                  <div className="flex flex-col gap-4">
                    {item.description.map((desc, i) => (
                      <p
                        key={i}
                        className="flex items-center gap-2 text-[#656565] dark:text-gray-400 text-[20px]"
                      >
                        <span className="rounded-full h-2 w-2 bg-primary" />
                        {desc}
                      </p>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
        <ScrollReveal>
          <div className="border-t-1 border-[#0000001A] dark:border-white/10 pt-15">
            <h2 className="text-[42px] xl:text-[52px] leading-[42px] xl:leading-[52px] font-primary dark:text-white">
              You are not hiring a developer.
            </h2>
            <h1 className="text-[40px] md:text-[64px] lg:text-[72px] xl:text-[84px] leading-[48px] md:leading-[72px] lg:leading-[80px] xl:leading-[92px] font-primary font-[400] tracking-tight text-[#C89B3C]">
              You are partnering with a platform-building team.
            </h1>
          </div>
        </ScrollReveal>
      </Section>

      {/* ── What We Do ── */}
      <Section className="bg-primary/10 dark:bg-primary/5">
        <ScrollReveal className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <Image
              src="/coreservices.jpg"
              alt=""
              width={100}
              height={100}
              className="relative w-full h-full object-cover hover:scale-105 transition-all duration-300 ease-in-out"
              style={{ width: "100%", maxWidth: "700px" }}
            />
            <div className="space-y-5 justify-center flex flex-col">
              <SectionWithHeading
                heading="What We Do"
                description="We build digital infrastructure that empowers organizations to"
                description2="operate at scale."
              />
            </div>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {whatWeDo.map((item, index) => (
            <ScrollReveal key={index} delay={index * 120} className="w-full">
              <Card className="h-full min-h-[20rem] 3xl:min-h-[30rem] 4xl:min-h-[40rem]">
                <div className="space-y-8">
                  <div className="space-y-5">
                    <div className="w-12 h-1 3xl:h-2 bg-[#C89B3C] group-hover:w-[30%] group-hover:bg-gradient-to-r from-primary to-gray-300 transition-all duration-300 ease-in-out" />
                    <h3 className="text-[32px] md:text-[32px] lg:text-[34px] xl:text-[36px] 2xl:text-[40px] 3xl:text-[56px] 4xl:text-[72px] font-primary font-normal leading-tight text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-[16px] md:text-[18px] lg:text-[20px] xl:text-[22px] 2xl:text-[24px] 3xl:text-[32px] 4xl:text-[40px] leading-[22px] md:leading-[24px] lg:leading-[26px] xl:leading-[28px] 2xl:leading-[30px] 3xl:leading-[40px] 4xl:leading-[52px] text-[#7C7C7C] dark:text-gray-400">
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
        <div className="w-full md:w-[50%]">
          {OurServices.map((item, index) => (
            <ScrollReveal key={index} delay={index * 50}>
              <p className="group relative font-[400] text-[22px] md:text-[28px] leading-[30px] md:leading-[34px] flex items-center py-6 md:py-10 cursor-pointer">
                <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 dark:bg-white group-hover:w-full transition-[width] duration-300 ease-out" />
                <span className="h-2 w-2 bg-primary rounded-full mr-2 transition-transform duration-300 group-hover:scale-150" />
                <span className="transition-transform duration-300 group-hover:translate-x-2">
                  {item.title}
                </span>
              </p>
            </ScrollReveal>
          ))}
          <ScrollReveal delay={OurServices.length * 50}>
            <Link
              href={"/services"}
              className="group relative flex items-center gap-2 mt-10 w-fit text-[24px] pb-1"
            >
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 dark:bg-white group-hover:w-full transition-[width] duration-300 ease-out" />
              View All Services
              <BsArrowRight className="transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
            </Link>
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
          {projects.map((item, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <div className="group relative p-6 flex flex-col md:flex-row md:justify-between md:items-center cursor-pointer gap-6 md:gap-0">
                <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 dark:bg-white group-hover:w-full transition-[width] duration-300 ease-out" />
                <div className="max-w-2xl">
                  <h1 className="text-[28px] md:text-[32px] font-primary font-[400] tracking-tight text-gray-900 dark:text-white transition-transform duration-300 group-hover:translate-x-2">
                    {item.name}
                  </h1>
                  <p className="text-[18px] md:text-[20px] leading-relaxed md:leading-[34px] text-[#7C7C7C] dark:text-gray-400">
                    {item.homeDescription}
                  </p>
                </div>
                <Link
                  href={item?.link ?? "#"}
                  className="group/link flex items-center gap-2 font-[400] text-primary md:opacity-0 group-hover:opacity-100 transition-all duration-300 md:translate-x-2 group-hover:translate-x-0 w-fit"
                >
                  <span className="uppercase tracking-widest text-primary text-[14px] md:text-[16px]">
                    {item.projectCategory}
                  </span>
                  <BsArrowRight className="transition-transform duration-300 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </ScrollReveal>
          ))}
          <ScrollReveal delay={FeaturedProjects.length * 100}>
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
          {AE.map((item, index) => (
            <ScrollReveal key={index} delay={index * 120}>
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl p-6 md:p-8 min-h-[280px] md:min-h-[320px] flex flex-col gap-5 md:gap-7 transition-transform duration-300 hover:-translate-y-1",
                  item.status === "ACTIVE"
                    ? "bg-[#1A1A1A] hover:bg-primary/100 group"
                    : "bg-[#F5F2EC] dark:bg-[#1C1C1C]",
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
                      item.status === "ACTIVE" ? "text-white" : "text-gray-900 dark:text-white",
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
          {HowWeWork.map((item, index) => (
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
