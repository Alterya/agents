import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { History, Download, Eye, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react"

const jobHistory = [
  {
    id: 1,
    name: "GPT-4 vs Claude-3 Romance Scam Battle",
    type: "Model Battle",
    status: "completed",
    duration: "8m 42s",
    completedAt: "2 hours ago",
    result: "GPT-4 wins (94.2% vs 91.8%)",
    resources: { cpu: 89, memory: 67 },
  },
  {
    id: 2,
    name: "Phishing Email Simulation Batch",
    type: "Conversation Simulation",
    status: "completed",
    duration: "15m 33s",
    completedAt: "4 hours ago",
    result: "2000 conversations processed, 91.5% accuracy",
    resources: { cpu: 76, memory: 82 },
  },
  {
    id: 3,
    name: "Investment Fraud Prompt Optimization",
    type: "Prompt Optimization",
    status: "failed",
    duration: "2m 15s",
    completedAt: "6 hours ago",
    result: "Error: Rate limit exceeded",
    resources: { cpu: 23, memory: 15 },
  },
  {
    id: 4,
    name: "Weekly Model Performance Evaluation",
    type: "Evaluation",
    status: "completed",
    duration: "45m 12s",
    completedAt: "1 day ago",
    result: "All models evaluated, report generated",
    resources: { cpu: 95, memory: 78 },
  },
  {
    id: 5,
    name: "Tech Support Scam Detection Training",
    type: "Data Processing",
    status: "completed",
    duration: "1h 23m",
    completedAt: "2 days ago",
    result: "5000 samples processed successfully",
    resources: { cpu: 67, memory: 45 },
  },
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-primary" />
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-primary/10 text-primary hover:bg-primary/20"
    case "failed":
      return "bg-destructive/10 text-destructive hover:bg-destructive/20"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function JobHistory() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <History className="h-5 w-5 text-muted-foreground" />
          Job History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-4">
            {jobHistory.map((job) => (
              <Card key={job.id} className="border border-border hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(job.status)}
                        <h4 className="font-medium text-sm text-card-foreground">{job.name}</h4>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {job.type}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(job.status)}`}>{job.status}</Badge>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{job.completedAt}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">{job.result}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">{job.duration}</div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-primary font-[family-name:var(--font-space-grotesk)]">
                        {job.resources.cpu}%
                      </div>
                      <div className="text-xs text-muted-foreground">Peak CPU</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-accent font-[family-name:var(--font-space-grotesk)]">
                        {job.resources.memory}%
                      </div>
                      <div className="text-xs text-muted-foreground">Peak Memory</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                      <Eye className="h-3 w-3" />
                      Details
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                      <Download className="h-3 w-3" />
                      Logs
                    </Button>
                    {job.status === "failed" && (
                      <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                        <RefreshCw className="h-3 w-3" />
                        Retry
                      </Button>
                    )}
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
