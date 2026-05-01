import { BsArrowRight } from "react-icons/bs";
import Badge from "../components/common/ui/Badge";
import Buttons from "../components/common/ui/Buttons";
import Image from "next/image";
import Card from "../components/common/ui/Card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ScrollReveal from "../components/common/ScrollReveal";
import Section from "../components/common/ui/Section";

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
      title: "Development & Engineering",
      description: [
        "Full-stack web applications",
        "API integrations & microservices",
        "Cloud infrastructure setup",
      ],
    },
    {
      title: "UI Systems",
      description: [
        "Design token systems",
        "Component library development",
        "Interactive prototypes",
      ],
    },
    {
      title: "Data & Intelligence",
      description: [
        "Analytics dashboard design",
        "Database optimization",
        "Data visualization systems",
      ],
    },
  ];
  const whatWeDo = [
    {
      title: "Digital Infrastructure",
      description:
        "Building the backbone of modern digital operations with secure, scalable cloud solutions.",
      className: "",
    },
    {
      title: "Product Engineering",
      description:
        "Transforming complex requirements into high-performance web and mobile applications.",
      className: "",
    },
    {
      title: "Experience Design",
      description:
        "Crafting intuitive user interfaces and seamless digital journeys for diverse audiences.",
      className: "",
    },
  ];
  const OurServices = [
    { title: "Cloud Strategy" },
    { title: "Full-stack Development" },
    { title: "Design Systems" },
    { title: "Platform Migration" },
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
      <Section className="px-4 md:px-20 py-15 h-fit md:h-[100vh] hero-section grid grid-cols-1 md:grid-cols-2 bg-hero-gradient bg-cover bg-center bg-no-repeat">
        <div className="space-y-4 flex flex-col items-start justify-center py-20 px-4">
          <Badge title="Platform Infrastructure Partner" type="primary" />
          <p className="text-[64px] leading-[72px] font-primary font-[400] tracking-tight text-gray-900">
            Building Platforms. <br /> Empowering Institutions. <br />{" "}
            <span className="text-primary">Expanding Opportunity.</span>
          </p>
          <p className="text-[22px] leading-[34px] text-[#7C7C7C]">
            We partner with nonprofits, institutions, and technology teams to
            build scalable digital infrastructure that drives impact and enables
            growth.
          </p>
          <div className="mt-10 flex gap-4 w-full">
            <Buttons lg primaryButton>
              Explore Our Work <BsArrowRight />
            </Buttons>
            <Buttons lg secondaryButton>
              Partner With Us
            </Buttons>
          </div>
        </div>
      </Section>

      {/* ── What You Get ── */}
      <Section className="px-4 md:px-20 py-15 space-y-5">
        <div className="space-y-5 pb-10">
          <ScrollReveal>
            <div className="space-y-5">
              <h1 className="text-[48px] leading-[56px] font-primary font-[400] tracking-tight text-gray-900">
                What You Get When You Build With Agunwami <br />
                Enterprise
              </h1>
              <div className="bg-primary h-1 w-[15%] md:w-[5%] my-4" />
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {whatYouGet.map((item, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <div className="space-y-7">
                  <h1 className="font-primary text-[35px] leading-[34px]">
                    {item.title}
                  </h1>
                  <div className="flex flex-col gap-4">
                    {item.description.map((desc, i) => (
                      <p
                        key={i}
                        className="flex items-center gap-2 text-[#656565] text-[20px]"
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
          <div className="border-t-1 border-[#0000001A] pt-15">
            <h2 className="text-[42px] leading-[42px] font-primary">
              You are not hiring a developer.
            </h2>
            <h1 className="text-[64px] leading-[72px] font-primary font-[400] tracking-tight text-[#C89B3C]">
              You are partnering with a platform-building team.
            </h1>
          </div>
        </ScrollReveal>
      </Section>

      {/* ── What We Do ── */}
      <Section className="px-4 md:px-20 py-15 space-y-20 bg-primary/10">
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <Image
              src={"/whatwedo.jpg"}
              alt="people"
              width={500}
              height={500}
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="space-y-5 justify-center flex flex-col">
              <h1 className="text-[48px] leading-[56px] font-primary font-[400] tracking-tight text-gray-900">
                What We Do
              </h1>
              <div className="bg-primary h-1 w-[15%] md:w-[15%] my-4" />
              <p className="text-[22px] leading-[34px] text-[#7C7C7C]">
                We build digital infrastructure that empowers organizations to{" "}
                <br />
                operate at scale.
              </p>
            </div>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {whatWeDo.map((item, index) => (
            <ScrollReveal key={index} delay={index * 120}>
              <Card title={item.title} description={item.description} />
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* ── Our Services ── */}
      <Section className="px-4 md:px-20 py-15 space-y-20 flex flex-col md:flex-row h-fit justify-start md:justify-between items-start bg-ourservices bg-cover bg-center bg-no-repeat">
        <ScrollReveal direction="left">
          <div className="space-y-5">
            <h1 className="text-[48px] leading-[56px] font-primary font-[400] tracking-tight text-gray-900">
              Our Services
            </h1>
            <div className="bg-primary h-1 w-[15%] md:w-[30%]" />
          </div>
        </ScrollReveal>
        <div className="w-full md:w-[50%]">
          {OurServices.map((item, index) => (
            <ScrollReveal key={index} delay={index * 50}>
              <p className="group relative font-[400] text-[28px] leading-[34px] flex items-center py-10 cursor-pointer">
                <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 group-hover:w-full transition-[width] duration-300 ease-out" />
                <span className="h-2 w-2 bg-primary rounded-full mr-2 transition-transform duration-300 group-hover:scale-150" />
                <span className="transition-transform duration-300 group-hover:translate-x-2">
                  {item.title}
                </span>
              </p>
            </ScrollReveal>
          ))}
          <ScrollReveal delay={OurServices.length * 50}>
            <Link
              href={"/ourservices"}
              className="group relative flex items-center gap-2 mt-10 w-fit text-[24px] pb-1"
            >
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 group-hover:w-full transition-[width] duration-300 ease-out" />
              View All Services
              <BsArrowRight className="transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
            </Link>
          </ScrollReveal>
        </div>
      </Section>

      {/* ── Featured Projects ── */}
      <Section className="px-4 md:px-20 py-15 space-y-20 bg-primary/10">
        <ScrollReveal>
          <div>
            <h1 className="text-[48px] leading-[56px] font-primary font-[400] tracking-tight text-gray-900">
              Featured Projects
            </h1>
            <div className="bg-primary h-1 w-[15%] md:w-[5%] my-4" />
            <p className="text-[22px] leading-[34px] text-[#7C7C7C]">
              Real-world implementations across diverse sectors
            </p>
          </div>
        </ScrollReveal>
        <div>
          {FeaturedProjects.map((item, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <div className="group relative p-6 flex justify-between items-center cursor-pointer">
                <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 group-hover:w-full transition-[width] duration-300 ease-out" />
                <div>
                  <h1 className="text-[32px] font-primary font-[400] tracking-tight text-gray-900 transition-transform duration-300 group-hover:translate-x-2">
                    {item.title}
                  </h1>
                  <p className="text-[20px] leading-[34px] text-[#7C7C7C]">
                    {item.description}
                  </p>
                </div>
                <Link
                  href={item.link}
                  className="group/link flex items-center gap-2 font-[400] text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
                >
                  <span className="uppercase tracking-widest text-primary text-[16px]">
                    {item.type}
                  </span>
                  <BsArrowRight className="transition-transform duration-300 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </ScrollReveal>
          ))}
          <ScrollReveal delay={FeaturedProjects.length * 100}>
            <Link
              href={"/featured-projects"}
              className="group relative flex items-center gap-2 mt-10 w-fit text-[24px] pb-1"
            >
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 group-hover:w-full transition-[width] duration-300 ease-out" />
              View All Projects
              <BsArrowRight className="transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
            </Link>
          </ScrollReveal>
        </div>
      </Section>

      {/* ── AE Digital Ecosystem ── */}
      <Section className="relative overflow-hidden py-20 px-4 md:px-20">
        {/* ecobg — large, left-anchored, low opacity */}
        <img
          src="/ecobg.png"
          alt=""
          aria-hidden="true"
          className="absolute left-[-80px] top-1/2 -translate-y-1/2 w-[480px] h-[480px] object-contain pointer-events-none opacity-30"
        />

        {/* Heading block */}
        <ScrollReveal>
          <div className="relative z-10 space-y-6 text-center flex flex-col items-center mb-16">
            <h1 className="text-[52px] leading-tight font-primary font-normal tracking-tight text-gray-900">
              AE Digital Ecosystem
            </h1>
            <div className="bg-primary h-[3px] w-28" />
            <p className="text-[18px] text-[#7C7C7C] max-w-3xl">
              We are building an interconnected network of platforms to address
              challenges in emerging markets
            </p>
          </div>
        </ScrollReveal>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {AE.map((item, index) => (
            <ScrollReveal key={index} delay={index * 120}>
              <div
                className="relative overflow-hidden rounded-xl p-8 min-h-[320px] flex flex-col gap-7 transition-transform duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor:
                    item.status === "ACTIVE" ? "#1A1A1A" : "#F5F2EC",
                }}
              >
                {/* Concentric circles pattern */}
                <img
                  src="/ecocard.png"
                  alt=""
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover pointer-events-none",
                    item.status === "ACTIVE" ? "opacity-20" : "opacity-60",
                  )}
                />
                {/* Badge */}
                <div className="relative z-10">
                  <span
                    className={cn(
                      "inline-flex items-center px-3 py-1 rounded-md text-[12px] font-semibold tracking-wide",
                      item.status === "ACTIVE"
                        ? "bg-primary text-white"
                        : "bg-[#E8E5DF] text-[#555555]",
                    )}
                  >
                    {item.status}
                  </span>
                </div>
                {/* Text */}
                <div className="relative z-10 space-y-3">
                  <h2
                    className={cn(
                      "text-[34px] font-primary font-normal leading-tight",
                      item.status === "ACTIVE" ? "text-white" : "text-gray-900",
                    )}
                  >
                    {item.title}
                  </h2>
                  <p
                    className={cn(
                      "text-[17px] leading-[28px]",
                      item.status === "ACTIVE"
                        ? "text-gray-400"
                        : "text-gray-500",
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
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gray-900 group-hover:w-full transition-[width] duration-300 ease-out" />
              Explore Our Ecosystem
              <BsArrowRight className="transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>
      </Section>

      {/* ── How We Work ── */}
      <Section className="px-4 md:px-20 py-15 bg-primary/10 space-y-10">
        <ScrollReveal>
          <div className="space-y-5">
            <h1 className="text-[48px] leading-[56px] font-primary font-[400] tracking-tight">
              How We Work
            </h1>
            <div className="bg-primary h-1 w-[15%] md:w-[5%] my-4" />
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 justify-between gap-3">
          {HowWeWork.map((item, index) => (
            <ScrollReveal key={index} delay={index * 150}>
              <div className="space-y-5">
                <h1 className="text-[58px] leading-[56px] font-primary font-[400] tracking-tight text-[#C89B3C33]">
                  0{index + 1}
                </h1>
                <h1 className="text-[42px] leading-[56px] font-primary font-[400] tracking-tight">
                  {item.title}
                </h1>
                <p className="text-[24px] leading-[34px] text-[#7C7C7C]">
                  {item.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>
    </main>
  );
}
