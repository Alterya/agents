import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BarChart3, Download, Eye, TrendingUp, TrendingDown } from "lucide-react"

const recentResults = [
  {
    id: 1,
    name: "Romance Scam Detection v2.0",
    model: "GPT-4",
    completed: "1 hour ago",
    totalConversations: 1000,
    successRate: 94.2,
    avgResponseTime: "1.2s",
    falsePositives: 12,
    falseNegatives: 46,
    trend: "up",
    change: "+2.1%",
  },
  {
    id: 2,
    name: "Investment Fraud Analysis",
    model: "Claude-3 Opus",
    completed: "3 hours ago",
    totalConversations: 750,
    successRate: 91.8,
    avgResponseTime: "0.9s",
    falsePositives: 18,
    falseNegatives: 43,
    trend: "up",
    change: "+1.5%",
  },
  {
    id: 3,
    name: "Phishing Email Detection",
    model: "GPT-3.5 Turbo",
    completed: "6 hours ago",
    totalConversations: 2000,
    successRate: 87.3,
    avgResponseTime: "0.7s",
    falsePositives: 89,
    falseNegatives: 165,
    trend: "down",
    change: "-0.8%",
  },
  {
    id: 4,
    name: "Tech Support Scam Test",
    model: "Claude-3 Sonnet",
    completed: "1 day ago",
    totalConversations: 500,
    successRate: 89.7,
    avgResponseTime: "1.1s",
    falsePositives: 23,
    falseNegatives: 28,
    trend: "up",
    change: "+3.2%",
  },
]

export function SimulationResults() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <BarChart3 className="h-5 w-5 text-primary" />
          Recent Simulation Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-4">
            {recentResults.map((result) => (
              <Card key={result.id} className="border border-border hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-card-foreground mb-1">{result.name}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {result.model}
                        </Badge>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">
                          {result.totalConversations} conversations
                        </Badge>
                        <span className="text-xs text-muted-foreground">{result.completed}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      {result.trend === "up" ? (
                        <TrendingUp className="h-3 w-3 text-primary" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className={result.trend === "up" ? "text-primary" : "text-destructive"}>
                        {result.change}
                      </span>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary font-[family-name:var(--font-space-grotesk)]">
                        {result.successRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-accent font-[family-name:var(--font-space-grotesk)]">
                        {result.avgResponseTime}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Response</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-muted-foreground font-[family-name:var(--font-space-grotesk)]">
                        {result.falsePositives}
                      </div>
                      <div className="text-xs text-muted-foreground">False Pos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-muted-foreground font-[family-name:var(--font-space-grotesk)]">
                        {result.falseNegatives}
                      </div>
                      <div className="text-xs text-muted-foreground">False Neg</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                      <Eye className="h-3 w-3" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                      <BarChart3 className="h-3 w-3" />
                      Analyze
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
