import CTA from "@/app/components/common/CTA";
import ScrollReveal from "@/app/components/common/ScrollReveal";
import Badge from "@/app/components/common/ui/Badge";
import Card from "@/app/components/common/ui/Card";
import Section, {
  SectionWithHeading,
} from "@/app/components/common/ui/Section";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { BiTrendingUp } from "react-icons/bi";
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
      title: "Shared Infastructure",
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
      <Section className="flex flex-col justify-between h-fit md:h-[100vh] bg-eco-hero bg-cover bg-center bg-no-repeat">
        {/* Text block — left column */}
        <div className="absolute -left-250 top-0 h-[100vh] overflow-hidden w-full flex justify-start items-start opacity-70">
          <img
            src="/ecobg.png"
            alt=""
            className="w-full h-fit scale-[0.6] mt-[-300px]"
          />
        </div>
        <div className="flex flex-col gap-6 max-w-xl justify-center h-[90%] w-full">
          <ScrollReveal direction="none">
            <Badge title="Interconnected Platforms" type="primary" />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <p className="text-[64px] leading-[72px] font-primary font-[400] tracking-tight text-gray-900 ">
              AE Digital <span className="text-primary">Ecosystem</span>
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={220}>
            <p className="text-[22px] leading-[34px] text-[#7C7C7C]">
              A growing network of interconnected platforms designed to solve
              real problems and create opportunities across emerging markets.
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
      <Section className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] items-start gap-20 justify-between">
        <div className="w-fit">
          <SectionWithHeading
            heading="Building Interconnected"
            heading2="Infrastructure"
          />
          <blockquote className="space-y-6 border-l-4 border-primary bg-white shadow-sm rounded-r-xl pl-6 pr-6 py-5 w-full">
            <p className="text-[26px] leading-[36px] font-semibold text-gray-900">
              The AE Digital Ecosystem represents our commitment to building
              platforms that work together to address systemic challenges. Each
              platform is designed to stand alone while also connecting to
              create greater value and opportunity across communities.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                <span className={cn("text-[20px] text-gray-700")}>
                  Unified technology Infastructure
                </span>
              </li>
              <li className="flex items-center gap-3 group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                <span className={cn("text-[20px] text-gray-700")}>
                  Seamless cross-platform integration
                </span>
              </li>
              <li className="flex items-center gap-3 group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                <span className={cn("text-[20px] text-gray-700")}>
                  Compounding network effects
                </span>
              </li>
              <li className="flex items-center gap-3 group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                <span className={cn("text-[20px] text-gray-700")}>
                  Sustainable economic models
                </span>
              </li>
            </ul>
          </blockquote>
        </div>
        <Image
          src="/buildinter.jpg"
          alt=""
          width={500}
          height={500}
          className="object-cover w-full rounded-lg"
        />
      </Section>
      <Section>
        <SectionWithHeading
          heading="Our Platforms"
          description2="Active and upcoming platforms in the AE ecosystem"
          className="text-center flex flex-col items-center"
        />
      </Section>
      <Section>
        <SectionWithHeading heading="Why an Ecosystem Approach?" />
        <div className="grid md:grid-cols-3 gap-4 w-full">
          {WhyEcosystem.map((item, index) => (
            <Card key={index} className="w-full border-[#D6B36B26]">
              <div className="w-fit p-4 rounded-lg bg-primary/10">
                {item.icon && (
                  <item.icon className="text-[34px] text-primary" />
                )}
              </div>
              <p className="font-primary font-[bold] text-[24px]">
                {item.title}
              </p>
              <p className="text-[#656565] text-[18px]">{item.description}</p>
            </Card>
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
