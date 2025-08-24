import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Cpu, HardDrive, MemoryStick, Activity } from "lucide-react"

const systemStats = {
  cpu: { usage: 67, cores: 8, temperature: 72 },
  memory: { usage: 45, total: 32, available: 17.6 },
  disk: { usage: 23, total: 500, available: 385 },
  network: { inbound: 125, outbound: 89 },
}

const activeWorkers = [
  { id: 1, name: "Worker-01", status: "busy", jobs: 3, uptime: "2d 14h" },
  { id: 2, name: "Worker-02", status: "idle", jobs: 0, uptime: "1d 8h" },
  { id: 3, name: "Worker-03", status: "busy", jobs: 2, uptime: "3d 2h" },
  { id: 4, name: "Worker-04", status: "maintenance", jobs: 0, uptime: "0h" },
]

export function SystemResources() {
  return (
    <div className="space-y-6">
      {/* System Resources */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
            <Activity className="h-5 w-5 text-primary" />
            System Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* CPU */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">CPU</span>
              </div>
              <span className="text-sm text-muted-foreground">{systemStats.cpu.usage}%</span>
            </div>
            <Progress value={systemStats.cpu.usage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{systemStats.cpu.cores} cores</span>
              <span>{systemStats.cpu.temperature}°C</span>
            </div>
          </div>

          {/* Memory */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MemoryStick className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Memory</span>
              </div>
              <span className="text-sm text-muted-foreground">{systemStats.memory.usage}%</span>
            </div>
            <Progress value={systemStats.memory.usage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{systemStats.memory.available}GB available</span>
              <span>{systemStats.memory.total}GB total</span>
            </div>
          </div>

          {/* Disk */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Disk</span>
              </div>
              <span className="text-sm text-muted-foreground">{systemStats.disk.usage}%</span>
            </div>
            <Progress value={systemStats.disk.usage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{systemStats.disk.available}GB free</span>
              <span>{systemStats.disk.total}GB total</span>
            </div>
          </div>

          {/* Network */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center">
              <div className="text-lg font-bold text-primary font-[family-name:var(--font-space-grotesk)]">
                {systemStats.network.inbound}
              </div>
              <div className="text-xs text-muted-foreground">MB/s In</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-accent font-[family-name:var(--font-space-grotesk)]">
                {systemStats.network.outbound}
              </div>
              <div className="text-xs text-muted-foreground">MB/s Out</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Workers */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground font-[family-name:var(--font-space-grotesk)]">
            Active Workers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeWorkers.map((worker) => (
              <div key={worker.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{worker.name}</span>
                      <Badge
                        className={`text-xs ${
                          worker.status === "busy"
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : worker.status === "idle"
                              ? "bg-accent/10 text-accent hover:bg-accent/20"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {worker.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{worker.jobs} jobs</span>
                      <span>•</span>
                      <span>Up: {worker.uptime}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
