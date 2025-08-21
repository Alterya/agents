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
    <main className="mx-auto max-w-3xl p-6" style={{ backgroundColor: "#ECEADF" }}>
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "#3F404C" }}>Scale Testing</h1>
      <p className="mb-6" style={{ color: "#3F404C", opacity: 0.7 }}>
        Configure a batch run to execute multiple conversations concurrently and view aggregate results.
      </p>
      <section
        className="rounded-[12px]"
        style={{ background: "#fff", border: "1px solid #DFD4CA", padding: "24px", boxShadow: "0 1px 3px rgba(63,64,76,0.1), 0 1px 2px rgba(63,64,76,0.06)" }}
      >
        <ScaleRunner agents={slimAgents} />
      </section>
    </main>
  );
}
