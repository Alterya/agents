"use client";
import * as React from "react";
import clsx from "clsx";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

export function Checkbox({ className, ...props }: CheckboxProps): JSX.Element {
  return (
    <input
      type="checkbox"
      className={clsx(
        "h-4 w-4 cursor-pointer rounded border border-slate-600 bg-slate-900 text-blue-600 outline-none ring-blue-500 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}


