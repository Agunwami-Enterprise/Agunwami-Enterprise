import { cn } from "@/lib/utils";

export default function Buttons({
  children,
  lg,
  md,
  sm,
  xs,
  primaryButton,
  secondaryButton,
}: {
  children?: React.ReactNode;
  lg?: boolean;
  md?: boolean;
  sm?: boolean;
  xs?: boolean;
  primaryButton?: boolean;
  secondaryButton?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg font-medium border w-full",
        primaryButton &&
          "bg-secondary text-white hover:opacity-90 transition-all",
        secondaryButton &&
          "border-secondary text-secondary hover:opacity-90 transition-all",
        lg && "text-lg px-6 py-3",
        md && "text-md px-4 py-2",
        sm && "text-sm px-2 py-1",
        xs && "text-xs px-1 py-0",
      )}
    >
      {children}
    </button>
  );
}
