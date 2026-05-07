import ScrollReveal from "@/app/components/common/ScrollReveal";
import Badge from "@/app/components/common/ui/Badge";
import Card from "@/app/components/common/ui/Card";
import Section, {
  SectionWithHeading,
} from "@/app/components/common/ui/Section";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { BiBuilding } from "react-icons/bi";
import { FaUsers } from "react-icons/fa";
import { PiPlant } from "react-icons/pi";

export default function PartnershipsPage() {
  const PartnershipCategories = [
    {
      icon: FaUsers,
      title: "Shared Infrastructure",
      description:
        "Platforms leverage common technology, reducing costs and accelerating development.",
      number: "01",
      partnershipBenefits: [
        "Cross-platform integration opportunities",
        "Access to growing user base",
        "Collaborative innovation pathways",
        "Joint marketing and outreach",
      ],
    },
    {
      icon: PiPlant,
      title: "Integrated Experience",
      description:
        "Users benefit from seamless connections between platforms, creating network effects.",
      number: "02",
      partnershipBenefits: [
        "Cross-platform integration opportunities",
        "Access to growing user base",
        "Collaborative innovation pathways",
        "Joint marketing and outreach",
      ],
    },
    {
      icon: BiBuilding,
      title: "Scalable Impact",
      description:
        "Each platform strengthens the others, multiple value and opportunity across the ecosystem.",
      number: "03",
      partnershipBenefits: [
        "Cross-platform integration opportunities",
        "Access to growing user base",
        "Collaborative innovation pathways",
        "Joint marketing and outreach",
      ],
    },
  ];
  return (
    <main className="flex flex-col items-center w-full">
      <Section className="flex flex-col justify-between h-fit md:h-[100vh] bg-partnerships-hero bg-cover bg-center bg-no-repeat">
        {/* Text block — left column */}
        <div className="absolute -left-260 top-0 h-[100vh] overflow-hidden w-full flex justify-start items-start opacity-70">
          <img
            src="/ecobg.png"
            alt=""
            className="w-full h-fit scale-[0.6] mt-[-300px]"
          />
        </div>
        <div className="flex flex-col gap-6 max-w-xl justify-center h-[90%] w-full">
          <ScrollReveal direction="none">
            <Badge title="Collaborate & Impact" type="primary" />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <p className="text-[64px] leading-[72px] font-primary font-[400] tracking-tight text-gray-900 ">
              Partnership
              <span className="text-primary">Opportunities</span>
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={220}>
            <p className="text-[22px] leading-[34px] text-[#7C7C7C]">
              We collaborate with organizations across sectors to build digital
              infrastructure that drives real-world impact and sustainable
              growth.
            </p>
          </ScrollReveal>
        </div>

        {/* Scroll indicator */}
        <ScrollReveal direction="none" delay={500}>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[11px] tracking-[0.2em] uppercase text-gray-400 font-medium">
              Scroll
            </span>
            <div className="w-px h-12 bg-gradient-to-b from-gray-400 to-transparent" />
          </div>
        </ScrollReveal>
      </Section>

      <Section className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] items-start gap-20 justify-between">
        <div className="w-fit">
          <SectionWithHeading heading="Who We Partner With" />
          <blockquote className="space-y-6 border-l-4 border-primary bg-white shadow-sm rounded-r-xl pl-6 pr-6 py-5 w-full">
            <p className="text-[26px] leading-[36px] font-semibold text-gray-900">
              We work with diverse organizations across sectors—from nonprofits
              and educational institutions to startups and technology
              companies—each bringing unique challenges and opportunities for
              digital transformation.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                <span className={cn("text-[20px] text-gray-700")}>
                  Mission-aligned collaboration
                </span>
              </li>
              <li className="flex items-center gap-3 group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                <span className={cn("text-[20px] text-gray-700")}>
                  Flexible engagement models
                </span>
              </li>
              <li className="flex items-center gap-3 group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                <span className={cn("text-[20px] text-gray-700")}>
                  Impact-driven outcomes
                </span>
              </li>
              <li className="flex items-center gap-3 group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                <span className={cn("text-[20px] text-gray-700")}>
                  Long-term partnerships
                </span>
              </li>
            </ul>
          </blockquote>
        </div>
        <Image
          src="/whowepartner.jpg"
          alt=""
          width={500}
          height={500}
          className="object-cover w-full rounded-lg"
        />
      </Section>
      <Section className="bg-primary/10">
        <div className="absolute z-0 overflow-hidden -left-250 w-full h-full ">
          <img
            src="/ecobg.png"
            alt=""
            className="w-full h-fit scale-[0.6] mt-[-300px]"
          />
        </div>
        <SectionWithHeading
          heading="Partnership Categories"
          description2="Tailored solutions for different sectors and organizational needs"
          className="text-center flex flex-col items-center"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {PartnershipCategories.map((category, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <div className="bg-white shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-10 relative overflow-hidden h-full group hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] transition-all duration-500 border border-gray-100/50">
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

                <div className="relative z-10 flex flex-col h-full">
                  {category.icon && (
                    <div className="w-fit bg-primary/10 rounded-lg p-2">
                      <category.icon size={32} className="text-primary" />
                    </div>
                  )}
                  <div className="space-y-2 py-2 mb-2">
                    <h3 className="text-[24px] font-primary font-normal text-gray-900 leading-tight">
                      {category.title}
                    </h3>
                    <span className="absolute top-7 right-40 text-[98px] font-primary text-primary/5 leading-none select-none group-hover:text-primary/40  group-hover:right-45 transition-all duration-500">
                      {category.number}
                    </span>
                    <p className="text-gray-500 leading-relaxed border-b border-gray-300">
                      {category.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-[16px] font-bold  leading-tight">
                      Partnership Benifits
                    </h2>
                    <ul className="space-y-4">
                      {category.partnershipBenefits?.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-3 text-gray-600 group/item"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                          <span className="text-[15px]">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>
    </main>
  );
}
