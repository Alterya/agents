import * as React from "react";
import clsx from "clsx";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={clsx("rounded-xl bg-slate-900/70", className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={clsx("px-4 pt-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h3 className={clsx("text-lg font-medium", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={clsx("p-4", className)} {...props} />;
}


