import FpsProbe from "@/components/FpsProbe";
import HeroSection from "@/components/HeroSection.client";
import CapabilitiesGraph from "@/components/CapabilitiesGraph.client";

export default function Page() {
  return (
    <main className="grid gap-4 p-6">
      <h1 className="text-2xl text-blue-300">Agent Wars</h1>
      <p className="text-slate-300">
        Landing page with lightweight 3D preview and interactive node graph.
      </p>
      <div className="grid max-w-[900px] gap-4">
        <FpsProbe />
        <HeroSection />
        <section className="rounded-xl bg-slate-900/70 p-3">
          <h2 className="mb-2 text-blue-400">Node Graph</h2>
          <CapabilitiesGraph />
        </section>
      </div>
    </main>
  );
}
