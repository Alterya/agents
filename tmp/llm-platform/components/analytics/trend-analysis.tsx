import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, Calendar, Download } from "lucide-react"

const trendData = [
  { period: "Week 1", accuracy: 89.2, battles: 23, simulations: 4200 },
  { period: "Week 2", accuracy: 91.1, battles: 31, simulations: 5800 },
  { period: "Week 3", accuracy: 92.8, battles: 28, simulations: 6100 },
  { period: "Week 4", accuracy: 94.2, battles: 45, simulations: 8600 },
]

const insights = [
  {
    title: "Accuracy Improvement",
    description: "Overall detection accuracy has improved by 5.0% over the past month",
    impact: "high",
    trend: "positive",
  },
  {
    title: "Model Battle Frequency",
    description: "Battle frequency increased by 95% compared to last month",
    impact: "medium",
    trend: "positive",
  },
  {
    title: "Simulation Volume",
    description: "Conversation simulations doubled in volume with maintained quality",
    impact: "high",
    trend: "positive",
  },
  {
    title: "Response Time Optimization",
    description: "Average model response time decreased by 15% through optimization",
    impact: "medium",
    trend: "positive",
  },
]

export function TrendAnalysis() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trend Analysis & Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select defaultValue="4w">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1w">Last Week</SelectItem>
                  <SelectItem value="4w">Last 4 Weeks</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Export Trends
          </Button>
        </div>

        {/* Trend Chart Data */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Performance Trends (Last 4 Weeks)</h4>
          <div className="space-y-3">
            {trendData.map((week) => (
              <div key={week.period} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                <div className="w-20 text-sm font-medium">{week.period}</div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary font-[family-name:var(--font-space-grotesk)]">
                      {week.accuracy}%
                    </div>
                    <div className="text-xs text-muted-foreground">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-accent font-[family-name:var(--font-space-grotesk)]">
                      {week.battles}
                    </div>
                    <div className="text-xs text-muted-foreground">Battles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-muted-foreground font-[family-name:var(--font-space-grotesk)]">
                      {week.simulations.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Simulations</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Key Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => (
              <div key={insight.title} className="p-4 rounded-lg border border-border">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-sm">{insight.title}</h5>
                  <div className="flex items-center gap-1">
                    <Badge
                      className={`text-xs ${
                        insight.impact === "high"
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "bg-accent/10 text-accent hover:bg-accent/20"
                      }`}
                    >
                      {insight.impact} impact
                    </Badge>
                    <TrendingUp className="h-3 w-3 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
