import { cn } from "@/lib/utils";

export default function Badge({
  title,
  className,
  type,
  variant = "dot",
}: {
  title?: string;
  className?: string;
  type?: "primary" | "secondary" | "neutral";
  variant?: "dot" | "solid";
}) {
  if (variant === "solid") {
    return (
      <span
        className={cn(
          "inline-flex items-center px-3 py-1 rounded-md text-[12px] font-bold tracking-wider uppercase",
          type === "primary" && "bg-primary text-white",
          type === "neutral" && "bg-[#F3F3F3] dark:bg-white/10 text-[#555555] dark:text-gray-400",
          className,
        )}
      >
        {title}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium text-center w-fit",
        type === "primary" &&
          "bg-primary/10 text-primary border border-primary/20",
        type === "secondary" &&
          "bg-secondary/10 text-secondary border border-secondary/20",
        className,
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          type === "primary" && "bg-primary",
          type === "secondary" && "bg-secondary",
        )}
      />
      {title}
    </span>
  );
}
