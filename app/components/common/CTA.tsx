import Link from "next/link";
import ScrollReveal from "./ScrollReveal";
import { BsArrowRight } from "react-icons/bs";

export default function CTA() {
  return (
    <section className="h-[60vh] w-full flex flex-col justify-center items-start px-4 md:px-20 py-15 space-y-5 bg-[#1A1A1A] text-white bg-cta bg-cover bg-center bg-no-repeat">
      <ScrollReveal>
        <div className="space-y-10">
          <h1 className="text-[52px] leading-[56px] font-primary font-[400] tracking-tight text-white">
            Ready to build something exceptional?
          </h1>
          <p className="text-[#BDBDBD]">
            Let us collaborate on digital infrastructure that scales with your
            vision and empowers your community.
          </p>
          <Link
            href="/contact"
            className="text-black inline-flex items-center gap-3 bg-white text-[15px] font-semibold px-5 py-3 rounded-md hover:bg-primary hover:text-white transition-all"
          >
            Start a Conversation <BsArrowRight />
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
