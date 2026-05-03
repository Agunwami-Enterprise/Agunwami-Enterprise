import { cn } from "@/lib/utils";

export default function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-10 px-4 md:px-20 w-full py-20", className)}>
      {children}
    </section>
  );
}
export function SectionWithHeading({
  // children,
  className,
  heading,
  heading2,
  description,
  description2,
  dash,
}: {
  // children: React.ReactNode;
  className?: string;
  heading: string;
  heading2?: string;
  description?: string;
  description2?: string;
  dash?: string;
}) {
  const renderHeading = () => {
    if (heading2) {
      return (
        <>
          {heading} <br /> {heading2}
        </>
      );
    }
    return heading;
  };
  const renderDescription = () => {
    if (description2) {
      return (
        <>
          <>
            {description} <br />
            {description2}
          </>
        </>
      );
    }
    return <>{description}</>;
  };
  return (
    <div className={cn("w-full space-y-5", className)}>
      <h1 className="text-[48px] leading-[56px] font-primary font-[400] tracking-tight text-gray-900">
        {renderHeading()}
      </h1>
      <div className={cn("bg-primary h-1 w-[15%] md:w-[10%] my-4", dash)} />
      <p className="text-[22px] leading-[34px] text-[#7C7C7C]">
        {renderDescription()}
      </p>
    </div>
  );
}
