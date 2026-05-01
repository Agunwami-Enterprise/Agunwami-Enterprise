import { cn } from "@/lib/utils";

export default function Card({
  className,
  title,
  description,
  children,
  variant = "light",
}: {
  className?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  variant?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-8 transition-all duration-300",
        variant === "light"
          ? "bg-[#FAFAFA] text-gray-900 border border-gray-100"
          : "bg-[#1A1A1A] text-white",
        className,
      )}
    >
      {/* Background Pattern Overlay (if applied via className) */}
      <div className="relative z-10 space-y-6">
        {(title || description) && (
          <div className="space-y-4">
            {title && (
              <div className="space-y-4">
                <div className="w-12 h-1 bg-primary" />
                <h1 className="text-2xl font-primary font-normal tracking-tight">
                  {title}
                </h1>
              </div>
            )}
            {description && (
              <p
                className={cn(
                  "text-base leading-relaxed",
                  variant === "light" ? "text-gray-600" : "text-gray-400",
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
