import dynamic from "next/dynamic";

const ThreeScene = dynamic(() => import("@/components/ThreeScene"), {
  ssr: false,
  loading: () => <div className="h-[280px] w-full animate-pulse rounded-xl bg-slate-800" aria-hidden />,
});
const NodeGraph = dynamic(() => import("@/components/NodeGraph"), {
  ssr: false,
  loading: () => <div className="h-[280px] w-full animate-pulse rounded-xl bg-slate-800" aria-hidden />,
});

export default function Page() {
  return (
    <main className="grid gap-4 p-6">
      <h1 className="text-2xl text-blue-300">Agent Wars</h1>
      <p className="text-slate-300">
        Landing page with lightweight 3D preview and interactive node graph.
      </p>
      <div className="grid max-w-[900px] gap-4">
        <section className="rounded-xl bg-slate-900/70 p-3">
          <h2 className="mb-2 text-blue-400">3D Scene</h2>
          <ThreeScene />
        </section>
        <section className="rounded-xl bg-slate-900/70 p-3">
          <h2 className="mb-2 text-blue-400">Node Graph</h2>
          <NodeGraph />
        </section>
      </div>
    </main>
  );
}
