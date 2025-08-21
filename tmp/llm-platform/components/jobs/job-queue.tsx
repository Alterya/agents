import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Pause, Square, MoreHorizontal, Clock, Zap } from "lucide-react"

const queuedJobs = [
  {
    id: 1,
    name: "Romance Scam Battle: GPT-4 vs Claude-3",
    type: "Model Battle",
    priority: "high",
    status: "running",
    progress: 67,
    eta: "4m 12s",
    startTime: "2:34 PM",
    resources: { cpu: 85, memory: 67 },
  },
  {
    id: 2,
    name: "Bulk Phishing Simulation",
    type: "Conversation Simulation",
    priority: "normal",
    status: "queued",
    progress: 0,
    eta: "Waiting",
    startTime: "Queued",
    resources: { cpu: 0, memory: 0 },
  },
  {
    id: 3,
    name: "Prompt Optimization: Scammer Detection v3.2",
    type: "Prompt Optimization",
    priority: "low",
    status: "running",
    progress: 23,
    eta: "12m 45s",
    startTime: "1:15 PM",
    resources: { cpu: 45, memory: 32 },
  },
  {
    id: 4,
    name: "Weekly Performance Evaluation",
    type: "Evaluation",
    priority: "urgent",
    status: "paused",
    progress: 89,
    eta: "Paused",
    startTime: "12:00 PM",
    resources: { cpu: 0, memory: 15 },
  },
  {
    id: 5,
    name: "Data Processing: Conversation Logs",
    type: "Data Processing",
    priority: "normal",
    status: "queued",
    progress: 0,
    eta: "Waiting",
    startTime: "Queued",
    resources: { cpu: 0, memory: 0 },
  },
]

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-destructive/10 text-destructive hover:bg-destructive/20"
    case "high":
      return "bg-accent/10 text-accent hover:bg-accent/20"
    case "normal":
      return "bg-primary/10 text-primary hover:bg-primary/20"
    case "low":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "running":
      return "bg-primary/10 text-primary hover:bg-primary/20"
    case "paused":
      return "bg-accent/10 text-accent hover:bg-accent/20"
    case "queued":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function JobQueue() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <Zap className="h-5 w-5 text-accent" />
          Job Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {queuedJobs.map((job) => (
              <Card key={job.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-card-foreground mb-1">{job.name}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {job.type}
                        </Badge>
                        <Badge className={`text-xs ${getPriorityColor(job.priority)}`}>{job.priority}</Badge>
                        <Badge className={`text-xs ${getStatusColor(job.status)}`}>{job.status}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Progress */}
                  {job.status === "running" && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress: {job.progress}%</span>
                        <span className="text-muted-foreground">ETA: {job.eta}</span>
                      </div>
                      <Progress value={job.progress} className="h-2" />
                    </div>
                  )}

                  {/* Resource Usage */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        {job.startTime}
                      </div>
                      <div className="text-xs text-muted-foreground">Started</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-primary font-[family-name:var(--font-space-grotesk)]">
                        {job.resources.cpu}%
                      </div>
                      <div className="text-xs text-muted-foreground">CPU</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-accent font-[family-name:var(--font-space-grotesk)]">
                        {job.resources.memory}%
                      </div>
                      <div className="text-xs text-muted-foreground">Memory</div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    {job.status === "running" ? (
                      <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                        <Pause className="h-3 w-3" />
                        Pause
                      </Button>
                    ) : job.status === "paused" ? (
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
                      Cancel
                    </Button>
                    <Button variant="ghost" size="sm">
                      Logs
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
