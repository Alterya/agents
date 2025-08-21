import * as React from "react";
import clsx from "clsx";

type ButtonVariant = "default" | "secondary" | "ghost" | "destructive" | "outline";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center rounded transition-colors disabled:opacity-50 disabled:pointer-events-none",
          // sizes
          size === "sm" && "px-2 py-1 text-sm",
          size === "md" && "px-3 py-2 text-sm",
          size === "lg" && "px-4 py-2 text-base",
          // variants
          variant === "default" && "bg-blue-600 text-white hover:bg-blue-500",
          variant === "secondary" && "bg-slate-700 text-slate-100 hover:bg-slate-600",
          variant === "ghost" && "bg-transparent text-slate-100 hover:bg-slate-800",
          variant === "destructive" && "bg-red-600 text-white hover:bg-red-500",
          variant === "outline" && "border border-slate-700 text-slate-100 hover:bg-slate-800",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";


