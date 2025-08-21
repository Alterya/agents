import * as React from "react";
import clsx from "clsx";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          "w-full rounded bg-slate-800 p-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-slate-700",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";


