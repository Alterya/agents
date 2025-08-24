import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <main style={{ backgroundColor: "#ECEADF" }}>
      <div
        className="mx-auto grid min-h-[100vh] max-w-[1280px] gap-6 px-6 md:px-8"
        style={{ paddingTop: "24px", paddingBottom: "24px" }}
      >
        <header className="mb-2" style={{ fontFamily: "var(--font-head)" }}>
          <h1 className="text-[32px] font-bold" style={{ color: "#3F404C" }}>
            Agent Wars
          </h1>
          <p className="text-[14px]" style={{ color: "#2D2E36" }}>
            Design, simulate, and optimize mission-driven prompts.
          </p>
        </header>

        {/* Stats grid */}
        <section
          className="grid"
          style={{ gap: "24px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
        >
          {[
            { label: "Battles", value: "128" },
            { label: "Simulations", value: "3.2k" },
            { label: "Prompts", value: "542" },
            { label: "Jobs", value: "87" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-4 rounded-[12px] bg-white"
              style={{ border: "1px solid #DFD4CA", padding: "24px", boxShadow: "0 1px 3px rgba(63,64,76,0.1), 0 1px 2px rgba(63,64,76,0.06)" }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: "#FE6726" }}
              />
              <div className="flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
                <div className="text-[28px] font-bold" style={{ color: "#3F404C" }}>
                  {s.value}
                </div>
                <div className="text-[14px]" style={{ color: "#2D2E36" }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Cards grid with CTAs */}
        <section
          className="grid"
          style={{ gap: "24px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
        >
          {[
            { title: "Model Wars Arena", desc: "Run head-to-head battles.", href: "/hub", cta: "Open Hub" },
            { title: "Conversation Simulation", desc: "Run at scale with reports.", href: "/scale", cta: "Open Scale" },
            { title: "PromptBRO Generator", desc: "Co-create and refine prompts.", href: "/promptbro", cta: "Open PromptBro" },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-[12px] bg-white"
              style={{ border: "1px solid #DFD4CA", padding: "24px", boxShadow: "0 1px 3px rgba(63,64,76,0.1), 0 1px 2px rgba(63,64,76,0.06)" }}
            >
              <h3 className="text-[18px] font-semibold" style={{ color: "#3F404C", fontFamily: "var(--font-head)" }}>
                {c.title}
              </h3>
              <p className="mt-1 text-[14px]" style={{ color: "#2D2E36", fontFamily: "var(--font-body)" }}>
                {c.desc}
              </p>
              <div className="mt-3">
                <Link
                  href={c.href}
                  className="inline-flex items-center rounded-[8px] px-6 py-3 font-medium"
                  style={{ backgroundColor: "#C54A1F", color: "#fff" }}
                >
                  {c.cta}
                </Link>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
