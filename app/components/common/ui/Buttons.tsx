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
          "border-secondary bg-secondary dark:bg-primary dark:border-primary text-white hover:opacity-90 hover:bg-primary hover:border-primary transition-all",
        secondaryButton &&
          "border-secondary dark:border-white text-secondary dark:text-white hover:opacity-90 hover:bg-secondary dark:hover:bg-white dark:hover:text-black hover:border-secondary hover:text-white transition-all",
        lg && "text-lg px-6 py-3 3xl:text-2xl 3xl:px-10 3xl:py-5 4xl:text-3xl 4xl:px-12 4xl:py-6",
        md && "text-md px-4 py-2 3xl:text-xl 3xl:px-8 3xl:py-4 4xl:text-2xl 4xl:px-10 4xl:py-5",
        sm && "text-sm px-2 py-1 3xl:text-base 3xl:px-4 3xl:py-2",
        xs && "text-xs px-1 py-0",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
