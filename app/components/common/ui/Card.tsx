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
        "group hover:translate-y-2 border border-[2px] border-[#C89B3C] relative overflow-hidden rounded-xl p-6 md:p-8 transition-all duration-300",
        variant === "light"
          ? "bg-[#FAFAFA] text-gray-900 border-gray-300"
          : "bg-[#1A1A1A] text-white",
        className,
      )}
    >
      {/* Background Pattern Overlay (if applied via className) */}
      <div className="relative z-10 space-y-6">
        {Icon && (
          <div className="w-14 h-14 rounded-xl bg-[#F5F2EC] flex items-center justify-center text-[#C89B3C] mb-2">
            <Icon size={28} />
          </div>
        )}
        {(title || description) && (
          <div className="space-y-4">
            {title && (
              <div className="space-y-5">
                <h1 className="text-[28px] md:text-[32px] font-primary font-normal tracking-tight">
                  {title}
                </h1>
              </div>
            )}
            {description && (
              <p
                className={cn(
                  "text-base md:text-lg xl:text-[20px] 2xl:text-[22px] leading-relaxed xl:leading-[30px] 2xl:leading-[34px]",
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
