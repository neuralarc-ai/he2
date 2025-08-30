import { FC } from "react";
import { cn } from "@/lib/utils";
import { AnimatedShinyText } from "./animated-shiny-text";

export interface ThinkingAnimationProps {
  className?: string;
}

export const ThinkingAnimation: FC<ThinkingAnimationProps> = ({
  className,
}) => {
  return (
    <div className={cn("flex w-fit items-center gap-1.5", className)}>
      <div className="thinking-loader-wrapper">
        <div className="thinking-loader"></div>
      </div>
      <AnimatedShinyText 
        shimmerWidth={40}
        className="font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,'Helvetica_Neue',Arial,sans-serif] text-sm"
      >
        Generating
      </AnimatedShinyText>
    </div>
  );
};
