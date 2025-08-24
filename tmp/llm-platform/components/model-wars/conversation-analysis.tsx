"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Eye, ThumbsUp, ThumbsDown } from "lucide-react"

export function ConversationAnalysis() {
  const conversations = [
    {
      id: "conv-1",
      model: "GPT-4",
      score: 8.2,
      status: "completed",
      preview:
        "User: Hi, I received a call about my car warranty...\nBot: I understand your concern. This sounds like a common scam tactic...",
      metrics: {
        goalCompletion: 9.1,
        personalityConsistency: 8.5,
        coherence: 8.0,
        styleAlignment: 7.8,
        robustness: 8.4,
      },
    },
    {
      id: "conv-2",
      model: "Claude 3",
      score: 7.6,
      status: "completed",
      preview:
        "User: Someone texted me about winning a prize...\nBot: That's definitely suspicious. Let me help you identify the red flags...",
      metrics: {
        goalCompletion: 8.2,
        personalityConsistency: 7.8,
        coherence: 7.4,
        styleAlignment: 7.2,
        robustness: 7.8,
      },
    },
  ]

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <Eye className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Conversation Analysis</h3>
          <p className="text-sm text-muted-foreground">Detailed scoring and performance metrics</p>
        </div>
      </div>

      <div className="space-y-4">
        {conversations.map((conv) => (
          <div key={conv.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium">{conv.model}</span>
                <Badge variant="outline">Score: {conv.score}/10</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Eye className="h-3 w-3 mr-1" />
                  View Full
                </Button>
              </div>
            </div>

            <ScrollArea className="h-16 w-full rounded border p-2 text-sm bg-muted/30">{conv.preview}</ScrollArea>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goal Completion:</span>
                <span className="font-medium">{conv.metrics.goalCompletion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Personality:</span>
                <span className="font-medium">{conv.metrics.personalityConsistency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coherence:</span>
                <span className="font-medium">{conv.metrics.coherence}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Robustness:</span>
                <span className="font-medium">{conv.metrics.robustness}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                <ThumbsUp className="h-3 w-3 mr-1" />
                Good Response
              </Button>
              <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                <ThumbsDown className="h-3 w-3 mr-1" />
                Needs Work
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
