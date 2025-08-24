"use client";
import * as React from "react";
import clsx from "clsx";

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value: controlled,
  defaultValue,
  onValueChange,
  className,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}): JSX.Element {
  const [uncontrolled, setUncontrolled] = React.useState<string>(defaultValue || "");
  const isControlled = controlled !== undefined;
  const value = isControlled ? (controlled as string) : uncontrolled;
  const setValue = React.useCallback(
    (v: string) => {
      if (!isControlled) setUncontrolled(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange],
  );
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div role="tablist" className={clsx("inline-flex items-center gap-2", className)} {...props} />;
}

export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }): JSX.Element {
  const ctx = React.useContext(TabsContext);
  const selected = ctx?.value === value;
  const id = React.useMemo(() => `tab-${value}`, [value]);
  const controls = React.useMemo(() => `tabpanel-${value}`, [value]);
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={selected}
      aria-controls={controls}
      tabIndex={selected ? 0 : -1}
      className={clsx(
        "rounded px-3 py-1 text-sm",
        selected ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-100",
        className,
      )}
      onClick={() => ctx?.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }): JSX.Element | null {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;
  return (
    <div role="tabpanel" id={`tabpanel-${value}`} aria-labelledby={`tab-${value}`} className={className}>
      {children}
    </div>
  );
}


