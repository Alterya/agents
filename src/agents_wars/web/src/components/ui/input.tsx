import * as React from "react";
import clsx from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          "w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";


