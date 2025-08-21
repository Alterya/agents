import { getActiveAgents } from "@/repo/agents";
import ScaleRunner from "@/components/features/scale/ScaleRunner";

export default async function ScalePage() {
  let agents: Array<{ id: string; name: string } & Record<string, any>> = [];
  try {
    const rows = await getActiveAgents();
    agents = Array.isArray(rows) ? rows : [];
  } catch {
    agents = [];
  }
  const slimAgents = agents.map((a) => ({ id: a.id, name: a.name }));

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold text-blue-300">Scale Testing</h1>
      <p className="mb-6 text-slate-300">
        Configure a batch run to execute multiple conversations concurrently and view aggregate
        results.
      </p>
      <section className="rounded-xl bg-slate-900/70 p-4">
        <ScaleRunner agents={slimAgents} />
      </section>
    </main>
  );
}
