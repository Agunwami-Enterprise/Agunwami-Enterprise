import CTA from "@/app/components/common/CTA";
import ScrollReveal from "@/app/components/common/ScrollReveal";
import Badge from "@/app/components/common/ui/Badge";
import Card from "@/app/components/common/ui/Card";
import Section, {
  SectionWithHeading,
} from "@/app/components/common/ui/Section";
import { projects } from "@/lib/dummy";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { BiCheckCircle, BiTrendingUp } from "react-icons/bi";
import { FaBolt } from "react-icons/fa";
import { RiShareBoxLine, RiStackshareLine } from "react-icons/ri";
import {
  SiBlockchaindotcom,
  SiChainlink,
  SiHiveBlockchain,
} from "react-icons/si";

export default function EcosystemPage() {
  const WhyEcosystem = [
    {
      icon: RiStackshareLine,
      title: "Shared Infrastructure",
      description:
        "Platforms leverage common technology, reducing costs and accelerating development.",
    },
    {
      icon: FaBolt,
      title: "Integrated Experience",
      description:
        "Users benefit from seamless connections between platforms, creating network effects.",
    },
    {
      icon: BiTrendingUp,
      title: "Scalable Impact",
      description:
        "Each platform strengthens the others, multiple value and opportunity across the ecosystem.",
    },
  ];
  return (
    <main className="flex flex-col items-center w-full">
      <Section className="relative flex flex-col justify-between min-h-[100dvh] bg-eco-hero dark:bg-eco-hero-dark bg-cover bg-center bg-no-repeat pt-28 md:pt-32 pb-16">
        {/* Text block — left column */}
        <div className="absolute right-[60%] top-0 h-full overflow-hidden w-full md:flex hidden justify-start items-start opacity-70">
          <img
            src="/ecobg.png"
            alt=""
            className="w-full h-fit scale-[0.6] mt-[-300px]"
          />
        </div>
        <div className="flex flex-col gap-6 justify-center flex-1 w-full">
          <ScrollReveal direction="none">
            <Badge title="Interconnected Platforms" type="primary" />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <h1 className="w-full text-[40px] md:text-[64px] lg:text-[72px] xl:text-[84px] 2xl:text-[96px] leading-[48px] md:leading-[72px] lg:leading-[80px] xl:leading-[92px] 2xl:leading-[104px] font-primary font-normal tracking-tight text-gray-900 dark:text-white ">
              AE Digital <br className="hidden sm:block" />
              <span className="text-primary">Ecosystem</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={220}>
            <p className="w-full max-w-2xl text-[18px] md:text-[22px] lg:text-[24px] xl:text-[28px] 2xl:text-[30px] leading-[28px] md:leading-[34px] lg:leading-[38px] xl:leading-[42px] 2xl:leading-[46px] text-[#7C7C7C]">
              A growing network of interconnected platforms designed to solve
              real problems and create opportunities across emerging markets.
            </p>
          </ScrollReveal>
        </div>

        {/* Scroll indicator */}
        <ScrollReveal direction="none" delay={800}>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[11px] tracking-[0.2em] uppercase text-gray-400 font-medium animate-pulse-slow">
              Explore
            </span>
            <div className="w-px h-12 bg-gradient-to-b from-gray-400 to-transparent animate-float" />
          </div>
        </ScrollReveal>
      </Section>
      <Section className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] items-start gap-20 justify-between">
        <div className="w-fit">
          <SectionWithHeading
            heading="Building Interconnected"
            heading2="Infrastructure"
          />
          <blockquote className="space-y-6 border-l-4 border-primary bg-white dark:bg-white/5 shadow-sm rounded-r-xl pl-6 pr-6 py-5 w-full">
            <p className="text-[26px] leading-[36px] font-semibold text-gray-900 dark:text-white">
              The AE Digital Ecosystem represents our commitment to building
              platforms that work together to address systemic challenges. Each
              platform is designed to stand alone while also connecting to
              create greater value and opportunity across communities.
            </p>
            <ul className="space-y-4">
              {[
                "Unified technology Infrastructure",
                "Seamless cross-platform integration",
                "Compounding network effects",
                "Sustainable economic models",
              ].map((item, i) => (
                <ScrollReveal key={i} delay={i * 100} direction="up">
                  <li className="flex items-center gap-3 group/item">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                    <span className={cn("text-[20px] text-gray-700")}>
                      {item}
                    </span>
                  </li>
                </ScrollReveal>
              ))}
            </ul>
          </blockquote>
        </div>
        <ScrollReveal direction="right" delay={200}>
          <Image
            src="/buildinter.jpg"
            alt=""
            width={500}
            height={500}
            className="object-cover w-full rounded-lg shadow-xl"
          />
        </ScrollReveal>
      </Section>
      <Section>
        <ScrollReveal direction="up">
          <div className="absolute right-[90%] top-0 h-[280vh] overflow-hidden w-full md:flex hidden justify-start items-start opacity-70">
            <img src="/ecobg.png" alt="" className="w-full h-full" />
          </div>
          <SectionWithHeading
            heading="Our Platforms"
            description2="Active and upcoming platforms in the AE ecosystem"
            className="text-center flex flex-col items-center"
          />
        </ScrollReveal>
        <div className="space-y-12">
          {projects
            .filter((item) => !item.client)
            .map((item, index) => {
              const isActive = item.status === "ACTIVE";
              return (
                <ScrollReveal key={index} direction="up" delay={index * 100}>
                  <Card
                    variant={isActive ? "dark" : "light"}
                    className={cn(
                      "relative overflow-hidden border-none p-0 md:p-0 min-h-fit md:min-h-[500px]",
                      !isActive && "bg-[#FDFBF7]",
                    )}
                  >
                    {/* Background Pattern Overlay */}
                    <img
                      src="/ecocard.png"
                      alt=""
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500",
                        isActive ? "opacity-30" : "opacity-10",
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] items-stretch relative z-10 h-full">
                      <div className="space-y-8 md:space-y-10 p-6 md:p-16 flex flex-col justify-center">
                        <div className="space-y-6">
                          <div className="flex gap-6 items-center">
                            {item.icon && (
                              <div
                                className={cn(
                                  "md:flex hidden w-16 h-16 rounded-xl items-center justify-center flex-shrink-0 border transition-all duration-300",
                                  isActive
                                    ? "bg-primary/10 border-primary/20 text-primary"
                                    : "bg-primary/5 border-primary/10 text-primary",
                                )}
                              >
                                <item.icon className="text-[32px]" />
                              </div>
                            )}
                            <div className="flex items-center gap-4 w-full justify-between md:justify-start">
                              <h3 className="text-[28px] md:text-[42px] font-primary leading-tight">
                                {item.name}
                              </h3>
                              <span
                                className={cn(
                                  "px-3 py-1 rounded-md text-[12px] font-bold tracking-wider uppercase",
                                  isActive
                                    ? "bg-primary text-white"
                                    : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400",
                                )}
                              >
                                {isActive ? "ACTIVE" : "COMING SOON"}
                              </span>
                            </div>
                          </div>
                          <p
                            className={cn(
                              "text-[20px] md:text-[24px] font-primary leading-tight",
                              isActive ? "text-white/90" : "text-gray-900 dark:text-white",
                            )}
                          >
                            {item.ecoshort}
                          </p>
                        </div>

                        <p
                          className={cn(
                            "text-[18px] leading-relaxed max-w-2xl",
                            isActive ? "text-white/70" : "text-gray-600 dark:text-gray-400",
                          )}
                        >
                          {item.ecodesc}
                        </p>

                        <div className="space-y-6">
                          <p
                            className={cn(
                              "text-[13px] font-bold tracking-[0.2em] uppercase",
                              isActive ? "text-white/50" : "text-gray-400",
                            )}
                          >
                            {isActive ? "KEY FEATURES" : "PLANNED FEATURES"}
                          </p>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-10">
                            {item.ecokey?.map((feature, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-3 group"
                              >
                                <BiCheckCircle className="text-[20px] mt-0.5 flex-shrink-0 text-primary" />
                                <span
                                  className={cn(
                                    "text-[16px] leading-snug",
                                    isActive
                                      ? "text-white/80"
                                      : "text-gray-700",
                                  )}
                                >
                                  {feature}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div
                          className={cn(
                            "space-y-3 pt-8 border-t",
                            isActive ? "border-white/10" : "border-black/5",
                          )}
                        >
                          <p
                            className={cn(
                              "text-[13px] font-bold tracking-[0.2em] uppercase",
                              isActive ? "text-white/50" : "text-gray-400",
                            )}
                          >
                            {isActive ? "IMPACT" : "EXPECTED IMPACT"}
                          </p>
                          <p
                            className={cn(
                              "text-[17px] leading-relaxed",
                              isActive ? "text-white/70" : "text-gray-600 dark:text-gray-400",
                            )}
                          >
                            {item.impact}
                          </p>
                        </div>
                      </div>

                      <div className="relative min-h-[300px] md:min-h-full overflow-hidden">
                        <Image
                          src={item.image ?? ""}
                          alt={item.name}
                          fill
                          className="object-cover w-full h-full transition-transform duration-1000 hover:scale-[1.05]"
                        />
                        {/* Gradient Fade Overlay */}
                        <div
                          className={cn(
                            "absolute inset-0 bg-gradient-to-r via-transparent to-transparent pointer-events-none",
                            isActive ? "from-[#1A1A1A]" : "from-[#FDFBF7]",
                          )}
                          style={{ backgroundSize: "200% 100%" }}
                        />
                        {/* Stronger left edge fade */}
                        <div
                          className={cn(
                            "absolute inset-y-0 left-0 w-32 bg-gradient-to-r pointer-events-none",
                            isActive ? "from-[#1A1A1A]" : "from-[#FDFBF7]",
                          )}
                        />
                      </div>
                    </div>
                  </Card>
                </ScrollReveal>
              );
            })}
        </div>
      </Section>
      <Section>
        <ScrollReveal direction="up">
          <SectionWithHeading heading="Why an Ecosystem Approach?" />
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {WhyEcosystem.map((item, index) => (
            <ScrollReveal key={index} delay={index * 150} direction="up">
              <Card className="w-full border-[#D6B36B26] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl group">
                <div className="w-fit p-4 rounded-lg bg-primary/10 transition-colors duration-300">
                  {item.icon && (
                    <item.icon className="text-[34px] text-primary transition-colors duration-300" />
                  )}
                </div>
                <p className="font-primary font-bold text-[24px] group-hover:text-primary">
                  {item.title}
                </p>
                <p className="text-[#656565] text-[18px]">{item.description}</p>
                <div className="w-[15%] bg-primary h-1 group-hover:w-[30%] group-hover:bg-gradient-to-r from-primary to-gray-300 transition-all duration-300 ease-in-out" />
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </Section>
      <CTA
        title="Interested in our ecosystem initiatives?"
        description="Connect with us to explore partnership opportunities or learn more about our platform roadmap."
        buttonText="Get in Touch"
        buttonHref="/contact"
      />
    </main>
  );
}
