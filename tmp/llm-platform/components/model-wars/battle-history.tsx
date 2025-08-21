import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Eye, Download, Clock } from "lucide-react"

const battleHistory = [
  {
    id: 1,
    name: "GPT-4 vs Claude-3 Opus",
    type: "Scammer Detection",
    winner: "GPT-4",
    score: "12-8",
    duration: "8m 42s",
    timestamp: "2 hours ago",
    accuracy: "94.2%",
  },
  {
    id: 2,
    name: "Claude-3 Sonnet vs GPT-3.5",
    type: "Phishing Analysis",
    winner: "Claude-3 Sonnet",
    score: "15-5",
    duration: "12m 18s",
    timestamp: "4 hours ago",
    accuracy: "91.8%",
  },
  {
    id: 3,
    name: "Llama-2 vs Mistral Large",
    type: "Social Engineering",
    winner: "Llama-2",
    score: "9-11",
    duration: "15m 33s",
    timestamp: "6 hours ago",
    accuracy: "87.3%",
  },
  {
    id: 4,
    name: "GPT-4 vs GPT-3.5",
    type: "Custom Prompt",
    winner: "GPT-4",
    score: "18-2",
    duration: "6m 55s",
    timestamp: "1 day ago",
    accuracy: "96.1%",
  },
  {
    id: 5,
    name: "Claude-3 Opus vs Mistral",
    type: "Scammer Detection",
    winner: "Claude-3 Opus",
    score: "14-6",
    duration: "9m 27s",
    timestamp: "1 day ago",
    accuracy: "89.7%",
  },
]

export function BattleHistory() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Battle History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-3">
            {battleHistory.map((battle) => (
              <div
                key={battle.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm text-card-foreground">{battle.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {battle.type}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Winner: <span className="text-primary font-medium">{battle.winner}</span>
                    </span>
                    <span>•</span>
                    <span>Score: {battle.score}</span>
                    <span>•</span>
                    <span>Accuracy: {battle.accuracy}</span>
                    <span>•</span>
                    <span>Duration: {battle.duration}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{battle.timestamp}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
