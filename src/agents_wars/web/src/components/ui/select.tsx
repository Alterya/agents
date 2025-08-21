import * as React from "react";
import clsx from "clsx";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={clsx(
          "rounded bg-slate-800 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";


