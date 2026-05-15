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

export default function Projects() {
  return (
    <main className="flex flex-col items-center w-full">
      <Section className="flex flex-col justify-between min-h-[80dvh] lg:min-h-screen bg-project-hero bg-cover bg-center bg-no-repeat">
        {/* Text block — left column */}
        <div className="absolute right-[60%] top-0 h-full overflow-hidden w-full md:flex hidden justify-start items-start opacity-70">
          <img
            src="/ecobg.png"
            alt=""
            className="w-full h-fit scale-[0.6] mt-[-300px]"
          />
        </div>
        <div className="flex flex-col gap-6 justify-center py-20 lg:py-0 flex-1 w-full">
          <ScrollReveal direction="none">
            <Badge title="Real-World Implementations" type="primary" />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <h1 className="w-full text-[40px] md:text-[64px] lg:text-[72px] xl:text-[84px] 2xl:text-[96px] leading-[48px] md:leading-[72px] lg:leading-[80px] xl:leading-[92px] 2xl:leading-[104px] font-primary font-normal tracking-tight text-gray-900 ">
              Projects Built for <br className="hidden sm:block" />
              <span className="text-primary">Impact</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={220}>
            <p className="w-full  max-w-2xl text-[18px] md:text-[22px] lg:text-[24px] xl:text-[28px] 2xl:text-[30px] leading-[28px] md:leading-[34px] lg:leading-[38px] xl:leading-[42px] 2xl:leading-[46px] text-[#7C7C7C]">
              From e-commerce platforms to community systems, we build digital
              infrastructure that drives measurable outcomes across diverse
              sectors.
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
        <SectionWithHeading
          heading="Client Implementations"
          description="Platforms we have built for organizations and businesses across diverse sectors"
        />
        <div className="grid grid-cols-1 gap-10">
          {projects
            .filter((project) => project.client)
            .map(
              (project, index) =>
                project.client && (
                  <ScrollReveal key={index} delay={index * 100}>
                    <Card className="border border-gray-200 group hover:border-primary transition-all duration-500 ease-in-out">
                      <div className="grid md:grid-cols-[1.5fr_2fr] grid-cols-1 gap-10 h-full w-full items-start">
                        <div className="relative h-[300px] md:h-[400px] w-full rounded-xl overflow-hidden flex flex-col justify-center items-center">
                          <span className="bg-[#FFFFFF] text-primary px-4 py-2 text-[14px] md:text-[18px] font-[500] uppercase rounded-lg absolute top-4 left-4 z-10">
                            {project.projectCategory}
                          </span>
                          <Image
                            src={project.image ?? ""}
                            alt={project.name}
                            width={100}
                            height={100}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-in-out flex items-center justify-center"
                            style={{
                              minHeight: "300px",
                              maxHeight: "500px",
                              objectPosition: "center",
                            }}
                          />
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="flex items-center justify-center p-4 bg-primary/10 rounded-lg h-14 w-14 flex items-center justify-center">
                              {project.icon && (
                                <project.icon className="text-[34px] text-primary" />
                              )}
                            </div>

                            <div className="space-y-2">
                              <h1 className="text-[34px] leading-[32px] font-primary font-[400] tracking-tight text-gray-900 ">
                                {project.name}
                              </h1>
                              <p className="text-[16px] text-[#656565]">
                                {project.description}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="uppercase text-[16px] leading-[28px] font-[600] tracking-tight text-gray-900 ">
                              Challenge
                            </h4>
                            <p className="text-[16px] leading-[28px] font-[400] tracking-tight text-[#656565]">
                              {project.challenges}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h4 className="uppercase text-[16px] leading-[28px] font-[600] tracking-tight text-gray-900 ">
                              Solution
                            </h4>
                            <p className="text-[16px] leading-[28px] font-[400] tracking-tight text-[#656565]">
                              {project.solution}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h4 className="uppercase text-[16px] leading-[28px] font-[600] tracking-tight text-gray-900 ">
                              Technologies
                            </h4>
                            <div className="flex flex-wrap gap-4">
                              {project.technologyStack?.map((tech, index) => (
                                <div
                                  key={index}
                                  className="text-[12px] text-[#6B7280] leading-[14px] font-[400] tracking-tight bg-[#F7F5F2] px-4 py-2 rounded-lg border border-[#E5E7EB]"
                                >
                                  {tech}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </ScrollReveal>
                ),
            )}
        </div>
      </Section>
      <Section className="space-y-16">
        <SectionWithHeading
          heading="Internal Platforms"
          description="Systems we have built to power our own operations and ecosystem"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Active Internal Projects - AE Hub */}
          {projects
            .filter((project) => !project.client && project.status === "ACTIVE")
            .map((item, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <div
                  className={cn(
                    "relative overflow-hidden rounded-xl p-6 md:p-8 h-full flex flex-col gap-5 md:gap-7 transition-transform duration-300 hover:-translate-y-1 bg-[#1A1A1A] hover:bg-[#252525] group",
                  )}
                >
                  {/* Background Patterns */}
                  <img
                    src="/ecocard.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40"
                  />
                  <img
                    src="/cardcorner.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute bottom-0 right-0 w-64 h-64 pointer-events-none group-hover:scale-110 transition-transform duration-700 opacity-20"
                  />

                  <div className="relative z-10 space-y-8 flex flex-col h-full">
                    {/* Header Row */}
                    <div className="flex items-center gap-4">
                      <h3 className="text-[28px] md:text-[40px] font-primary font-normal leading-tight text-white">
                        {item.name}
                      </h3>
                      <span className="text-[12px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md bg-primary text-white">
                        {item.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[18px] leading-relaxed text-gray-300 group-hover:text-white">
                      {item.description}
                    </p>

                    {/* Features List */}
                    <div className="space-y-4 mt-auto pt-4">
                      <h5 className="text-[14px] font-bold tracking-[0.2em] uppercase text-gray-500">
                        KEY FEATURES
                      </h5>
                      <ul className="space-y-4">
                        {item?.key?.map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-3 group/item"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                            <span className="text-[16px] text-gray-300">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}

          {/* Future Platforms Card - Consolidated In-Development */}
          <ScrollReveal delay={200}>
            <div className="relative overflow-hidden rounded-xl p-6 md:p-8 h-full flex flex-col gap-5 md:gap-7 transition-transform duration-300 hover:-translate-y-1 bg-[#FDFBF7] border border-[#F0EADF] group">
              {/* Background Patterns */}
              <img
                src="/ecocard.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-50"
              />
              <img
                src="/cardcorner.png"
                alt=""
                aria-hidden="true"
                className="absolute bottom-0 right-0 w-64 h-64 pointer-events-none group-hover:scale-110 transition-transform duration-700 opacity-30"
              />

              <div className="relative z-10 space-y-8 flex flex-col h-full">
                {/* Header Row */}
                <div className="flex items-center gap-4">
                  <h3 className="text-[28px] md:text-[40px] font-primary font-normal leading-tight text-gray-900">
                    Future Platforms
                  </h3>
                  <span className="text-[12px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md bg-[#E5E7EB] text-gray-600">
                    IN DEVELOPMENT
                  </span>
                </div>

                {/* Description */}
                <p className="text-[18px] leading-relaxed text-gray-600">
                  We are building additional platforms in the mobility and
                  fintech sectors. These initiatives will expand our ecosystem
                  and create new opportunities for partnerships.
                </p>

                {/* Planned Features List */}
                <div className="space-y-4 mt-auto pt-4">
                  <h5 className="text-[14px] font-bold tracking-[0.2em] uppercase text-gray-400">
                    PLANNED FEATURES
                  </h5>
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 group/item">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                      <span className="text-[16px] text-gray-700">
                        Mobility Platform (Coming Soon)
                      </span>
                    </li>
                    <li className="flex items-center gap-3 group/item">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                      <span className="text-[16px] text-gray-700">
                        Fintech Platform (Coming Soon)
                      </span>
                    </li>
                    <li className="flex items-center gap-3 group/item">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                      <span className="text-[16px] text-gray-700">
                        Educational Platform (Planned)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </Section>
      <CTA
        title="Let us build something together"
        description="Ready to bring your digital platform vision to life? Partner with us to create infrastructure that scales."
        buttonText="Start Your Project"
      />
    </main>
  );
}
