import * as React from "react";
import clsx from "clsx";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          "w-full rounded bg-slate-800 p-2 text-sm outline-none ring-blue-500 focus:ring-2",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";


