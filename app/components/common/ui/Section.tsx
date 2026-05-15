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
    <div className={cn("w-full space-y-4 md:space-y-5", className)}>
      <h1 className="text-[32px] md:text-[48px] lg:text-[56px] xl:text-[64px] 2xl:text-[72px] leading-[40px] md:leading-[56px] lg:leading-[64px] xl:leading-[72px] 2xl:leading-[80px] font-primary font-normal tracking-tight text-gray-900">
        {renderHeading()}
      </h1>
      <div
        className={cn("bg-primary h-1 w-16 md:w-[10%] my-3 md:my-4", dash)}
      />
      <p className="text-[18px] md:text-[22px] lg:text-[24px] xl:text-[26px] 2xl:text-[28px] leading-[28px] md:leading-[34px] lg:leading-[38px] xl:leading-[42px] 2xl:leading-[44px] text-[#7C7C7C] max-w-2xl xl:max-w-3xl">
        {renderDescription()}
      </p>
    </div>
  );
}
