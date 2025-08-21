import FpsProbe from "@/components/FpsProbe";
import HeroSection from "@/components/HeroSection.client";
import CapabilitiesGraph from "@/components/CapabilitiesGraph.client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <Card className="p-0">
          <CardHeader>
            <CardTitle className="text-blue-400">Node Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <CapabilitiesGraph />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
