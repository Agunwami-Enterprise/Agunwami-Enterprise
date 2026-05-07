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
      <Section className="flex flex-col justify-between h-fit md:h-[100vh] bg-project-hero bg-cover bg-center bg-no-repeat">
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
            <Badge title="Real-World Implementations" type="primary" />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <p className="text-[64px] leading-[72px] font-primary font-[400] tracking-tight text-gray-900 ">
              Projects Built for <span className="text-primary">Impact</span>
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={220}>
            <p className="text-[22px] leading-[34px] text-[#7C7C7C]">
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
                        <div className="relative h-[400px] w-full rounded-xl overflow-hidden flex flex-col justify-center items-center">
                          <span className="bg-[#FFFFFF] text-primary px-4 py-2 text-[18px] font-[500] uppercase rounded-lg absolute top-4 left-4 z-10">
                            {project.projectCategory}
                          </span>
                          <Image
                            src={project.image ?? ""}
                            alt={project.name}
                            width={100}
                            height={100}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-in-out flex items-center justify-center"
                            style={{
                              minHeight: "500px",
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
          {projects
            .filter((project) => !project.client)
            .map((item, index) => {
              return (
                <ScrollReveal key={index} delay={index * 100}>
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-xl p-8 h-full flex flex-col gap-7 transition-transform duration-300 hover:-translate-y-1",
                      item.status === "ACTIVE"
                        ? "bg-[#1A1A1A] hover:bg-[#805f11] group"
                        : "bg-[#F5F2EC]",
                    )}
                  >
                    {/* Background Patterns */}
                    <img
                      src="/ecocard.png"
                      alt=""
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-0 w-full h-full object-cover pointer-events-none",
                      )}
                    />
                    <img
                      src="/cardcorner.png"
                      alt=""
                      aria-hidden="true"
                      className="absolute bottom-0 right-0 w-64 h-64 pointer-events-none group-hover:scale-110 transition-transform duration-700"
                    />

                    <div className="relative z-10 space-y-8 flex flex-col h-full">
                      {/* Header Row */}
                      <div className="flex items-center gap-4">
                        <h3 className="text-[40px] font-primary font-normal leading-tight text-white">
                          {item.name}
                        </h3>
                        <span
                          className={cn(
                            "text-[12px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md",
                            item.status === "ACTIVE"
                              ? "bg-primary text-secondary text-white"
                              : "bg-gray-200 text-gray-500",
                          )}
                        >
                          {item.status}
                        </span>
                      </div>

                      {/* Description */}
                      <p
                        className={cn(
                          "text-[18px] leading-relaxed",
                          item.status === "ACTIVE"
                            ? "text-gray-400 group-hover:text-white"
                            : "text-gray-500",
                        )}
                      >
                        {item.description}
                      </p>

                      {/* Features List */}
                      <div className="space-y-4 mt-auto pt-4">
                        <h5
                          className={cn(
                            "text-[14px] font-bold tracking-[0.2em] uppercase",
                            item.status === "ACTIVE"
                              ? "text-gray-500"
                              : "text-gray-400",
                          )}
                        >
                          {item.name === "AE Hub"
                            ? "Key Features"
                            : "Planned Features"}
                        </h5>
                        <ul className="space-y-4">
                          {item?.key?.map((feature, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-3 group/item"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-125 transition-transform" />
                              <span
                                className={cn(
                                  "text-[16px]",
                                  item.status === "ACTIVE"
                                    ? "text-gray-300"
                                    : "text-gray-600",
                                )}
                              >
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
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
