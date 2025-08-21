import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Wand2, Star, TrendingUp } from "lucide-react"

const topPrompts = [
  {
    name: "Romance Scam Detector v3.1",
    category: "Scammer Detection",
    qualityScore: 96,
    accuracy: 94.2,
    usage: 1247,
    improvement: "+2.1%",
    author: "AI Assistant",
  },
  {
    name: "Investment Fraud Analyzer",
    category: "Financial Fraud",
    qualityScore: 93,
    accuracy: 91.8,
    usage: 892,
    improvement: "+1.5%",
    author: "John Doe",
  },
  {
    name: "Phishing Email Scanner",
    category: "Email Security",
    qualityScore: 91,
    accuracy: 89.7,
    usage: 2156,
    improvement: "+0.8%",
    author: "Security Team",
  },
  {
    name: "Social Engineering Detector",
    category: "Social Engineering",
    qualityScore: 94,
    accuracy: 92.3,
    usage: 1089,
    improvement: "+1.2%",
    author: "AI Assistant",
  },
]

const promptMetrics = [
  { name: "Average Quality Score", value: 91.2, target: 95, unit: "/100" },
  { name: "Prompt Accuracy", value: 89.7, target: 92, unit: "%" },
  { name: "Usage Rate", value: 78.3, target: 85, unit: "%" },
  { name: "Optimization Rate", value: 23.1, target: 30, unit: "%" },
]

export function PromptEffectiveness() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <Wand2 className="h-5 w-5 text-accent" />
          Prompt Effectiveness Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prompt Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Key Metrics</h4>
          <div className="grid grid-cols-2 gap-4">
            {promptMetrics.map((metric) => (
              <div key={metric.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{metric.name}</span>
                  <span className="font-medium">
                    {metric.value}
                    {metric.unit}
                  </span>
                </div>
                <Progress value={(metric.value / metric.target) * 100} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Current</span>
                  <span>
                    Target: {metric.target}
                    {metric.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Prompts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Top Performing Prompts</h4>
            <Button variant="outline" size="sm" className="bg-transparent">
              View All
            </Button>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-3">
              {topPrompts.map((prompt, index) => (
                <div key={prompt.name} className="p-3 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        <h5 className="font-medium text-sm">{prompt.name}</h5>
                        {index < 3 && <Star className="h-3 w-3 text-accent fill-current" />}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {prompt.category}
                        </Badge>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">
                          Quality: {prompt.qualityScore}/100
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <TrendingUp className="h-3 w-3" />
                      {prompt.improvement}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Accuracy:</span>
                      <span className="ml-1 font-medium text-primary">{prompt.accuracy}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Usage:</span>
                      <span className="ml-1 font-medium text-accent">{prompt.usage}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Author:</span>
                      <span className="ml-1 font-medium">{prompt.author}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}
