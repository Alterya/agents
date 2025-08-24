import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trophy, TrendingUp, TrendingDown } from "lucide-react"

const leaderboard = [
  {
    rank: 1,
    model: "GPT-4",
    provider: "OpenAI",
    winRate: 94.2,
    battles: 127,
    wins: 119,
    trend: "up",
    change: "+2.1%",
  },
  {
    rank: 2,
    model: "Claude-3 Opus",
    provider: "Anthropic",
    winRate: 91.8,
    battles: 98,
    wins: 90,
    trend: "up",
    change: "+1.5%",
  },
  {
    rank: 3,
    model: "Claude-3 Sonnet",
    provider: "Anthropic",
    winRate: 87.3,
    battles: 142,
    wins: 124,
    trend: "down",
    change: "-0.8%",
  },
  {
    rank: 4,
    model: "GPT-3.5 Turbo",
    provider: "OpenAI",
    winRate: 82.1,
    battles: 203,
    wins: 167,
    trend: "up",
    change: "+3.2%",
  },
  {
    rank: 5,
    model: "Llama-2 70B",
    provider: "Meta",
    winRate: 78.9,
    battles: 89,
    wins: 70,
    trend: "down",
    change: "-1.2%",
  },
  {
    rank: 6,
    model: "Mistral Large",
    provider: "Mistral AI",
    winRate: 74.6,
    battles: 67,
    wins: 50,
    trend: "up",
    change: "+0.9%",
  },
]

export function ModelLeaderboard() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <Trophy className="h-5 w-5 text-accent" />
          Model Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {leaderboard.map((model) => (
              <div
                key={model.rank}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                  {model.rank}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm text-card-foreground truncate">{model.model}</h4>
                    <Badge variant="outline" className="text-xs">
                      {model.provider}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{model.winRate}% win rate</span>
                    <span>•</span>
                    <span>
                      {model.wins}/{model.battles} battles
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  {model.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-primary" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={model.trend === "up" ? "text-primary" : "text-destructive"}>{model.change}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
