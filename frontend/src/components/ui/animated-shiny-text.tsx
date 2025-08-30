import { ComponentPropsWithoutRef, CSSProperties, FC } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedShinyTextProps
  extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number;
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
  ...props
}) => {
  return (
    <span
      className={cn(
        "mx-auto max-w-md relative",
        className,
      )}
      {...props}
    >
      {/* Base text with proper colors */}
      <span className="text-black dark:text-white">
        {children}
      </span>
      
      {/* Shimmer effect overlay */}
      <span
        style={
          {
            "--shiny-width": `${shimmerWidth}px`,
            backgroundImage: "linear-gradient(90deg, transparent calc(50% - 40px), var(--shimmer-color-1), var(--shimmer-color-2), var(--shimmer-color-3), transparent calc(50% + 40px))",
            backgroundSize: "200% 100%",
            backgroundPosition: "0% center",
            "--shimmer-color-1": "var(--light-shimmer-1, var(--helium-blue))",
            "--shimmer-color-2": "var(--light-shimmer-2, var(--helium-green))", 
            "--shimmer-color-3": "var(--light-shimmer-3, var(--helium-yellow))",
            "--light-shimmer-1": "transparent",
            "--light-shimmer-2": "white",
            "--light-shimmer-3": "transparent",
          } as CSSProperties
        }
        className="absolute inset-0 bg-clip-text bg-no-repeat text-transparent animate-shiny-text"
      >
        {children}
      </span>
    </span>
  );
};
