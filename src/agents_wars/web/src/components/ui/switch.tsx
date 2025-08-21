"use client";
import * as React from "react";
import clsx from "clsx";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

export function Switch({ className, checked, onChange, ...props }: SwitchProps): JSX.Element {
  return (
    <label className={clsx("relative inline-flex cursor-pointer items-center", className)}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={!!checked}
        onChange={onChange}
        {...props}
      />
      <div className="h-5 w-9 rounded-full bg-slate-700 transition peer-checked:bg-blue-600" />
      <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
    </label>
  );
}


