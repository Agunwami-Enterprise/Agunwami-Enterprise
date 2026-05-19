import { cn } from "@/lib/utils";

export default function Card({
  className,
  title,
  description,
  children,
  icon: Icon,
  variant = "light",
}: {
  className?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  icon?: React.ElementType;
  variant?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "group hover:translate-y-2 border border-[2px] border-[#C89B3C] relative overflow-hidden rounded-xl p-6 md:p-8 3xl:p-12 4xl:p-16 transition-all duration-300",
        variant === "light"
          ? "bg-[#FAFAFA] dark:bg-[#1C1C1C] text-gray-900 dark:text-white border-gray-300 dark:border-white/10"
          : "bg-[#1A1A1A] text-white",
        className,
      )}
    >
      {/* Background Pattern Overlay (if applied via className) */}
      <div className="relative z-10 space-y-6">
        {Icon && (
          <div className="w-14 h-14 3xl:w-20 3xl:h-20 4xl:w-24 4xl:h-24 rounded-xl 3xl:rounded-2xl bg-[#F5F2EC] flex items-center justify-center text-[#C89B3C] mb-2">
            <Icon className="w-7 h-7 3xl:w-10 3xl:h-10 4xl:w-12 4xl:h-12" />
          </div>
        )}
        {(title || description) && (
          <div className="space-y-4">
            {title && (
              <div className="space-y-5">
                <h1 className="text-[28px] md:text-[32px] 3xl:text-[48px] 4xl:text-[64px] font-primary font-normal tracking-tight">
                  {title}
                </h1>
              </div>
            )}
            {description && (
              <p
                className={cn(
                  "text-base md:text-lg xl:text-[20px] 2xl:text-[22px] 3xl:text-[32px] 4xl:text-[40px] leading-relaxed xl:leading-[30px] 2xl:leading-[34px] 3xl:leading-[48px] 4xl:leading-[60px]",
                  variant === "light" ? "text-gray-600" : "text-gray-400",
                )}
              >
                {description}
              </p>
            )}
            <div className="w-12 h-1 bg-[#C89B3C] group-hover:w-[30%] group-hover:bg-gradient-to-r from-primary to-gray-300 transition-all duration-300 ease-in-out" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
