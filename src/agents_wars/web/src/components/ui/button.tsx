import * as React from "react";
import clsx from "clsx";

type AnchorLikeProps = { asChild?: boolean; children?: React.ReactNode };

type ButtonVariant = "default" | "secondary" | "ghost" | "destructive" | "outline";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    AnchorLikeProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild, children, ...props }, ref) => {
    const classes = clsx(
      "inline-flex items-center justify-center rounded transition-colors disabled:opacity-50 disabled:pointer-events-none",
      // sizes
      size === "sm" && "px-2 py-1 text-sm",
      size === "md" && "px-3 py-2 text-sm",
      size === "lg" && "px-4 py-2 text-base",
      // variants
      variant === "default" && "bg-primary text-white hover:bg-orange-500 shadow-subtle focus:outline-none focus:ring-2 focus:ring-primary",
      variant === "secondary" && "bg-slate-700 text-slate-100 hover:bg-slate-600 shadow-subtle focus:outline-none focus:ring-2 focus:ring-primary/50",
      variant === "ghost" && "bg-transparent text-slate-100 hover:bg-slate-800",
      variant === "destructive" && "bg-red-600 text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/60",
      variant === "outline" && "border border-slate-700 text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50",
      className,
    );
    if (asChild) {
      return (
        <span className={classes}>
          {children}
        </span>
      );
    }
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";


