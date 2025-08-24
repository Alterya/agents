import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Pause, Square, Eye, MoreHorizontal } from "lucide-react"

const activeBattles = [
  {
    id: 1,
    name: "GPT-4 vs Claude-3 Opus",
    type: "Scammer Detection",
    status: "running",
    progress: 67,
    currentRound: "Round 4 of 6",
    score: { model1: 8, model2: 6 },
    timeRemaining: "2m 34s",
    models: ["GPT-4", "Claude-3 Opus"],
  },
  {
    id: 2,
    name: "Llama-2 vs Mistral Large",
    type: "Phishing Analysis",
    status: "paused",
    progress: 33,
    currentRound: "Round 2 of 6",
    score: { model1: 3, model2: 3 },
    timeRemaining: "Paused",
    models: ["Llama-2 70B", "Mistral Large"],
  },
  {
    id: 3,
    name: "GPT-3.5 vs Claude-3 Sonnet",
    type: "Social Engineering",
    status: "running",
    progress: 83,
    currentRound: "Round 5 of 6",
    score: { model1: 7, model2: 8 },
    timeRemaining: "1m 12s",
    models: ["GPT-3.5 Turbo", "Claude-3 Sonnet"],
  },
]

export function ActiveBattles() {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-card-foreground font-[family-name:var(--font-space-grotesk)]">
          Active Battles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {activeBattles.map((battle) => (
              <Card key={battle.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-card-foreground mb-1">{battle.name}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {battle.type}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            battle.status === "running"
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-accent/10 text-accent hover:bg-accent/20"
                          }`}
                        >
                          {battle.status}
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
                      <span className="text-muted-foreground">{battle.currentRound}</span>
                      <span className="text-muted-foreground">{battle.timeRemaining}</span>
                    </div>
                    <Progress value={battle.progress} className="h-2" />
                  </div>

                  {/* Score */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary font-[family-name:var(--font-space-grotesk)]">
                        {battle.score.model1}
                      </div>
                      <div className="text-xs text-muted-foreground">{battle.models[0]}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">VS</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-accent font-[family-name:var(--font-space-grotesk)]">
                        {battle.score.model2}
                      </div>
                      <div className="text-xs text-muted-foreground">{battle.models[1]}</div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                      <Eye className="h-3 w-3" />
                      Watch
                    </Button>
                    {battle.status === "running" ? (
                      <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                        <Pause className="h-3 w-3" />
                        Pause
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                        <Play className="h-3 w-3" />
                        Resume
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
