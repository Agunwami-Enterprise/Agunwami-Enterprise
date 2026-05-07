import { cn } from "@/lib/utils";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  lg?: boolean;
  md?: boolean;
  sm?: boolean;
  xs?: boolean;
  primaryButton?: boolean;
  secondaryButton?: boolean;
}

export default function Buttons({
  children,
  lg,
  md,
  sm,
  xs,
  primaryButton,
  secondaryButton,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg font-medium border w-full",
        primaryButton &&
          "border-secondary bg-secondary text-white hover:opacity-90 hover:bg-primary hover:border-primary transition-all",
        secondaryButton &&
          "border-secondary text-secondary hover:opacity-90 hover:bg-secondary hover:border-secondary hover:text-white transition-all",
        lg && "text-lg px-6 py-3",
        md && "text-md px-4 py-2",
        sm && "text-sm px-2 py-1",
        xs && "text-xs px-1 py-0",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
