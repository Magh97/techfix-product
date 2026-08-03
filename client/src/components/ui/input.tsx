import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-border-line bg-surface px-3 text-sm placeholder:text-faint focus-visible:outline-2 outline-offset-0 outline-accent",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
