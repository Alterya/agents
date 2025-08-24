import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Pause, Square, Eye, MoreHorizontal, Clock } from "lucide-react"

const activeSimulations = [
  {
    id: 1,
    name: "Romance Scam Detection v2.1",
    model: "GPT-4",
    scenario: "Romance Scam",
    status: "running",
    progress: 73,
    completed: 730,
    total: 1000,
    successRate: 94.2,
    timeRemaining: "4m 12s",
    startTime: "2:34 PM",
  },
  {
    id: 2,
    name: "Investment Fraud Analysis",
    model: "Claude-3 Opus",
    scenario: "Investment Fraud",
    status: "paused",
    progress: 45,
    completed: 225,
    total: 500,
    successRate: 87.8,
    timeRemaining: "Paused",
    startTime: "1:15 PM",
  },
  {
    id: 3,
    name: "Phishing Email Detection",
    model: "GPT-3.5 Turbo",
    scenario: "Phishing",
    status: "running",
    progress: 91,
    completed: 1820,
    total: 2000,
    successRate: 91.5,
    timeRemaining: "1m 45s",
    startTime: "12:45 PM",
  },
  {
    id: 4,
    name: "Tech Support Scam Test",
    model: "Claude-3 Sonnet",
    scenario: "Tech Support Scam",
    status: "queued",
    progress: 0,
    completed: 0,
    total: 750,
    successRate: 0,
    timeRemaining: "Waiting",
    startTime: "Queued",
  },
]

export function ActiveSimulations() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          Active Simulations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {activeSimulations.map((sim) => (
              <Card key={sim.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-card-foreground mb-1">{sim.name}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {sim.model}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {sim.scenario}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            sim.status === "running"
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : sim.status === "paused"
                                ? "bg-accent/10 text-accent hover:bg-accent/20"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {sim.status}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {sim.completed}/{sim.total} conversations
                      </span>
                      <span className="text-muted-foreground">{sim.timeRemaining}</span>
                    </div>
                    <Progress value={sim.progress} className="h-2" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary font-[family-name:var(--font-space-grotesk)]">
                        {sim.successRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-accent font-[family-name:var(--font-space-grotesk)]">
                        {sim.progress}%
                      </div>
                      <div className="text-xs text-muted-foreground">Complete</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        {sim.startTime}
                      </div>
                      <div className="text-xs text-muted-foreground">Started</div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                      <Eye className="h-3 w-3" />
                      Monitor
                    </Button>
                    {sim.status === "running" ? (
                      <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                        <Pause className="h-3 w-3" />
                        Pause
                      </Button>
                    ) : sim.status === "paused" ? (
                      <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                        <Play className="h-3 w-3" />
                        Resume
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                        <Play className="h-3 w-3" />
                        Start
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                      <Square className="h-3 w-3" />
                      Stop
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
