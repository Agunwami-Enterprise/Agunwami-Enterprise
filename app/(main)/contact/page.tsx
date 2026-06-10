import ScrollReveal from "@/app/components/common/ScrollReveal";
import Badge from "@/app/components/common/ui/Badge";
import Card from "@/app/components/common/ui/Card";
import Section, {
  SectionWithHeading,
} from "@/app/components/common/ui/Section";
import { BiArrowToRight, BiChat, BiPhone, BiRightArrow } from "react-icons/bi";
import { BsArrowRight } from "react-icons/bs";
import { CgMail } from "react-icons/cg";
import { CiClock1 } from "react-icons/ci";
import { FaLocationPin } from "react-icons/fa6";
import ContactForm from "@/app/components/contact/ContactForm";

export default function ContactPage() {
  const contactDetails = [
    {
      icon: CgMail,
      name: "EMAIL",
      details: "Contact@agunwamienterprise.com",
      link: "mailto:Contact@agunwamienterprise.com",
    },
    {
      icon: BiPhone,
      name: "PHONE",
      details: "+1 (470) 526-0343",
      link: "tel:+14705260343",
    },
    {
      icon: FaLocationPin,
      name: "LOCATION",
      details: "Atlanta, Georgia, US",
      text: "Serving clients globally",
    },
  ];
  return (
    <main className="flex flex-col items-center w-full">
      {/* ── Hero ── */}
      <Section className="relative flex flex-col justify-between min-h-[100dvh] bg-contact-hero dark:bg-contact-hero-dark bg-cover bg-center bg-no-repeat pt-28 md:pt-32 pb-16">
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
            <Badge title="Start a Conversation" type="primary" />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <h1 className="w-full text-[40px] md:text-[64px] lg:text-[72px] xl:text-[84px] 2xl:text-[96px] leading-[48px] md:leading-[72px] lg:leading-[80px] xl:leading-[92px] 2xl:leading-[104px] font-primary font-normal tracking-tight text-gray-900 dark:text-white ">
              Let's Build Something <br className="hidden sm:block" />
              <span className="text-primary">Together</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={220}>
            <p className="w-full max-w-2xl text-[18px] md:text-[22px] lg:text-[24px] xl:text-[28px] 2xl:text-[30px] leading-[28px] md:leading-[34px] lg:leading-[38px] xl:leading-[42px] 2xl:leading-[46px] text-[#7C7C7C] dark:text-gray-400">
              Ready to build your platform? Have questions about our services?
              We would love to hear from you and explore how we can collaborate.
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contactDetails.map((contactDetail, index) => (
            <Card key={index} className="border-[#0000000D] dark:border-white/10">
              <div className="p-3 w-fit bg-primary/10 rounded-xl text-primary space-y-2">
                <contactDetail.icon size={24} />
              </div>
              <h3 className="text-lg font-medium">{contactDetail.name}</h3>
              <p className="text-[#656565] dark:text-gray-400">{contactDetail.details}</p>
              {contactDetail.link ? (
                <a
                  href={contactDetail.link}
                  className="flex items-center gap-2 text-primary"
                >
                  {contactDetail.name === "EMAIL"
                    ? "Send Email"
                    : contactDetail.name === "PHONE"
                      ? "Call Now"
                      : ""}{" "}
                  <BsArrowRight />
                </a>
              ) : (
                <span className="text-[#656565] dark:text-gray-400 flex items-center gap-2 mt-3">
                  <div className="h-2 w-2 rounded-full bg-[#656565]" />
                  {contactDetail.text}
                </span>
              )}
            </Card>
          ))}
        </div>
      </Section>
      <Section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mt-20">
        <div className="space-y-6">
          <ScrollReveal direction="up">
            <SectionWithHeading
              heading="Get in Touch"
              description="Whether you are launching a new platform, scaling existing infrastructure, or exploring partnership opportunities, we are here to help."
              heading2=""
            />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <Card className="border-[#0000000D] dark:border-white/10 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 p-2">
                <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-xl shrink-0">
                  <CiClock1 className="text-primary" size={26} />
                </div>
                <div className="space-y-1">
                  <p className="text-gray-900 dark:text-white font-medium text-[16px] uppercase tracking-wider">
                    Response Time
                  </p>
                  <p className="text-[17px] text-gray-600 dark:text-gray-400 leading-relaxed">
                    We typically respond to partnership inquiries within 24-48
                    hours on business days.
                  </p>
                </div>
              </div>
            </Card>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <Card className="border-[#0000000D] dark:border-white/10 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 p-2">
                <div className="bg-primary/10 w-12 h-12 flex items-center justify-center rounded-xl shrink-0">
                  <BiChat className="text-primary" size={26} />
                </div>
                <div className="space-y-1">
                  <p className="text-gray-900 dark:text-white font-medium text-[16px] uppercase tracking-wider">
                    What to expect
                  </p>
                  <p className="text-[17px] text-gray-600 dark:text-gray-400 leading-relaxed">
                    After you reach out, we'll schedule a discovery call to
                    understand your needs and explore how we can work together.
                  </p>
                </div>
              </div>
            </Card>
          </ScrollReveal>
        </div>

        <ScrollReveal direction="up" delay={300}>
          <ContactForm />
        </ScrollReveal>
      </Section>
    </main>
  );
}
