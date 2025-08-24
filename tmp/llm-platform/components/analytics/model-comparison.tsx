import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Swords, TrendingUp, TrendingDown } from "lucide-react"

const modelPerformance = [
  {
    model: "GPT-4",
    provider: "OpenAI",
    accuracy: 94.2,
    battles: 127,
    wins: 119,
    winRate: 93.7,
    avgResponseTime: 1.2,
    trend: "up",
    change: "+2.1%",
  },
  {
    model: "Claude-3 Opus",
    provider: "Anthropic",
    accuracy: 91.8,
    battles: 98,
    wins: 87,
    winRate: 88.8,
    avgResponseTime: 0.9,
    trend: "up",
    change: "+1.5%",
  },
  {
    model: "Claude-3 Sonnet",
    provider: "Anthropic",
    accuracy: 87.3,
    battles: 142,
    wins: 118,
    winRate: 83.1,
    avgResponseTime: 0.8,
    trend: "down",
    change: "-0.8%",
  },
  {
    model: "GPT-3.5 Turbo",
    provider: "OpenAI",
    accuracy: 82.1,
    battles: 203,
    wins: 156,
    winRate: 76.8,
    avgResponseTime: 0.6,
    trend: "up",
    change: "+3.2%",
  },
]

const battleCategories = [
  { name: "Romance Scam", gpt4: 96, claude3: 92, gpt35: 84 },
  { name: "Investment Fraud", gpt4: 93, claude3: 89, gpt35: 81 },
  { name: "Phishing", gpt4: 91, claude3: 94, gpt35: 79 },
  { name: "Tech Support", gpt4: 95, claude3: 87, gpt35: 83 },
]

export function ModelComparison() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <Swords className="h-5 w-5 text-primary" />
          Model Performance Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Rankings */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Overall Rankings</h4>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {modelPerformance.map((model, index) => (
                <div key={model.model} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-sm">{model.model}</h5>
                      <Badge variant="outline" className="text-xs">
                        {model.provider}
                      </Badge>
                      <Badge
                        className={`text-xs ${
                          model.trend === "up"
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {model.trend === "up" ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {model.change}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="ml-1 font-medium text-primary">{model.accuracy}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Win Rate:</span>
                        <span className="ml-1 font-medium text-accent">{model.winRate}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Battles:</span>
                        <span className="ml-1 font-medium">{model.battles}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Latency:</span>
                        <span className="ml-1 font-medium">{model.avgResponseTime}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Category Performance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Performance by Category</h4>
            <Button variant="outline" size="sm" className="bg-transparent">
              View Details
            </Button>
          </div>

          <div className="space-y-2">
            {battleCategories.map((category) => (
              <div key={category.name} className="p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">GPT-4</span>
                    <span className="font-medium text-primary">{category.gpt4}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Claude-3</span>
                    <span className="font-medium text-accent">{category.claude3}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">GPT-3.5</span>
                    <span className="font-medium text-muted-foreground">{category.gpt35}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
