import Link from "next/link";
import ScrollReveal from "./ScrollReveal";
import { BsArrowRight } from "react-icons/bs";

export default function CTA({
  title,
  description,
  buttonText,
  buttonHref,
}: {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
}) {
  return (
    <section className="h-[60vh] w-full flex flex-col justify-center items-start px-4 md:px-20 py-15 space-y-5 bg-[#1A1A1A] text-white bg-cta bg-cover bg-center bg-no-repeat">
      <ScrollReveal>
        <div className="space-y-10">
          <h1 className="text-[52px] leading-[56px] font-primary font-[400] tracking-tight text-white">
            {title}
          </h1>
          <p className="text-[#BDBDBD]">{description}</p>
          <Link
            href={buttonHref || "#"}
            className="text-black inline-flex items-center gap-3 bg-white text-[15px] font-semibold px-5 py-3 rounded-md hover:bg-primary hover:text-white transition-all"
          >
            {buttonText}
            <BsArrowRight />
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
