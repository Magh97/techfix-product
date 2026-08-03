import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 outline-offset-2 outline-accent",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-strong",
        accent: "bg-accent text-white hover:opacity-90",
        outline: "border border-border-line bg-surface hover:bg-surface-2",
        ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
