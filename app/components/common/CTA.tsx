import Link from "next/link";
import ScrollReveal from "./ScrollReveal";
import { BsArrowRight } from "react-icons/bs";

export default function CTA({
  title,
  description,
  buttonText,
  buttonHref,
  secondaryButtonText,
  secondaryButtonHref,
}: {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
}) {
  return (
    <section className="min-h-[50vh] w-full flex flex-col justify-center items-start px-6 md:px-20 py-20 space-y-5 bg-[#1A1A1A] text-white bg-cta bg-cover bg-center bg-no-repeat">
      <ScrollReveal>
        <div className="space-y-8 max-w-4xl">
          <h1 className="text-[32px] md:text-[52px] leading-[40px] md:leading-[56px] font-primary font-[400] tracking-tight text-white">
            {title}
          </h1>
          <p className="text-[#BDBDBD] text-[18px] md:text-[20px] leading-relaxed">{description}</p>
          <div className="flex flex-wrap items-center gap-4">
            {buttonText && (
              <Link
                href={buttonHref || "#"}
                className="text-black inline-flex items-center gap-3 bg-white text-[15px] font-semibold px-6 py-3.5 rounded-md hover:bg-primary hover:text-white transition-all duration-300"
              >
                {buttonText}
                <BsArrowRight />
              </Link>
            )}
            {secondaryButtonText && (
              <Link
                href={secondaryButtonHref || "#"}
                className="inline-flex items-center gap-3 border border-white/30 text-white text-[15px] font-semibold px-6 py-3.5 rounded-md hover:bg-white/10 transition-all duration-300"
              >
                {secondaryButtonText}
                <BsArrowRight />
              </Link>
            )}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
