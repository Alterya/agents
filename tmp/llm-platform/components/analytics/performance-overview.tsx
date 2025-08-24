import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Target, Zap, Users, Clock } from "lucide-react"

const performanceMetrics = [
  {
    title: "Overall Accuracy",
    value: "94.2%",
    change: "+2.1%",
    trend: "up",
    icon: Target,
    description: "Across all detection tasks",
    target: "95%",
  },
  {
    title: "Model Battles",
    value: "127",
    change: "+15",
    trend: "up",
    icon: Zap,
    description: "Completed this week",
    target: "150",
  },
  {
    title: "Conversations Analyzed",
    value: "24.7K",
    change: "+3.2K",
    trend: "up",
    icon: Users,
    description: "Total simulations run",
    target: "30K",
  },
  {
    title: "Avg Response Time",
    value: "1.2s",
    change: "+0.1s",
    trend: "down",
    icon: Clock,
    description: "Model latency",
    target: "1.0s",
  },
]

const systemHealth = [
  { name: "Model Performance", score: 94, status: "excellent" },
  { name: "Prompt Quality", score: 87, status: "good" },
  { name: "System Reliability", score: 98, status: "excellent" },
  { name: "Data Quality", score: 91, status: "good" },
]

export function PerformanceOverview() {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceMetrics.map((metric) => (
          <Card key={metric.title} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground font-[family-name:var(--font-space-grotesk)]">
                {metric.value}
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={metric.trend === "up" ? "default" : "secondary"}
                    className={`text-xs ${
                      metric.trend === "up"
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {metric.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {metric.change}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">Target: {metric.target}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Health */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground font-[family-name:var(--font-space-grotesk)]">
            System Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {systemHealth.map((item) => (
              <div key={item.name} className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-2">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-muted stroke-current"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={`stroke-current ${item.status === "excellent" ? "text-primary" : "text-accent"}`}
                      strokeWidth="3"
                      strokeDasharray={`${item.score}, 100`}
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold font-[family-name:var(--font-space-grotesk)]">{item.score}</span>
                  </div>
                </div>
                <h4 className="font-medium text-sm text-card-foreground mb-1">{item.name}</h4>
                <Badge
                  className={`text-xs ${
                    item.status === "excellent"
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-accent/10 text-accent hover:bg-accent/20"
                  }`}
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
