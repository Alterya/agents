import * as React from "react";
import clsx from "clsx";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, ...props }: LabelProps): JSX.Element {
  return <label className={clsx("text-sm text-slate-300", className)} {...props} />;
}


