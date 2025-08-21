"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Header(): JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/hub", label: "Hub" },
    { href: "/scale", label: "Scale" },
    { href: "/promptbro", label: "PromptBro" },
    { href: "/debug/llm", label: "LLM Debug" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold text-blue-300">
            Agent Wars
          </Link>
          <span className="hidden text-xs text-slate-300 sm:inline">v0</span>
        </div>
        <div className="hidden items-center gap-2 text-sm sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                "rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
                (pathname?.startsWith(l.href)
                  ? "bg-blue-600 text-white"
                  : "text-slate-200 hover:bg-slate-800")
              }
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="sm:hidden">
          <Button aria-label="Menu" variant="secondary" onClick={() => setOpen((v) => !v)}>
            Menu
          </Button>
        </div>
      </div>
      {open ? (
        <nav aria-label="Mobile" className="sm:hidden">
          <div className="mx-auto grid max-w-6xl gap-1 px-4 pb-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={
                  "rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
                  (pathname?.startsWith(l.href)
                    ? "bg-blue-600 text-white"
                    : "text-slate-200 hover:bg-slate-800")
                }
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}


